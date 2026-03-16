import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appOrganizations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg, membership } = await parent();

	if (membership.role !== 'owner' && membership.role !== 'admin') {
		redirect(302, `/org/${currentOrg.slug}`);
	}

	return {
		defaultRpmLimit: currentOrg.defaultRpmLimit ?? null,
		defaultTpmLimit: currentOrg.defaultTpmLimit ?? null,
		smartRoutingCheapModel: currentOrg.smartRoutingCheapModel ?? null,
		smartRoutingExpensiveModel: currentOrg.smartRoutingExpensiveModel ?? null,
		cacheTtlSeconds: currentOrg.cacheTtlSeconds ?? 3600,
		redisAvailable: Boolean(env.REDIS_URL)
	};
};

export const actions: Actions = {
	saveDefaults: async ({ request, parent }) => {
		const { currentOrg, membership } = await parent();

		if (membership.role !== 'owner' && membership.role !== 'admin') {
			return fail(403, { error: 'Only owners and admins can update settings' });
		}

		const formData = await request.formData();
		const rpmStr = formData.get('defaultRpmLimit') as string | null;
		const tpmStr = formData.get('defaultTpmLimit') as string | null;

		const defaultRpmLimit = rpmStr && rpmStr.trim() !== '' ? parseInt(rpmStr, 10) : null;
		const defaultTpmLimit = tpmStr && tpmStr.trim() !== '' ? parseInt(tpmStr, 10) : null;

		if (defaultRpmLimit !== null && (isNaN(defaultRpmLimit) || defaultRpmLimit < 1)) {
			return fail(400, { error: 'RPM limit must be a positive number' });
		}
		if (defaultTpmLimit !== null && (isNaN(defaultTpmLimit) || defaultTpmLimit < 1)) {
			return fail(400, { error: 'TPM limit must be a positive number' });
		}

		await db
			.update(appOrganizations)
			.set({
				defaultRpmLimit,
				defaultTpmLimit,
				updatedAt: new Date()
			})
			.where(eq(appOrganizations.id, currentOrg.id));

		return { success: true };
	},

	saveRouting: async ({ request, parent }) => {
		const { currentOrg, membership } = await parent();

		if (membership.role !== 'owner' && membership.role !== 'admin') {
			return fail(403, { error: 'Only owners and admins can update settings' });
		}

		const formData = await request.formData();
		const cheapModel = (formData.get('cheapModel') as string | null)?.trim() || null;
		const expensiveModel = (formData.get('expensiveModel') as string | null)?.trim() || null;

		await db
			.update(appOrganizations)
			.set({
				smartRoutingCheapModel: cheapModel,
				smartRoutingExpensiveModel: expensiveModel,
				updatedAt: new Date()
			})
			.where(eq(appOrganizations.id, currentOrg.id));

		return { success: true };
	},

	saveCacheTtl: async ({ request, parent }) => {
		const { currentOrg, membership } = await parent();

		if (membership.role !== 'owner' && membership.role !== 'admin') {
			return fail(403, { error: 'Only owners and admins can update settings' });
		}

		const formData = await request.formData();
		const ttlStr = formData.get('cacheTtlSeconds') as string | null;
		const cacheTtlSeconds = ttlStr ? parseInt(ttlStr, 10) : null;

		if (cacheTtlSeconds === null || isNaN(cacheTtlSeconds) || cacheTtlSeconds < 60 || cacheTtlSeconds > 86400) {
			return fail(400, { error: 'TTL must be between 60 and 86,400 seconds.' });
		}

		await db
			.update(appOrganizations)
			.set({
				cacheTtlSeconds,
				updatedAt: new Date()
			})
			.where(eq(appOrganizations.id, currentOrg.id));

		return { success: true };
	}
};
