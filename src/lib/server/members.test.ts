import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock setup ---

const mockSendInvitationEmail = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/server/auth/email', () => ({
	sendInvitationEmail: (...args: unknown[]) => mockSendInvitationEmail(...args)
}));

vi.mock('$lib/server/db/schema', () => ({
	appUsers: { id: 'id', email: 'email' },
	appOrgMembers: { id: 'id', orgId: 'orgId', userId: 'userId', role: 'role' },
	appOrgInvitations: {
		id: 'id',
		orgId: 'orgId',
		email: 'email',
		token: 'token',
		acceptedAt: 'acceptedAt'
	},
	appApiKeys: { orgId: 'orgId', userId: 'userId', isActive: 'isActive' },
	appOrganizations: { id: 'id', name: 'name' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((_col, val) => ({ type: 'eq', val })),
	and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
	isNull: vi.fn((col) => ({ type: 'isNull', col }))
}));

// Build chainable mock that supports sequential calls with different results
function mockChain(result: unknown) {
	const chain: Record<string, unknown> = {};
	const limitFn = vi.fn().mockResolvedValue(result);
	const whereFn = vi.fn(() => ({ limit: limitFn }));
	const fromFn = vi.fn(() => ({ where: whereFn, limit: limitFn }));
	chain.from = fromFn;
	chain.where = whereFn;
	chain.limit = limitFn;
	return { chain, limitFn, whereFn, fromFn };
}

const mockSelectResults: unknown[][] = [];
let selectCallIndex = 0;

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockDeleteWhere = vi.fn();
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

// Mock tx for transaction
const mockTxInsertValues = vi.fn();
const mockTxInsert = vi.fn(() => ({ values: mockTxInsertValues }));
const mockTxUpdateWhere = vi.fn();
const mockTxUpdateSet = vi.fn(() => ({ where: mockTxUpdateWhere }));
const mockTxUpdate = vi.fn(() => ({ set: mockTxUpdateSet }));

const mockTransaction = vi.fn(async (cb: (tx: unknown) => Promise<void>) => {
	await cb({
		insert: mockTxInsert,
		update: mockTxUpdate
	});
});

// Select mock that returns different results for sequential calls
const mockSelectLimit = vi.fn(() => {
	const result = mockSelectResults[selectCallIndex] ?? [];
	selectCallIndex++;
	return Promise.resolve(result);
});
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere, limit: mockSelectLimit }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock('$lib/server/db', () => ({
	db: {
		select: (...args: unknown[]) => mockSelect(...args),
		insert: (...args: unknown[]) => mockInsert(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
		delete: (...args: unknown[]) => mockDelete(...args),
		transaction: (...args: unknown[]) => mockTransaction(...(args as [any]))
	}
}));

// Mock crypto.randomUUID and node:crypto
vi.mock('node:crypto', () => ({
	randomBytes: vi.fn(() => ({
		toString: () => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
	}))
}));

// Mock crypto.randomUUID globally
const originalRandomUUID = globalThis.crypto?.randomUUID;
beforeEach(() => {
	if (globalThis.crypto) {
		globalThis.crypto.randomUUID = (() => 'test-uuid-1234') as () => `${string}-${string}-${string}-${string}-${string}`;
	}
});

import {
	inviteMember,
	acceptInvitation,
	removeMember,
	changeRole,
	revokeInvitation
} from './members';

describe('members', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectCallIndex = 0;
		mockSelectResults.length = 0;
		mockSendInvitationEmail.mockResolvedValue(undefined);
	});

	describe('inviteMember', () => {
		it('creates invitation and sends email for new email', async () => {
			// select 1: user lookup -> no user found
			// select 2: existing invite check -> none
			// select 3: (after insert) org name
			// select 4: inviter name
			mockSelectResults.push(
				[],  // no existing user
				[],  // no existing invite
				[{ name: 'Acme Corp' }],  // org name
				[{ name: 'Bob' }]  // inviter name
			);

			const result = await inviteMember('org-1', 'new@example.com', 'member', 'user-inviter');
			expect(result).toHaveProperty('id');
			expect(mockInsert).toHaveBeenCalled();
			expect(mockSendInvitationEmail).toHaveBeenCalledWith(
				'new@example.com',
				expect.any(String),
				'Acme Corp',
				'Bob',
				'member'
			);
		});

		it('rejects duplicate member', async () => {
			// select 1: user lookup -> found
			// select 2: member check -> found (already a member)
			mockSelectResults.push(
				[{ id: 'user-1' }],  // existing user
				[{ id: 'member-1' }]  // already a member
			);

			await expect(
				inviteMember('org-1', 'existing@example.com', 'member', 'user-inviter')
			).rejects.toThrow('already a member');
		});

		it('rejects duplicate pending invite', async () => {
			// select 1: user lookup -> no user
			// select 2: invite check -> found
			mockSelectResults.push(
				[],  // no existing user
				[{ id: 'inv-1' }]  // existing invite
			);

			await expect(
				inviteMember('org-1', 'invited@example.com', 'member', 'user-inviter')
			).rejects.toThrow('already been invited');
		});

		it('handles graceful SMTP failure without throwing', async () => {
			mockSendInvitationEmail.mockRejectedValueOnce(new Error('SMTP down'));
			mockSelectResults.push(
				[],  // no existing user
				[],  // no existing invite
				[{ name: 'Acme' }],  // org name
				[{ name: 'Bob' }]  // inviter name
			);

			// Should NOT throw despite SMTP failure
			const result = await inviteMember('org-1', 'new@example.com', 'member', 'user-inviter');
			expect(result).toHaveProperty('id');
		});
	});

	describe('acceptInvitation', () => {
		it('creates membership in transaction for valid invitation', async () => {
			const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			// select 1: invitation lookup
			// select 2: member check -> not yet a member
			mockSelectResults.push(
				[{
					id: 'inv-1',
					orgId: 'org-1',
					email: 'new@example.com',
					role: 'member',
					token: 'tok123',
					invitedBy: 'user-inviter',
					expiresAt: futureDate,
					acceptedAt: null,
					createdAt: new Date()
				}],
				[]  // not yet a member
			);

			const result = await acceptInvitation('tok123', 'user-new');
			expect(result).toEqual({ orgId: 'org-1' });
			expect(mockTransaction).toHaveBeenCalled();
			expect(mockTxInsert).toHaveBeenCalled();
			expect(mockTxUpdate).toHaveBeenCalled();
		});

		it('rejects expired invitation', async () => {
			const pastDate = new Date(Date.now() - 1000);
			mockSelectResults.push([{
				id: 'inv-1',
				orgId: 'org-1',
				email: 'old@example.com',
				role: 'member',
				token: 'tok-expired',
				invitedBy: 'user-inviter',
				expiresAt: pastDate,
				acceptedAt: null,
				createdAt: new Date()
			}]);

			await expect(acceptInvitation('tok-expired', 'user-1')).rejects.toThrow('expired');
		});

		it('rejects already-accepted invitation', async () => {
			const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			mockSelectResults.push([{
				id: 'inv-1',
				orgId: 'org-1',
				email: 'used@example.com',
				role: 'member',
				token: 'tok-used',
				invitedBy: 'user-inviter',
				expiresAt: futureDate,
				acceptedAt: new Date(),
				createdAt: new Date()
			}]);

			await expect(acceptInvitation('tok-used', 'user-1')).rejects.toThrow(
				'already been accepted'
			);
		});

		it('rejects unknown token', async () => {
			mockSelectResults.push([]);  // no invitation found

			await expect(acceptInvitation('tok-unknown', 'user-1')).rejects.toThrow('not found');
		});

		it('marks accepted without transaction when already a member', async () => {
			const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			mockSelectResults.push(
				[{
					id: 'inv-1',
					orgId: 'org-1',
					email: 'existing@example.com',
					role: 'member',
					token: 'tok-existing',
					invitedBy: 'user-inviter',
					expiresAt: futureDate,
					acceptedAt: null,
					createdAt: new Date()
				}],
				[{ id: 'member-existing' }]  // already a member
			);

			const result = await acceptInvitation('tok-existing', 'user-existing');
			expect(result).toEqual({ orgId: 'org-1' });
			expect(mockUpdate).toHaveBeenCalled();
			expect(mockTransaction).not.toHaveBeenCalled();
		});
	});

	describe('removeMember', () => {
		it('deactivates keys and deletes membership', async () => {
			mockSelectResults.push([{ role: 'member' }]);  // target is a member

			await removeMember('org-1', 'user-target', 'admin');
			expect(mockUpdate).toHaveBeenCalled();  // deactivate keys
			expect(mockDelete).toHaveBeenCalled();  // remove membership
		});

		it('rejects non-admin/owner actor', async () => {
			await expect(removeMember('org-1', 'user-target', 'member')).rejects.toThrow(
				'Only admins and owners'
			);
		});

		it('rejects removing owner', async () => {
			mockSelectResults.push([{ role: 'owner' }]);

			await expect(removeMember('org-1', 'user-owner', 'admin')).rejects.toThrow(
				'Cannot remove the organization owner'
			);
		});

		it('rejects unknown member', async () => {
			mockSelectResults.push([]);  // no member found

			await expect(removeMember('org-1', 'user-ghost', 'admin')).rejects.toThrow(
				'Member not found'
			);
		});
	});

	describe('changeRole', () => {
		it('changes role successfully when actor is owner', async () => {
			mockSelectResults.push([{ role: 'member' }]);  // target is member

			await changeRole('org-1', 'user-target', 'admin', 'owner');
			expect(mockUpdate).toHaveBeenCalled();
		});

		it('rejects non-owner actor', async () => {
			await expect(
				changeRole('org-1', 'user-target', 'admin', 'admin')
			).rejects.toThrow('Only the owner');
		});

		it('rejects changing owner role', async () => {
			mockSelectResults.push([{ role: 'owner' }]);

			await expect(
				changeRole('org-1', 'user-owner', 'admin', 'owner')
			).rejects.toThrow("Cannot change the owner's role");
		});
	});

	describe('revokeInvitation', () => {
		it('calls db.delete', async () => {
			await revokeInvitation('org-1', 'inv-1');
			expect(mockDelete).toHaveBeenCalled();
		});
	});
});
