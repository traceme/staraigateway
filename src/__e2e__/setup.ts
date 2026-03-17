import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { execSync } from 'child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as schema from '$lib/server/db/schema';

export const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/staraigateway_test';

// Valid 64-char hex encryption key for tests (32 bytes)
export const TEST_ENCRYPTION_KEY = 'aa'.repeat(32);

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Returns a drizzle instance connected to the test database.
 * Reuses the same connection across calls.
 */
export function getTestDb() {
	if (!_db) {
		_client = postgres(TEST_DATABASE_URL, { max: 5 });
		_db = drizzle(_client, { schema });
	}
	return _db;
}

/**
 * Pushes the current Drizzle schema to the test database using drizzle-kit push.
 */
export async function pushSchema() {
	execSync('npx drizzle-kit push --force', {
		env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
		stdio: 'pipe'
	});
}

/**
 * Seeds a test user and organization with owner membership.
 */
export async function seedUserAndOrg(db: ReturnType<typeof getTestDb>) {
	const userId = 'e2e-user-1';
	const orgId = 'e2e-org-1';

	await db.insert(schema.appUsers).values({
		id: userId,
		email: 'e2e@test.com',
		name: 'E2E User',
		passwordHash: 'not-used',
		emailVerified: true
	});

	await db.insert(schema.appOrganizations).values({
		id: orgId,
		name: 'E2E Org',
		slug: 'e2e-org'
	});

	await db.insert(schema.appOrgMembers).values({
		id: randomUUID(),
		orgId,
		userId,
		role: 'owner'
	});

	return { userId, orgId };
}

/**
 * Seeds a provider key for the given org.
 */
export async function seedProviderKey(
	db: ReturnType<typeof getTestDb>,
	orgId: string,
	encryptedKey: string,
	models: string[]
) {
	const id = randomUUID();
	await db.insert(schema.appProviderKeys).values({
		id,
		orgId,
		provider: 'openai',
		label: 'E2E Test Key',
		encryptedKey,
		models,
		isActive: true
	});
	return id;
}

/**
 * Seeds an API key and returns the full key, hash, and ID.
 * Reimplements key generation inline to avoid importing the app's db singleton.
 */
export async function seedApiKey(
	db: ReturnType<typeof getTestDb>,
	orgId: string,
	userId: string
) {
	const bytes = randomBytes(48);
	const body = bytes.toString('base64url');
	const fullKey = `sk-th-${body}`;
	const prefix = fullKey.slice(0, 12);
	const keyHash = createHash('sha256').update(fullKey).digest('hex');
	const apiKeyId = randomUUID();

	await db.insert(schema.appApiKeys).values({
		id: apiKeyId,
		orgId,
		userId,
		name: 'E2E Test API Key',
		keyPrefix: prefix,
		keyHash,
		isActive: true
	});

	return { fullKey, keyHash, apiKeyId };
}

/**
 * Seeds a budget record for the given org/user.
 * Returns the budget ID.
 */
export async function seedBudget(
	db: ReturnType<typeof getTestDb>,
	orgId: string,
	userId: string,
	hardLimitCents: number
): Promise<string> {
	const id = randomUUID();
	await db.insert(schema.appBudgets).values({
		id,
		orgId,
		userId,
		hardLimitCents,
		softLimitCents: null,
		resetDay: 1,
		isOrgDefault: false,
		spendSnapshotCents: 0,
		snapshotUpdatedAt: new Date()
	});
	return id;
}

/**
 * Truncates all app_ tables in the test database.
 */
export async function truncateAll(db: ReturnType<typeof getTestDb>) {
	await db.execute(sql`
		TRUNCATE TABLE
			app_usage_logs,
			app_api_keys,
			app_budgets,
			app_org_invitations,
			app_org_members,
			app_oauth_accounts,
			app_password_resets,
			app_email_verifications,
			app_sessions,
			app_provider_keys,
			app_organizations,
			app_users
		CASCADE
	`);
}

/**
 * Closes the underlying postgres client connection pool.
 */
export async function cleanupDb(db: ReturnType<typeof getTestDb>) {
	if (_client) {
		await _client.end();
		_client = null;
		_db = null;
	}
}
