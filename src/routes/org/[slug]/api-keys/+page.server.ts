import { fail, error } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { appOrganizations, appOrgMembers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createApiKey, getUserApiKeys, revokeApiKey } from '$lib/server/api-keys';
import type { PageServerLoad, Actions } from './$types';

/** Resolve org + user from locals/params; throws on unauthenticated. */
async function resolveOrgUser(locals: App.Locals, slug: string) {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	const orgs = await db
		.select()
		.from(appOrganizations)
		.where(eq(appOrganizations.slug, slug))
		.limit(1);

	if (orgs.length === 0) error(404, 'Organization not found');
	const org = orgs[0];

	const memberships = await db
		.select()
		.from(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, org.id), eq(appOrgMembers.userId, locals.user.id)))
		.limit(1);

	if (memberships.length === 0) error(404, 'Organization not found');

	return { org, userId: locals.user.id };
}

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg, user } = await parent();
	const apiKeys = await getUserApiKeys(currentOrg.id, user.id);
	return { apiKeys };
};

const createSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(50, 'Name must be 50 characters or less')
		.trim()
});

const revokeSchema = z.object({
	id: z.string().min(1, 'Key ID is required')
});

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { org, userId } = await resolveOrgUser(locals, params.slug);

		const formData = await request.formData();
		const parsed = createSchema.safeParse({
			name: formData.get('name')
		});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.errors[0].message });
		}

		try {
			const { key, fullKey } = await createApiKey(org.id, userId, parsed.data.name);
			return { success: true, key, fullKey };
		} catch {
			return fail(500, { error: 'Failed to create API key' });
		}
	},

	revoke: async ({ request, locals, params }) => {
		const { org, userId } = await resolveOrgUser(locals, params.slug);

		const formData = await request.formData();
		const parsed = revokeSchema.safeParse({ id: formData.get('id') });

		if (!parsed.success) {
			return fail(400, { error: parsed.error.errors[0].message });
		}

		const revoked = await revokeApiKey(parsed.data.id, org.id, userId);
		if (!revoked) {
			return fail(404, { error: 'API key not found' });
		}

		return { success: true };
	}
};
