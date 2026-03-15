import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appOrganizations, appOrgMembers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
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

	return {
		currentOrg,
		userOrgs,
		membership: { role: membership.role },
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email
		}
	};
};
