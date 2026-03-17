import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('$lib/server/redis', () => ({
	getRedis: vi.fn(() => null)
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(),
		update: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	appApiKeys: { id: 'id', keyHash: 'keyHash', orgId: 'orgId', isActive: 'isActive' },
	appUsers: {},
	appOrganizations: { id: 'id' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((...args: unknown[]) => args),
	and: vi.fn((...args: unknown[]) => args)
}));

import { authenticateApiKey } from './auth';
import { getRedis } from '$lib/server/redis';
import { db } from '$lib/server/db';

const mockGetRedis = vi.mocked(getRedis);

const mockAuth = {
	userId: 'user-1',
	orgId: 'org-1',
	apiKeyId: 'key-1',
	effectiveRpmLimit: 100,
	effectiveTpmLimit: 50000,
	smartRouting: false,
	org: {
		id: 'org-1',
		name: 'Test Org',
		slug: 'test-org',
		litellmOrgId: null,
		smartRoutingCheapModel: null,
		smartRoutingExpensiveModel: null,
		cacheTtlSeconds: 3600
	}
};

function mockDbSelectChain(result: unknown[]) {
	const chain = {
		from: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockResolvedValue(result)
	};
	vi.mocked(db.select).mockReturnValue(chain as never);
	return chain;
}

function mockDbUpdate() {
	const chain = {
		set: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				then: vi.fn((cb: () => void) => {
					cb();
					return { catch: vi.fn() };
				})
			})
		})
	};
	vi.mocked(db.update).mockReturnValue(chain as never);
	return chain;
}

function makeRequest(authHeader?: string): Request {
	const headers: Record<string, string> = {};
	if (authHeader) headers['Authorization'] = authHeader;
	return new Request('http://localhost', { headers });
}

