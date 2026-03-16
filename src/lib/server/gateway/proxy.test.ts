import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, RETRYABLE_STATUSES } from './proxy';

// Save original fetch
const originalFetch = globalThis.fetch;

describe('fetchWithRetry', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('retries on 429 up to 3 times then returns last response', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response('rate limited', { status: 429 })
		);
		globalThis.fetch = mockFetch;

		const response = await fetchWithRetry('http://test.com/api', { method: 'POST' }, 3);

		expect(response.status).toBe(429);
		// 1 initial + 3 retries = 4 total calls
		expect(mockFetch).toHaveBeenCalledTimes(4);
	});

	it('returns immediately on 200', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response('ok', { status: 200 })
		);
		globalThis.fetch = mockFetch;

		const response = await fetchWithRetry('http://test.com/api', { method: 'POST' });

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('returns immediately on 400 (non-retryable)', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response('bad request', { status: 400 })
		);
		globalThis.fetch = mockFetch;

		const response = await fetchWithRetry('http://test.com/api', { method: 'POST' });

		expect(response.status).toBe(400);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('recovers when retry succeeds', async () => {
		const mockFetch = vi.fn()
			.mockResolvedValueOnce(new Response('err', { status: 503 }))
			.mockResolvedValueOnce(new Response('ok', { status: 200 }));
		globalThis.fetch = mockFetch;

		const response = await fetchWithRetry('http://test.com/api', { method: 'POST' });

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});
});

describe('RETRYABLE_STATUSES', () => {
	it('includes 429, 500, 503', () => {
		expect(RETRYABLE_STATUSES.has(429)).toBe(true);
		expect(RETRYABLE_STATUSES.has(500)).toBe(true);
		expect(RETRYABLE_STATUSES.has(503)).toBe(true);
	});

	it('does not include 400, 401, 404', () => {
		expect(RETRYABLE_STATUSES.has(400)).toBe(false);
		expect(RETRYABLE_STATUSES.has(401)).toBe(false);
		expect(RETRYABLE_STATUSES.has(404)).toBe(false);
	});
});
