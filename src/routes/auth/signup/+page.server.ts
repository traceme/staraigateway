import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appUsers, appEmailVerifications } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { signupSchema } from '$lib/server/auth/validation';
import { hashPassword } from '$lib/server/auth/password';
import { sendVerificationEmail } from '$lib/server/auth/email';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = {
			name: formData.get('name') as string,
			email: formData.get('email') as string,
			password: formData.get('password') as string
		};

		// Validate input
		const parsed = signupSchema.safeParse(data);
		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, { errors, email: data.email, name: data.name });
		}

		const { name, email, password } = parsed.data;

		// Check if email is already taken
		const existing = await db
			.select({ id: appUsers.id })
			.from(appUsers)
			.where(eq(appUsers.email, email))
			.limit(1);

		if (existing.length > 0) {
			return fail(400, {
				errors: { email: ['An account with this email already exists'] },
				email,
				name
			});
		}

		// Hash password
		const passwordHash = await hashPassword(password);

		// Create user
		const userId = crypto.randomUUID();
		await db.insert(appUsers).values({
			id: userId,
			email,
			passwordHash,
			name,
			emailVerified: false
		});

		// Create verification token
		const verificationToken = crypto.randomUUID();
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
		await db.insert(appEmailVerifications).values({
			id: verificationToken,
			userId,
			expiresAt
		});

		// Send verification email
		try {
			await sendVerificationEmail(email, name, verificationToken);
		} catch {
			// Email sending may fail in dev without SMTP configured
			// User can still be verified manually or via resend
		}

		return { success: true };
	}
} satisfies Actions;
