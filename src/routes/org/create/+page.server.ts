import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appOrganizations, appOrgMembers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createLiteLLMOrganization } from '$lib/server/litellm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/auth/login');
	}
	return {};
};

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/^-+|-+$/g, '')
		.substring(0, 50);
}

function randomSuffix(): string {
	return Math.random().toString(36).substring(2, 6);
}

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/auth/login');
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim() ?? '';
		const description = formData.get('description')?.toString()?.trim() ?? '';

		// Validation
		if (name.length < 2 || name.length > 50) {
			return fail(400, {
				name,
				description,
				error: 'Organization name must be between 2 and 50 characters.'
			});
		}

		if (description.length > 200) {
			return fail(400, {
				name,
				description,
				error: 'Description must be 200 characters or fewer.'
			});
		}

		// Generate slug
		let slug = generateSlug(name);
		if (!slug) {
			slug = randomSuffix();
		}

		// Check if slug is taken
		const existing = await db
			.select({ id: appOrganizations.id })
			.from(appOrganizations)
			.where(eq(appOrganizations.slug, slug))
			.limit(1);

		if (existing.length > 0) {
			slug = `${slug}-${randomSuffix()}`;
		}

		// Generate IDs
		const orgId = crypto.randomUUID();
		const memberId = crypto.randomUUID();

		// Create LiteLLM organization (non-blocking)
		const litellmResult = await createLiteLLMOrganization(name, slug);

		// Insert organization
		await db.insert(appOrganizations).values({
			id: orgId,
			name,
			slug,
			description: description || null,
			litellmOrgId: litellmResult?.organization_id ?? null
		});

		// Insert org member (owner)
		await db.insert(appOrgMembers).values({
			id: memberId,
			orgId,
			userId: locals.user.id,
			role: 'owner'
		});

		redirect(302, `/org/${slug}/dashboard`);
	}
} satisfies Actions;
