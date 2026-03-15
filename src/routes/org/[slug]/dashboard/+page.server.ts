import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg } = await parent();
	return {
		orgName: currentOrg.name
	};
};
