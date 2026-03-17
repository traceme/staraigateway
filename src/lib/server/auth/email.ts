import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { verificationEmail } from './emails/verification';
import { passwordResetEmail } from './emails/password-reset';
import { budgetWarningEmail } from './emails/budget-warning';
import { adminDigestEmail } from './emails/admin-digest';
import { invitationEmail } from './emails/invitation';

let transport: nodemailer.Transporter | null | undefined; // undefined = not yet initialized

function getTransport(): nodemailer.Transporter | null {
	if (transport !== undefined) return transport;

	if (!env.SMTP_HOST) {
		transport = null;
		return null;
	}

	transport = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: Number(env.SMTP_PORT) || 587,
		secure: Number(env.SMTP_PORT) === 465,
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS
		}
	});
	return transport;
}

function getFromAddress(): string {
	return env.SMTP_FROM || `LLMTokenHub <noreply@${env.SMTP_HOST || 'localhost'}>`;
}

function getAppUrl(): string {
	return env.APP_URL || 'http://localhost:5173';
}

export async function sendVerificationEmail(
	email: string,
	name: string,
	token: string
): Promise<void> {
	const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${token}`;
	const { subject, html, text } = verificationEmail(name, verifyUrl);

	const transport = getTransport();
	if (!transport) throw new Error('SMTP not configured');
	await transport.sendMail({
		from: getFromAddress(),
		to: email,
		subject,
		html,
		text
	});
}

export async function sendPasswordResetEmail(
	email: string,
	name: string,
	token: string
): Promise<void> {
	const resetUrl = `${getAppUrl()}/auth/reset-password?token=${token}`;
	const { subject, html, text } = passwordResetEmail(name, resetUrl);

	const transport = getTransport();
	if (!transport) throw new Error('SMTP not configured');
	await transport.sendMail({
		from: getFromAddress(),
		to: email,
		subject,
		html,
		text
	});
}

export async function sendBudgetWarningEmail(
	email: string,
	memberName: string,
	currentSpend: string,
	limit: string,
	orgName: string
): Promise<void> {
	const { subject, html, text } = budgetWarningEmail(memberName, currentSpend, limit, orgName);
	const transport = getTransport();
	if (!transport) throw new Error('SMTP not configured');
	await transport.sendMail({ from: getFromAddress(), to: email, subject, html, text });
}

export async function sendInvitationEmail(
	email: string,
	token: string,
	orgName: string,
	inviterName: string,
	role: string
): Promise<void> {
	const acceptUrl = `${getAppUrl()}/auth/invite/${token}`;
	const { subject, html, text } = invitationEmail(orgName, inviterName, role, acceptUrl);

	const transport = getTransport();
	if (!transport) throw new Error('SMTP not configured');
	await transport.sendMail({
		from: getFromAddress(),
		to: email,
		subject,
		html,
		text
	});
}

export async function sendAdminDigestEmail(
	adminEmail: string,
	orgName: string,
	date: string,
	members: Array<{ name: string; spend: string; limit: string; percentage: number }>
): Promise<void> {
	const { subject, html, text } = adminDigestEmail(orgName, date, members);
	const transport = getTransport();
	if (!transport) throw new Error('SMTP not configured');
	await transport.sendMail({ from: getFromAddress(), to: adminEmail, subject, html, text });
}
