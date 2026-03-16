import { db } from '$lib/server/db';
import { appOrgMembers, appApiKeys, appUsageLogs } from '$lib/server/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg, membership } = await parent();
	const isAdmin = membership.role === 'admin' || membership.role === 'owner';

	const result: Record<string, unknown> = {
		orgName: currentOrg.name,
		isAdmin
	};

	if (isAdmin) {
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		// Total members
		const membersCount = await db
			.select({ count: sql<number>`COUNT(*)::int` })
			.from(appOrgMembers)
			.where(eq(appOrgMembers.orgId, currentOrg.id));

		// Active API keys
		const activeKeysCount = await db
			.select({ count: sql<number>`COUNT(*)::int` })
			.from(appApiKeys)
			.where(and(eq(appApiKeys.orgId, currentOrg.id), eq(appApiKeys.isActive, true)));

		// Spend this month
		const spendResult = await db
			.select({ total: sql<string>`COALESCE(SUM(${appUsageLogs.cost}), '0')` })
			.from(appUsageLogs)
			.where(
				and(
					eq(appUsageLogs.orgId, currentOrg.id),
					gte(appUsageLogs.createdAt, monthStart)
				)
			);

		// Requests this month
		const requestsResult = await db
			.select({ count: sql<number>`COUNT(*)::int` })
			.from(appUsageLogs)
			.where(
				and(
					eq(appUsageLogs.orgId, currentOrg.id),
					gte(appUsageLogs.createdAt, monthStart)
				)
			);

		result.kpi = {
			members: membersCount[0]?.count ?? 0,
			activeKeys: activeKeysCount[0]?.count ?? 0,
			spendThisMonth: parseFloat(spendResult[0]?.total ?? '0'),
			requestsThisMonth: requestsResult[0]?.count ?? 0
		};
	}

	return result;
};
