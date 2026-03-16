import { db } from '$lib/server/db';
import {
	appBudgets,
	appUsageLogs,
	appUsers,
	appOrgMembers,
	appOrganizations
} from '$lib/server/db/schema';
import { sendBudgetWarningEmail, sendAdminDigestEmail } from '$lib/server/auth/email';
import { eq, and, gte, sql, isNull, or } from 'drizzle-orm';

function getBudgetResetDate(resetDay: number): Date {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	if (now.getDate() < resetDay) {
		return new Date(year, month - 1, resetDay);
	}
	return new Date(year, month, resetDay);
}

interface MemberBudgetInfo {
	userId: string;
	name: string;
	email: string;
	role: string;
	currentSpendDollars: number;
	limitDollars: number;
	percentage: number;
}

/**
 * Resolve effective budget for each member in an org using cascade:
 * individual > role default > org default
 */
async function resolveMemberBudgets(orgId: string): Promise<MemberBudgetInfo[]> {
	// Load all members
	const members = await db
		.select({
			userId: appOrgMembers.userId,
			role: appOrgMembers.role,
			name: appUsers.name,
			email: appUsers.email
		})
		.from(appOrgMembers)
		.innerJoin(appUsers, eq(appOrgMembers.userId, appUsers.id))
		.where(eq(appOrgMembers.orgId, orgId));

	// Load all budgets for org
	const budgets = await db.select().from(appBudgets).where(eq(appBudgets.orgId, orgId));

	const orgDefault = budgets.find((b) => b.isOrgDefault) ?? null;
	const roleBudgetMap = new Map(
		budgets.filter((b) => b.role !== null && b.userId === null).map((b) => [b.role, b])
	);

	const results: MemberBudgetInfo[] = [];

	for (const member of members) {
		// Cascade: individual > role default > org default
		const individual = budgets.find((b) => b.userId === member.userId);
		const roleDefault = roleBudgetMap.get(member.role) ?? null;
		const budget = individual ?? roleDefault ?? orgDefault;

		if (!budget) continue;

		const limitCents = budget.hardLimitCents ?? budget.softLimitCents;
		if (!limitCents) continue;

		const resetDate = getBudgetResetDate(budget.resetDay);

		const spendResult = await db
			.select({
				total: sql<string>`COALESCE(SUM(CAST(${appUsageLogs.cost} AS numeric)), 0)`
			})
			.from(appUsageLogs)
			.where(
				and(
					eq(appUsageLogs.orgId, orgId),
					eq(appUsageLogs.userId, member.userId),
					gte(appUsageLogs.createdAt, resetDate)
				)
			);

		const currentSpendDollars = parseFloat(spendResult[0]?.total ?? '0');
		const limitDollars = limitCents / 100;
		const percentage = limitDollars > 0 ? Math.round((currentSpendDollars / limitDollars) * 100) : 0;

		if (percentage >= 90) {
			results.push({
				userId: member.userId,
				name: member.name,
				email: member.email,
				role: member.role,
				currentSpendDollars,
				limitDollars,
				percentage
			});
		}
	}

	return results;
}

/**
 * Check all members in an org and send budget warning emails to those at 90%+.
 * Designed to be called from the gateway when a soft limit is hit (fire-and-forget)
 * or from a scheduled job.
 */
export async function checkAndNotifyBudgets(orgId: string): Promise<void> {
	const org = await db
		.select()
		.from(appOrganizations)
		.where(eq(appOrganizations.id, orgId))
		.limit(1);

	if (org.length === 0) return;
	const orgName = org[0].name;

	const membersAtThreshold = await resolveMemberBudgets(orgId);

	// Send individual warning emails
	for (const member of membersAtThreshold) {
		try {
			await sendBudgetWarningEmail(
				member.email,
				member.name,
				`$${member.currentSpendDollars.toFixed(2)}`,
				`$${member.limitDollars.toFixed(2)}`,
				orgName
			);
		} catch {
			// Graceful failure -- don't block on email errors
			console.error(`Failed to send budget warning to ${member.email}`);
		}
	}
}

/**
 * Send daily digest to all admins/owners of an org.
 * Lists members at 90%+ of their budget.
 * Designed to be called from a cron job / scheduled endpoint.
 */
export async function sendAdminDigest(orgId: string): Promise<void> {
	const org = await db
		.select()
		.from(appOrganizations)
		.where(eq(appOrganizations.id, orgId))
		.limit(1);

	if (org.length === 0) return;
	const orgName = org[0].name;

	const membersAtThreshold = await resolveMemberBudgets(orgId);
	if (membersAtThreshold.length === 0) return;

	// Get all admin/owner members
	const admins = await db
		.select({
			email: appUsers.email,
			name: appUsers.name
		})
		.from(appOrgMembers)
		.innerJoin(appUsers, eq(appOrgMembers.userId, appUsers.id))
		.where(
			and(
				eq(appOrgMembers.orgId, orgId),
				or(eq(appOrgMembers.role, 'admin'), eq(appOrgMembers.role, 'owner'))
			)
		);

	const date = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const digestMembers = membersAtThreshold.map((m) => ({
		name: m.name,
		spend: `$${m.currentSpendDollars.toFixed(2)}`,
		limit: `$${m.limitDollars.toFixed(2)}`,
		percentage: m.percentage
	}));

	for (const admin of admins) {
		try {
			await sendAdminDigestEmail(admin.email, orgName, date, digestMembers);
		} catch {
			console.error(`Failed to send admin digest to ${admin.email}`);
		}
	}
}
