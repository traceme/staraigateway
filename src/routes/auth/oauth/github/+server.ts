import { redirect } from '@sveltejs/kit';
import { github, generateState } from '$lib/server/auth/oauth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!github) {
		redirect(303, '/auth/login?error=oauth_failed');
	}

	const state = generateState();

	cookies.set('github_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		maxAge: 600
	});

	const url = github.createAuthorizationURL(state, ['user:email']);
	redirect(303, url.toString());
};