describe('authenticateApiKey', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetRedis.mockReturnValue(null);
	});

	it('returns null when no Authorization header', async () => {
		const result = await authenticateApiKey(makeRequest());
		expect(result).toBeNull();
	});

	it('returns null for non-Bearer header', async () => {
		const result = await authenticateApiKey(makeRequest('Basic abc'));
		expect(result).toBeNull();
	});

	it('returns null for Bearer without sk-th- prefix', async () => {
		const result = await authenticateApiKey(makeRequest('Bearer sk-abc'));
		expect(result).toBeNull();
	});

	it('returns cached auth on cache hit without DB query', async () => {
		const mockRedis = {
			get: vi.fn().mockResolvedValue(JSON.stringify(mockAuth)),
			setex: vi.fn()
		};
		mockGetRedis.mockReturnValue(mockRedis as never);
		mockDbUpdate();

		const result = await authenticateApiKey(makeRequest('Bearer sk-th-testkey123'));
		expect(result).toEqual(mockAuth);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('falls through to DB on cache miss and returns auth', async () => {
		const mockRedis = {
			get: vi.fn().mockResolvedValue(null),
			setex: vi.fn()
		};
		mockGetRedis.mockReturnValue(mockRedis as never);

		const dbRow = {
			keyId: 'key-1',
			userId: 'user-1',
			orgId: 'org-1',
			rpmLimit: 100,
			tpmLimit: 50000,
			smartRouting: false,
			orgName: 'Test Org',
			orgSlug: 'test-org',
			litellmOrgId: null,
			defaultRpmLimit: 50,
			defaultTpmLimit: 25000,
			smartRoutingCheapModel: null,
			smartRoutingExpensiveModel: null,
			cacheTtlSeconds: 3600
		};
		mockDbSelectChain([dbRow]);
		mockDbUpdate();

		const result = await authenticateApiKey(makeRequest('Bearer sk-th-testkey123'));
		expect(result).not.toBeNull();
		expect(result!.userId).toBe('user-1');
		expect(result!.effectiveRpmLimit).toBe(100);
		expect(db.select).toHaveBeenCalled();
	});

	it('returns null when DB returns no rows (inactive key)', async () => {
		const mockRedis = {
			get: vi.fn().mockResolvedValue(null),
			setex: vi.fn()
		};
		mockGetRedis.mockReturnValue(mockRedis as never);
		mockDbSelectChain([]);

		const result = await authenticateApiKey(makeRequest('Bearer sk-th-testkey123'));
		expect(result).toBeNull();
	});

	it('rate limit cascade: per-key override wins', async () => {
		const mockRedis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn() };
		mockGetRedis.mockReturnValue(mockRedis as never);

		const dbRow = {
			keyId: 'key-1', userId: 'user-1', orgId: 'org-1',
			rpmLimit: 100, tpmLimit: 80000, smartRouting: false,
			orgName: 'Org', orgSlug: 'org', litellmOrgId: null,
			defaultRpmLimit: 50, defaultTpmLimit: 40000,
			smartRoutingCheapModel: null, smartRoutingExpensiveModel: null,
			cacheTtlSeconds: 3600
		};
		mockDbSelectChain([dbRow]);
		mockDbUpdate();

		const result = await authenticateApiKey(makeRequest('Bearer sk-th-testkey123'));
		expect(result!.effectiveRpmLimit).toBe(100);
		expect(result!.effectiveTpmLimit).toBe(80000);
	});

	it('rate limit cascade: org default when per-key is null', async () => {
		const mockRedis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn() };
		mockGetRedis.mockReturnValue(mockRedis as never);

		const dbRow = {
			keyId: 'key-1', userId: 'user-1', orgId: 'org-1',
			rpmLimit: null, tpmLimit: null, smartRouting: false,
			orgName: 'Org', orgSlug: 'org', litellmOrgId: null,
			defaultRpmLimit: 50, defaultTpmLimit: 40000,
			smartRoutingCheapModel: null, smartRoutingExpensiveModel: null,
			cacheTtlSeconds: 3600
		};
		mockDbSelectChain([dbRow]);
		mockDbUpdate();

		const result = await authenticateApiKey(makeRequest('Bearer sk-th-testkey123'));
		expect(result!.effectiveRpmLimit).toBe(50);
		expect(result!.effectiveTpmLimit).toBe(40000);
	});

	it('rate limit cascade: both null when no limits set', async () => {
		const mockRedis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn() };
		mockGetRedis.mockReturnValue(mockRedis as never);

		const dbRow = {
			keyId: 'key-1', userId: 'user-1', orgId: 'org-1',
			rpmLimit: null, tpmLimit: null, smartRouting: false,
			orgName: 'Org', orgSlug: 'org', litellmOrgId: null,
			defaultRpmLimit: null, defaultTpmLimit: null,
			smartRoutingCheapModel: null, smartRoutingExpensiveModel: null,
			cacheTtlSeconds: 3600
		};
		mockDbSelectChain([dbRow]);
		mockDbUpdate();

		const result = await authenticateApiKey(makeRequest('Bearer sk-th-testkey123'));
		expect(result!.effectiveRpmLimit).toBeNull();
		expect(result!.effectiveTpmLimit).toBeNull();
	});

	it('gracefully degrades to DB lookup on Redis failure', async () => {
		const mockRedis = {
			get: vi.fn().mockRejectedValue(new Error('conn')),
			setex: vi.fn()
		};
		mockGetRedis.mockReturnValue(mockRedis as never);

		const dbRow = {
			keyId: 'key-1', userId: 'user-1', orgId: 'org-1',
			rpmLimit: 100, tpmLimit: 50000, smartRouting: false,
			orgName: 'Org', orgSlug: 'org', litellmOrgId: null,
			defaultRpmLimit: 50, defaultTpmLimit: 25000,
			smartRoutingCheapModel: null, smartRoutingExpensiveModel: null,
			cacheTtlSeconds: 3600
		};
		mockDbSelectChain([dbRow]);
		mockDbUpdate();

		const result = await authenticateApiKey(makeRequest('Bearer sk-th-testkey123'));
		expect(result).not.toBeNull();
		expect(result!.userId).toBe('user-1');
		expect(db.select).toHaveBeenCalled();
	});
});
