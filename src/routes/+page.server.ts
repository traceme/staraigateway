import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appOrgMembers, appOrganizations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/auth/login');
	}

	// Check if user has any organizations
	const memberships = await db
		.select({
			orgSlug: appOrganizations.slug
		})
		.from(appOrgMembers)
		.innerJoin(appOrganizations, eq(appOrgMembers.orgId, appOrganizations.id))
		.where(eq(appOrgMembers.userId, locals.user.id))
		.limit(1);

	if (memberships.length > 0) {
		redirect(302, `/org/${memberships[0].orgSlug}/dashboard`);
	}

	redirect(302, '/org/create');
};
