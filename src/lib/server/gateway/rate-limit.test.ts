import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	checkRateLimit,
	recordRequest,
	cleanup,
	rateLimitResponse,
	addRateLimitHeaders
} from './rate-limit';
import type { RateLimitResult } from './rate-limit';

describe('rate-limit', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('checkRateLimit', () => {
		it('returns allowed with no limits (null, null)', () => {
			const result = checkRateLimit('no-limit-key', null, null);
			expect(result.allowed).toBe(true);
			expect(result.rpmLimit).toBeNull();
			expect(result.tpmLimit).toBeNull();
		});

		it('returns allowed when under RPM limit', () => {
			const keyId = 'under-rpm-key';
			for (let i = 0; i < 5; i++) {
				recordRequest(keyId, 0);
			}
			const result = checkRateLimit(keyId, 10, null);
			expect(result.allowed).toBe(true);
			expect(result.rpmRemaining).toBe(5);
		});

		it('returns not allowed when RPM limit exactly hit', () => {
			const keyId = 'rpm-exact-key';
			for (let i = 0; i < 10; i++) {
				recordRequest(keyId, 0);
			}
			const result = checkRateLimit(keyId, 10, null);
			expect(result.allowed).toBe(false);
			expect(result.rpmRemaining).toBe(0);
		});

		it('returns not allowed when TPM limit exceeded', () => {
			const keyId = 'tpm-exceeded-key';
			recordRequest(keyId, 1000);
			const result = checkRateLimit(keyId, null, 500);
			expect(result.allowed).toBe(false);
			expect(result.tpmRemaining).toBe(0);
		});

		it('returns not allowed when RPM triggers before TPM', () => {
			const keyId = 'both-limits-key';
			recordRequest(keyId, 10);
			recordRequest(keyId, 10);
			const result = checkRateLimit(keyId, 2, 10000);
			expect(result.allowed).toBe(false);
		});

		it('allows requests after stale entries evicted by time advance', () => {
			const keyId = 'stale-evict-key';
			for (let i = 0; i < 10; i++) {
				recordRequest(keyId, 100);
			}
			const blocked = checkRateLimit(keyId, 10, null);
			expect(blocked.allowed).toBe(false);

			// Advance past the 60s window
			vi.advanceTimersByTime(61_000);

			const result = checkRateLimit(keyId, 10, null);
			expect(result.allowed).toBe(true);
			expect(result.rpmRemaining).toBe(10);
		});
	});

	describe('recordRequest', () => {
		it('records entry visible to checkRateLimit', () => {
			const keyId = 'record-key';
			recordRequest(keyId, 100);
			const result = checkRateLimit(keyId, 10, null);
			expect(result.rpmRemaining).toBe(9);
		});
	});

	describe('cleanup', () => {
		it('removes stale entries so usage resets', () => {
			const keyId = 'cleanup-key';
			recordRequest(keyId, 500);
			vi.advanceTimersByTime(61_000);
			cleanup();
			const result = checkRateLimit(keyId, 10, 1000);
			expect(result.allowed).toBe(true);
			expect(result.rpmRemaining).toBe(10);
			expect(result.tpmRemaining).toBe(1000);
		});
	});

	describe('rateLimitResponse', () => {
		it('returns 429 with correct body and RPM headers', async () => {
			const result: RateLimitResult = {
				allowed: false,
				rpmLimit: 10,
				rpmRemaining: 0,
				tpmLimit: null,
				tpmRemaining: 0,
				resetMs: 5000
			};
			const response = rateLimitResponse(result);
			expect(response.status).toBe(429);

			const body = await response.json();
			expect(body.error.type).toBe('rate_limit_exceeded');

			expect(response.headers.get('Retry-After')).toBe('5');
			expect(response.headers.get('x-ratelimit-limit-requests')).toBe('10');
		});

		it('includes TPM headers when only tpmLimit set', async () => {
			const result: RateLimitResult = {
				allowed: false,
				rpmLimit: null,
				rpmRemaining: 0,
				tpmLimit: 1000,
				tpmRemaining: 0,
				resetMs: 3000
			};
			const response = rateLimitResponse(result);
			expect(response.headers.get('x-ratelimit-limit-tokens')).toBe('1000');
			expect(response.headers.get('x-ratelimit-limit-requests')).toBeNull();
		});
	});

	describe('addRateLimitHeaders', () => {
		it('returns original response when no limits set', () => {
			const original = new Response('ok', { status: 200 });
			const result: RateLimitResult = {
				allowed: true,
				rpmLimit: null,
				rpmRemaining: 0,
				tpmLimit: null,
				tpmRemaining: 0,
				resetMs: 0
			};
			const returned = addRateLimitHeaders(original, result);
			expect(returned).toBe(original);
		});

		it('adds RPM headers to response', () => {
			const original = new Response('ok', { status: 200 });
			const result: RateLimitResult = {
				allowed: true,
				rpmLimit: 100,
				rpmRemaining: 95,
				tpmLimit: null,
				tpmRemaining: 0,
				resetMs: 10000
			};
			const returned = addRateLimitHeaders(original, result);
			expect(returned.headers.get('x-ratelimit-limit-requests')).toBe('100');
			expect(returned.headers.get('x-ratelimit-remaining-requests')).toBe('95');
		});

		it('preserves original response status', () => {
			const original = new Response('ok', { status: 200 });
			const result: RateLimitResult = {
				allowed: true,
				rpmLimit: 100,
				rpmRemaining: 95,
				tpmLimit: null,
				tpmRemaining: 0,
				resetMs: 1000
			};
			const returned = addRateLimitHeaders(original, result);
			expect(returned.status).toBe(200);
		});
	});
});
