/**
 * In-memory sliding window rate limiter for API keys.
 * Tracks RPM (requests per minute) and TPM (tokens per minute) per key.
 * Returns OpenAI-compatible 429 responses and x-ratelimit-* headers.
 */

export interface RateLimitResult {
	allowed: boolean;
	rpmLimit: number | null;
	rpmRemaining: number;
	tpmLimit: number | null;
	tpmRemaining: number;
	resetMs: number;
}

interface RequestEntry {
	timestamp: number;
	tokens: number;
}

// Sliding window: Map<keyId, RequestEntry[]>
const windows = new Map<string, RequestEntry[]>();

const WINDOW_MS = 60_000; // 1 minute

/**
 * Check whether a request is allowed under RPM/TPM limits.
 * Evicts stale entries, counts current window usage.
 */
export function checkRateLimit(
	keyId: string,
	rpmLimit: number | null,
	tpmLimit: number | null
): RateLimitResult {
	// No limits set — always allowed
	if (rpmLimit === null && tpmLimit === null) {
		return {
			allowed: true,
			rpmLimit: null,
			rpmRemaining: 0,
			tpmLimit: null,
			tpmRemaining: 0,
			resetMs: 0
		};
	}

	const now = Date.now();
	const cutoff = now - WINDOW_MS;

	// Get or create window
	let entries = windows.get(keyId);
	if (!entries) {
		entries = [];
		windows.set(keyId, entries);
	}

	// Evict stale entries
	while (entries.length > 0 && entries[0].timestamp < cutoff) {
		entries.shift();
	}

	const currentRpm = entries.length;
	const currentTpm = entries.reduce((sum, e) => sum + e.tokens, 0);

	// Calculate reset time from oldest entry
	const oldestTs = entries.length > 0 ? entries[0].timestamp : now;
	const resetMs = Math.max(0, oldestTs + WINDOW_MS - now);

	const rpmRemaining = rpmLimit !== null ? Math.max(0, rpmLimit - currentRpm) : 0;
	const tpmRemaining = tpmLimit !== null ? Math.max(0, tpmLimit - currentTpm) : 0;

	const rpmExceeded = rpmLimit !== null && currentRpm >= rpmLimit;
	const tpmExceeded = tpmLimit !== null && currentTpm >= tpmLimit;

	return {
		allowed: !rpmExceeded && !tpmExceeded,
		rpmLimit,
		rpmRemaining,
		tpmLimit,
		tpmRemaining,
		resetMs
	};
}

/**
 * Record a completed request with its token count in the sliding window.
 */
export function recordRequest(keyId: string, tokenCount: number): void {
	let entries = windows.get(keyId);
	if (!entries) {
		entries = [];
		windows.set(keyId, entries);
	}
	entries.push({ timestamp: Date.now(), tokens: tokenCount });
}

/**
 * Evict all stale entries from every key's window. Deletes empty keys.
 */
export function cleanup(): void {
	const cutoff = Date.now() - WINDOW_MS;
	for (const [keyId, entries] of windows) {
		while (entries.length > 0 && entries[0].timestamp < cutoff) {
			entries.shift();
		}
		if (entries.length === 0) {
			windows.delete(keyId);
		}
	}
}

// Periodic cleanup every 60 seconds
setInterval(cleanup, 60_000);

/**
 * Build an OpenAI-compatible 429 rate limit response.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
	const resetSeconds = Math.ceil(result.resetMs / 1000);
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Retry-After': String(resetSeconds)
	};

	if (result.rpmLimit !== null) {
		headers['x-ratelimit-limit-requests'] = String(result.rpmLimit);
		headers['x-ratelimit-remaining-requests'] = String(result.rpmRemaining);
		headers['x-ratelimit-reset-requests'] = `${resetSeconds}s`;
	}
	if (result.tpmLimit !== null) {
		headers['x-ratelimit-limit-tokens'] = String(result.tpmLimit);
		headers['x-ratelimit-remaining-tokens'] = String(result.tpmRemaining);
		headers['x-ratelimit-reset-tokens'] = `${resetSeconds}s`;
	}

	return new Response(
		JSON.stringify({
			error: {
				message: 'Rate limit exceeded',
				type: 'rate_limit_exceeded',
				code: 'rate_limit_exceeded'
			}
		}),
		{ status: 429, headers }
	);
}

/**
 * Clone a response with added x-ratelimit-* headers.
 * Only adds headers when the corresponding limit is set (not null).
 */
export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
	if (result.rpmLimit === null && result.tpmLimit === null) {
		return response;
	}

	const resetSeconds = Math.ceil(result.resetMs / 1000);
	const newHeaders = new Headers(response.headers);

	if (result.rpmLimit !== null) {
		newHeaders.set('x-ratelimit-limit-requests', String(result.rpmLimit));
		newHeaders.set('x-ratelimit-remaining-requests', String(result.rpmRemaining));
		newHeaders.set('x-ratelimit-reset-requests', `${resetSeconds}s`);
	}
	if (result.tpmLimit !== null) {
		newHeaders.set('x-ratelimit-limit-tokens', String(result.tpmLimit));
		newHeaders.set('x-ratelimit-remaining-tokens', String(result.tpmRemaining));
		newHeaders.set('x-ratelimit-reset-tokens', `${resetSeconds}s`);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders
	});
}
