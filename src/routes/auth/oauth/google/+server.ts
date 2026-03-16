import { redirect } from '@sveltejs/kit';
import { google, generateState, generateCodeVerifier } from '$lib/server/auth/oauth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!google) {
		redirect(303, '/auth/login?error=oauth_failed');
	}

	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	cookies.set('google_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		maxAge: 600
	});

	cookies.set('google_code_verifier', codeVerifier, {
		path: '/',
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		maxAge: 600
	});

	const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email']);
	redirect(303, url.toString());
};
