import { redirect } from '@sveltejs/kit';
import { decodeIdToken } from 'arctic';
import { google } from '$lib/server/auth/oauth';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { db } from '$lib/server/db';
import { appUsers, appOauthAccounts } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!google) {
		redirect(303, '/auth/login?error=oauth_failed');
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('google_oauth_state');
	const codeVerifier = cookies.get('google_code_verifier');

	if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
		redirect(303, '/auth/login?error=oauth_failed');
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);
		const idToken = tokens.idToken();
		const claims = decodeIdToken(idToken) as { sub: string; email: string; name: string };

		const { sub, email, name } = claims;

		// Check for existing OAuth account
		const existingOAuth = await db
			.select()
			.from(appOauthAccounts)
			.where(and(eq(appOauthAccounts.provider, 'google'), eq(appOauthAccounts.providerUserId, sub)))
			.limit(1);

		let userId: string;

		if (existingOAuth.length > 0) {
			userId = existingOAuth[0].userId;
		} else {
			// Check for existing user by email
			const existingUsers = await db
				.select()
				.from(appUsers)
				.where(eq(appUsers.email, email))
				.limit(1);

			if (existingUsers.length > 0) {
				userId = existingUsers[0].id;
				// Link OAuth account
				await db.insert(appOauthAccounts).values({
					id: crypto.randomUUID(),
					userId,
					provider: 'google',
					providerUserId: sub
				});
			} else {
				// Create new user
				userId = crypto.randomUUID();
				await db.insert(appUsers).values({
					id: userId,
					email,
					name: name || email.split('@')[0],
					passwordHash: null,
					emailVerified: true
				});
				await db.insert(appOauthAccounts).values({
					id: crypto.randomUUID(),
					userId,
					provider: 'google',
					providerUserId: sub
				});
			}
		}

		const { token } = await createSession(userId);

		// Clean up OAuth cookies
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		cookies.set(SESSION_COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			secure: false,
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60
		});

		redirect(303, '/');
	} catch (e) {
		// Clean up cookies on error
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });
		redirect(303, '/auth/login?error=oauth_failed');
	}
};
