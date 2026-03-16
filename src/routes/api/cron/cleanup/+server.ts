import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { appSessions } from '$lib/server/db/schema';
import { lt } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ request }) => {
	if (!env.CRON_SECRET) {
		return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token || token !== env.CRON_SECRET) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const result = await db
		.delete(appSessions)
		.where(lt(appSessions.expiresAt, new Date()))
		.returning({ id: appSessions.id });

	return new Response(
		JSON.stringify({ success: true, sessionsDeleted: result.length }),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};
