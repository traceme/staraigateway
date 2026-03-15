import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appPasswordResets, appUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { resetPasswordSchema } from '$lib/server/auth/validation';
import { hashPassword } from '$lib/server/auth/password';
import { invalidateAllUserSessions } from '$lib/server/auth/session';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return { tokenValid: false, error: 'Missing reset token.' };
	}

	// Verify token exists and is not expired
	const resets = await db
		.select()
		.from(appPasswordResets)
		.where(eq(appPasswordResets.id, token))
		.limit(1);

	if (resets.length === 0) {
		return { tokenValid: false, error: 'Invalid or expired reset link.' };
	}

	if (Date.now() >= resets[0].expiresAt.getTime()) {
		await db.delete(appPasswordResets).where(eq(appPasswordResets.id, token));
		return { tokenValid: false, error: 'This reset link has expired. Please request a new one.' };
	}

	return { tokenValid: true, token };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = {
			token: formData.get('token') as string,
			password: formData.get('password') as string
		};

		// Validate input
		const parsed = resetPasswordSchema.safeParse(data);
		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, { errors });
		}

		const { token, password } = parsed.data;

		// Look up reset token
		const resets = await db
			.select()
			.from(appPasswordResets)
			.where(eq(appPasswordResets.id, token))
			.limit(1);

		if (resets.length === 0) {
			return fail(400, { errors: { token: ['Invalid or expired reset link.'] } });
		}

		const resetRecord = resets[0];

		if (Date.now() >= resetRecord.expiresAt.getTime()) {
			await db.delete(appPasswordResets).where(eq(appPasswordResets.id, token));
			return fail(400, { errors: { token: ['This reset link has expired.'] } });
		}

		// Hash new password
		const passwordHash = await hashPassword(password);

		// Update user password
		await db
			.update(appUsers)
			.set({ passwordHash, updatedAt: new Date() })
			.where(eq(appUsers.id, resetRecord.userId));

		// Delete reset token
		await db.delete(appPasswordResets).where(eq(appPasswordResets.id, token));

		// Invalidate all user sessions
		await invalidateAllUserSessions(resetRecord.userId);

		// Redirect to login
		redirect(303, '/auth/login?reset=success');
	}
} satisfies Actions;
