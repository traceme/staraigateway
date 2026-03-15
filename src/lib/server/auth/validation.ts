import { z } from 'zod';

export const signupSchema = z.object({
	name: z.string().min(1, 'Name is required').trim(),
	email: z.string().email('Invalid email address').toLowerCase().trim(),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

export const loginSchema = z.object({
	email: z.string().email('Invalid email address').toLowerCase().trim(),
	password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
	email: z.string().email('Invalid email address').toLowerCase().trim()
});

export const resetPasswordSchema = z.object({
	token: z.string().min(1, 'Token is required'),
	password: z.string().min(8, 'Password must be at least 8 characters')
});
