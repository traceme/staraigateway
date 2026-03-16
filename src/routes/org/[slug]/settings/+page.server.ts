import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appOrganizations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg, membership } = await parent();

	if (membership.role !== 'owner' && membership.role !== 'admin') {
		redirect(302, `/org/${currentOrg.slug}`);
	}

	return {
		defaultRpmLimit: currentOrg.defaultRpmLimit ?? null,
		defaultTpmLimit: currentOrg.defaultTpmLimit ?? null
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
	}
};
