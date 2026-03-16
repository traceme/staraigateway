import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { loginSchema } from '$lib/server/auth/validation';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const data = {
			email: formData.get('email') as string,
			password: formData.get('password') as string
		};

		// Validate input
		const parsed = loginSchema.safeParse(data);
		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, { errors, email: data.email });
		}

		const { email, password } = parsed.data;

		// Look up user
		const users = await db
			.select()
			.from(appUsers)
			.where(eq(appUsers.email, email))
			.limit(1);

		if (users.length === 0) {
			return fail(400, {
				errors: { email: ['Invalid email or password'] },
				email
			});
		}

		const user = users[0];

		// Verify password (OAuth-only users have null passwordHash)
		if (!user.passwordHash) {
			return fail(400, {
				errors: { email: ['This account uses social login. Please sign in with Google or GitHub.'] },
				email
			});
		}
		const valid = await verifyPassword(user.passwordHash, password);
		if (!valid) {
			return fail(400, {
				errors: { email: ['Invalid email or password'] },
				email
			});
		}

		// Check email verified
		if (!user.emailVerified) {
			return fail(400, {
				errors: { email: ['Please verify your email first. Check your inbox for the verification link.'] },
				email
			});
		}

		// Create session
		const { token } = await createSession(user.id);

		// Set cookie
		cookies.set(SESSION_COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			secure: false, // Will be true in production behind HTTPS
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60 // 30 days
		});

		redirect(303, '/');
	}
} satisfies Actions;
