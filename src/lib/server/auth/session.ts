import { db } from '$lib/server/db';
import { appSessions, appUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import type { User, Session } from '$lib/types';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

/**
 * Generate a cryptographically random session token.
 * Returns a base32-encoded string (32 random bytes).
 */
export function generateSessionToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

/**
 * Hash a session token with SHA-256 for storage in the database.
 * The unhashed token is stored in the cookie; the hashed version in the DB.
 */
function hashToken(token: string): string {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hashBuffer = sha256(data);
	// Convert to hex string
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export interface SessionValidationResult {
	user: User;
	session: Session;
	fresh: boolean; // true if session was extended (sliding window)
}

/**
 * Create a new session for a user.
 * Inserts a hashed session token into the database.
 * Returns the unhashed token (for the cookie) and the session record.
 */
export async function createSession(
	userId: string
): Promise<{ token: string; session: Session }> {
	const token = generateSessionToken();
	const sessionId = hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	const [session] = await db
		.insert(appSessions)
		.values({
			id: sessionId,
			userId,
			expiresAt
		})
		.returning();

	return { token, session };
}

/**
 * Validate a session token.
 * Looks up the hashed token in the database, checks expiry,
 * and implements sliding window renewal (extends if within 15 days of expiry).
 * Returns null if the session is invalid or expired.
 */
export async function validateSession(
	token: string
): Promise<SessionValidationResult | null> {
	const sessionId = hashToken(token);

	const rows = await db
		.select({
			session: appSessions,
			user: appUsers
		})
		.from(appSessions)
		.innerJoin(appUsers, eq(appSessions.userId, appUsers.id))
		.where(eq(appSessions.id, sessionId))
		.limit(1);

	if (rows.length === 0) {
		return null;
	}

	const { session, user } = rows[0];

	// Check if session has expired
	if (Date.now() >= session.expiresAt.getTime()) {
		// Clean up expired session
		await db.delete(appSessions).where(eq(appSessions.id, sessionId));
		return null;
	}

	// Sliding window: extend session if within refresh threshold
	let fresh = false;
	if (Date.now() >= session.expiresAt.getTime() - SESSION_REFRESH_THRESHOLD_MS) {
		const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		await db
			.update(appSessions)
			.set({ expiresAt: newExpiresAt })
			.where(eq(appSessions.id, sessionId));
		session.expiresAt = newExpiresAt;
		fresh = true;
	}

	return { user, session, fresh };
}

/**
 * Invalidate a single session by its hashed ID.
 */
export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(appSessions).where(eq(appSessions.id, sessionId));
}

/**
 * Invalidate all sessions for a user (e.g., after password reset).
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
	await db.delete(appSessions).where(eq(appSessions.userId, userId));
}

/**
 * Cookie name for the session token.
 */
export const SESSION_COOKIE_NAME = 'auth_session';
