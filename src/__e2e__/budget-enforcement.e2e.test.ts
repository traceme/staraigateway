/**
 * E2E: Budget Enforcement Test
 *
 * Verifies the gateway rejects requests with 429 when budget is exhausted,
 * and allows requests when budget has remaining capacity.
 *
 * Uses real PostgreSQL (test DB) but mocks upstream LLM provider responses via globalThis.fetch.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import {
	getTestDb,
	seedUserAndOrg,
	seedProviderKey,
	seedApiKey,
	seedBudget,
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
import { appBudgets } from '$lib/server/db/schema';

const originalFetch = globalThis.fetch;

describe('E2E: Budget Enforcement', () => {
	let db: ReturnType<typeof getTestDb>;
	let fullApiKey: string;
	let budgetId: string;

	beforeAll(async () => {
		db = getTestDb();
		await pushSchema();
		await truncateAll(db);

		const { userId, orgId } = await seedUserAndOrg(db);

		const encryptedKey = encrypt('sk-fake-openai-key-for-budget-e2e');
		await seedProviderKey(db, orgId, encryptedKey, ['gpt-4o']);

		const apiKeyResult = await seedApiKey(db, orgId, userId);
		fullApiKey = apiKeyResult.fullKey;

		// Seed budget with hard limit of 1 cent
		budgetId = await seedBudget(db, orgId, userId, 1);

		// Update the spend snapshot to be AT the limit (1 cent spent)
		await db
			.update(appBudgets)
			.set({ spendSnapshotCents: 1, snapshotUpdatedAt: new Date() })
			.where(eq(appBudgets.id, budgetId));

		// Mock fetch for LiteLLM proxy calls
		globalThis.fetch = vi.fn(
			async (url: string | URL | Request, init?: RequestInit) => {
				const urlStr =
					typeof url === 'string'
						? url
						: url instanceof URL
							? url.toString()
							: url.url;
				if (urlStr.includes('/v1/chat/completions')) {
					return new Response(
						JSON.stringify({
							id: 'chatcmpl-budget-test',
							object: 'chat.completion',
							created: Math.floor(Date.now() / 1000),
							model: 'gpt-4o',
							choices: [
								{
									index: 0,
									message: {
										role: 'assistant',
										content: 'Should not reach here'
									},
									finish_reason: 'stop'
								}
							],
							usage: {
								prompt_tokens: 10,
								completion_tokens: 5,
								total_tokens: 15
							}
						}),
						{
							status: 200,
							headers: { 'Content-Type': 'application/json' }
						}
					);
				}
				return originalFetch(url, init);
			}
		);
	}, 30_000);

	afterAll(async () => {
		globalThis.fetch = originalFetch;
		await truncateAll(db);
		await cleanupDb(db);
	});

	it('rejects gateway request when budget is exhausted with 429', async () => {
		const { POST } = await import('../routes/v1/chat/completions/+server');

		const request = new Request('http://localhost:3000/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${fullApiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'This should be rejected' }]
			})
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(429);

		const body = await response.json();
		expect(body.error.code).toBe('budget_exceeded');
		expect(body.error.message).toContain('Monthly budget exceeded');
	});

	it('allows gateway request when budget has remaining capacity', async () => {
		// Reset spend to 0 (well under 1 cent limit)
		await db
			.update(appBudgets)
			.set({ spendSnapshotCents: 0, snapshotUpdatedAt: new Date() })
			.where(eq(appBudgets.id, budgetId));

		const { POST } = await import('../routes/v1/chat/completions/+server');

		const request = new Request('http://localhost:3000/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${fullApiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'This should succeed' }]
			})
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(200);
	});
});
