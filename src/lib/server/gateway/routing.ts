/**
 * Smart routing: estimate token count and select appropriate model tier.
 * Routes small requests to cheaper models to reduce costs.
 */

/**
 * Estimate token count from messages using the ~4 chars per token heuristic.
 */
export function estimateTokenCount(messages: Array<{ content?: string }>): number {
	let totalChars = 0;
	for (const msg of messages) {
		if (typeof msg.content === 'string') {
			totalChars += msg.content.length;
		}
	}
	return Math.ceil(totalChars / 4);
}

/**
 * Select model tier based on estimated token count.
 * Returns cheapModel for small requests (below threshold),
 * expensiveModel otherwise.
 */
export function selectModelTier(
	estimatedTokens: number,
	cheapModel: string,
	expensiveModel: string,
	threshold = 500
): string {
	return estimatedTokens < threshold ? cheapModel : expensiveModel;
}
