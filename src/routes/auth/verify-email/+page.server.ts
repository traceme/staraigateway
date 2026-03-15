import { db } from '$lib/server/db';
import { appEmailVerifications, appUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return { error: 'Missing verification token.' };
	}

	// Look up token
	const verifications = await db
		.select()
		.from(appEmailVerifications)
		.where(eq(appEmailVerifications.id, token))
		.limit(1);

	if (verifications.length === 0) {
		return { error: 'Invalid or expired verification link.' };
	}

	const verification = verifications[0];

	// Check expiry
	if (Date.now() >= verification.expiresAt.getTime()) {
		// Clean up expired token
		await db.delete(appEmailVerifications).where(eq(appEmailVerifications.id, token));
		return { error: 'This verification link has expired. Please sign up again.' };
	}

	// Mark user as verified
	await db
		.update(appUsers)
		.set({ emailVerified: true })
		.where(eq(appUsers.id, verification.userId));

	// Delete the verification token
	await db.delete(appEmailVerifications).where(eq(appEmailVerifications.id, token));

	return { success: true };
};
