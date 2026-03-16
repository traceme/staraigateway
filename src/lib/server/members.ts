import { db } from '$lib/server/db';
import {
	appOrgMembers,
	appOrgInvitations,
	appApiKeys,
	appUsers,
	appOrganizations
} from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sendInvitationEmail } from '$lib/server/auth/email';

export async function inviteMember(
	orgId: string,
	email: string,
	role: 'admin' | 'member',
	invitedByUserId: string
): Promise<{ id: string }> {
	// Check if already a member
	const existingUser = await db
		.select({ id: appUsers.id })
		.from(appUsers)
		.where(eq(appUsers.email, email))
		.limit(1);

	if (existingUser.length > 0) {
		const existingMember = await db
			.select({ id: appOrgMembers.id })
			.from(appOrgMembers)
			.where(and(eq(appOrgMembers.orgId, orgId), eq(appOrgMembers.userId, existingUser[0].id)))
			.limit(1);

		if (existingMember.length > 0) {
			throw new Error('This user is already a member of this organization');
		}
	}

	// Check for existing pending invite
	const existingInvite = await db
		.select({ id: appOrgInvitations.id })
		.from(appOrgInvitations)
		.where(
			and(
				eq(appOrgInvitations.orgId, orgId),
				eq(appOrgInvitations.email, email),
				isNull(appOrgInvitations.acceptedAt)
			)
		)
		.limit(1);

	if (existingInvite.length > 0) {
		throw new Error('This email has already been invited');
	}

	const token = crypto.randomUUID();
	const id = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	await db.insert(appOrgInvitations).values({
		id,
		orgId,
		email,
		role,
		token,
		invitedBy: invitedByUserId,
		expiresAt
	});

	// Get org name and inviter name for email
	const org = await db
		.select({ name: appOrganizations.name })
		.from(appOrganizations)
		.where(eq(appOrganizations.id, orgId))
		.limit(1);

	const inviter = await db
		.select({ name: appUsers.name })
		.from(appUsers)
		.where(eq(appUsers.id, invitedByUserId))
		.limit(1);

	const orgName = org[0]?.name ?? 'Unknown Organization';
	const inviterName = inviter[0]?.name ?? 'A team member';

	try {
		await sendInvitationEmail(email, token, orgName, inviterName, role);
	} catch {
		// Graceful SMTP failure -- invitation still exists, admin can share link manually
		console.warn(`Failed to send invitation email to ${email}`);
	}

	return { id };
}

export async function acceptInvitation(
	token: string,
	userId: string
): Promise<{ orgId: string }> {
	const invitations = await db
		.select()
		.from(appOrgInvitations)
		.where(eq(appOrgInvitations.token, token))
		.limit(1);

	if (invitations.length === 0) {
		throw new Error('Invitation not found');
	}

	const invitation = invitations[0];

	if (invitation.acceptedAt) {
		throw new Error('This invitation has already been accepted');
	}

	if (new Date() > invitation.expiresAt) {
		throw new Error('This invitation has expired');
	}

	// Check if already a member
	const existingMember = await db
		.select({ id: appOrgMembers.id })
		.from(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, invitation.orgId), eq(appOrgMembers.userId, userId)))
		.limit(1);

	if (existingMember.length > 0) {
		// Already a member, just mark invitation as accepted
		await db
			.update(appOrgInvitations)
			.set({ acceptedAt: new Date() })
			.where(eq(appOrgInvitations.id, invitation.id));
		return { orgId: invitation.orgId };
	}

	// Insert org membership
	await db.insert(appOrgMembers).values({
		id: crypto.randomUUID(),
		orgId: invitation.orgId,
		userId,
		role: invitation.role
	});

	// Mark invitation as accepted
	await db
		.update(appOrgInvitations)
		.set({ acceptedAt: new Date() })
		.where(eq(appOrgInvitations.id, invitation.id));

	return { orgId: invitation.orgId };
}

export async function removeMember(
	orgId: string,
	targetUserId: string,
	actorRole: string
): Promise<void> {
	if (actorRole !== 'admin' && actorRole !== 'owner') {
		throw new Error('Only admins and owners can remove members');
	}

	// Check target is not owner
	const target = await db
		.select({ role: appOrgMembers.role })
		.from(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, orgId), eq(appOrgMembers.userId, targetUserId)))
		.limit(1);

	if (target.length === 0) {
		throw new Error('Member not found');
	}

	if (target[0].role === 'owner') {
		throw new Error('Cannot remove the organization owner');
	}

	// Deactivate all API keys for this user in this org
	await db
		.update(appApiKeys)
		.set({ isActive: false })
		.where(and(eq(appApiKeys.orgId, orgId), eq(appApiKeys.userId, targetUserId)));

	// Remove membership
	await db
		.delete(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, orgId), eq(appOrgMembers.userId, targetUserId)));
}

export async function changeRole(
	orgId: string,
	targetUserId: string,
	newRole: 'admin' | 'member',
	actorRole: string
): Promise<void> {
	if (actorRole !== 'owner') {
		throw new Error('Only the owner can change roles');
	}

	// Check target is not owner
	const target = await db
		.select({ role: appOrgMembers.role })
		.from(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, orgId), eq(appOrgMembers.userId, targetUserId)))
		.limit(1);

	if (target.length === 0) {
		throw new Error('Member not found');
	}

	if (target[0].role === 'owner') {
		throw new Error("Cannot change the owner's role");
	}

	await db
		.update(appOrgMembers)
		.set({ role: newRole })
		.where(and(eq(appOrgMembers.orgId, orgId), eq(appOrgMembers.userId, targetUserId)));
}

export async function revokeInvitation(orgId: string, invitationId: string): Promise<void> {
	await db
		.delete(appOrgInvitations)
		.where(and(eq(appOrgInvitations.orgId, orgId), eq(appOrgInvitations.id, invitationId)));
}
