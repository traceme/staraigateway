import { describe, it, expect } from 'vitest';
import { estimateTokenCount, selectModelTier } from './routing';

describe('estimateTokenCount', () => {
	it('returns Math.ceil(totalChars / 4) for messages array', () => {
		const messages = [
			{ content: 'Hello' }, // 5 chars
			{ content: 'World' } // 5 chars
		];
		// 10 chars / 4 = 2.5 -> ceil = 3
		expect(estimateTokenCount(messages)).toBe(3);
	});

	it('handles messages with no content field (returns 0)', () => {
		const messages = [{ role: 'system' }, { role: 'user' }] as Array<{ content?: string }>;
		expect(estimateTokenCount(messages)).toBe(0);
	});
});

describe('selectModelTier', () => {
	it('returns cheapModel when tokens < 500', () => {
		expect(selectModelTier(100, 'gpt-4o-mini', 'gpt-4o')).toBe('gpt-4o-mini');
	});

	it('returns expensiveModel when tokens >= 500', () => {
		expect(selectModelTier(1000, 'gpt-4o-mini', 'gpt-4o')).toBe('gpt-4o');
	});

	it('returns expensiveModel at exactly 500 tokens', () => {
		expect(selectModelTier(500, 'gpt-4o-mini', 'gpt-4o')).toBe('gpt-4o');
	});
});
