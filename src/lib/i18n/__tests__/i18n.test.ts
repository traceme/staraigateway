import { describe, it, expect } from 'vitest';

describe('i18n initialization', () => {
	it('index.ts imports without error', async () => {
		// Importing the module should not throw
		await expect(import('../index')).resolves.toBeDefined();
	});

	it('svelte-i18n locale and t stores are available after init', async () => {
		await import('../index');
		const { locale, t } = await import('svelte-i18n');
		expect(locale).toBeDefined();
		expect(t).toBeDefined();
	});
});
