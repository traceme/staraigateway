import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appOrgInvitations, appUsers, appOrganizations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { acceptInvitation } from '$lib/server/members';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { token } = params;

	// If not logged in, redirect to login with return URL
	if (!locals.user) {
		redirect(303, `/auth/login?redirect=/auth/invite/${token}`);
	}

	const invitations = await db
		.select({
			id: appOrgInvitations.id,
			orgId: appOrgInvitations.orgId,
			email: appOrgInvitations.email,
			role: appOrgInvitations.role,
			invitedBy: appOrgInvitations.invitedBy,
			expiresAt: appOrgInvitations.expiresAt,
			acceptedAt: appOrgInvitations.acceptedAt
		})
		.from(appOrgInvitations)
		.where(eq(appOrgInvitations.token, token))
		.limit(1);

	if (invitations.length === 0) {
		return { valid: false as const };
	}

	const invitation = invitations[0];

	if (invitation.acceptedAt || new Date() > invitation.expiresAt) {
		return { valid: false as const };
	}

	// Get org name and inviter name
	const org = await db
		.select({ name: appOrganizations.name })
		.from(appOrganizations)
		.where(eq(appOrganizations.id, invitation.orgId))
		.limit(1);

	const inviter = await db
		.select({ name: appUsers.name })
		.from(appUsers)
		.where(eq(appUsers.id, invitation.invitedBy))
		.limit(1);

	return {
		valid: true as const,
		orgName: org[0]?.name ?? 'Unknown Organization',
		role: invitation.role,
		inviterName: inviter[0]?.name ?? 'A team member'
	};
};

export const actions = {
	accept: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to accept an invitation' });
		}

		try {
			const { orgId } = await acceptInvitation(params.token, locals.user.id);

			// Get org slug for redirect
			const org = await db
				.select({ slug: appOrganizations.slug })
				.from(appOrganizations)
				.where(eq(appOrganizations.id, orgId))
				.limit(1);

			const slug = org[0]?.slug ?? '';
			redirect(303, `/org/${slug}/dashboard`);
		} catch (e) {
			if (e instanceof Error && 'status' in e) throw e; // re-throw redirect
			return fail(400, { error: e instanceof Error ? e.message : 'Failed to accept invitation' });
		}
	},

	decline: async ({ params }) => {
		// Delete the invitation
		await db
			.delete(appOrgInvitations)
			.where(eq(appOrgInvitations.token, params.token));

		redirect(303, '/');
	}
} satisfies Actions;
