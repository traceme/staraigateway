import type { Handle, RequestEvent } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { isSecureContext } from '$lib/server/auth/cookies';

function detectLocale(event: RequestEvent): string {
	// 1. Authenticated user preference
	if (event.locals.user?.language) {
		return event.locals.user.language;
	}
	// 2. Cookie preference
	const cookieLang = event.cookies.get('lang');
	if (cookieLang === 'zh' || cookieLang === 'en') {
		return cookieLang;
	}
	// 3. Accept-Language header
	const acceptLang = event.request.headers.get('accept-language') ?? '';
	if (/zh[-_]?/i.test(acceptLang) || acceptLang.startsWith('zh')) {
		return 'zh';
	}
	// 4. Default
	return 'en';
}

export const handle: Handle = async ({ event, resolve }) => {
	const resolveWithLang = (e: typeof event) =>
		resolve(e, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', e.locals.locale ?? 'en')
		});

	// /v1/* routes use API key auth (Bearer token), not session cookies
	if (event.url.pathname.startsWith('/v1/')) {
		event.locals.user = null;
		event.locals.session = null;
		event.locals.locale = detectLocale(event);
		return resolveWithLang(event);
	}

	const token = event.cookies.get(SESSION_COOKIE_NAME);

	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		event.locals.locale = detectLocale(event);
		return resolveWithLang(event);
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
				secure: isSecureContext(event.request, event.url),
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

	event.locals.locale = detectLocale(event);
	return resolveWithLang(event);
};
