import type { RequestHandler } from './$types';
import { authenticateApiKey } from '$lib/server/gateway/auth';
import { getAvailableModels } from '$lib/server/gateway/models';
import { getCorsHeaders } from '$lib/server/gateway/cors';

export const GET: RequestHandler = async ({ request }) => {
	const corsHeaders = getCorsHeaders(request.headers.get('origin'));

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
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
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
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
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
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
			}
		);
	}
};

export const OPTIONS: RequestHandler = async ({ request }) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(request.headers.get('origin'))
	});
};
