import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appUsers, appPasswordResets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { forgotPasswordSchema } from '$lib/server/auth/validation';
import { sendPasswordResetEmail } from '$lib/server/auth/email';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = {
			email: formData.get('email') as string
		};

		// Validate input
		const parsed = forgotPasswordSchema.safeParse(data);
		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, { errors, email: data.email });
		}

		const { email } = parsed.data;

		// Look up user (don't reveal if user exists for security)
		const users = await db
			.select()
			.from(appUsers)
			.where(eq(appUsers.email, email))
			.limit(1);

		if (users.length > 0) {
			const user = users[0];

			// Generate reset token
			const resetToken = crypto.randomUUID();
			const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

			await db.insert(appPasswordResets).values({
				id: resetToken,
				userId: user.id,
				expiresAt
			});

			// Send reset email
			try {
				await sendPasswordResetEmail(email, user.name, resetToken);
			} catch {
				// Email may fail in dev without SMTP
			}
		}

		// Always show success to prevent email enumeration
		return { success: true };
	}
} satisfies Actions;
