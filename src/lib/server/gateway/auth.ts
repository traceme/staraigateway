import { createHash } from 'crypto';
import { db } from '$lib/server/db';
import { appApiKeys, appUsers, appOrganizations } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getRedis } from '$lib/server/redis';

export interface GatewayAuth {
	userId: string;
	orgId: string;
	apiKeyId: string;
	effectiveRpmLimit: number | null;
	effectiveTpmLimit: number | null;
	smartRouting: boolean;
	org: {
		id: string;
		name: string;
		slug: string;
		litellmOrgId: string | null;
		smartRoutingCheapModel: string | null;
		smartRoutingExpensiveModel: string | null;
		cacheTtlSeconds: number;
	};
}

const AUTH_CACHE_TTL = 60; // seconds

async function getCachedAuth(keyHash: string): Promise<GatewayAuth | null> {
	try {
		const redis = getRedis();
		if (!redis) return null;
		const cached = await redis.get(`auth:${keyHash}`);
		if (!cached) return null;
		return JSON.parse(cached) as GatewayAuth;
	} catch {
		return null;
	}
}

async function setCachedAuth(keyHash: string, auth: GatewayAuth): Promise<void> {
	try {
		const redis = getRedis();
		if (!redis) return;
		await redis.setex(`auth:${keyHash}`, AUTH_CACHE_TTL, JSON.stringify(auth));
	} catch {
		// Cache write failure is non-critical
	}
}

/**
 * Authenticate an API request using a Bearer sk-th-* API key.
 * Extracts the token from the Authorization header, hashes it with SHA-256,
 * and looks it up in appApiKeys. Returns user/org info with effective rate limits or null.
 * Uses Redis cache-aside with 60s TTL; gracefully degrades to DB on Redis failure.
 */
export async function authenticateApiKey(request: Request): Promise<GatewayAuth | null> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) return null;

	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token || !token.startsWith('sk-th-')) return null;

	// SHA-256 hash (same as api-keys.ts uses)
	const keyHash = createHash('sha256').update(token).digest('hex');

	// Try Redis cache first
	const cached = await getCachedAuth(keyHash);
	if (cached) {
		// Fire-and-forget lastUsedAt update
		db.update(appApiKeys)
			.set({ lastUsedAt: new Date() })
			.where(eq(appApiKeys.keyHash, keyHash))
			.then(() => {})
			.catch(() => {});
		return cached;
	}

	// Look up the key with org join, including rate limit fields
	const rows = await db
		.select({
			keyId: appApiKeys.id,
			userId: appApiKeys.userId,
			orgId: appApiKeys.orgId,
			rpmLimit: appApiKeys.rpmLimit,
			tpmLimit: appApiKeys.tpmLimit,
			smartRouting: appApiKeys.smartRouting,
			orgName: appOrganizations.name,
			orgSlug: appOrganizations.slug,
			litellmOrgId: appOrganizations.litellmOrgId,
			defaultRpmLimit: appOrganizations.defaultRpmLimit,
			defaultTpmLimit: appOrganizations.defaultTpmLimit,
			smartRoutingCheapModel: appOrganizations.smartRoutingCheapModel,
			smartRoutingExpensiveModel: appOrganizations.smartRoutingExpensiveModel,
			cacheTtlSeconds: appOrganizations.cacheTtlSeconds
		})
		.from(appApiKeys)
		.innerJoin(appOrganizations, eq(appApiKeys.orgId, appOrganizations.id))
		.where(and(eq(appApiKeys.keyHash, keyHash), eq(appApiKeys.isActive, true)))
		.limit(1);

	if (rows.length === 0) return null;

	const row = rows[0];

	// Update lastUsedAt (fire-and-forget, don't block the response)
	db.update(appApiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(appApiKeys.id, row.keyId))
		.then(() => {})
		.catch(() => {});

	// Effective limits: per-key override ?? org default ?? null
	const effectiveRpmLimit = row.rpmLimit ?? row.defaultRpmLimit ?? null;
	const effectiveTpmLimit = row.tpmLimit ?? row.defaultTpmLimit ?? null;

	const result: GatewayAuth = {
		userId: row.userId,
		orgId: row.orgId,
		apiKeyId: row.keyId,
		effectiveRpmLimit,
		effectiveTpmLimit,
		smartRouting: row.smartRouting,
		org: {
			id: row.orgId,
			name: row.orgName,
			slug: row.orgSlug,
			litellmOrgId: row.litellmOrgId,
			smartRoutingCheapModel: row.smartRoutingCheapModel,
			smartRoutingExpensiveModel: row.smartRoutingExpensiveModel,
			cacheTtlSeconds: row.cacheTtlSeconds
		}
	};

	// Cache the result (fire-and-forget)
	setCachedAuth(keyHash, result).catch(() => {});

	return result;
}
