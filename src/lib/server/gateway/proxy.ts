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
	calculateCost
} from './usage';
import {
	checkRateLimit,
	recordRequest,
	rateLimitResponse,
	addRateLimitHeaders
} from './rate-limit';

const LITELLM_API_URL = env.LITELLM_API_URL ?? 'http://localhost:4000';

/**
 * Proxy a request to LiteLLM with the org's decrypted provider key.
 * Selects the first active provider key that supports the requested model.
 * Supports both streaming (SSE pass-through) and non-streaming responses.
 * Logs usage data (token counts, cost) fire-and-forget after response.
 * Enforces per-key rate limits (RPM/TPM) before forwarding.
 */
export async function proxyToLiteLLM(
	request: Request,
	orgId: string,
	path: string,
	auth?: GatewayAuth,
	apiKeyId?: string
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

	const model = body.model as string | undefined;
	if (!model) {
		return errorResponse(400, 'Missing "model" field in request body', 'invalid_request_error');
	}

	// Find an active provider key that supports this model
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

	// Find the first key whose models array contains the requested model
	const matchingKey = providerKeys.find((key) => {
		if (!key.models) return false;
		try {
			const modelList = JSON.parse(key.models) as string[];
			return modelList.includes(model);
		} catch {
			return false;
		}
	});

	if (!matchingKey) {
		return errorResponse(
			404,
			`No provider configured for model: ${model}`,
			'invalid_request_error'
		);
	}

	// Decrypt the provider key
	let decryptedKey: string;
	try {
		decryptedKey = decrypt(matchingKey.encryptedKey);
	} catch {
		return errorResponse(500, 'Failed to decrypt provider key', 'server_error');
	}

	// Build headers for LiteLLM
	const providerDef = getProvider(matchingKey.provider);
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	// Set auth header in the format the provider expects
	if (providerDef?.authHeader === 'x-api-key') {
		headers['x-api-key'] = decryptedKey;
	} else if (providerDef?.authHeader === 'api-key') {
		headers['api-key'] = decryptedKey;
	} else {
		headers['Authorization'] = `Bearer ${decryptedKey}`;
	}

	// Forward to LiteLLM
	const litellmUrl = `${LITELLM_API_URL}${path}`;
	const isStreaming = body.stream === true;

	// Get rate limit snapshot for response headers
	const rlSnapshot = auth
		? checkRateLimit(apiKeyId ?? '', auth.effectiveRpmLimit, auth.effectiveTpmLimit)
		: null;

	try {
		const litellmResponse = await fetch(litellmUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});

		if (!litellmResponse.ok) {
			// Pass through LiteLLM error response
			const errorBody = await litellmResponse.text();
			const latencyMs = Date.now() - startTime;

			// Log error usage if auth is available
			if (auth && apiKeyId) {
				logUsage(
					auth,
					apiKeyId,
					path,
					model,
					matchingKey.provider,
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

		// Streaming response: pass through SSE with usage extraction
		if (isStreaming && litellmResponse.body) {
			const reader = litellmResponse.body.getReader();
			const decoder = new TextDecoder();
			// Ring buffer to keep the last few SSE lines for usage extraction
			const recentLines: string[] = [];
			const MAX_RECENT = 10;

			const stream = new ReadableStream({
				async pull(controller) {
					try {
						const { done, value } = await reader.read();
						if (done) {
							// Stream ended - extract usage from buffered lines
							const latencyMs = Date.now() - startTime;
							if (auth && apiKeyId) {
								const sseText = recentLines.join('\n');
								const usage = extractUsageFromSSEText(sseText);
								const totalTokens = usage
									? usage.inputTokens + usage.outputTokens
									: 0;
								// Record tokens for rate limiting
								recordRequest(apiKeyId, totalTokens);
								if (usage) {
									const cost = calculateCost(
										usage.model || model,
										usage.inputTokens,
										usage.outputTokens
									);
									logUsage(
										auth,
										apiKeyId,
										path,
										usage.model || model,
										matchingKey.provider,
										usage.inputTokens,
										usage.outputTokens,
										cost,
										latencyMs,
										'success',
										true
									);
								} else {
									// No usage data found in stream - log with zero tokens
									logUsage(
										auth,
										apiKeyId,
										path,
										model,
										matchingKey.provider,
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

						// Pass through the chunk unchanged
						controller.enqueue(value);

						// Buffer recent lines for usage extraction
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
								model,
								matchingKey.provider,
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

			// Add rate limit headers to the initial SSE response
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

		// Non-streaming: return JSON response with usage logging
		const responseBody = await litellmResponse.text();
		const latencyMs = Date.now() - startTime;

		if (auth && apiKeyId) {
			const usage = extractUsageFromJSON(responseBody);
			const totalTokens = usage ? usage.inputTokens + usage.outputTokens : 0;
			// Record tokens for rate limiting
			recordRequest(apiKeyId, totalTokens);
			if (usage) {
				const cost = calculateCost(
					usage.model || model,
					usage.inputTokens,
					usage.outputTokens
				);
				logUsage(
					auth,
					apiKeyId,
					path,
					usage.model || model,
					matchingKey.provider,
					usage.inputTokens,
					usage.outputTokens,
					cost,
					latencyMs,
					'success',
					false
				);
			} else {
				// No usage data in response - log with zero tokens
				logUsage(
					auth,
					apiKeyId,
					path,
					model,
					matchingKey.provider,
					0,
					0,
					0,
					latencyMs,
					'success',
					false
				);
			}
		}

		const jsonResponse = new Response(responseBody, {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});

		return rlSnapshot ? addRateLimitHeaders(jsonResponse, rlSnapshot) : jsonResponse;
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown proxy error';
		const latencyMs = Date.now() - startTime;

		if (auth && apiKeyId) {
			logUsage(
				auth,
				apiKeyId,
				path,
				model,
				matchingKey.provider,
				0,
				0,
				0,
				latencyMs,
				'error',
				isStreaming,
				message
			);
		}

		return errorResponse(502, `LiteLLM proxy error: ${message}`, 'server_error');
	}
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
