import type { RequestHandler } from './$types';
import { authenticateApiKey } from '$lib/server/gateway/auth';
import { proxyToLiteLLM } from '$lib/server/gateway/proxy';
import { checkBudget } from '$lib/server/gateway/budget';
import { checkAndNotifyBudgets } from '$lib/server/budget/notifications';

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
				headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
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
		'/v1/chat/completions',
		auth,
		auth.apiKeyId
	);

	// Add CORS headers to proxy response
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
