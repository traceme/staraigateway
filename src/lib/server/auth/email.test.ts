import { describe, it, expect, vi, beforeAll } from 'vitest';

const mockSendMail = vi.fn().mockResolvedValue({});

vi.mock('nodemailer', () => ({
	default: {
		createTransport: vi.fn(() => ({
			sendMail: mockSendMail
		}))
	}
}));

vi.mock('$lib/server/auth/emails/verification', () => ({
	verificationEmail: vi.fn(() => ({
		subject: 'Verify your email',
		html: '<b>verify</b>',
		text: 'verify'
	}))
}));

vi.mock('$lib/server/auth/emails/password-reset', () => ({
	passwordResetEmail: vi.fn(() => ({
		subject: 'Reset password',
		html: '<b>reset</b>',
		text: 'reset'
	}))
}));

vi.mock('$lib/server/auth/emails/budget-warning', () => ({
	budgetWarningEmail: vi.fn(() => ({
		subject: 'Budget warning',
		html: '<b>budget</b>',
		text: 'budget'
	}))
}));

vi.mock('$lib/server/auth/emails/invitation', () => ({
	invitationEmail: vi.fn(() => ({
		subject: 'Invitation',
		html: '<b>invite</b>',
		text: 'invite'
	}))
}));

vi.mock('$lib/server/auth/emails/admin-digest', () => ({
	adminDigestEmail: vi.fn(() => ({
		subject: 'Digest',
		html: '<b>digest</b>',
		text: 'digest'
	}))
}));

import { env } from '$env/dynamic/private';
import {
	sendVerificationEmail,
	sendPasswordResetEmail,
	sendInvitationEmail,
	sendBudgetWarningEmail,
	sendAdminDigestEmail
} from './email';

describe('email sending', () => {
	beforeAll(() => {
		// Set env before first getTransport() call so the lazy singleton creates a transport
		env.SMTP_HOST = 'smtp.test.com';
		env.SMTP_PORT = '587';
		env.SMTP_USER = 'user';
		env.SMTP_PASS = 'pass';
		env.APP_URL = 'http://localhost:3000';
	});

	it('sendVerificationEmail calls sendMail with correct to', async () => {
		mockSendMail.mockClear();
		await sendVerificationEmail('test@x.com', 'Alice', 'tok123');
		expect(mockSendMail).toHaveBeenCalledWith(
			expect.objectContaining({ to: 'test@x.com' })
		);
	});

	it('sendPasswordResetEmail calls sendMail with correct to', async () => {
		mockSendMail.mockClear();
		await sendPasswordResetEmail('reset@x.com', 'Bob', 'tok456');
		expect(mockSendMail).toHaveBeenCalledWith(
			expect.objectContaining({ to: 'reset@x.com' })
		);
	});

	it('sendInvitationEmail calls sendMail', async () => {
		mockSendMail.mockClear();
		await sendInvitationEmail('inv@x.com', 'tok789', 'Acme', 'Bob', 'member');
		expect(mockSendMail).toHaveBeenCalledWith(
			expect.objectContaining({ to: 'inv@x.com' })
		);
	});

	it('sendBudgetWarningEmail calls sendMail', async () => {
		mockSendMail.mockClear();
		await sendBudgetWarningEmail('budget@x.com', 'Alice', '$80', '$100', 'Acme');
		expect(mockSendMail).toHaveBeenCalledWith(
			expect.objectContaining({ to: 'budget@x.com' })
		);
	});

	it('sendAdminDigestEmail calls sendMail', async () => {
		mockSendMail.mockClear();
		await sendAdminDigestEmail('admin@x.com', 'Acme', '2026-03-17', [
			{ name: 'Alice', spend: '$50', limit: '$100', percentage: 50 }
		]);
		expect(mockSendMail).toHaveBeenCalledWith(
			expect.objectContaining({ to: 'admin@x.com' })
		);
	});
});

describe('SMTP not configured', () => {
	it('throws when SMTP_HOST is not set', async () => {
		// Reset modules to get a fresh email module with uninitialized transport
		vi.resetModules();

		// After resetModules, import fresh env and set SMTP_HOST to undefined
		const { env: freshEnv } = await import('$env/dynamic/private');
		freshEnv.SMTP_HOST = undefined;
		freshEnv.APP_URL = 'http://localhost:3000';

		const { sendVerificationEmail: freshSend } = await import('./email');
		await expect(freshSend('test@x.com', 'Alice', 'tok')).rejects.toThrow(
			'SMTP not configured'
		);
	});
});
