import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

function getEncryptionKey(): Buffer {
	const keyHex = env.ENCRYPTION_KEY;
	if (!keyHex) {
		throw new Error('ENCRYPTION_KEY environment variable is not set');
	}
	if (keyHex.length !== 64) {
		throw new Error(
			`ENCRYPTION_KEY must be 64 hex characters (32 bytes), got ${keyHex.length} characters`
		);
	}
	return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a string in the format: iv_hex:ciphertext_hex:authTag_hex
 */
export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(12); // 96-bit IV for GCM
	const cipher = createCipheriv('aes-256-gcm', key, iv);

	let encrypted = cipher.update(plaintext, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	const authTag = cipher.getAuthTag();

	return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt a string encrypted with encrypt().
 * Expects format: iv_hex:ciphertext_hex:authTag_hex
 */
export function decrypt(encrypted: string): string {
	const key = getEncryptionKey();
	const parts = encrypted.split(':');
	if (parts.length !== 3) {
		throw new Error('Invalid encrypted data format: expected iv:ciphertext:authTag');
	}

	const [ivHex, ciphertextHex, authTagHex] = parts;
	const iv = Buffer.from(ivHex, 'hex');
	const ciphertext = Buffer.from(ciphertextHex, 'hex');
	const authTag = Buffer.from(authTagHex, 'hex');

	const decipher = createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(ciphertext);
	decrypted = Buffer.concat([decrypted, decipher.final()]);

	return decrypted.toString('utf8');
}
