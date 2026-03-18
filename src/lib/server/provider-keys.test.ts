import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB chain: update().set().where() must be awaitable
const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));

vi.mock('$lib/server/db', () => ({
	db: {
		update: (...args: unknown[]) => mockUpdate(...args),
		select: vi.fn(),
		insert: vi.fn(),
		delete: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	appProviderKeys: { __table: 'app_provider_keys', id: 'id' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b })),
	and: vi.fn()
}));

vi.mock('$lib/server/crypto', () => ({ encrypt: vi.fn() }));

const mockGetProvider = vi.fn();
vi.mock('$lib/server/providers', () => ({
	getProvider: (...args: unknown[]) => mockGetProvider(...args)
}));

import { discoverModelsForKey } from './provider-keys';
import { appProviderKeys } from '$lib/server/db/schema';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeModelsResponse(models: { id?: string; name?: string }[], useGoogleFormat = false) {
	const body = useGoogleFormat ? { models } : { data: models };
	return {
		ok: true,
		json: () => Promise.resolve(body),
		text: () => Promise.resolve(JSON.stringify(body))
	};
}

describe('discoverModelsForKey', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWhere.mockResolvedValue(undefined);
		mockGetProvider.mockReturnValue({
			id: 'openai',
			name: 'OpenAI',
			baseUrl: 'https://api.openai.com',
			modelsEndpoint: '/v1/models',
			authHeader: 'Bearer'
		});
	});

	it('calls validateProviderKey with correct args and writes models to DB on success', async () => {
		mockFetch.mockResolvedValue(
			makeModelsResponse([{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }])
		);

		discoverModelsForKey('key-1', 'openai', 'sk-test123');

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.openai.com/v1/models',
				expect.objectContaining({
					method: 'GET',
					headers: { Authorization: 'Bearer sk-test123' }
				})
			);
			expect(mockUpdate).toHaveBeenCalledWith(appProviderKeys);
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					models: ['gpt-4o', 'gpt-4o-mini']
				})
			);
		});
	});

	it('strips Google models/ prefix from model names before storage', async () => {
		mockGetProvider.mockReturnValue({
			id: 'google',
			name: 'Google AI',
			baseUrl: 'https://generativelanguage.googleapis.com',
			modelsEndpoint: '/v1beta/models',
			authHeader: 'Bearer'
		});
		mockFetch.mockResolvedValue(
			makeModelsResponse(
				[
					{ name: 'models/gemini-1.5-pro' },
					{ name: 'models/gemini-1.5-flash' },
					{ name: 'gemini-2.0-flash' }
				],
				true
			)
		);

		discoverModelsForKey('key-2', 'google', 'goog-key');

		await vi.waitFor(() => {
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash']
				})
			);
		});
	});

	it('silently handles fetch failure without throwing', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));

		// Should not throw
		expect(() => {
			discoverModelsForKey('key-3', 'openai', 'bad-key');
		}).not.toThrow();

		// Wait for promise chain to settle
		await new Promise((r) => setTimeout(r, 50));

		// DB update should not be called (validateProviderKey returns valid:false on error)
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('returns void (fire-and-forget signature)', () => {
		mockFetch.mockResolvedValue(makeModelsResponse([]));
		const result = discoverModelsForKey('key-4', 'openai', 'sk-test');
		expect(result).toBeUndefined();
	});

	it('does not trigger DB update when models array is empty', async () => {
		mockFetch.mockResolvedValue(makeModelsResponse([]));

		discoverModelsForKey('key-5', 'openai', 'sk-test');

		await new Promise((r) => setTimeout(r, 50));

		expect(mockUpdate).not.toHaveBeenCalled();
	});
});
