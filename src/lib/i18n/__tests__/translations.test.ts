import { describe, it, expect } from 'vitest';
import en from '../en.json';
import zh from '../zh.json';

/**
 * Recursively extract all dot-notation keys from a nested object.
 */
function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
	const keys: string[] = [];
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			keys.push(...getKeys(value as Record<string, unknown>, fullKey));
		} else {
			keys.push(fullKey);
		}
	}
	return keys.sort();
}

/**
 * Recursively check that no leaf value is an empty string.
 */
function getEmptyKeys(obj: Record<string, unknown>, prefix = ''): string[] {
	const emptyKeys: string[] = [];
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			emptyKeys.push(...getEmptyKeys(value as Record<string, unknown>, fullKey));
		} else if (value === '') {
			emptyKeys.push(fullKey);
		}
	}
	return emptyKeys;
}

describe('Translation files', () => {
	it('en.json and zh.json have identical key sets', () => {
		const enKeys = getKeys(en as Record<string, unknown>);
		const zhKeys = getKeys(zh as Record<string, unknown>);

		const missingInZh = enKeys.filter((k) => !zhKeys.includes(k));
		const missingInEn = zhKeys.filter((k) => !enKeys.includes(k));

		expect(missingInZh, `Keys in en.json missing from zh.json: ${missingInZh.join(', ')}`).toEqual([]);
		expect(missingInEn, `Keys in zh.json missing from en.json: ${missingInEn.join(', ')}`).toEqual([]);
	});

	it('en.json has no empty string values', () => {
		const emptyKeys = getEmptyKeys(en as Record<string, unknown>);
		expect(emptyKeys, `Empty values in en.json: ${emptyKeys.join(', ')}`).toEqual([]);
	});

	it('zh.json has no empty string values', () => {
		const emptyKeys = getEmptyKeys(zh as Record<string, unknown>);
		expect(emptyKeys, `Empty values in zh.json: ${emptyKeys.join(', ')}`).toEqual([]);
	});

	it('en.json contains required top-level namespaces', () => {
		const required = ['common', 'nav', 'api_keys', 'errors', 'validation', 'dashboard', 'members', 'provider_keys', 'usage', 'budget', 'models', 'settings', 'kpi', 'onboarding', 'org_switcher', 'org_create', 'language', 'docs'];
		const topKeys = Object.keys(en);
		for (const ns of required) {
			expect(topKeys, `Missing namespace: ${ns}`).toContain(ns);
		}
	});

	it('all errors.* keys in en.json exist in zh.json', () => {
		const enKeys = getKeys(en as Record<string, unknown>);
		const zhKeys = getKeys(zh as Record<string, unknown>);
		const errorKeys = enKeys.filter((k) => k.startsWith('errors.'));
		for (const key of errorKeys) {
			expect(zhKeys, `Missing error key in zh.json: ${key}`).toContain(key);
		}
	});

	it('all validation.* keys in en.json exist in zh.json', () => {
		const enKeys = getKeys(en as Record<string, unknown>);
		const zhKeys = getKeys(zh as Record<string, unknown>);
		const validationKeys = enKeys.filter((k) => k.startsWith('validation.'));
		for (const key of validationKeys) {
			expect(zhKeys, `Missing validation key in zh.json: ${key}`).toContain(key);
		}
	});

	it('translation files have at least 50 leaf keys each', () => {
		const enKeys = getKeys(en as Record<string, unknown>);
		const zhKeys = getKeys(zh as Record<string, unknown>);
		expect(enKeys.length).toBeGreaterThanOrEqual(50);
		expect(zhKeys.length).toBeGreaterThanOrEqual(50);
	});
});
