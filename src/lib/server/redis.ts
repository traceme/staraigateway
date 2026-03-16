import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

let redis: Redis | null = null;

/**
 * Lazy Redis singleton. Returns null if REDIS_URL is not set,
 * allowing the app to work without Redis (caching silently disabled).
 */
export function getRedis(): Redis | null {
	if (redis) return redis;

	const url = env.REDIS_URL;
	if (!url) return null;

	redis = new Redis(url, {
		maxRetriesPerRequest: 3,
		lazyConnect: true,
		retryStrategy(times: number) {
			return Math.min(times * 200, 2000);
		}
	});

	// Prevent unhandled rejection on connection errors
	redis.on('error', () => {});

	return redis;
}
