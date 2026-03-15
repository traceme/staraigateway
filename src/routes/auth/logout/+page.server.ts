import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ locals, cookies }) => {
		if (locals.session) {
			// Session invalidation will be handled by the auth module from Plan 02
			// For now, clear the cookie which is sufficient to log out
			const { invalidateSession } = await import('$lib/server/auth/session').catch(() => ({
				invalidateSession: null
			}));

			if (invalidateSession) {
				await invalidateSession(locals.session.id);
			}
		}

		cookies.delete('auth_session', { path: '/' });
		redirect(302, '/auth/login');
	}
} satisfies Actions;
