import { env } from '$env/dynamic/private';

const LITELLM_API_URL = env.LITELLM_API_URL ?? 'http://localhost:4000';
const LITELLM_MASTER_KEY = env.LITELLM_MASTER_KEY ?? '';

export async function createLiteLLMOrganization(
	name: string,
	alias: string
): Promise<{ organization_id: string } | null> {
	try {
		const response = await fetch(`${LITELLM_API_URL}/organization/new`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${LITELLM_MASTER_KEY}`
			},
			body: JSON.stringify({ organization_alias: alias })
		});

		if (!response.ok) {
			console.warn(
				`LiteLLM organization creation failed: ${response.status} ${response.statusText}`
			);
			return null;
		}

		const data = await response.json();
		return { organization_id: data.organization_id };
	} catch (error) {
		console.warn('LiteLLM unavailable, skipping organization creation:', error);
		return null;
	}
}
