/**
 * Detect whether the current request is served over HTTPS.
 * Checks X-Forwarded-Proto header first (reverse proxy), then URL protocol.
 */
export function isSecureContext(request: Request, url: URL): boolean {
	const forwardedProto = request.headers.get('x-forwarded-proto');
	if (forwardedProto) return forwardedProto === 'https';
	return url.protocol === 'https:';
}
