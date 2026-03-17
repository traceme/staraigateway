import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('$lib/server/db', () => ({
	db: {
		insert: vi.fn(),
		select: vi.fn(),
		update: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	appApiKeys: {
		id: 'id',
		orgId: 'orgId',
		userId: 'userId',
		name: 'name',
		keyPrefix: 'keyPrefix',
		keyHash: 'keyHash',
		isActive: 'isActive',
		lastUsedAt: 'lastUsedAt',
		createdAt: 'createdAt'
	}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((...args: unknown[]) => args),
	and: vi.fn((...args: unknown[]) => args),
	desc: vi.fn((col: unknown) => ({ col, dir: 'desc' }))
}));

import { generateApiKey, createApiKey, getUserApiKeys, revokeApiKey } from './api-keys';
import { db } from '$lib/server/db';

describe('generateApiKey', () => {
	it('produces key starting with sk-th-', () => {
		const key = generateApiKey();
		expect(key.fullKey.startsWith('sk-th-')).toBe(true);
	});

	it('prefix is first 12 chars of full key', () => {
		const key = generateApiKey();
		expect(key.prefix).toBe(key.fullKey.slice(0, 12));
	});

	it('hash is 64-char hex (SHA-256)', () => {
		const key = generateApiKey();
		expect(key.hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it('produces different keys on successive calls', () => {
		const key1 = generateApiKey();
		const key2 = generateApiKey();
		expect(key1.fullKey).not.toBe(key2.fullKey);
	});
});

describe('createApiKey', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('inserts key and returns metadata with full key', async () => {
		const mockRow = {
			id: 'key-1',
			orgId: 'org-1',
			userId: 'user-1',
			name: 'My Key',
			keyPrefix: 'sk-th-abcdef',
			isActive: true,
			lastUsedAt: null,
			createdAt: new Date()
		};

		const chain = {
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([mockRow])
			})
		};
		vi.mocked(db.insert).mockReturnValue(chain as never);

		const result = await createApiKey('org-1', 'user-1', 'My Key');
		expect(db.insert).toHaveBeenCalled();
		expect(result.key.name).toBe('My Key');
		expect(result.fullKey.startsWith('sk-th-')).toBe(true);
	});
});

describe('getUserApiKeys', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns metadata array from DB', async () => {
		const mockRows = [
			{ id: 'key-1', orgId: 'org-1', userId: 'user-1', name: 'Key 1', keyPrefix: 'sk-th-aaa', isActive: true, lastUsedAt: null, createdAt: new Date() },
			{ id: 'key-2', orgId: 'org-1', userId: 'user-1', name: 'Key 2', keyPrefix: 'sk-th-bbb', isActive: true, lastUsedAt: null, createdAt: new Date() }
		];

		const chain: Record<string, ReturnType<typeof vi.fn>> = {
			from: vi.fn(),
			where: vi.fn(),
			orderBy: vi.fn().mockResolvedValue(mockRows)
		};
		chain.from.mockReturnValue(chain);
		chain.where.mockReturnValue(chain);
		vi.mocked(db.select).mockReturnValue(chain as never);

		const result = await getUserApiKeys('org-1', 'user-1');
		expect(result).toHaveLength(2);
		expect(db.select).toHaveBeenCalled();
	});
});

describe('revokeApiKey', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns true when key found and revoked', async () => {
		const chain = {
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: 'key-1' }])
				})
			})
		};
		vi.mocked(db.update).mockReturnValue(chain as never);

		const result = await revokeApiKey('key-1', 'org-1', 'user-1');
		expect(result).toBe(true);
	});

	it('returns false when key not found', async () => {
		const chain = {
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([])
				})
			})
		};
		vi.mocked(db.update).mockReturnValue(chain as never);

		const result = await revokeApiKey('key-nonexistent', 'org-1', 'user-1');
		expect(result).toBe(false);
	});
});
