import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockDeleteWhere = vi.fn();
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

const mockUpdateSet = vi.fn(() => ({ where: vi.fn() }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

vi.mock('$lib/server/db', () => ({
	db: {
		insert: (...args: unknown[]) => mockInsert(...args),
		select: (...args: unknown[]) => mockSelect(...args),
		delete: (...args: unknown[]) => mockDelete(...args),
		update: (...args: unknown[]) => mockUpdate(...args)
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	appSessions: { id: 'id', userId: 'userId', expiresAt: 'expiresAt' },
	appUsers: { id: 'id' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((_col, val) => val)
}));

vi.mock('@oslojs/encoding', () => ({
	encodeBase32LowerCaseNoPadding: vi.fn(() => 'mockedtoken123')
}));

vi.mock('@oslojs/crypto/sha2', () => ({
	sha256: vi.fn(() => new Uint8Array(32))
}));

import {
	generateSessionToken,
	createSession,
	validateSession,
	invalidateSession,
	invalidateAllUserSessions,
	SESSION_COOKIE_NAME
} from './session';

describe('session', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('generateSessionToken', () => {
		it('returns a string', () => {
			const token = generateSessionToken();
			expect(typeof token).toBe('string');
			expect(token).toBe('mockedtoken123');
		});
	});

	describe('createSession', () => {
		it('inserts into DB and returns token + session', async () => {
			const mockSession = {
				id: 'sess-hash',
				userId: 'user-1',
				expiresAt: new Date()
			};
			mockReturning.mockResolvedValueOnce([mockSession]);

			const result = await createSession('user-1');
			expect(result.token).toBe('mockedtoken123');
			expect(result.session).toEqual(mockSession);
			expect(mockInsert).toHaveBeenCalled();
		});
	});

	describe('validateSession', () => {
		it('returns user+session for valid token (not in refresh window)', async () => {
			const futureDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000); // 25 days
			mockLimit.mockResolvedValueOnce([
				{
					session: { id: 'x', userId: 'user-1', expiresAt: futureDate },
					user: { id: 'user-1', name: 'Alice', email: 'alice@test.com' }
				}
			]);

			const result = await validateSession('mockedtoken123');
			expect(result).not.toBeNull();
			expect(result!.fresh).toBe(false);
			expect(result!.user.id).toBe('user-1');
		});

		it('returns null for expired session and deletes it', async () => {
			const pastDate = new Date(Date.now() - 1000);
			mockLimit.mockResolvedValueOnce([
				{
					session: { id: 'x', userId: 'user-1', expiresAt: pastDate },
					user: { id: 'user-1' }
				}
			]);

			const result = await validateSession('mockedtoken123');
			expect(result).toBeNull();
			expect(mockDelete).toHaveBeenCalled();
		});

		it('extends session in refresh window and returns fresh: true', async () => {
			const nearExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
			const mockUpdateWhere = vi.fn();
			mockUpdateSet.mockReturnValueOnce({ where: mockUpdateWhere });
			mockLimit.mockResolvedValueOnce([
				{
					session: { id: 'x', userId: 'user-1', expiresAt: nearExpiry },
					user: { id: 'user-1' }
				}
			]);

			const result = await validateSession('mockedtoken123');
			expect(result).not.toBeNull();
			expect(result!.fresh).toBe(true);
			expect(mockUpdate).toHaveBeenCalled();
		});

		it('returns null when session not found', async () => {
			mockLimit.mockResolvedValueOnce([]);

			const result = await validateSession('nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('invalidateSession', () => {
		it('calls db.delete', async () => {
			await invalidateSession('sess-1');
			expect(mockDelete).toHaveBeenCalled();
		});
	});

	describe('invalidateAllUserSessions', () => {
		it('calls db.delete', async () => {
			await invalidateAllUserSessions('user-1');
			expect(mockDelete).toHaveBeenCalled();
		});
	});

	it('exports SESSION_COOKIE_NAME', () => {
		expect(SESSION_COOKIE_NAME).toBe('auth_session');
	});
});
