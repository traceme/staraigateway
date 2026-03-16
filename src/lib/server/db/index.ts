import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
	if (!_db) {
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error('DATABASE_URL environment variable is not set');
		}
		const client = postgres(connectionString, {
			max: parseInt(process.env.DB_POOL_MAX || '20'),
			idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
			connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
		});
		_db = drizzle(client, { schema });
	}
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_target, prop) {
		return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
	}
});
