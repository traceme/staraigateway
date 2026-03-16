import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appOrganizations, appOrgMembers, appBudgets, appUsageLogs } from '$lib/server/db/schema';
import { eq, and, gte, sql, isNull, or } from 'drizzle-orm';
import { getBudgetResetDate } from '$lib/server/budget/utils';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, '/auth/login');
	}

	// Look up org by slug
	const orgs = await db
		.select()
		.from(appOrganizations)
		.where(eq(appOrganizations.slug, params.slug))
		.limit(1);

	if (orgs.length === 0) {
		error(404, 'Organization not found');
	}

	const currentOrg = orgs[0];

	// Verify user is a member
	const memberships = await db
		.select()
		.from(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, currentOrg.id), eq(appOrgMembers.userId, locals.user.id)))
		.limit(1);

	if (memberships.length === 0) {
		error(404, 'Organization not found');
	}

	const membership = memberships[0];

	// Load all user's orgs for org switcher
	const userOrgs = await db
		.select({
			id: appOrganizations.id,
			name: appOrganizations.name,
			slug: appOrganizations.slug
		})
		.from(appOrgMembers)
		.innerJoin(appOrganizations, eq(appOrgMembers.orgId, appOrganizations.id))
		.where(eq(appOrgMembers.userId, locals.user.id));

	// Check if user has a budget and is approaching limit
	const userRole = membership.role;

	// Find user's budget using cascade: individual > role default > org default
	const userBudgets = await db
		.select()
		.from(appBudgets)
		.where(
			and(
				eq(appBudgets.orgId, currentOrg.id),
				or(
					eq(appBudgets.userId, locals.user.id), // individual
					and(isNull(appBudgets.userId), eq(appBudgets.role, userRole)), // role default
					and(isNull(appBudgets.userId), isNull(appBudgets.role), eq(appBudgets.isOrgDefault, true)) // org default
				)
			)
		);

	const budget =
		userBudgets.find((b) => b.userId === locals.user.id) ??
		userBudgets.find((b) => b.userId === null && b.role === userRole) ??
		userBudgets.find((b) => b.isOrgDefault);

	let budgetWarning: { currentSpend: number; limit: number } | null = null;

	if (budget && (budget.hardLimitCents || budget.softLimitCents)) {
		const resetDate = getBudgetResetDate(budget.resetDay);
		const spendResult = await db
			.select({
				total: sql<string>`COALESCE(SUM(CAST(${appUsageLogs.cost} AS numeric)), 0)`
			})
			.from(appUsageLogs)
			.where(
				and(
					eq(appUsageLogs.orgId, currentOrg.id),
					eq(appUsageLogs.userId, locals.user.id),
					gte(appUsageLogs.createdAt, resetDate)
				)
			);

		const currentSpendDollars = parseFloat(spendResult[0]?.total ?? '0');
		const limitCents = budget.hardLimitCents ?? budget.softLimitCents;
		const limitDollars = limitCents ? limitCents / 100 : null;

		if (limitDollars && currentSpendDollars >= limitDollars * 0.9) {
			budgetWarning = { currentSpend: currentSpendDollars, limit: limitDollars };
		}
	}

	return {
		currentOrg,
		userOrgs,
		membership: { role: membership.role },
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email
		},
		budgetWarning
	};
};
