import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	return {
		user: event.locals.user,
		locale: event.locals.locale ?? event.locals.user?.language ?? 'en'
	};
};
