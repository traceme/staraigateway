/**
 * Round-robin load balancer for distributing requests across
 * multiple provider keys for the same model.
 */

// In-memory rotation counters: Map<"orgId:provider", counter>
const rotationCounters = new Map<string, number>();

/**
 * Reorder keys array using round-robin rotation.
 * Each call for the same org+provider advances the counter,
 * so consecutive calls distribute across all available keys.
 */
export function selectKeyRoundRobin<T>(keys: T[], orgId: string, provider: string): T[] {
	if (keys.length === 0) return [];

	const counterKey = `${orgId}:${provider}`;
	const current = rotationCounters.get(counterKey) ?? 0;
	rotationCounters.set(counterKey, current + 1);

	const startIdx = current % keys.length;
	return [...keys.slice(startIdx), ...keys.slice(0, startIdx)];
}
