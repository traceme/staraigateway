import type { RequestHandler } from './$types';
import { authenticateApiKey } from '$lib/server/gateway/auth';
import { proxyToLiteLLM } from '$lib/server/gateway/proxy';
import { checkBudget } from '$lib/server/gateway/budget';
import { checkAndNotifyBudgets } from '$lib/server/budget/notifications';
import { getCorsHeaders } from '$lib/server/gateway/cors';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	const corsHeaders = getCorsHeaders(request.headers.get('origin'));

	const MAX_BODY_BYTES = parseInt(env.MAX_REQUEST_BODY_BYTES ?? '10485760', 10);
	const contentLength = request.headers.get('content-length');
	if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
		return new Response(
			JSON.stringify({
				error: {
					message: `Request body exceeds maximum size of ${MAX_BODY_BYTES} bytes`,
					type: 'invalid_request_error',
					code: 'payload_too_large'
				}
			}),
			{ status: 413, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
		);
	}

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

	// Pre-request budget check
	const budgetResult = await checkBudget(auth);
	if (!budgetResult.allowed) {
		const currentSpend = (budgetResult.currentSpendCents / 100).toFixed(2);
		const hardLimit = budgetResult.hardLimitCents
			? (budgetResult.hardLimitCents / 100).toFixed(2)
			: '0.00';
		return new Response(
			JSON.stringify({
				error: {
					message: `Monthly budget exceeded ($${currentSpend}/$${hardLimit}). Contact your admin.`,
					type: 'budget_exceeded',
					code: 'budget_exceeded'
				}
			}),
			{
				status: 429,
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
			}
		);
	}

	// Fire-and-forget: notify if soft limit hit
	if (budgetResult.softLimitHit) {
		checkAndNotifyBudgets(auth.orgId).catch(() => {});
	}

	const response = await proxyToLiteLLM(
		request,
		auth.orgId,
		'/v1/embeddings',
		auth,
		auth.apiKeyId,
		budgetResult.budgetId
	);

	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders)) {
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		headers
	});
};

export const OPTIONS: RequestHandler = async ({ request }) => {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders(request.headers.get('origin'))
	});
};
