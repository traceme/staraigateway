import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Not authenticated');

	const { language } = await request.json();
	if (language !== 'en' && language !== 'zh') {
		error(400, 'Invalid language');
	}

	await db
		.update(appUsers)
		.set({ language, updatedAt: new Date() })
		.where(eq(appUsers.id, locals.user.id));

	return json({ success: true });
};
