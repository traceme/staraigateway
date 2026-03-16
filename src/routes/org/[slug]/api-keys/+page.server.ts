import { fail, error } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { appOrganizations, appOrgMembers, appApiKeys, appUsers } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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

	return { org, userId: locals.user.id, role: memberships[0].role };
}

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg, user, membership } = await parent();
	const myKeys = await getUserApiKeys(currentOrg.id, user.id);
	const isAdmin = membership.role === 'owner' || membership.role === 'admin';

	let allKeys: Array<{
		id: string;
		name: string;
		keyPrefix: string;
		isActive: boolean;
		rpmLimit: number | null;
		tpmLimit: number | null;
		lastUsedAt: Date | null;
		createdAt: Date;
		ownerName: string;
		userId: string;
	}> = [];

	if (isAdmin) {
		const rows = await db
			.select({
				id: appApiKeys.id,
				name: appApiKeys.name,
				keyPrefix: appApiKeys.keyPrefix,
				isActive: appApiKeys.isActive,
				rpmLimit: appApiKeys.rpmLimit,
				tpmLimit: appApiKeys.tpmLimit,
				lastUsedAt: appApiKeys.lastUsedAt,
				createdAt: appApiKeys.createdAt,
				userId: appApiKeys.userId,
				ownerName: appUsers.name
			})
			.from(appApiKeys)
			.innerJoin(appUsers, eq(appApiKeys.userId, appUsers.id))
			.where(eq(appApiKeys.orgId, currentOrg.id))
			.orderBy(desc(appApiKeys.createdAt));

		allKeys = rows;
	}

	return {
		myKeys,
		allKeys,
		isAdmin,
		orgDefaults: {
			defaultRpmLimit: currentOrg.defaultRpmLimit ?? null,
			defaultTpmLimit: currentOrg.defaultTpmLimit ?? null
		}
	};
};

const createSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(50, 'Name must be 50 characters or less')
		.trim(),
	rpmLimit: z.coerce.number().int().positive().optional().or(z.literal('')),
	tpmLimit: z.coerce.number().int().positive().optional().or(z.literal(''))
});

const revokeSchema = z.object({
	id: z.string().min(1, 'Key ID is required')
});

const rateLimitSchema = z.object({
	id: z.string().min(1, 'Key ID is required'),
	rpmLimit: z.string().optional(),
	tpmLimit: z.string().optional()
});

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { org, userId } = await resolveOrgUser(locals, params.slug);

		const formData = await request.formData();
		const parsed = createSchema.safeParse({
			name: formData.get('name'),
			rpmLimit: formData.get('rpmLimit') || undefined,
			tpmLimit: formData.get('tpmLimit') || undefined
		});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.errors[0].message });
		}

		try {
			const { key, fullKey } = await createApiKey(org.id, userId, parsed.data.name);

			// Update rate limits if provided
			const rpm = typeof parsed.data.rpmLimit === 'number' ? parsed.data.rpmLimit : null;
			const tpm = typeof parsed.data.tpmLimit === 'number' ? parsed.data.tpmLimit : null;
			if (rpm !== null || tpm !== null) {
				await db
					.update(appApiKeys)
					.set({
						...(rpm !== null ? { rpmLimit: rpm } : {}),
						...(tpm !== null ? { tpmLimit: tpm } : {})
					})
					.where(eq(appApiKeys.id, key.id));
			}

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
	},

	adminRevoke: async ({ request, locals, params }) => {
		const { org, role } = await resolveOrgUser(locals, params.slug);

		if (role !== 'owner' && role !== 'admin') {
			return fail(403, { error: 'Only owners and admins can revoke keys' });
		}

		const formData = await request.formData();
		const parsed = revokeSchema.safeParse({ id: formData.get('id') });

		if (!parsed.success) {
			return fail(400, { error: parsed.error.errors[0].message });
		}

		// Verify key belongs to this org and deactivate
		const keys = await db
			.select({ id: appApiKeys.id })
			.from(appApiKeys)
			.where(and(eq(appApiKeys.id, parsed.data.id), eq(appApiKeys.orgId, org.id)))
			.limit(1);

		if (keys.length === 0) {
			return fail(404, { error: 'API key not found in this organization' });
		}

		await db
			.update(appApiKeys)
			.set({ isActive: false })
			.where(eq(appApiKeys.id, parsed.data.id));

		return { success: true };
	},

	updateRateLimits: async ({ request, locals, params }) => {
		const { org, role } = await resolveOrgUser(locals, params.slug);

		if (role !== 'owner' && role !== 'admin') {
			return fail(403, { error: 'Only owners and admins can update rate limits' });
		}

		const formData = await request.formData();
		const parsed = rateLimitSchema.safeParse({
			id: formData.get('id'),
			rpmLimit: formData.get('rpmLimit') ?? '',
			tpmLimit: formData.get('tpmLimit') ?? ''
		});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.errors[0].message });
		}

		// Verify key belongs to this org
		const keys = await db
			.select({ id: appApiKeys.id })
			.from(appApiKeys)
			.where(and(eq(appApiKeys.id, parsed.data.id), eq(appApiKeys.orgId, org.id)))
			.limit(1);

		if (keys.length === 0) {
			return fail(404, { error: 'API key not found in this organization' });
		}

		const rpmVal = parsed.data.rpmLimit?.trim();
		const tpmVal = parsed.data.tpmLimit?.trim();
		const rpmLimit = rpmVal ? parseInt(rpmVal, 10) : null;
		const tpmLimit = tpmVal ? parseInt(tpmVal, 10) : null;

		await db
			.update(appApiKeys)
			.set({ rpmLimit, tpmLimit })
			.where(eq(appApiKeys.id, parsed.data.id));

		return { success: true };
	}
};
