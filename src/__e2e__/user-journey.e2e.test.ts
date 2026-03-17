/**
 * E2E: User Journey Test
 *
 * Exercises the full flow: seed user+org -> add provider key -> generate API key
 * -> make gateway request -> receive valid response.
 *
 * Uses real PostgreSQL (test DB) but mocks upstream LLM provider responses via globalThis.fetch.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
	getTestDb,
	seedUserAndOrg,
	seedProviderKey,
	seedApiKey,
	truncateAll,
	pushSchema,
	cleanupDb,
	TEST_DATABASE_URL,
	TEST_ENCRYPTION_KEY
} from './setup';

// Set env vars BEFORE any app module imports read them
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Populate the $env/dynamic/private mock object
import { env } from '$env/dynamic/private';
env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
env.DATABASE_URL = TEST_DATABASE_URL;
env.APP_URL = 'http://localhost:3000';

// Now we can safely import modules that depend on env
import { encrypt } from '$lib/server/crypto';

const originalFetch = globalThis.fetch;

describe('E2E: User Journey', () => {
	let db: ReturnType<typeof getTestDb>;
	let fullApiKey: string;

	beforeAll(async () => {
		db = getTestDb();
		await pushSchema();
		await truncateAll(db);

		// Seed: user + org
		const { userId, orgId } = await seedUserAndOrg(db);

		// Seed: provider key (encrypt a fake key)
		const encryptedKey = encrypt('sk-fake-openai-key-for-e2e');
		await seedProviderKey(db, orgId, encryptedKey, ['gpt-4o']);

		// Seed: API key
		const apiKeyResult = await seedApiKey(db, orgId, userId);
		fullApiKey = apiKeyResult.fullKey;

		// Mock fetch to intercept LiteLLM proxy calls
		globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			const urlStr =
				typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
			if (urlStr.includes('/v1/chat/completions')) {
				return new Response(
					JSON.stringify({
						id: 'chatcmpl-e2e-test',
						object: 'chat.completion',
						created: Math.floor(Date.now() / 1000),
						model: 'gpt-4o',
						choices: [
							{
								index: 0,
								message: { role: 'assistant', content: 'Hello from E2E test!' },
								finish_reason: 'stop'
							}
						],
						usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				);
			}
			return originalFetch(url, init);
		});
	}, 30_000);

	afterAll(async () => {
		globalThis.fetch = originalFetch;
		await truncateAll(db);
		await cleanupDb(db);
	});

	it('completes full user journey: API key authenticates and gateway returns valid response', async () => {
		const { POST } = await import('../routes/v1/chat/completions/+server');

		const request = new Request('http://localhost:3000/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${fullApiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'Hello' }]
			})
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body.choices).toBeDefined();
		expect(body.choices[0].message.content).toBe('Hello from E2E test!');
		expect(body.usage.total_tokens).toBe(15);
	});

	it('rejects request with invalid API key', async () => {
		const { POST } = await import('../routes/v1/chat/completions/+server');

		const request = new Request('http://localhost:3000/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer sk-th-invalid-key-does-not-exist'
			},
			body: JSON.stringify({
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'Hello' }]
			})
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error.code).toBe('invalid_api_key');
	});
});
