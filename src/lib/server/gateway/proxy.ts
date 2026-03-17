import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { appProviderKeys } from '$lib/server/db/schema';
import { decrypt } from '$lib/server/crypto';
import { getProvider } from '$lib/server/providers';
import { eq, and } from 'drizzle-orm';
import type { GatewayAuth } from './auth';
import {
	logUsage,
	extractUsageFromJSON,
	extractUsageFromSSEText,
	calculateCost,
	updateSpendSnapshot
} from './usage';
import {
	checkRateLimit,
	recordRequest,
	rateLimitResponse,
	addRateLimitHeaders
} from './rate-limit';
import { selectKeyRoundRobin } from './load-balancer';
import { estimateTokenCount, selectModelTier } from './routing';
import { generateCacheKey, getCachedResponse, setCachedResponse } from './cache';
import { getRedis } from '$lib/server/redis';

const LITELLM_API_URL = env.LITELLM_API_URL ?? 'http://localhost:4000';

export const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * Fetch with exponential backoff retry on retryable status codes (429, 500, 503).
 * Returns the last response after all retries are exhausted.
 */
export async function fetchWithRetry(
	url: string,
	init: RequestInit,
	retries = MAX_RETRIES
): Promise<Response> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const response = await fetch(url, init);
		if (!RETRYABLE_STATUSES.has(response.status) || attempt === retries) return response;
		const delay = BASE_DELAY_MS * Math.pow(2, attempt);
		const jitter = delay * 0.25 * Math.random();
		await new Promise((resolve) => setTimeout(resolve, delay + jitter));
	}
	// Should not reach here, but TypeScript needs it
	throw new Error('Retry exhausted');
}

/**
 * Proxy a request to LiteLLM with retry/fallback, smart routing, caching, and load balancing.
 *
 * Flow:
 * 1. Parse request, extract model + messages
 * 2. Smart routing: substitute model for small requests (if enabled)
 * 3. Cache check: return cached response for non-streaming (if Redis available)
 * 4. Rate limit check
 * 5. Key selection with round-robin across matching provider keys
 * 6. Try each key with fetchWithRetry, fallback to next key on failure
 * 7. Cache set on success for non-streaming responses
 */
