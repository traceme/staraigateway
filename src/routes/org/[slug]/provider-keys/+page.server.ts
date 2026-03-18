import { fail, error } from '@sveltejs/kit';
import { z } from 'zod';
import { zodErrorToKey } from '$lib/server/i18n-errors';
import { recordAuditEvent } from '$lib/server/audit';
import { db } from '$lib/server/db';
import { appOrganizations, appOrgMembers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
	getProviderKeys,
	createProviderKey,
	updateProviderKey,
	deleteProviderKey
} from '$lib/server/provider-keys';
import { PROVIDERS } from '$lib/server/providers';
import type { PageServerLoad, Actions } from './$types';

/** Resolve org + membership from locals/params; throws on unauthorized. */
async function resolveOrgAdmin(locals: App.Locals, slug: string) {
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
	const role = memberships[0].role;

	if (role !== 'owner' && role !== 'admin') {
		error(403, 'Only owners and admins can manage provider keys');
	}

	return { org, role };
}

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg, membership } = await parent();

	if (membership.role !== 'owner' && membership.role !== 'admin') {
		return { providerKeys: [], providers: PROVIDERS, accessDenied: true };
	}

	const providerKeys = await getProviderKeys(currentOrg.id);

	return {
		providerKeys,
		providers: PROVIDERS,
		accessDenied: false
	};
};

const createSchema = z.object({
	provider: z.string().min(1, 'Provider is required'),
	label: z.string().min(1, 'Label is required').max(50, 'Label must be 50 characters or less'),
	apiKey: z.string().min(1, 'API key is required'),
	baseUrl: z.string().url('Must be a valid URL').optional().or(z.literal(''))
});

const updateSchema = z.object({
	id: z.string().min(1, 'Key ID is required'),
	label: z.string().min(1).max(50).optional(),
	apiKey: z.string().min(1).optional(),
	baseUrl: z.string().url().optional().or(z.literal('')),
	isActive: z
		.enum(['true', 'false'])
		.transform((v) => v === 'true')
		.optional()
});

const deleteSchema = z.object({
	id: z.string().min(1, 'Key ID is required')
});

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { org } = await resolveOrgAdmin(locals, params.slug);

		const formData = await request.formData();
		const parsed = createSchema.safeParse({
			provider: formData.get('provider'),
			label: formData.get('label'),
			apiKey: formData.get('apiKey'),
			baseUrl: formData.get('baseUrl') || undefined
		});

		if (!parsed.success) {
			return fail(400, { errorKey: zodErrorToKey(parsed.error.errors[0].message) });
		}

		try {
			const key = await createProviderKey(org.id, {
				provider: parsed.data.provider,
				label: parsed.data.label,
				apiKey: parsed.data.apiKey,
				baseUrl: parsed.data.baseUrl || undefined
			});
			recordAuditEvent(org.id, locals.user!.id, 'provider_key_added', 'provider_key', key.id, { provider: parsed.data.provider, label: parsed.data.label });
			return { success: true, key };
		} catch (err) {
			if (err instanceof Error && err.message.includes('unique')) {
				return fail(400, {
					errorKey: 'errors.provider_key_failed'
				});
			}
			return fail(500, { errorKey: 'errors.provider_key_failed' });
		}
	},

	update: async ({ request, locals, params }) => {
		const { org } = await resolveOrgAdmin(locals, params.slug);

		const formData = await request.formData();
		const parsed = updateSchema.safeParse({
			id: formData.get('id'),
			label: formData.get('label') || undefined,
			apiKey: formData.get('apiKey') || undefined,
			baseUrl: formData.get('baseUrl') || undefined,
			isActive: formData.get('isActive') || undefined
		});

		if (!parsed.success) {
			return fail(400, { errorKey: zodErrorToKey(parsed.error.errors[0].message) });
		}

		const { id, ...updates } = parsed.data;
		const updated = await updateProviderKey(id, org.id, updates);
		if (!updated) {
			return fail(404, { errorKey: 'errors.key_not_found' });
		}

		return { success: true };
	},

	delete: async ({ request, locals, params }) => {
		const { org } = await resolveOrgAdmin(locals, params.slug);

		const formData = await request.formData();
		const parsed = deleteSchema.safeParse({ id: formData.get('id') });

		if (!parsed.success) {
			return fail(400, { errorKey: zodErrorToKey(parsed.error.errors[0].message) });
		}

		const deleted = await deleteProviderKey(parsed.data.id, org.id);
		if (!deleted) {
			return fail(404, { errorKey: 'errors.key_not_found' });
		}

		recordAuditEvent(org.id, locals.user!.id, 'provider_key_removed', 'provider_key', parsed.data.id, null);
		return { success: true };
	}
};
