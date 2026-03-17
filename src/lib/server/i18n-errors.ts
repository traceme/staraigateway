/**
 * Maps Zod validation error messages to i18n translation keys.
 * Server actions use this to return translatable error keys instead
 * of hardcoded English strings.
 */
export function zodErrorToKey(zodMessage: string): string {
	const map: Record<string, string> = {
		'Name is required': 'validation.name_required',
		'Name must be 50 characters or less': 'validation.name_too_long',
		'Please enter a valid email address': 'validation.email_invalid',
		'Key ID is required': 'validation.key_id_required',
		'Invalid role': 'validation.invalid_role',
		'Provider is required': 'validation.name_required',
		'Label is required': 'validation.name_required',
		'API key is required': 'validation.name_required',
		'Label must be 50 characters or less': 'validation.name_too_long'
	};
	return map[zodMessage] ?? 'errors.generic';
}
