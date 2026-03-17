import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { execSync } from 'child_process';
import * as schema from '../db/schema';

export const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/staraigateway_test';

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
 * This applies all table definitions without needing migration files.
 */
export async function pushSchema() {
	execSync('npx drizzle-kit push --force', {
		env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
		stdio: 'pipe'
	});
}

/**
 * Wraps a function in a database transaction that always rolls back.
 * Useful for test isolation — any writes inside fn are discarded.
 */
export async function withTestTransaction<T>(
	fn: (tx: Parameters<Parameters<ReturnType<typeof drizzle>['transaction']>[0]>[0]) => Promise<T>
): Promise<T> {
	const db = getTestDb();
	let result: T;
	try {
		await db.transaction(async (tx) => {
			result = await fn(tx);
			throw new RollbackError();
		});
	} catch (e) {
		if (e instanceof RollbackError) {
			return result!;
		}
		throw e;
	}
	return result!;
}

class RollbackError extends Error {
	constructor() {
		super('Transaction rollback');
		this.name = 'RollbackError';
	}
}

/**
 * Truncates all app_ tables in the test database.
 * Use in afterAll/afterEach for cleanup between test suites.
 */
export async function truncateAllTables() {
	const db = getTestDb();
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
 * Call in afterAll at the top-level suite.
 */
export async function cleanupTestDb() {
	if (_client) {
		await _client.end();
		_client = null;
		_db = null;
	}
}
