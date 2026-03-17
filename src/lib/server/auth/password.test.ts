import { describe, it, expect, vi } from 'vitest';

vi.mock('@node-rs/argon2', () => ({
	hash: vi.fn().mockResolvedValue('$argon2id$hashed'),
	verify: vi.fn().mockResolvedValue(true)
}));

import { hashPassword, verifyPassword } from './password';
import { verify as argon2Verify } from '@node-rs/argon2';

describe('hashPassword', () => {
	it('returns a string', async () => {
		const result = await hashPassword('test');
		expect(typeof result).toBe('string');
		expect(result).toBe('$argon2id$hashed');
	});
});

describe('verifyPassword', () => {
	it('returns true for matching password', async () => {
		const result = await verifyPassword('$argon2id$hashed', 'test');
		expect(result).toBe(true);
	});

	it('returns false for mismatched password', async () => {
		vi.mocked(argon2Verify).mockResolvedValueOnce(false);
		const result = await verifyPassword('$argon2id$hashed', 'wrong');
		expect(result).toBe(false);
	});

	it('returns false on argon2 error', async () => {
		vi.mocked(argon2Verify).mockRejectedValueOnce(new Error('argon2 internal error'));
		const result = await verifyPassword('$argon2id$hashed', 'test');
		expect(result).toBe(false);
	});
});
