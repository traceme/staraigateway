import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { appProviderKeys } from '$lib/server/db/schema';
import { decrypt } from '$lib/server/crypto';
import { getProvider } from '$lib/server/providers';
import { eq, and } from 'drizzle-orm';

const LITELLM_API_URL = env.LITELLM_API_URL ?? 'http://localhost:4000';

/**
 * Proxy a request to LiteLLM with the org's decrypted provider key.
 * Selects the first active provider key that supports the requested model.
 * Supports both streaming (SSE pass-through) and non-streaming responses.
 */
export async function proxyToLiteLLM(
	request: Request,
	orgId: string,
	path: string
): Promise<Response> {
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

	try {
		const litellmResponse = await fetch(litellmUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});

		if (!litellmResponse.ok) {
			// Pass through LiteLLM error response
			const errorBody = await litellmResponse.text();
			return new Response(errorBody, {
				status: litellmResponse.status,
				headers: {
					'Content-Type': litellmResponse.headers.get('Content-Type') ?? 'application/json'
				}
			});
		}

		// Streaming response: pass through SSE directly
		if (body.stream === true && litellmResponse.body) {
			return new Response(litellmResponse.body, {
				status: 200,
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive'
				}
			});
		}

		// Non-streaming: return JSON response
		const responseBody = await litellmResponse.text();
		return new Response(responseBody, {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown proxy error';
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
