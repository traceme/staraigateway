import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB before importing usage module
vi.mock('$lib/server/db', () => {
	const mockInsert = vi.fn(() => ({
		values: vi.fn(() => ({
			then: vi.fn((cb: any) => {
				cb();
				return { catch: vi.fn() };
			})
		}))
	}));
	const mockUpdate = vi.fn(() => ({
		set: vi.fn(() => ({
			where: vi.fn(() => ({
				then: vi.fn((cb: any) => {
					cb();
					return { catch: vi.fn() };
				})
			}))
		}))
	}));
	return {
		db: { insert: mockInsert, update: mockUpdate }
	};
});

vi.mock('$lib/server/db/schema', () => ({
	appUsageLogs: 'appUsageLogs',
	appBudgets: { spendSnapshotCents: 'spendSnapshotCents' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn(),
	sql: vi.fn()
}));

import {
	calculateCost,
	extractUsageFromJSON,
	extractUsageFromSSEText,
	logUsage,
	updateSpendSnapshot
} from './usage';
import { db } from '$lib/server/db';
import type { GatewayAuth } from './auth';

describe('usage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('calculateCost', () => {
		it('calculates cost for known model gpt-4o', () => {
			const cost = calculateCost('gpt-4o', 1000, 500);
			expect(cost).toBeCloseTo(0.0075);
		});

		it('calculates cost for known model gpt-4o-mini', () => {
			const cost = calculateCost('gpt-4o-mini', 1_000_000, 1_000_000);
			expect(cost).toBeCloseTo(0.75);
		});

		it('returns 0 for unknown model', () => {
			expect(calculateCost('unknown-model', 1000, 1000)).toBe(0);
		});

		it('returns 0 for zero tokens', () => {
			expect(calculateCost('gpt-4o', 0, 0)).toBe(0);
		});
	});

	describe('extractUsageFromJSON', () => {
		it('extracts usage from valid response', () => {
			const json = JSON.stringify({
				usage: { prompt_tokens: 10, completion_tokens: 20 },
				model: 'gpt-4o'
			});
			const result = extractUsageFromJSON(json);
			expect(result).toEqual({
				inputTokens: 10,
				outputTokens: 20,
				model: 'gpt-4o',
				provider: ''
			});
		});

		it('returns null when no usage field', () => {
			const json = JSON.stringify({ choices: [] });
			expect(extractUsageFromJSON(json)).toBeNull();
		});

		it('returns null for invalid JSON', () => {
			expect(extractUsageFromJSON('not json')).toBeNull();
		});

		it('handles partial usage with missing completion_tokens', () => {
			const json = JSON.stringify({
				usage: { prompt_tokens: 10 }
			});
			const result = extractUsageFromJSON(json);
			expect(result).toEqual({
				inputTokens: 10,
				outputTokens: 0,
				model: '',
				provider: ''
			});
		});
	});

	describe('extractUsageFromSSEText', () => {
		it('extracts usage from valid SSE with usage in last data chunk', () => {
			const sse = [
				'data: {"choices":[{"delta":{"content":"Hi"}}]}',
				'',
				'data: {"usage":{"prompt_tokens":5,"completion_tokens":15},"model":"gpt-4o"}',
				'',
				'data: [DONE]',
				''
			].join('\n');
			const result = extractUsageFromSSEText(sse);
			expect(result).toEqual({
				inputTokens: 5,
				outputTokens: 15,
				model: 'gpt-4o',
				provider: ''
			});
		});

		it('returns null when SSE has no usage', () => {
			const sse = [
				'data: {"choices":[{"delta":{"content":"Hi"}}]}',
				'',
				'data: [DONE]'
			].join('\n');
			expect(extractUsageFromSSEText(sse)).toBeNull();
		});

		it('returns null for empty string', () => {
			expect(extractUsageFromSSEText('')).toBeNull();
		});
	});

	describe('logUsage', () => {
		it('calls db.insert', () => {
			const auth: GatewayAuth = {
				userId: 'user-1',
				orgId: 'org-1',
				apiKeyId: 'key-1',
				effectiveRpmLimit: null,
				effectiveTpmLimit: null,
				smartRouting: false,
				org: {
					id: 'org-1',
					name: 'Test Org',
					slug: 'test-org',
					litellmOrgId: null,
					smartRoutingCheapModel: null,
					smartRoutingExpensiveModel: null,
					cacheTtlSeconds: 0
				}
			};
			logUsage(auth, 'key-1', '/v1/chat/completions', 'gpt-4o', 'openai', 100, 50, 0.001, 200, 'success', false);
			expect(db.insert).toHaveBeenCalled();
		});
	});

	describe('updateSpendSnapshot', () => {
		it('calls db.update', () => {
			updateSpendSnapshot('budget-1', 500);
			expect(db.update).toHaveBeenCalled();
		});
	});
});
