import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { appProviderKeys } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { MODEL_PRICING } from '$lib/server/gateway/usage';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentOrg } = await parent();

	// Get all active provider keys and their models
	const providerKeys = await db
		.select({ provider: appProviderKeys.provider, models: appProviderKeys.models })
		.from(appProviderKeys)
		.where(and(eq(appProviderKeys.orgId, currentOrg.id), eq(appProviderKeys.isActive, true)));

	// Build set of available model names
	const availableModels = new Set<string>();
	for (const key of providerKeys) {
		if (key.models) {
			const modelList = key.models as string[];
			modelList.forEach((m) => availableModels.add(m));
		}
	}

	// Context windows for known models
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

	function getProviderFromModel(model: string): string {
		if (model.startsWith('gpt')) return 'OpenAI';
		if (model.startsWith('claude')) return 'Anthropic';
		if (model.startsWith('gemini')) return 'Google';
		if (model.startsWith('deepseek')) return 'DeepSeek';
		return 'Other';
	}

	const models = Object.entries(MODEL_PRICING).map(([name, pricing]) => ({
		name,
		provider: getProviderFromModel(name),
		inputPrice: pricing.input,
		outputPrice: pricing.output,
		contextWindow: MODEL_CONTEXT_WINDOWS[name] ?? 'Unknown',
		hasKey: availableModels.has(name)
	}));

	return { models };
};
