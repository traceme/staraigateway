import { createHash } from 'crypto';
import { getRedis } from '$lib/server/redis';

/**
 * Generate a deterministic cache key for a request.
 * Format: cache:{orgId}:{sha256hex}
 */
export function generateCacheKey(orgId: string, model: string, messages: unknown[]): string {
	const raw = JSON.stringify(messages);
	const hash = createHash('sha256')
		.update(model + ':' + raw)
		.digest('hex');
	return `cache:${orgId}:${hash}`;
}

/**
 * Retrieve a cached response from Redis.
 * Returns null if Redis is not available or key doesn't exist.
 */
export async function getCachedResponse(key: string): Promise<string | null> {
	try {
		const redis = getRedis();
		if (!redis) return null;
		return await redis.get(key);
	} catch {
		return null;
	}
}

/**
 * Store a response in Redis with a TTL.
 * Silently fails if Redis is not available.
 */
export async function setCachedResponse(
	key: string,
	body: string,
	ttlSeconds: number
): Promise<void> {
	try {
		const redis = getRedis();
		if (!redis) return;
		await redis.setex(key, ttlSeconds, body);
	} catch {
		// Silently fail — caching is best-effort
	}
}
