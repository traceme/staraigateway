import type { Handle } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE_NAME);

	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const result = await validateSession(token);

	if (result) {
		event.locals.user = result.user;
		event.locals.session = result.session;

		// If session was extended (sliding window), update the cookie
		if (result.fresh) {
			event.cookies.set(SESSION_COOKIE_NAME, token, {
				path: '/',
				httpOnly: true,
				secure: !event.url.hostname.startsWith('localhost'),
				sameSite: 'lax',
				maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
			});
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
		// Clear invalid cookie
		event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	}

	return resolve(event);
};
