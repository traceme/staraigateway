import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { appUsageLogs, appUsers, appOrgMembers, appBudgets } from '$lib/server/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { currentOrg } = await parent();
	const range = url.searchParams.get('range') ?? '7';
	const tab = url.searchParams.get('tab') ?? 'overview';

	// Calculate date range
	let fromDate: Date;
	let toDate = new Date();
	if (range === 'custom') {
		fromDate = new Date(url.searchParams.get('from') ?? '');
		const toParam = url.searchParams.get('to');
		if (toParam) toDate = new Date(toParam);
		if (isNaN(fromDate.getTime())) fromDate = new Date(Date.now() - 7 * 86400000);
	} else {
		fromDate = new Date(Date.now() - parseInt(range) * 86400000);
	}

	// KPI aggregates
	const kpiResult = await db
		.select({
			totalCost: sql<string>`COALESCE(SUM(CAST(${appUsageLogs.cost} AS numeric)), 0)`,
			totalRequests: sql<number>`COUNT(*)::int`,
			totalInputTokens: sql<number>`COALESCE(SUM(${appUsageLogs.inputTokens}), 0)::int`,
			totalOutputTokens: sql<number>`COALESCE(SUM(${appUsageLogs.outputTokens}), 0)::int`
		})
		.from(appUsageLogs)
		.where(
			and(
				eq(appUsageLogs.orgId, currentOrg.id),
				gte(appUsageLogs.createdAt, fromDate),
				lte(appUsageLogs.createdAt, toDate)
			)
		);

	// Daily cost trend (for line chart)
	const dailyCosts = await db
		.select({
			date: sql<string>`TO_CHAR(${appUsageLogs.createdAt}, 'YYYY-MM-DD')`,
			cost: sql<string>`SUM(CAST(${appUsageLogs.cost} AS numeric))`,
			requests: sql<number>`COUNT(*)::int`
		})
		.from(appUsageLogs)
		.where(
			and(
				eq(appUsageLogs.orgId, currentOrg.id),
				gte(appUsageLogs.createdAt, fromDate),
				lte(appUsageLogs.createdAt, toDate)
			)
		)
		.groupBy(sql`TO_CHAR(${appUsageLogs.createdAt}, 'YYYY-MM-DD')`)
		.orderBy(sql`TO_CHAR(${appUsageLogs.createdAt}, 'YYYY-MM-DD')`);

	// Per-member breakdown -- join with appUsers for name AND appOrgMembers for role (TRACK-03)
	// This enables role-based cost grouping as the per-team breakdown for Phase 3
	const memberBreakdown = await db
		.select({
			userId: appUsageLogs.userId,
			userName: appUsers.name,
			role: appOrgMembers.role,
			cost: sql<string>`SUM(CAST(${appUsageLogs.cost} AS numeric))`,
			requests: sql<number>`COUNT(*)::int`,
			inputTokens: sql<number>`SUM(${appUsageLogs.inputTokens})::int`,
			outputTokens: sql<number>`SUM(${appUsageLogs.outputTokens})::int`
		})
		.from(appUsageLogs)
		.innerJoin(appUsers, eq(appUsageLogs.userId, appUsers.id))
		.innerJoin(
			appOrgMembers,
			and(eq(appOrgMembers.userId, appUsageLogs.userId), eq(appOrgMembers.orgId, appUsageLogs.orgId))
		)
		.where(
			and(
				eq(appUsageLogs.orgId, currentOrg.id),
				gte(appUsageLogs.createdAt, fromDate),
				lte(appUsageLogs.createdAt, toDate)
			)
		)
		.groupBy(appUsageLogs.userId, appUsers.name, appOrgMembers.role)
		.orderBy(desc(sql`SUM(CAST(${appUsageLogs.cost} AS numeric))`));

	// Per-model breakdown
	const modelBreakdown = await db
		.select({
			model: appUsageLogs.model,
			provider: appUsageLogs.provider,
			cost: sql<string>`SUM(CAST(${appUsageLogs.cost} AS numeric))`,
			requests: sql<number>`COUNT(*)::int`,
			inputTokens: sql<number>`SUM(${appUsageLogs.inputTokens})::int`,
			outputTokens: sql<number>`SUM(${appUsageLogs.outputTokens})::int`
		})
		.from(appUsageLogs)
		.where(
			and(
				eq(appUsageLogs.orgId, currentOrg.id),
				gte(appUsageLogs.createdAt, fromDate),
				lte(appUsageLogs.createdAt, toDate)
			)
		)
		.groupBy(appUsageLogs.model, appUsageLogs.provider)
		.orderBy(desc(sql`SUM(CAST(${appUsageLogs.cost} AS numeric))`));

	// Load all budgets for this org
	const budgets = await db
		.select()
		.from(appBudgets)
		.where(eq(appBudgets.orgId, currentOrg.id));

	const orgDefault = budgets.find((b) => b.isOrgDefault) ?? null;
	const roleBudgets = budgets.filter((b) => b.role !== null && b.userId === null);

	// Per-role aggregation for TRACK-03 (per-team cost breakdown by role)
	const roleBreakdown = memberBreakdown.reduce(
		(acc, m) => {
			const role = m.role ?? 'member';
			if (!acc[role]) acc[role] = { role, cost: 0, requests: 0, members: 0 };
			acc[role].cost += parseFloat(m.cost ?? '0');
			acc[role].requests += m.requests;
			acc[role].members += 1;
			return acc;
		},
		{} as Record<string, { role: string; cost: number; requests: number; members: number }>
	);

	// Annotate members with budget info using cascade: individual > role > org default
	const annotatedMembers = memberBreakdown.map((m) => {
		const memberRole = m.role ?? 'member';
		const individual = budgets.find((b) => b.userId === m.userId);
		const roleDefault = roleBudgets.find((b) => b.role === memberRole);

		let budget: (typeof budgets)[0] | null = null;
		let budgetSource: 'individual' | 'role' | 'org-default' | null = null;

		if (individual) {
			budget = individual;
			budgetSource = 'individual';
		} else if (roleDefault) {
			budget = roleDefault;
			budgetSource = 'role';
		} else if (orgDefault) {
			budget = orgDefault;
			budgetSource = 'org-default';
		}

		const costDollars = parseFloat(m.cost ?? '0');

		return {
			userId: m.userId,
			name: m.userName,
			role: memberRole,
			cost: costDollars,
			requests: m.requests,
			inputTokens: m.inputTokens,
			outputTokens: m.outputTokens,
			hardLimitCents: budget?.hardLimitCents ?? null,
			softLimitCents: budget?.softLimitCents ?? null,
			currentSpendCents: Math.round(costDollars * 100),
			budgetSource
		};
	});

	return {
		tab,
		range,
		fromDate: fromDate.toISOString(),
		toDate: toDate.toISOString(),
		kpi: {
			totalCost: parseFloat(kpiResult[0]?.totalCost ?? '0'),
			totalRequests: kpiResult[0]?.totalRequests ?? 0,
			avgCost: kpiResult[0]?.totalRequests
				? parseFloat(kpiResult[0].totalCost) / kpiResult[0].totalRequests
				: 0
		},
		dailyCosts: dailyCosts.map((d) => ({
			date: d.date,
			cost: parseFloat(d.cost ?? '0'),
			requests: d.requests
		})),
		memberBreakdown: annotatedMembers,
		roleBreakdown: Object.values(roleBreakdown),
		modelBreakdown: modelBreakdown.map((m) => ({
			model: m.model,
			provider: m.provider,
			cost: parseFloat(m.cost ?? '0'),
			requests: m.requests,
			inputTokens: m.inputTokens,
			outputTokens: m.outputTokens
		})),
		budgets: {
			orgDefault: orgDefault
				? {
						hardLimitCents: orgDefault.hardLimitCents,
						softLimitCents: orgDefault.softLimitCents,
						resetDay: orgDefault.resetDay
					}
				: null,
			roleBudgets: roleBudgets.map((rb) => ({
				role: rb.role!,
				hardLimitCents: rb.hardLimitCents,
				softLimitCents: rb.softLimitCents
			}))
		}
	};
};
