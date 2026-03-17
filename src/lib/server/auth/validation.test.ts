import { describe, it, expect } from 'vitest';
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './validation';

describe('signupSchema', () => {
	it('accepts valid input', () => {
		const result = signupSchema.parse({
			name: 'Alice',
			email: 'alice@example.com',
			password: 'password123'
		});
		expect(result.name).toBe('Alice');
		expect(result.email).toBe('alice@example.com');
	});

	it('rejects empty name', () => {
		const result = signupSchema.safeParse({
			name: '',
			email: 'a@b.com',
			password: '12345678'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Name is required');
		}
	});

	it('rejects short password', () => {
		const result = signupSchema.safeParse({
			name: 'Alice',
			email: 'a@b.com',
			password: 'short'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('at least 8 characters');
		}
	});

	it('lowercases email', () => {
		const result = signupSchema.parse({
			name: 'Alice',
			email: 'Alice@Example.COM',
			password: 'password123'
		});
		expect(result.email).toBe('alice@example.com');
	});
});

describe('loginSchema', () => {
	it('accepts valid input', () => {
		const result = loginSchema.parse({ email: 'a@b.com', password: 'x' });
		expect(result.email).toBe('a@b.com');
	});

	it('rejects empty password', () => {
		const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Password is required');
		}
	});
});

describe('forgotPasswordSchema', () => {
	it('rejects invalid email', () => {
		const result = forgotPasswordSchema.safeParse({ email: 'not-email' });
		expect(result.success).toBe(false);
	});

	it('accepts valid email', () => {
		const result = forgotPasswordSchema.parse({ email: 'test@example.com' });
		expect(result.email).toBe('test@example.com');
	});
});

describe('resetPasswordSchema', () => {
	it('rejects empty token', () => {
		const result = resetPasswordSchema.safeParse({ token: '', password: '12345678' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Token is required');
		}
	});

	it('rejects short password', () => {
		const result = resetPasswordSchema.safeParse({ token: 'abc', password: 'short' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('at least 8 characters');
		}
	});
});
