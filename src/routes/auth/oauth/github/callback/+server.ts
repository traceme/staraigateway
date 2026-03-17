import { redirect } from '@sveltejs/kit';
import { github } from '$lib/server/auth/oauth';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { db } from '$lib/server/db';
import { appUsers, appOauthAccounts } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { isSecureContext } from '$lib/server/auth/cookies';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	if (!github) {
		redirect(303, '/auth/login?error=oauth_failed');
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('github_oauth_state');

	if (!code || !state || !storedState || state !== storedState) {
		redirect(303, '/auth/login?error=oauth_failed');
	}

	try {
		const tokens = await github.validateAuthorizationCode(code);
		const accessToken = tokens.accessToken();

		// Fetch user info from GitHub API
		const userResponse = await fetch('https://api.github.com/user', {
			headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'LLMTokenHub' }
		});
		const githubUser = (await userResponse.json()) as {
			id: number;
			login: string;
			name: string | null;
			email: string | null;
		};

		let email = githubUser.email;

		// If email is private, fetch from emails endpoint
		if (!email) {
			const emailsResponse = await fetch('https://api.github.com/user/emails', {
				headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'LLMTokenHub' }
			});
			const emails = (await emailsResponse.json()) as Array<{
				email: string;
				primary: boolean;
				verified: boolean;
			}>;
			const primaryEmail = emails.find((e) => e.primary && e.verified);
			email = primaryEmail?.email ?? null;
		}

		if (!email) {
			redirect(303, '/auth/login?error=oauth_failed');
		}

		const providerUserId = String(githubUser.id);

		// Check for existing OAuth account
		const existingOAuth = await db
			.select()
			.from(appOauthAccounts)
			.where(
				and(eq(appOauthAccounts.provider, 'github'), eq(appOauthAccounts.providerUserId, providerUserId))
			)
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
					provider: 'github',
					providerUserId
				});
			} else {
				// Create new user
				userId = crypto.randomUUID();
				await db.insert(appUsers).values({
					id: userId,
					email,
					name: githubUser.name || githubUser.login,
					passwordHash: null,
					emailVerified: true
				});
				await db.insert(appOauthAccounts).values({
					id: crypto.randomUUID(),
					userId,
					provider: 'github',
					providerUserId
				});
			}
		}

		const { token } = await createSession(userId);

		cookies.delete('github_oauth_state', { path: '/' });

		cookies.set(SESSION_COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			secure: isSecureContext(request, url),
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60
		});

		redirect(303, '/');
	} catch (e) {
		cookies.delete('github_oauth_state', { path: '/' });
		redirect(303, '/auth/login?error=oauth_failed');
	}
};
