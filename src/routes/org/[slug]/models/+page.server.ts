import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { appProviderKeys } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { MODEL_PRICING } from '$lib/server/gateway/usage';
import { getProvider } from '$lib/server/providers';

// Context windows for known models (static reference data)
const MODEL_CONTEXT_WINDOWS: Record<string, string> = {
	'gpt-4o': '128K',
	'gpt-4o-mini': '128K',
	'gpt-4-turbo': '128K',
	'gpt-3.5-turbo': '16K',
	'claude-3-5-sonnet-20241022': '200K',
	'claude-3-5-haiku-20241022': '200K',
	'claude-3-opus-20240229': '200K',
	'claude-sonnet-4-20250514': '200K',
	'claude-haiku-4-20250514': '200K',
	'gemini-1.5-pro': '1M',
	'gemini-1.5-flash': '1M',
	'gemini-2.0-flash': '1M',
	'deepseek-chat': '64K',
	'deepseek-reasoner': '64K'
};

export type CatalogModel = {
	name: string;
	provider: string;
	inputPrice: number | null;
	outputPrice: number | null;
	contextWindow: string | null;
};

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg } = await parent();

	const providerKeys = await db
		.select({ provider: appProviderKeys.provider, models: appProviderKeys.models })
		.from(appProviderKeys)
		.where(and(eq(appProviderKeys.orgId, currentOrg.id), eq(appProviderKeys.isActive, true)));

	const seen = new Set<string>();
	const models: CatalogModel[] = [];

	for (const key of providerKeys) {
		if (!key.models) continue;
		for (const modelId of key.models as string[]) {
			if (seen.has(modelId)) continue;
			seen.add(modelId);
			const pricing = MODEL_PRICING[modelId];
			const providerDef = getProvider(key.provider);
			models.push({
				name: modelId,
				provider: providerDef?.name ?? key.provider,
				inputPrice: pricing?.input ?? null,
				outputPrice: pricing?.output ?? null,
				contextWindow: MODEL_CONTEXT_WINDOWS[modelId] ?? null
			});
		}
	}

	return { models };
};
