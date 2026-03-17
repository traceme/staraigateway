import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { eq, and, gte, sql } from 'drizzle-orm';
import {
	appUsers,
	appOrganizations,
	appOrgMembers,
	appApiKeys,
	appUsageLogs
} from '../db/schema';
import { getTestDb, pushSchema, cleanupTestDb, truncateAllTables } from './setup';

type TestDb = ReturnType<typeof getTestDb>;
let db: TestDb;

beforeAll(async () => {
	await pushSchema();
	db = getTestDb();
}, 30_000); // schema push can be slow

afterAll(async () => {
	await truncateAllTables();
	await cleanupTestDb();
});

// Helper to create a user record with unique values
function makeUser(overrides: Partial<{ id: string; email: string; name: string }> = {}) {
	const id = overrides.id ?? randomUUID();
	return {
		id,
		email: overrides.email ?? `user-${id}@test.com`,
		name: overrides.name ?? `User ${id.slice(0, 8)}`,
		passwordHash: 'hashed-password'
	};
}

// Helper to create an org record with unique values
function makeOrg(overrides: Partial<{ id: string; name: string; slug: string }> = {}) {
	const id = overrides.id ?? randomUUID();
	return {
		id,
		name: overrides.name ?? `Org ${id.slice(0, 8)}`,
		slug: overrides.slug ?? `org-${id.slice(0, 12)}`
	};
}

describe('insert operations', () => {
	it('inserts a user and retrieves by email', async () => {
		const user = makeUser();
		await db.insert(appUsers).values(user);

		const rows = await db
			.select()
			.from(appUsers)
			.where(eq(appUsers.email, user.email));

		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe(user.name);
		expect(rows[0].email).toBe(user.email);
		expect(rows[0].emailVerified).toBe(false);
	});

	it('enforces unique constraint on organization slug', async () => {
		const slug = `unique-slug-${randomUUID().slice(0, 8)}`;
		await db.insert(appOrganizations).values(makeOrg({ slug }));

		await expect(
			db.insert(appOrganizations).values(makeOrg({ slug }))
		).rejects.toThrow();
	});
});

describe('update operations', () => {
	it('updates user emailVerified flag', async () => {
		const user = makeUser();
		await db.insert(appUsers).values(user);

		await db
			.update(appUsers)
			.set({ emailVerified: true })
			.where(eq(appUsers.id, user.id));

		const rows = await db
			.select()
			.from(appUsers)
			.where(eq(appUsers.id, user.id));

		expect(rows).toHaveLength(1);
		expect(rows[0].emailVerified).toBe(true);
	});
});

describe('select with join', () => {
	it('joins api_keys with organizations via orgId', async () => {
		const user = makeUser();
		const org = makeOrg();
		const memberId = randomUUID();
		const keyHash = `hash-${randomUUID()}`;
		const apiKey = {
			id: randomUUID(),
			orgId: org.id,
			userId: user.id,
			name: 'Test Key',
			keyPrefix: 'sk-th-test12',
			keyHash
		};

		await db.insert(appUsers).values(user);
		await db.insert(appOrganizations).values(org);
		await db.insert(appOrgMembers).values({
			id: memberId,
			orgId: org.id,
			userId: user.id,
			role: 'owner'
		});
		await db.insert(appApiKeys).values(apiKey);

		const rows = await db
			.select()
			.from(appApiKeys)
			.innerJoin(appOrganizations, eq(appApiKeys.orgId, appOrganizations.id))
			.where(eq(appApiKeys.keyHash, keyHash));

		expect(rows).toHaveLength(1);
		expect(rows[0].app_api_keys.keyHash).toBe(keyHash);
		expect(rows[0].app_api_keys.name).toBe('Test Key');
		expect(rows[0].app_organizations.name).toBe(org.name);
		expect(rows[0].app_organizations.slug).toBe(org.slug);
	});
});

describe('aggregation queries', () => {
	it('sums usage log costs for a user in a period', async () => {
		const user = makeUser();
		const org = makeOrg();
		const apiKey = {
			id: randomUUID(),
			orgId: org.id,
			userId: user.id,
			name: 'Agg Key',
			keyPrefix: 'sk-th-agg123',
			keyHash: `hash-${randomUUID()}`
		};

		await db.insert(appUsers).values(user);
		await db.insert(appOrganizations).values(org);
		await db.insert(appOrgMembers).values({
			id: randomUUID(),
			orgId: org.id,
			userId: user.id,
			role: 'member'
		});
		await db.insert(appApiKeys).values(apiKey);

		// Insert 3 usage log entries with known costs
		const costs = ['0.050000', '0.030000', '0.020000'];
		const resetDate = new Date('2025-01-01T00:00:00Z');

		for (const cost of costs) {
			await db.insert(appUsageLogs).values({
				id: randomUUID(),
				orgId: org.id,
				userId: user.id,
				apiKeyId: apiKey.id,
				model: 'gpt-4o',
				provider: 'openai',
				endpoint: '/v1/chat/completions',
				inputTokens: 100,
				outputTokens: 50,
				cost
			});
		}

		const result = await db
			.select({
				totalCost: sql<string>`COALESCE(SUM(CAST(${appUsageLogs.cost} AS numeric)), 0)`
			})
			.from(appUsageLogs)
			.where(
				and(
					eq(appUsageLogs.orgId, org.id),
					eq(appUsageLogs.userId, user.id),
					gte(appUsageLogs.createdAt, resetDate)
				)
			);

		const totalCost = parseFloat(result[0].totalCost);
		expect(totalCost).toBeCloseTo(0.1, 5);
	});
});

describe('cascade and constraints', () => {
	it('foreign key prevents inserting api_key with non-existent orgId', async () => {
		const user = makeUser();
		await db.insert(appUsers).values(user);

		const fakeOrgId = randomUUID();
		await expect(
			db.insert(appApiKeys).values({
				id: randomUUID(),
				orgId: fakeOrgId,
				userId: user.id,
				name: 'Bad Key',
				keyPrefix: 'sk-th-bad123',
				keyHash: `hash-${randomUUID()}`
			})
		).rejects.toThrow();
	});

	it('unique constraint prevents duplicate org membership', async () => {
		const user = makeUser();
		const org = makeOrg();
		const memberId1 = randomUUID();
		const memberId2 = randomUUID();

		await db.insert(appUsers).values(user);
		await db.insert(appOrganizations).values(org);
		await db.insert(appOrgMembers).values({
			id: memberId1,
			orgId: org.id,
			userId: user.id,
			role: 'member'
		});

		await expect(
			db.insert(appOrgMembers).values({
				id: memberId2,
				orgId: org.id,
				userId: user.id,
				role: 'admin'
			})
		).rejects.toThrow();
	});
});
