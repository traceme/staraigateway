import { db } from '$lib/server/db';
import { appProviderKeys } from '$lib/server/db/schema';
import { encrypt } from '$lib/server/crypto';
import { getProvider } from '$lib/server/providers';
import { eq, and } from 'drizzle-orm';

/**
 * Get all provider keys for an org (metadata only, never expose encrypted key).
 */
export async function getProviderKeys(orgId: string) {
	const keys = await db
		.select({
			id: appProviderKeys.id,
			orgId: appProviderKeys.orgId,
			provider: appProviderKeys.provider,
			label: appProviderKeys.label,
			baseUrl: appProviderKeys.baseUrl,
			models: appProviderKeys.models,
			isActive: appProviderKeys.isActive,
			createdAt: appProviderKeys.createdAt,
			updatedAt: appProviderKeys.updatedAt
		})
		.from(appProviderKeys)
		.where(eq(appProviderKeys.orgId, orgId));
	return keys;
}

/**
 * Create a new provider key with encryption.
 */
export async function createProviderKey(
	orgId: string,
	data: { provider: string; label: string; apiKey: string; baseUrl?: string }
) {
	const encryptedKey = encrypt(data.apiKey);
	const id = crypto.randomUUID();

	const [created] = await db
		.insert(appProviderKeys)
		.values({
			id,
			orgId,
			provider: data.provider,
			label: data.label,
			encryptedKey,
			baseUrl: data.baseUrl ?? null
		})
		.returning({
			id: appProviderKeys.id,
			provider: appProviderKeys.provider,
			label: appProviderKeys.label,
			baseUrl: appProviderKeys.baseUrl,
			isActive: appProviderKeys.isActive,
			createdAt: appProviderKeys.createdAt
		});

	return created;
}

/**
 * Update a provider key. Verifies ownership by orgId.
 */
export async function updateProviderKey(
	id: string,
	orgId: string,
	data: { label?: string; apiKey?: string; baseUrl?: string; isActive?: boolean }
) {
	const updates: Record<string, unknown> = { updatedAt: new Date() };
	if (data.label !== undefined) updates.label = data.label;
	if (data.apiKey !== undefined) updates.encryptedKey = encrypt(data.apiKey);
	if (data.baseUrl !== undefined) updates.baseUrl = data.baseUrl;
	if (data.isActive !== undefined) updates.isActive = data.isActive;

	const [updated] = await db
		.update(appProviderKeys)
		.set(updates)
		.where(and(eq(appProviderKeys.id, id), eq(appProviderKeys.orgId, orgId)))
		.returning({
			id: appProviderKeys.id,
			provider: appProviderKeys.provider,
			label: appProviderKeys.label,
			isActive: appProviderKeys.isActive,
			updatedAt: appProviderKeys.updatedAt
		});

	return updated ?? null;
}

/**
 * Delete a provider key. Verifies ownership by orgId.
 */
export async function deleteProviderKey(id: string, orgId: string) {
	const [deleted] = await db
		.delete(appProviderKeys)
		.where(and(eq(appProviderKeys.id, id), eq(appProviderKeys.orgId, orgId)))
		.returning({ id: appProviderKeys.id });

	return deleted ?? null;
}

/**
 * Validate a provider key by calling the provider's /models endpoint.
 */
export async function validateProviderKey(
	provider: string,
	apiKey: string,
	baseUrl?: string
): Promise<{ valid: boolean; models: string[]; error?: string }> {
	const providerDef = getProvider(provider);
	if (!providerDef) {
		return { valid: false, models: [], error: `Unknown provider: ${provider}` };
	}

	const effectiveBaseUrl = provider === 'custom' ? baseUrl : providerDef.baseUrl;
	if (!effectiveBaseUrl) {
		return { valid: false, models: [], error: 'Base URL is required for custom providers' };
	}

	const url = `${effectiveBaseUrl}${providerDef.modelsEndpoint}`;

	const headers: Record<string, string> = {};
	if (providerDef.authHeader === 'Bearer') {
		headers['Authorization'] = `Bearer ${apiKey}`;
	} else if (providerDef.authHeader === 'x-api-key') {
		headers['x-api-key'] = apiKey;
	} else if (providerDef.authHeader === 'api-key') {
		headers['api-key'] = apiKey;
	}

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers,
			signal: AbortSignal.timeout(15000) // 15s timeout
		});

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			return {
				valid: false,
				models: [],
				error: `API returned ${response.status}: ${text.slice(0, 200)}`
			};
		}

		const json = await response.json();

		// Most OpenAI-compatible APIs return { data: [{ id: "model-name" }] }
		// Google returns { models: [{ name: "models/gemini-pro" }] }
		let models: string[] = [];
		if (Array.isArray(json.data)) {
			models = json.data.map((m: { id?: string }) => m.id).filter(Boolean);
		} else if (Array.isArray(json.models)) {
			models = json.models
				.map((m: { name?: string; id?: string }) => m.name ?? m.id)
				.filter(Boolean);
		}

		return { valid: true, models };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { valid: false, models: [], error: message };
	}
}
