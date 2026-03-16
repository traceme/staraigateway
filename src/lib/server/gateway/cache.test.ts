import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCacheKey, getCachedResponse, setCachedResponse } from './cache';

// Mock the redis module
vi.mock('$lib/server/redis', () => ({
	getRedis: vi.fn(() => null)
}));

import { getRedis } from '$lib/server/redis';
const mockGetRedis = vi.mocked(getRedis);

describe('generateCacheKey', () => {
	it('produces format "cache:{orgId}:{sha256hex}"', () => {
		const key = generateCacheKey('org-1', 'gpt-4o', [{ role: 'user', content: 'hello' }]);
		expect(key).toMatch(/^cache:org-1:[a-f0-9]{64}$/);
	});

	it('produces same hash for messages differing only in whitespace', () => {
		const messages1 = [{ role: 'user', content: 'hello  world' }];
		const messages2 = [{ role: 'user', content: 'hello world' }];
		const key1 = generateCacheKey('org-1', 'gpt-4o', messages1);
		const key2 = generateCacheKey('org-1', 'gpt-4o', messages2);
		expect(key1).toBe(key2);
	});

	it('produces different hash for different models', () => {
		const messages = [{ role: 'user', content: 'hello' }];
		const key1 = generateCacheKey('org-1', 'gpt-4o', messages);
		const key2 = generateCacheKey('org-1', 'gpt-4o-mini', messages);
		expect(key1).not.toBe(key2);
	});
});

describe('getCachedResponse', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns null when Redis not available', async () => {
		mockGetRedis.mockReturnValue(null);
		const result = await getCachedResponse('cache:org-1:abc');
		expect(result).toBeNull();
	});
});

describe('setCachedResponse', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('is no-op when Redis not available', async () => {
		mockGetRedis.mockReturnValue(null);
		// Should not throw
		await setCachedResponse('cache:org-1:abc', '{"data": "test"}', 3600);
	});
});
