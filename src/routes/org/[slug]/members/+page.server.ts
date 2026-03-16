import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	appOrgMembers,
	appUsers,
	appOrgInvitations,
	appUsageLogs
} from '$lib/server/db/schema';
import { eq, and, isNull, sql, gte } from 'drizzle-orm';
import { inviteMember, removeMember, changeRole, revokeInvitation } from '$lib/server/members';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

const emailSchema = z.string().email('Please enter a valid email address');

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg, membership } = await parent();
	const isAdmin = membership.role === 'admin' || membership.role === 'owner';

	// Get start of current month for usage calculation
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	// Get all org members with user info
	const members = await db
		.select({
			userId: appOrgMembers.userId,
			role: appOrgMembers.role,
			joinedAt: appOrgMembers.createdAt,
			name: appUsers.name,
			email: appUsers.email
		})
		.from(appOrgMembers)
		.innerJoin(appUsers, eq(appOrgMembers.userId, appUsers.id))
		.where(eq(appOrgMembers.orgId, currentOrg.id));

	// Get usage per member this month
	const usageByMember = await db
		.select({
			userId: appUsageLogs.userId,
			totalCost: sql<string>`COALESCE(SUM(${appUsageLogs.cost}), '0')`
		})
		.from(appUsageLogs)
		.where(
			and(
				eq(appUsageLogs.orgId, currentOrg.id),
				gte(appUsageLogs.createdAt, monthStart)
			)
		)
		.groupBy(appUsageLogs.userId);

	const usageMap = new Map(usageByMember.map((u) => [u.userId, parseFloat(u.totalCost)]));

	const membersWithUsage = members.map((m) => ({
		...m,
		usageThisMonth: usageMap.get(m.userId) ?? 0
	}));

	// Get pending invitations (admin/owner only)
	let pendingInvitations: Array<{
		id: string;
		email: string;
		role: string;
		createdAt: Date;
		inviterName: string;
	}> = [];

	if (isAdmin) {
		const invites = await db
			.select({
				id: appOrgInvitations.id,
				email: appOrgInvitations.email,
				role: appOrgInvitations.role,
				createdAt: appOrgInvitations.createdAt,
				invitedBy: appOrgInvitations.invitedBy
			})
			.from(appOrgInvitations)
			.where(
				and(
					eq(appOrgInvitations.orgId, currentOrg.id),
					isNull(appOrgInvitations.acceptedAt),
					gte(appOrgInvitations.expiresAt, new Date())
				)
			);

		// Get inviter names
		const inviterIds = [...new Set(invites.map((i) => i.invitedBy))];
		const inviters =
			inviterIds.length > 0
				? await db
						.select({ id: appUsers.id, name: appUsers.name })
						.from(appUsers)
						.where(sql`${appUsers.id} IN ${inviterIds}`)
				: [];
		const inviterMap = new Map(inviters.map((i) => [i.id, i.name]));

		pendingInvitations = invites.map((i) => ({
			id: i.id,
			email: i.email,
			role: i.role,
			createdAt: i.createdAt,
			inviterName: inviterMap.get(i.invitedBy) ?? 'Unknown'
		}));
	}

	return {
		members: membersWithUsage,
		pendingInvitations,
		isAdmin,
		isOwner: membership.role === 'owner'
	};
};

export const actions = {
	invite: async ({ request, locals, parent }) => {
		const { currentOrg, membership } = await parent();
		if (membership.role !== 'admin' && membership.role !== 'owner') {
			return fail(403, { error: 'Only admins can invite members' });
		}

		const formData = await request.formData();
		const email = formData.get('email') as string;
		const role = (formData.get('role') as string) || 'member';

		const parsed = emailSchema.safeParse(email);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.errors[0].message });
		}

		if (role !== 'admin' && role !== 'member') {
			return fail(400, { error: 'Invalid role' });
		}

		try {
			await inviteMember(currentOrg.id, email, role, locals.user!.id);
			return { success: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Failed to send invitation' });
		}
	},

	changeRole: async ({ request, parent }) => {
		const { currentOrg, membership } = await parent();
		if (membership.role !== 'owner') {
			return fail(403, { error: 'Only the owner can change roles' });
		}

		const formData = await request.formData();
		const targetUserId = formData.get('userId') as string;
		const newRole = formData.get('role') as string;

		if (newRole !== 'admin' && newRole !== 'member') {
			return fail(400, { error: 'Invalid role' });
		}

		try {
			await changeRole(currentOrg.id, targetUserId, newRole, membership.role);
			return { success: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Failed to change role' });
		}
	},

	removeMember: async ({ request, parent }) => {
		const { currentOrg, membership } = await parent();
		if (membership.role !== 'admin' && membership.role !== 'owner') {
			return fail(403, { error: 'Only admins can remove members' });
		}

		const formData = await request.formData();
		const targetUserId = formData.get('userId') as string;

		try {
			await removeMember(currentOrg.id, targetUserId, membership.role);
			return { success: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Failed to remove member' });
		}
	},

	revokeInvitation: async ({ request, parent }) => {
		const { currentOrg, membership } = await parent();
		if (membership.role !== 'admin' && membership.role !== 'owner') {
			return fail(403, { error: 'Only admins can revoke invitations' });
		}

		const formData = await request.formData();
		const invitationId = formData.get('invitationId') as string;

		try {
			await revokeInvitation(currentOrg.id, invitationId);
			return { success: true };
		} catch (e) {
			return fail(400, {
				error: e instanceof Error ? e.message : 'Failed to revoke invitation'
			});
		}
	}
} satisfies Actions;
