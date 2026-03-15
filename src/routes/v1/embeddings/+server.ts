import type { RequestHandler } from './$types';
import { authenticateApiKey } from '$lib/server/gateway/auth';
import { proxyToLiteLLM } from '$lib/server/gateway/proxy';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const POST: RequestHandler = async ({ request }) => {
	const auth = await authenticateApiKey(request);
	if (!auth) {
		return new Response(
			JSON.stringify({
				error: {
					message: 'Invalid API key',
					type: 'authentication_error',
					code: 'invalid_api_key'
				}
			}),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
			}
		);
	}

	const response = await proxyToLiteLLM(request, auth.orgId, '/v1/embeddings');

	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		headers
	});
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: CORS_HEADERS
	});
};
