import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { appOrganizations, appOrgMembers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateProviderKey } from '$lib/server/provider-keys';
import type { RequestHandler } from './$types';

const validateSchema = z.object({
	provider: z.string().min(1),
	apiKey: z.string().min(1),
	baseUrl: z.string().url().optional().or(z.literal(''))
});

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	// Look up org and verify admin role
	const orgs = await db
		.select()
		.from(appOrganizations)
		.where(eq(appOrganizations.slug, params.slug))
		.limit(1);

	if (orgs.length === 0) error(404, 'Organization not found');

	const memberships = await db
		.select()
		.from(appOrgMembers)
		.where(
			and(eq(appOrgMembers.orgId, orgs[0].id), eq(appOrgMembers.userId, locals.user.id))
		)
		.limit(1);

	if (memberships.length === 0) error(404, 'Organization not found');
	if (memberships[0].role !== 'owner' && memberships[0].role !== 'admin') {
		error(403, 'Only owners and admins can validate provider keys');
	}

	const body = await request.json();
	const parsed = validateSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ valid: false, models: [], error: parsed.error.errors[0].message },
			{ status: 400 }
		);
	}

	const result = await validateProviderKey(
		parsed.data.provider,
		parsed.data.apiKey,
		parsed.data.baseUrl || undefined
	);

	return json(result);
};
