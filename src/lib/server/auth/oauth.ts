import { Google, GitHub, generateState, generateCodeVerifier } from 'arctic';
import { env } from '$env/dynamic/private';

const appUrl = env.APP_URL || 'http://localhost:5173';

export const google =
	env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
		? new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${appUrl}/auth/oauth/google/callback`)
		: null;

export const github =
	env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
		? new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, `${appUrl}/auth/oauth/github/callback`)
		: null;

export { generateState, generateCodeVerifier };
