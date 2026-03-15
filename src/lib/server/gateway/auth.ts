import { createHash } from 'crypto';
import { db } from '$lib/server/db';
import { appApiKeys, appUsers, appOrganizations } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export interface GatewayAuth {
	userId: string;
	orgId: string;
	org: {
		id: string;
		name: string;
		slug: string;
		litellmOrgId: string | null;
	};
}

/**
 * Authenticate an API request using a Bearer sk-th-* API key.
 * Extracts the token from the Authorization header, hashes it with SHA-256,
 * and looks it up in appApiKeys. Returns user/org info or null.
 */
export async function authenticateApiKey(request: Request): Promise<GatewayAuth | null> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) return null;

	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token || !token.startsWith('sk-th-')) return null;

	// SHA-256 hash (same as api-keys.ts uses)
	const keyHash = createHash('sha256').update(token).digest('hex');

	// Look up the key with user and org joins
	const rows = await db
		.select({
			keyId: appApiKeys.id,
			userId: appApiKeys.userId,
			orgId: appApiKeys.orgId,
			orgName: appOrganizations.name,
			orgSlug: appOrganizations.slug,
			litellmOrgId: appOrganizations.litellmOrgId
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

	return {
		userId: row.userId,
		orgId: row.orgId,
		org: {
			id: row.orgId,
			name: row.orgName,
			slug: row.orgSlug,
			litellmOrgId: row.litellmOrgId
		}
	};
}
