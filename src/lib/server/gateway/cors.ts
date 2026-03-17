import { env } from '$env/dynamic/private';

let cachedOrigins: Set<string> | null = null;

function getAllowedOrigins(): Set<string> {
	if (cachedOrigins) return cachedOrigins;
	const configured = env.CORS_ALLOWED_ORIGINS;
	if (configured) {
		cachedOrigins = new Set(configured.split(',').map((s) => s.trim()).filter(Boolean));
	} else {
		cachedOrigins = new Set([env.APP_URL ?? 'http://localhost:3000']);
	}
	return cachedOrigins;
}

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
	const allowed = getAllowedOrigins();
	const origin = requestOrigin && allowed.has(requestOrigin) ? requestOrigin : '';
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Headers': 'Authorization, Content-Type',
		'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
		...(origin ? { Vary: 'Origin' } : {})
	};
}
