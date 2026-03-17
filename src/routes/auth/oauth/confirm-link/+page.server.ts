import { fail, redirect } from '@sveltejs/kit';
import { decrypt } from '$lib/server/crypto';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { isSecureContext } from '$lib/server/auth/cookies';
import { db } from '$lib/server/db';
import { appUsers, appOauthAccounts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

interface PendingLinkData {
	provider: string;
	providerUserId: string;
	userId: string;
}

function getPendingLink(cookies: import('@sveltejs/kit').Cookies): PendingLinkData | null {
	const encrypted = cookies.get('oauth_pending_link');
	if (!encrypted) return null;
	try {
		const data = JSON.parse(decrypt(encrypted)) as PendingLinkData;
		if (!data.provider || !data.providerUserId || !data.userId) return null;
		return data;
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ cookies }) => {
	const pending = getPendingLink(cookies);
	if (!pending) {
		redirect(303, '/auth/login?error=oauth_link_expired');
	}
	return { provider: pending.provider };
};

export const actions = {
	default: async ({ request, cookies }) => {
		const pending = getPendingLink(cookies);
		if (!pending) {
			// Always clear the cookie in error paths
			cookies.delete('oauth_pending_link', { path: '/' });
			redirect(303, '/auth/login?error=oauth_link_expired');
		}

		const formData = await request.formData();
		const password = formData.get('password') as string;

		if (!password) {
			return fail(400, { error: 'Password is required' });
		}

		// Look up the user to get their password hash
		const users = await db
			.select({ id: appUsers.id, passwordHash: appUsers.passwordHash })
			.from(appUsers)
			.where(eq(appUsers.id, pending.userId))
			.limit(1);

		if (users.length === 0 || !users[0].passwordHash) {
			cookies.delete('oauth_pending_link', { path: '/' });
			redirect(303, '/auth/login?error=oauth_link_expired');
		}

		const valid = await verifyPassword(users[0].passwordHash, password);
		if (!valid) {
			return fail(400, { error: 'Incorrect password. Please try again.' });
		}

		// Password verified -- link the OAuth account
		await db.insert(appOauthAccounts).values({
			id: crypto.randomUUID(),
			userId: pending.userId,
			provider: pending.provider,
			providerUserId: pending.providerUserId
		});

		// Create session and clean up
		const { token } = await createSession(pending.userId);
		cookies.delete('oauth_pending_link', { path: '/' });

		const url = new URL(request.url);
		cookies.set(SESSION_COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			secure: isSecureContext(request, url),
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60
		});

		redirect(303, '/');
	}
} satisfies Actions;
