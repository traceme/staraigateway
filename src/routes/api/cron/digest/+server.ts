import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { appOrganizations } from '$lib/server/db/schema';
import { sendAdminDigest } from '$lib/server/budget/notifications';
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

	const orgs = await db.select({ id: appOrganizations.id }).from(appOrganizations);

	for (const org of orgs) {
		try {
			await sendAdminDigest(org.id);
		} catch (err) {
			console.error(`Failed to send digest for org ${org.id}:`, err);
		}
	}

	return new Response(JSON.stringify({ success: true, orgsProcessed: orgs.length }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
