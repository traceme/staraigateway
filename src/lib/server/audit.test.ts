import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
const mockThen = vi.fn();
const mockCatch = vi.fn();
const mockValues = vi.fn(() => ({ then: mockThen }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

vi.mock('$lib/server/db', () => ({
	db: {
		insert: (...args: unknown[]) => mockInsert(...args)
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	appAuditLogs: { __table: 'app_audit_logs' }
}));

import { recordAuditEvent } from './audit';
import { appAuditLogs } from '$lib/server/db/schema';

describe('recordAuditEvent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockThen.mockReturnValue({ catch: mockCatch });
	});

	it('calls db.insert with appAuditLogs table', () => {
		recordAuditEvent('org-1', 'user-1', 'member_invited', 'member', 'target-1');

		expect(mockInsert).toHaveBeenCalledWith(appAuditLogs);
	});

	it('passes correct values including all fields', () => {
		const metadata = { role: 'admin' };
		recordAuditEvent('org-1', 'user-1', 'role_changed', 'member', 'target-1', metadata);

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				orgId: 'org-1',
				actorId: 'user-1',
				actionType: 'role_changed',
				targetType: 'member',
				targetId: 'target-1',
				metadata: { role: 'admin' }
			})
		);
	});

	it('passes null metadata when not provided', () => {
		recordAuditEvent('org-1', 'user-1', 'settings_updated', 'org', null);

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: null,
				targetId: null
			})
		);
	});

	it('generates a UUID for the id field', () => {
		recordAuditEvent('org-1', 'user-1', 'api_key_created', 'api_key', 'key-1');

		const values = mockValues.mock.calls[0][0];
		expect(values.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		);
	});

	it('sets createdAt to a Date instance', () => {
		recordAuditEvent('org-1', 'user-1', 'member_removed', 'member', 'user-2');

		const values = mockValues.mock.calls[0][0];
		expect(values.createdAt).toBeInstanceOf(Date);
	});

	it('registers a catch handler for error suppression', () => {
		recordAuditEvent('org-1', 'user-1', 'budget_changed', 'budget', 'budget-1');

		expect(mockThen).toHaveBeenCalled();
		expect(mockCatch).toHaveBeenCalled();
	});

	it('catch handler logs error without throwing', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Capture the catch callback
		recordAuditEvent('org-1', 'user-1', 'provider_key_added', 'provider_key', 'pk-1');

		const catchCallback = mockCatch.mock.calls[0][0];
		const testError = new Error('DB connection failed');

		// Should not throw
		expect(() => catchCallback(testError)).not.toThrow();
		expect(consoleSpy).toHaveBeenCalledWith(
			'Failed to record audit event: provider_key_added',
			testError
		);

		consoleSpy.mockRestore();
	});

	it('returns void (fire-and-forget pattern)', () => {
		const result = recordAuditEvent('org-1', 'user-1', 'settings_updated', 'org', null);
		expect(result).toBeUndefined();
	});
});
