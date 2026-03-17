import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(),
		update: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	appBudgets: { id: 'id', orgId: 'orgId', userId: 'userId', role: 'role', isOrgDefault: 'isOrgDefault' },
	appUsageLogs: { orgId: 'orgId', userId: 'userId', cost: 'cost', createdAt: 'createdAt' },
	appOrgMembers: { orgId: 'orgId', userId: 'userId', role: 'role' }
}));

vi.mock('$lib/server/budget/utils', () => ({
	getBudgetResetDate: vi.fn(() => new Date('2026-03-01T00:00:00Z'))
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((...args: unknown[]) => args),
	and: vi.fn((...args: unknown[]) => args),
	gte: vi.fn((...args: unknown[]) => args),
	sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
	isNull: vi.fn((col: unknown) => ({ col, type: 'isNull' })),
	or: vi.fn((...args: unknown[]) => args)
}));

import { checkBudget } from './budget';
import type { GatewayAuth } from './auth';
import { db } from '$lib/server/db';

const baseAuth: GatewayAuth = {
	userId: 'user-1',
	orgId: 'org-1',
	apiKeyId: 'key-1',
	effectiveRpmLimit: null,
	effectiveTpmLimit: null,
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

// Helper to create sequential select chain mocks
function mockDbSelectSequence(results: unknown[][]) {
	let callIndex = 0;
	vi.mocked(db.select).mockImplementation(() => {
		const currentResult = results[callIndex] ?? [];
		callIndex++;
		const chain: Record<string, ReturnType<typeof vi.fn>> = {
			from: vi.fn(),
			innerJoin: vi.fn(),
			where: vi.fn(),
			limit: vi.fn().mockResolvedValue(currentResult)
		};
		// Each method returns the chain for chaining, but also acts as a thenable (resolved value)
		const thenable = Object.assign(chain, {
			then: (resolve: (v: unknown) => void) => Promise.resolve(currentResult).then(resolve)
		});
		chain.from.mockReturnValue(thenable);
		chain.innerJoin.mockReturnValue(thenable);
		chain.where.mockReturnValue(thenable);
		return thenable as never;
	});
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

function makeBudget(overrides: Record<string, unknown> = {}) {
	return {
		id: 'budget-1',
		orgId: 'org-1',
		userId: null as string | null,
		role: null as string | null,
		hardLimitCents: null as number | null,
		softLimitCents: null as number | null,
		resetDay: 1,
		isOrgDefault: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		spendSnapshotCents: 0,
		snapshotUpdatedAt: new Date('2026-03-10T00:00:00Z'), // after reset date = fresh
		...overrides
	};
}

describe('checkBudget', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns allowed with null budgetId when no budget exists', async () => {
		mockDbSelectSequence([
			[{ role: 'member' }], // member role query
			[]                     // budgets query - empty
		]);

		const result = await checkBudget(baseAuth);
		expect(result.allowed).toBe(true);
		expect(result.budgetId).toBeNull();
		expect(result.hardLimitCents).toBeNull();
		expect(result.softLimitCents).toBeNull();
	});

	it('allows when individual budget under hard limit', async () => {
		mockDbSelectSequence([
			[{ role: 'member' }],
			[makeBudget({
				userId: 'user-1',
				hardLimitCents: 10000,
				spendSnapshotCents: 5000
			})]
		]);

		const result = await checkBudget(baseAuth);
		expect(result.allowed).toBe(true);
		expect(result.hardLimitHit).toBe(false);
		expect(result.currentSpendCents).toBe(5000);
	});

	it('blocks when individual budget at hard limit', async () => {
		mockDbSelectSequence([
			[{ role: 'member' }],
			[makeBudget({
				userId: 'user-1',
				hardLimitCents: 10000,
				spendSnapshotCents: 10000
			})]
		]);

		const result = await checkBudget(baseAuth);
		expect(result.allowed).toBe(false);
		expect(result.hardLimitHit).toBe(true);
	});

	it('reports soft limit hit but still allows', async () => {
		mockDbSelectSequence([
			[{ role: 'member' }],
			[makeBudget({
				userId: 'user-1',
				softLimitCents: 5000,
				hardLimitCents: 10000,
				spendSnapshotCents: 6000
			})]
		]);

		const result = await checkBudget(baseAuth);
		expect(result.allowed).toBe(true);
		expect(result.softLimitHit).toBe(true);
		expect(result.hardLimitHit).toBe(false);
	});

	it('cascade: individual budget wins over role default', async () => {
		const individualBudget = makeBudget({
			id: 'budget-individual',
			userId: 'user-1',
			hardLimitCents: 20000,
			spendSnapshotCents: 5000
		});
		const roleBudget = makeBudget({
			id: 'budget-role',
			userId: null,
			role: 'member',
			hardLimitCents: 10000,
			spendSnapshotCents: 3000
		});

		mockDbSelectSequence([
			[{ role: 'member' }],
			[individualBudget, roleBudget]
		]);

		const result = await checkBudget(baseAuth);
		expect(result.budgetId).toBe('budget-individual');
		expect(result.hardLimitCents).toBe(20000);
	});

	it('cascade: role default wins over org default', async () => {
		const roleBudget = makeBudget({
			id: 'budget-role',
			userId: null,
			role: 'member',
			hardLimitCents: 15000,
			spendSnapshotCents: 2000
		});
		const orgBudget = makeBudget({
			id: 'budget-org',
			userId: null,
			role: null,
			isOrgDefault: true,
			hardLimitCents: 10000,
			spendSnapshotCents: 1000
		});

		mockDbSelectSequence([
			[{ role: 'member' }],
			[roleBudget, orgBudget]
		]);

		const result = await checkBudget(baseAuth);
		expect(result.budgetId).toBe('budget-role');
		expect(result.hardLimitCents).toBe(15000);
	});

	it('cascade: org default used when no individual or role budget', async () => {
		const orgBudget = makeBudget({
			id: 'budget-org',
			userId: null,
			role: null,
			isOrgDefault: true,
			hardLimitCents: 10000,
			spendSnapshotCents: 1000
		});

		mockDbSelectSequence([
			[{ role: 'member' }],
			[orgBudget]
		]);

		const result = await checkBudget(baseAuth);
		expect(result.budgetId).toBe('budget-org');
		expect(result.hardLimitCents).toBe(10000);
	});

	it('stale snapshot triggers SUM fallback', async () => {
		// snapshotUpdatedAt before reset date = stale
		const staleBudget = makeBudget({
			userId: 'user-1',
			hardLimitCents: 10000,
			spendSnapshotCents: 9999, // should be ignored
			snapshotUpdatedAt: new Date('2026-02-15T00:00:00Z') // before 2026-03-01
		});

		// Third select call is the SUM query
		mockDbSelectSequence([
			[{ role: 'member' }],
			[staleBudget],
			[{ totalCost: '75.50' }] // SUM result = $75.50 = 7550 cents
		]);
		mockDbUpdate();

		const result = await checkBudget(baseAuth);
		expect(result.currentSpendCents).toBe(7550);
		expect(result.allowed).toBe(true);
	});

	it('fresh snapshot uses snapshot value without SUM query', async () => {
		const freshBudget = makeBudget({
			userId: 'user-1',
			hardLimitCents: 10000,
			spendSnapshotCents: 4200,
			snapshotUpdatedAt: new Date('2026-03-10T00:00:00Z') // after 2026-03-01
		});

		mockDbSelectSequence([
			[{ role: 'member' }],
			[freshBudget]
		]);

		const result = await checkBudget(baseAuth);
		expect(result.currentSpendCents).toBe(4200);
		// db.select should only be called twice (member + budgets), not a third time for SUM
		expect(db.select).toHaveBeenCalledTimes(2);
	});
});
