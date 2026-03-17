import { db } from '$lib/server/db';
import { appBudgets, appUsageLogs, appOrgMembers } from '$lib/server/db/schema';
import { eq, and, gte, sql, isNull, or } from 'drizzle-orm';
import type { GatewayAuth } from './auth';
import { getBudgetResetDate } from '$lib/server/budget/utils';

export interface BudgetCheckResult {
	allowed: boolean;
	hardLimitHit: boolean;
	softLimitHit: boolean;
	currentSpendCents: number;
	hardLimitCents: number | null;
	softLimitCents: number | null;
	budgetId: string | null;
}

export async function checkBudget(auth: GatewayAuth): Promise<BudgetCheckResult> {
	// Step 1: Look up the user's role in this org (needed for role-scoped default)
	const memberRows = await db
		.select({ role: appOrgMembers.role })
		.from(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, auth.orgId), eq(appOrgMembers.userId, auth.userId)))
		.limit(1);

	const userRole = memberRows[0]?.role ?? 'member';

	// Step 2: Fetch all candidate budgets in one query:
	// - individual (userId matches)
	// - role default (role matches user's role, no userId)
	// - org default (isOrgDefault = true, no userId, no role)
	const budgets = await db
		.select()
		.from(appBudgets)
		.where(
			and(
				eq(appBudgets.orgId, auth.orgId),
				or(
					eq(appBudgets.userId, auth.userId), // individual
					and(isNull(appBudgets.userId), eq(appBudgets.role, userRole)), // role default
					and(
						isNull(appBudgets.userId),
						isNull(appBudgets.role),
						eq(appBudgets.isOrgDefault, true)
					) // org default
				)
			)
		);

	// Step 3: Apply cascade: individual override > role default > org default
	const budget =
		budgets.find((b) => b.userId === auth.userId) ??
		budgets.find((b) => b.userId === null && b.role === userRole) ??
		budgets.find((b) => b.isOrgDefault);

	if (!budget) {
		return {
			allowed: true,
			hardLimitHit: false,
			softLimitHit: false,
			currentSpendCents: 0,
			hardLimitCents: null,
			softLimitCents: null,
			budgetId: null
		};
	}

	const resetDate = getBudgetResetDate(budget.resetDay);

	let currentSpendCents: number;

	// Use snapshot if it was updated within the current budget period (O(1) read)
	if (budget.snapshotUpdatedAt >= resetDate) {
		currentSpendCents = budget.spendSnapshotCents;
	} else {
		// Snapshot is stale or from a previous period — fall back to SUM query
		const result = await db
			.select({
				totalCost: sql<string>`COALESCE(SUM(CAST(${appUsageLogs.cost} AS numeric)), 0)`
			})
			.from(appUsageLogs)
			.where(
				and(
					eq(appUsageLogs.orgId, auth.orgId),
					eq(appUsageLogs.userId, auth.userId),
					gte(appUsageLogs.createdAt, resetDate)
				)
			);

		const totalCostDollars = parseFloat(result[0]?.totalCost ?? '0');
		currentSpendCents = Math.round(totalCostDollars * 100);

		// Fire-and-forget: re-seed the snapshot with the accurate SUM value
		db.update(appBudgets)
			.set({ spendSnapshotCents: currentSpendCents, snapshotUpdatedAt: new Date() })
			.where(eq(appBudgets.id, budget.id))
			.then(() => {})
			.catch(() => {});
	}

	const hardLimitHit =
		budget.hardLimitCents !== null && currentSpendCents >= budget.hardLimitCents;
	const softLimitHit =
		budget.softLimitCents !== null && currentSpendCents >= budget.softLimitCents;

	return {
		allowed: !hardLimitHit,
		hardLimitHit,
		softLimitHit,
		currentSpendCents,
		hardLimitCents: budget.hardLimitCents,
		softLimitCents: budget.softLimitCents,
		budgetId: budget.id
	};
}
