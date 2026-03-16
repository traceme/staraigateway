import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { appApiKeys } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/** Metadata returned to the client (never includes keyHash). */
export type ApiKeyMetadata = {
	id: string;
	orgId: string;
	userId: string;
	name: string;
	keyPrefix: string;
	isActive: boolean;
	lastUsedAt: Date | null;
	createdAt: Date;
};

/**
 * Generate a new API key with sk-th- prefix.
 * Returns the full key (shown once), display prefix, and SHA-256 hash for storage.
 */
export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
	const bytes = randomBytes(48);
	const body = bytes.toString('base64url'); // ~64 chars, URL-safe
	const fullKey = `sk-th-${body}`;
	const prefix = fullKey.slice(0, 12);
	const hash = createHash('sha256').update(fullKey).digest('hex');
	return { fullKey, prefix, hash };
}

/**
 * Create a new API key for a user within an organization.
 * Returns metadata + the full key (this is the ONLY time the full key is available).
 */
export async function createApiKey(
	orgId: string,
	userId: string,
	name: string
): Promise<{ key: ApiKeyMetadata; fullKey: string }> {
	const { fullKey, prefix, hash } = generateApiKey();
	const id = randomUUID();

	const [row] = await db
		.insert(appApiKeys)
		.values({
			id,
			orgId,
			userId,
			name,
			keyPrefix: prefix,
			keyHash: hash,
			isActive: true
		})
		.returning({
			id: appApiKeys.id,
			orgId: appApiKeys.orgId,
			userId: appApiKeys.userId,
			name: appApiKeys.name,
			keyPrefix: appApiKeys.keyPrefix,
			isActive: appApiKeys.isActive,
			lastUsedAt: appApiKeys.lastUsedAt,
			createdAt: appApiKeys.createdAt
		});

	return { key: row, fullKey };
}

/**
 * Get all API keys for a user in an organization (metadata only).
 */
export async function getUserApiKeys(
	orgId: string,
	userId: string
): Promise<ApiKeyMetadata[]> {
	return db
		.select({
			id: appApiKeys.id,
			orgId: appApiKeys.orgId,
			userId: appApiKeys.userId,
			name: appApiKeys.name,
			keyPrefix: appApiKeys.keyPrefix,
			isActive: appApiKeys.isActive,
			lastUsedAt: appApiKeys.lastUsedAt,
			createdAt: appApiKeys.createdAt
		})
		.from(appApiKeys)
		.where(and(eq(appApiKeys.orgId, orgId), eq(appApiKeys.userId, userId)))
		.orderBy(desc(appApiKeys.createdAt));
}

/**
 * Revoke an API key. Sets isActive = false (preserves for audit trail).
 * Only the key owner in the same org can revoke.
 */
export async function revokeApiKey(
	id: string,
	orgId: string,
	userId: string
): Promise<boolean> {
	const [updated] = await db
		.update(appApiKeys)
		.set({ isActive: false })
		.where(
			and(
				eq(appApiKeys.id, id),
				eq(appApiKeys.orgId, orgId),
				eq(appApiKeys.userId, userId)
			)
		)
		.returning({ id: appApiKeys.id });

	return !!updated;
}
