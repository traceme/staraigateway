import { describe, it, expect } from 'vitest';
import { selectKeyRoundRobin } from './load-balancer';

describe('selectKeyRoundRobin', () => {
	it('returns keys starting from rotation index with 3 keys', () => {
		const keys = ['key-a', 'key-b', 'key-c'];
		// First call for this org+provider starts at index 0
		const result = selectKeyRoundRobin(keys, 'org-rr1', 'openai');
		expect(result).toEqual(['key-a', 'key-b', 'key-c']);
	});

	it('consecutive calls rotate through keys', () => {
		const keys = ['key-a', 'key-b', 'key-c'];
		// Use a unique org to avoid state from other tests
		const first = selectKeyRoundRobin(keys, 'org-rr2', 'openai');
		const second = selectKeyRoundRobin(keys, 'org-rr2', 'openai');
		const third = selectKeyRoundRobin(keys, 'org-rr2', 'openai');

		expect(first).toEqual(['key-a', 'key-b', 'key-c']);
		expect(second).toEqual(['key-b', 'key-c', 'key-a']);
		expect(third).toEqual(['key-c', 'key-a', 'key-b']);
	});

	it('single key returns that key', () => {
		const keys = ['only-key'];
		const result = selectKeyRoundRobin(keys, 'org-rr3', 'anthropic');
		expect(result).toEqual(['only-key']);
	});

	it('empty keys array returns empty array', () => {
		const result = selectKeyRoundRobin([], 'org-rr4', 'openai');
		expect(result).toEqual([]);
	});
});
