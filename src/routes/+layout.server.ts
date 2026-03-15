import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	// Will be used by auth in Plan 02 to provide user/session data
	return {};
};
