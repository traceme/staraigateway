import { db } from '$lib/server/db';
import { appUsageLogs } from '$lib/server/db/schema';
import type { GatewayAuth } from './auth';

interface UsageData {
	inputTokens: number;
	outputTokens: number;
	model: string;
	provider: string;
}

// Model pricing: input/output per 1M tokens in dollars
// Source: LiteLLM model_cost_map defaults, can be overridden later
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
	'gpt-4o': { input: 2.5, output: 10.0 },
	'gpt-4o-mini': { input: 0.15, output: 0.6 },
	'gpt-4-turbo': { input: 10.0, output: 30.0 },
	'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
	'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
	'claude-3-5-haiku-20241022': { input: 1.0, output: 5.0 },
	'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
	'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
	'claude-haiku-4-20250514': { input: 1.0, output: 5.0 },
	'gemini-1.5-pro': { input: 1.25, output: 5.0 },
	'gemini-1.5-flash': { input: 0.075, output: 0.3 },
	'gemini-2.0-flash': { input: 0.1, output: 0.4 },
	'deepseek-chat': { input: 0.14, output: 0.28 },
	'deepseek-reasoner': { input: 0.55, output: 2.19 }
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
	const pricing = MODEL_PRICING[model];
	if (!pricing) return 0; // Unknown model, zero cost (admin can override later)
	return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

// Extract usage from a non-streaming OpenAI-compatible JSON response
export function extractUsageFromJSON(responseBody: string): UsageData | null {
	try {
		const parsed = JSON.parse(responseBody);
		if (parsed.usage) {
			return {
				inputTokens: parsed.usage.prompt_tokens ?? 0,
				outputTokens: parsed.usage.completion_tokens ?? 0,
				model: parsed.model ?? '',
				provider: '' // filled by caller
			};
		}
		return null;
	} catch {
		return null;
	}
}

// Extract usage from the final SSE chunk in a streaming response
// The final data chunk before [DONE] contains usage info
export function extractUsageFromSSEText(sseText: string): UsageData | null {
	const lines = sseText.split('\n');
	// Walk backward to find last data: line before [DONE]
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (line.startsWith('data: ') && line !== 'data: [DONE]') {
			try {
				const parsed = JSON.parse(line.slice(6));
				if (parsed.usage) {
					return {
						inputTokens: parsed.usage.prompt_tokens ?? 0,
						outputTokens: parsed.usage.completion_tokens ?? 0,
						model: parsed.model ?? '',
						provider: ''
					};
				}
			} catch {
				// skip unparseable chunks
			}
		}
	}
	return null;
}

// Fire-and-forget usage log write
export function logUsage(
	auth: GatewayAuth,
	apiKeyId: string,
	endpoint: string,
	model: string,
	provider: string,
	inputTokens: number,
	outputTokens: number,
	cost: number,
	latencyMs: number,
	status: 'success' | 'error',
	isStreaming: boolean,
	errorMessage?: string
): void {
	db.insert(appUsageLogs)
		.values({
			id: crypto.randomUUID(),
			orgId: auth.orgId,
			userId: auth.userId,
			apiKeyId,
			model,
			provider,
			endpoint,
			inputTokens,
			outputTokens,
			cost: cost.toFixed(6),
			latencyMs,
			status,
			isStreaming,
			errorMessage: errorMessage ?? null
		})
		.then(() => {})
		.catch(() => {});
}