export async function proxyToLiteLLM(
	request: Request,
	orgId: string,
	path: string,
	auth?: GatewayAuth,
	apiKeyId?: string,
	budgetId?: string | null
): Promise<Response> {
	const startTime = Date.now();

	// Rate limit check BEFORE forwarding to LiteLLM
	if (auth && apiKeyId) {
		const rlResult = checkRateLimit(apiKeyId, auth.effectiveRpmLimit, auth.effectiveTpmLimit);
		if (!rlResult.allowed) {
			return rateLimitResponse(rlResult);
		}
	}

	// Parse the request body to get the model
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return errorResponse(400, 'Invalid JSON in request body', 'invalid_request_error');
	}

	const requestedModel = body.model as string | undefined;
	if (!requestedModel) {
		return errorResponse(400, 'Missing "model" field in request body', 'invalid_request_error');
	}

	// --- Smart Routing: substitute model for small requests ---
	let effectiveModel = requestedModel;
	let effectiveBody = body;

	if (
		auth?.smartRouting &&
		auth.org.smartRoutingCheapModel &&
		auth.org.smartRoutingExpensiveModel
	) {
		const messages = body.messages as Array<{ content?: string }> | undefined;
		if (messages) {
			const tokens = estimateTokenCount(messages);
			const selectedModel = selectModelTier(
				tokens,
				auth.org.smartRoutingCheapModel,
				auth.org.smartRoutingExpensiveModel
			);
			if (selectedModel !== requestedModel) {
				effectiveModel = selectedModel;
				effectiveBody = { ...body, model: effectiveModel };
			}
		}
	}

	const isStreaming = effectiveBody.stream === true;

	// --- Cache check (non-streaming only) ---
	let cacheKey: string | null = null;
	if (!isStreaming && getRedis()) {
		const messages = effectiveBody.messages as unknown[] | undefined;
		if (messages) {
			cacheKey = generateCacheKey(orgId, effectiveModel, messages);
			const cached = await getCachedResponse(cacheKey);
			if (cached) {
				return new Response(cached, {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'X-Cache': 'HIT'
					}
				});
			}
		}
	}

	// --- Find all active provider keys ---
	const providerKeys = await db
		.select({
			id: appProviderKeys.id,
			provider: appProviderKeys.provider,
			encryptedKey: appProviderKeys.encryptedKey,
			baseUrl: appProviderKeys.baseUrl,
			models: appProviderKeys.models
		})
		.from(appProviderKeys)
		.where(and(eq(appProviderKeys.orgId, orgId), eq(appProviderKeys.isActive, true)));

	// Find all keys whose models array contains the effective model
	let matchingKeys = providerKeys.filter((key) => {
		if (!key.models) return false;
		const modelList = key.models as string[];
		return modelList.includes(effectiveModel);
	});

	// If smart routing substituted the model but no keys match, fall back to requested model
	if (matchingKeys.length === 0 && effectiveModel !== requestedModel) {
		effectiveModel = requestedModel;
		effectiveBody = body;
		matchingKeys = providerKeys.filter((key) => {
			if (!key.models) return false;
			const modelList = key.models as string[];
			return modelList.includes(requestedModel);
		});
	}

	if (matchingKeys.length === 0) {
		return errorResponse(
			404,
			`No provider configured for model: ${effectiveModel}`,
			'invalid_request_error'
		);
	}

	// --- Round-robin key ordering ---
	const provider = matchingKeys[0].provider;
	const orderedKeys = selectKeyRoundRobin(matchingKeys, orgId, provider);

	// Get rate limit snapshot for response headers
	const rlSnapshot = auth
		? checkRateLimit(apiKeyId ?? '', auth.effectiveRpmLimit, auth.effectiveTpmLimit)
		: null;

	const litellmUrl = `${LITELLM_API_URL}${path}`;

	// --- Try each key with retry/fallback ---
	let lastErrorResponse: Response | null = null;

	for (const key of orderedKeys) {
		// Decrypt the provider key
		let decryptedKey: string;
		try {
			decryptedKey = decrypt(key.encryptedKey);
		} catch {
			continue; // Skip keys that fail to decrypt
		}

		// Build headers for LiteLLM
		const providerDef = getProvider(key.provider);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (providerDef?.authHeader === 'x-api-key') {
			headers['x-api-key'] = decryptedKey;
		} else if (providerDef?.authHeader === 'api-key') {
			headers['api-key'] = decryptedKey;
		} else {
			headers['Authorization'] = `Bearer ${decryptedKey}`;
		}

		try {
			const litellmResponse = await fetchWithRetry(litellmUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify(effectiveBody)
			});

			// If not OK and retryable, try next key
			if (!litellmResponse.ok && RETRYABLE_STATUSES.has(litellmResponse.status)) {
				lastErrorResponse = litellmResponse;
				continue;
			}

			if (!litellmResponse.ok) {
				// Non-retryable error — pass through
				const errorBody = await litellmResponse.text();
				const latencyMs = Date.now() - startTime;

				if (auth && apiKeyId) {
					logUsage(
						auth,
						apiKeyId,
						path,
						effectiveModel,
						key.provider,
						0,
						0,
						0,
						latencyMs,
						'error',
						isStreaming,
						`LiteLLM returned ${litellmResponse.status}`
					);
				}

				return new Response(errorBody, {
					status: litellmResponse.status,
					headers: {
						'Content-Type':
							litellmResponse.headers.get('Content-Type') ?? 'application/json'
					}
				});
			}

			// --- Streaming response: pass through SSE with usage extraction ---
			if (isStreaming && litellmResponse.body) {
				const reader = litellmResponse.body.getReader();
				const decoder = new TextDecoder();
				const recentLines: string[] = [];
				const MAX_RECENT = 10;

				const stream = new ReadableStream({
					async pull(controller) {
						try {
							const { done, value } = await reader.read();
							if (done) {
								const latencyMs = Date.now() - startTime;
								if (auth && apiKeyId) {
									const sseText = recentLines.join('\n');
									const usage = extractUsageFromSSEText(sseText);
									const totalTokens = usage
										? usage.inputTokens + usage.outputTokens
										: 0;
									recordRequest(apiKeyId, totalTokens);
									if (usage) {
										const cost = calculateCost(
											usage.model || effectiveModel,
											usage.inputTokens,
											usage.outputTokens
										);
										logUsage(
											auth,
											apiKeyId,
											path,
											usage.model || effectiveModel,
											key.provider,
											usage.inputTokens,
											usage.outputTokens,
											cost,
											latencyMs,
											'success',
											true
										);
										if (budgetId && cost > 0) {
											updateSpendSnapshot(budgetId, Math.round(cost * 100));
										}
									} else {
										logUsage(
											auth,
											apiKeyId,
											path,
											effectiveModel,
											key.provider,
											0,
											0,
											0,
											latencyMs,
											'success',
											true
										);
									}
								}
								controller.close();
								return;
							}

							controller.enqueue(value);

							const text = decoder.decode(value, { stream: true });
							const lines = text.split('\n').filter((l) => l.trim().length > 0);
							for (const line of lines) {
								recentLines.push(line);
								if (recentLines.length > MAX_RECENT) {
									recentLines.shift();
								}
							}
						} catch (err) {
							const latencyMs = Date.now() - startTime;
							if (auth && apiKeyId) {
								logUsage(
									auth,
									apiKeyId,
									path,
									effectiveModel,
									key.provider,
									0,
									0,
									0,
									latencyMs,
									'error',
									true,
									err instanceof Error ? err.message : 'Stream read error'
								);
							}
							controller.error(err);
						}
					},
					cancel() {
						reader.cancel();
					}
				});

				const sseResponse = new Response(stream, {
					status: 200,
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive'
					}
				});

				return rlSnapshot ? addRateLimitHeaders(sseResponse, rlSnapshot) : sseResponse;
			}

			// --- Non-streaming: return JSON response with usage logging + cache set ---
			const responseBody = await litellmResponse.text();
			const latencyMs = Date.now() - startTime;

			if (auth && apiKeyId) {
				const usage = extractUsageFromJSON(responseBody);
				const totalTokens = usage ? usage.inputTokens + usage.outputTokens : 0;
				recordRequest(apiKeyId, totalTokens);
				if (usage) {
					const cost = calculateCost(
						usage.model || effectiveModel,
						usage.inputTokens,
						usage.outputTokens
					);
					logUsage(
						auth,
						apiKeyId,
						path,
						usage.model || effectiveModel,
						key.provider,
						usage.inputTokens,
						usage.outputTokens,
						cost,
						latencyMs,
						'success',
						false
					);
					if (budgetId && cost > 0) {
						updateSpendSnapshot(budgetId, Math.round(cost * 100));
					}
				} else {
					logUsage(
						auth,
						apiKeyId,
						path,
						effectiveModel,
						key.provider,
						0,
						0,
						0,
						latencyMs,
						'success',
						false
					);
				}
			}

			// Cache set on success (fire-and-forget)
			if (cacheKey && auth) {
				try {
					setCachedResponse(cacheKey, responseBody, auth.org.cacheTtlSeconds);
				} catch {
					// Silently fail
				}
			}

			const jsonResponse = new Response(responseBody, {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'X-Cache': 'MISS'
				}
			});

			return rlSnapshot ? addRateLimitHeaders(jsonResponse, rlSnapshot) : jsonResponse;
		} catch (err) {
			// Network error for this key, try next
			lastErrorResponse = new Response(
				JSON.stringify({
					error: {
						message: err instanceof Error ? err.message : 'Unknown proxy error',
						type: 'server_error',
						code: 'server_error'
					}
				}),
				{ status: 502, headers: { 'Content-Type': 'application/json' } }
			);
			continue;
		}
	}

	// All keys exhausted — return last error
	if (lastErrorResponse) {
		const latencyMs = Date.now() - startTime;
		if (auth && apiKeyId) {
			logUsage(
				auth,
				apiKeyId,
				path,
				effectiveModel,
				orderedKeys[0]?.provider ?? 'unknown',
				0,
				0,
				0,
				latencyMs,
				'error',
				isStreaming,
				'All provider keys exhausted after retries'
			);
		}
		return lastErrorResponse;
	}

	return errorResponse(502, 'All provider keys failed', 'server_error');
}

function errorResponse(status: number, message: string, type: string): Response {
	return new Response(
		JSON.stringify({
			error: {
				message,
				type,
				code: type
			}
		}),
		{
			status,
			headers: { 'Content-Type': 'application/json' }
		}
	);
}
