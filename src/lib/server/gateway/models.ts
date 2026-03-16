import { db } from '$lib/server/db';
import { appProviderKeys } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export interface ModelEntry {
	id: string;
	object: 'model';
	created: number;
	owned_by: string;
}

/**
 * Get all available models for an org by aggregating models from all active provider keys.
 * Returns a deduplicated list in OpenAI /v1/models response format.
 */
export async function getAvailableModels(orgId: string): Promise<ModelEntry[]> {
	const keys = await db
		.select({
			provider: appProviderKeys.provider,
			models: appProviderKeys.models
		})
		.from(appProviderKeys)
		.where(and(eq(appProviderKeys.orgId, orgId), eq(appProviderKeys.isActive, true)));

	const seen = new Set<string>();
	const models: ModelEntry[] = [];
	const now = Math.floor(Date.now() / 1000);

	for (const key of keys) {
		if (!key.models) continue;

		const modelList = key.models as string[];

		for (const modelId of modelList) {
			if (seen.has(modelId)) continue;
			seen.add(modelId);

			models.push({
				id: modelId,
				object: 'model',
				created: now,
				owned_by: key.provider
			});
		}
	}

	return models;
}
