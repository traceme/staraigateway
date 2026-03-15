import type { RequestHandler } from './$types';
import { authenticateApiKey } from '$lib/server/gateway/auth';
import { getAvailableModels } from '$lib/server/gateway/models';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
	'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export const GET: RequestHandler = async ({ request }) => {
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

	try {
		const models = await getAvailableModels(auth.orgId);
		return new Response(
			JSON.stringify({
				object: 'list',
				data: models
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
			}
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return new Response(
			JSON.stringify({
				error: {
					message: `Failed to list models: ${message}`,
					type: 'server_error',
					code: 'server_error'
				}
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
			}
		);
	}
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: CORS_HEADERS
	});
};
