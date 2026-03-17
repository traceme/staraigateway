# Phase 8: Security Hardening - Research

**Researched:** 2026-03-17
**Domain:** Web application security (OAuth, CORS, cookies, request validation, token generation)
**Confidence:** HIGH

## Summary

Phase 8 addresses six distinct security vulnerabilities in the LLMTokenHub application. All six are well-scoped, localized fixes with clear implementation paths. The codebase already has the necessary infrastructure (Argon2 password verification, Zod validation, Drizzle ORM, SvelteKit cookie API) -- no new libraries are needed.

The most complex change is SEC-01 (OAuth account linking verification), which requires a new SvelteKit page for password confirmation and modifications to both OAuth callbacks. The remaining five changes are straightforward: replacing hardcoded CORS headers with environment-driven allowlists, detecting HTTPS for cookie flags, adding Content-Length checks before body parsing, upgrading invitation token entropy, and verifying `.env.example` cleanliness.

**Primary recommendation:** Implement in two plans -- one for the OAuth linking flow (SEC-01, which involves new UI + callback refactoring) and one for the remaining gateway/infrastructure hardening (SEC-02 through SEC-06).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- SEC-01: OAuth account linking requires password confirmation (not email challenge). Redirect to confirmation page. Skip verification for OAuth-only accounts (no passwordHash).
- SEC-02: `CORS_ALLOWED_ORIGINS` env var, comma-separated. Default to `APP_URL` only. Never wildcard.
- SEC-03: Detect HTTPS via `X-Forwarded-Proto` header or `url.protocol`. Apply to login, Google callback, GitHub callback.
- SEC-04: Check `Content-Length` before `request.json()`. Default 10MB. Configurable via `MAX_REQUEST_BODY_BYTES`. Apply to chat/completions and embeddings only.
- SEC-05: Add `token` column with `randomBytes(32).toString('hex')`. Keep `id` as UUID. Schema migration with backfill.
- SEC-06: Verify no default secrets in `.env.example`. Add new env vars from this phase.

### Claude's Discretion
- Exact error messages for 413 and CORS rejection
- Order of implementation within plans
- Whether to split into 1 or 2 plans
- Password confirmation UI page design details
- Index type for the new `token` column

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | OAuth account linking requires password confirmation before linking | OAuth callback code inspected (lines 50-58 in Google, 80-88 in GitHub). `verifyPassword` from `password.ts` is available. Need new `/auth/oauth/confirm-link` page. |
| SEC-02 | Gateway CORS restricted to configurable allowlist | All 3 `/v1/*` endpoints use identical `CORS_HEADERS` with `*`. Extract to shared utility reading `CORS_ALLOWED_ORIGINS` env var. |
| SEC-03 | Session cookies set Secure flag when behind HTTPS | 3 cookie-set locations identified: login (+page.server.ts:81), Google callback (+server.ts:87), GitHub callback (+server.ts:115). `hooks.server.ts` already has HTTPS detection pattern (line 31). |
| SEC-04 | Request body size limit on /v1/* endpoints | `proxy.ts` line 83 calls `request.json()` without size check. Add Content-Length guard before this call. |
| SEC-05 | Invitation tokens use randomBytes(32) separate from record ID | Schema already has separate `token` column (schema.ts:205). `members.ts` uses `crypto.randomUUID()` for token -- upgrade to `randomBytes(32).toString('hex')`. No schema migration needed. |
| SEC-06 | .env.example has no default secret values | Phase 7 already cleaned LITELLM_MASTER_KEY. Add `CORS_ALLOWED_ORIGINS` and `MAX_REQUEST_BODY_BYTES` entries. |
</phase_requirements>

## Standard Stack

### Core (already in project -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | existing | Framework for pages, routing, hooks, cookies | Already the app framework |
| Drizzle ORM | existing | DB schema, migrations, queries | Already used for all DB access |
| Zod | ^3.24 | Input validation | Already used throughout for `.safeParse()` |
| @node-rs/argon2 | existing | Password hashing/verification | Already used in `password.ts` |
| Node.js crypto | built-in | `randomBytes(32)` for token generation | Built-in, no dependency needed |

### No New Dependencies Required
This phase is entirely about hardening existing code. No new npm packages are needed. All required primitives (Argon2 verify, cookie API, CORS headers, Content-Length, randomBytes) are already available.

## Architecture Patterns

### SEC-01: OAuth Confirmation Flow

**Current flow (vulnerable):**
```
OAuth callback → email matches existing user? → silently link → create session
```

**New flow:**
```
OAuth callback → email matches existing user with password?
  → YES: store pending link in session cookie → redirect to /auth/oauth/confirm-link
       → user enters password → verify → link OAuth account → create session
  → NO (OAuth-only account): skip verification, link directly (no risk)
  → NO existing user: create new user (no change)
```

**Implementation approach:**
1. In both OAuth callbacks, when `existingUsers.length > 0` AND `existingUsers[0].passwordHash !== null`:
   - Store pending link data in a short-lived encrypted cookie (provider, providerUserId, userId, email)
   - Redirect to `/auth/oauth/confirm-link` instead of creating session
2. New page at `src/routes/auth/oauth/confirm-link/`:
   - `+page.server.ts`: Load action reads pending link cookie, accepts password form
   - `+page.svelte`: Simple form with password input and submit button
   - On valid password: link OAuth account, create session, clear pending cookie, redirect to `/`
   - On invalid password: return error via `fail(400, { error })`
   - On missing/expired pending link cookie: redirect to `/auth/login?error=oauth_failed`
3. Pending link cookie: JSON with `{provider, providerUserId, userId}`, encrypted or signed, 5-minute expiry

**Cookie vs. DB for pending state:** Use a short-lived cookie (same pattern as `google_oauth_state`). Avoids DB table for transient state. Encrypt the cookie value using the existing `encrypt()/decrypt()` from `crypto.ts`.

### SEC-02: CORS Allowlist Pattern

**Extract shared CORS utility:**
```typescript
// src/lib/server/gateway/cors.ts
import { env } from '$env/dynamic/private';

function getAllowedOrigins(): Set<string> {
  const configured = env.CORS_ALLOWED_ORIGINS;
  if (!configured) {
    return new Set([env.APP_URL ?? 'http://localhost:3000']);
  }
  return new Set(configured.split(',').map(s => s.trim()).filter(Boolean));
}

export function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  const origin = requestOrigin && allowed.has(requestOrigin) ? requestOrigin : '';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    ...(origin ? { 'Vary': 'Origin' } : {}),
  };
}
```

**Key details:**
- `Vary: Origin` header is required when CORS response varies by request origin (not wildcard)
- Return empty string for `Access-Control-Allow-Origin` when origin not allowed (browser will block)
- All 3 `/v1/*` endpoints must pass `request.headers.get('origin')` to the utility
- OPTIONS handler must also use the dynamic CORS headers

### SEC-03: Secure Cookie Flag

**Detection pattern (already in hooks.server.ts line 31):**
```typescript
secure: !event.url.hostname.startsWith('localhost')
```

**But the locked decision says:** detect via `X-Forwarded-Proto` header or `url.protocol`.

**Recommended helper:**
```typescript
// src/lib/server/auth/cookies.ts
export function isSecureContext(request: Request, url: URL): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) return forwardedProto === 'https';
  return url.protocol === 'https:';
}
```

**Apply in 3 locations:**
1. `src/routes/auth/login/+page.server.ts` (line 81)
2. `src/routes/auth/oauth/google/callback/+server.ts` (line 87)
3. `src/routes/auth/oauth/github/callback/+server.ts` (line 115)

Also update `hooks.server.ts` line 31 to use the same helper for consistency.

### SEC-04: Request Body Size Limit

**Implementation approach:**
```typescript
// In each POST handler, before calling proxyToLiteLLM or request.json():
const MAX_BODY = parseInt(env.MAX_REQUEST_BODY_BYTES ?? '10485760', 10); // 10MB
const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
if (contentLength > MAX_BODY) {
  return new Response(JSON.stringify({
    error: {
      message: `Request body too large. Maximum size is ${MAX_BODY} bytes.`,
      type: 'invalid_request_error',
      code: 'payload_too_large'
    }
  }), { status: 413, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}
```

**Where to apply:** Only the POST handlers in `chat/completions` and `embeddings` (not `models` which is GET-only, per locked decision).

**Edge case:** `Content-Length` can be absent (chunked transfer encoding). For missing Content-Length, allow the request through -- SvelteKit/Node has its own runtime limits. The explicit check catches the common case of oversized payloads with declared length.

### SEC-05: Invitation Token Upgrade

**Current state (already partially done):**
- Schema (`schema.ts` line 205): `token: text('token').notNull().unique()` -- column already exists
- Schema has index: `index('app_org_invitations_token_idx').on(table.token)` -- index already exists
- `members.ts` line 54: `const token = crypto.randomUUID()` -- uses UUID, needs upgrade to randomBytes

**What actually needs to change:**
- `members.ts` line 54: Change `crypto.randomUUID()` to `randomBytes(32).toString('hex')`
- Import `randomBytes` from `node:crypto`
- No schema migration needed -- the column and index already exist
- No changes to `acceptInvitation` or the invite page -- they already look up by `token` column

**Important discovery:** The CONTEXT.md mentions needing a schema migration, but the schema already has the `token` column separate from `id`. Only the token generation method needs upgrading from UUID to randomBytes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password verification | Custom hash comparison | `verifyPassword()` from `password.ts` | Already handles Argon2 safely |
| Encryption for pending link cookie | Custom signing | `encrypt()/decrypt()` from `crypto.ts` | AES-256-GCM already implemented |
| CORS header logic | Manual string matching | Shared `corsHeaders()` utility | Centralizes logic, avoids inconsistency across 3 endpoints |
| Secure context detection | Per-file inline checks | Shared `isSecureContext()` helper | Consistent detection across 4 cookie-set locations |
| Random token generation | Custom entropy | `crypto.randomBytes(32)` | Node.js built-in CSPRNG |

## Common Pitfalls

### Pitfall 1: Forgetting Vary: Origin with Dynamic CORS
**What goes wrong:** If CORS responses vary by request origin but don't include `Vary: Origin`, CDNs and browser caches may serve a response with the wrong origin header to a different origin.
**How to avoid:** Always include `Vary: Origin` when not using wildcard `*` CORS.

### Pitfall 2: OAuth Pending Link Cookie Not Cleared on Error
**What goes wrong:** If the confirm-link page errors but doesn't clear the pending link cookie, stale data persists.
**How to avoid:** Always delete the pending link cookie in both success and error paths of the confirm-link action.

### Pitfall 3: Content-Length Spoofing
**What goes wrong:** A client could send `Content-Length: 100` but stream a much larger body. The check passes but memory is still consumed.
**Why acceptable:** SvelteKit/Node.js runtime will disconnect clients that exceed declared Content-Length. This check catches the 99% case of honest large payloads. Full protection requires stream-level limiting which is out of scope.

### Pitfall 4: Missing CORS on Error Responses
**What goes wrong:** If the 413 or auth error response doesn't include CORS headers, the browser can't read the error message (it just sees an opaque network error).
**How to avoid:** All error responses in `/v1/*` endpoints must include CORS headers, including the new 413 response.

### Pitfall 5: Redirect Loop in OAuth Confirm Flow
**What goes wrong:** If the confirm-link page can't find the pending cookie, it redirects to login, which may redirect back to OAuth, creating a loop.
**How to avoid:** On missing pending cookie, redirect to `/auth/login?error=oauth_link_expired` (login page, no auto-OAuth redirect).

### Pitfall 6: Hooks.server.ts Secure Flag Inconsistency
**What goes wrong:** `hooks.server.ts` already checks `!event.url.hostname.startsWith('localhost')` for the secure flag, but the 3 cookie-set locations use hardcoded `false`. After fixing, the logic might diverge again.
**How to avoid:** Use the same `isSecureContext()` helper in all 4 locations (hooks + 3 auth flows).

## Code Examples

### CORS Utility (verified pattern for this codebase)
```typescript
// src/lib/server/gateway/cors.ts
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
```

### Secure Context Detection
```typescript
// src/lib/server/auth/cookies.ts
export function isSecureContext(request: Request, url: URL): boolean {
	const forwardedProto = request.headers.get('x-forwarded-proto');
	if (forwardedProto) return forwardedProto === 'https';
	return url.protocol === 'https:';
}
```

### Body Size Check
```typescript
// Inline in /v1/chat/completions and /v1/embeddings POST handlers
const MAX_BODY_BYTES = parseInt(env.MAX_REQUEST_BODY_BYTES ?? '10485760', 10);
const contentLength = request.headers.get('content-length');
if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
	return new Response(
		JSON.stringify({
			error: {
				message: `Request body exceeds maximum size of ${MAX_BODY_BYTES} bytes`,
				type: 'invalid_request_error',
				code: 'payload_too_large'
			}
		}),
		{ status: 413, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
	);
}
```

### Token Generation Upgrade
```typescript
// In members.ts
import { randomBytes } from 'node:crypto';
const token = randomBytes(32).toString('hex'); // 256-bit, 64 hex chars
```

### Pending OAuth Link Cookie (encrypted)
```typescript
// Store pending link data
const pendingData = JSON.stringify({ provider, providerUserId, userId });
const encrypted = encrypt(pendingData); // Uses existing AES-256-GCM from crypto.ts
cookies.set('oauth_pending_link', encrypted, {
	path: '/',
	httpOnly: true,
	secure: isSecureContext(request, url),
	sameSite: 'lax',
	maxAge: 300 // 5 minutes
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Access-Control-Allow-Origin: *` | Origin allowlist with `Vary: Origin` | Standard practice | Prevents cross-origin API abuse from browsers |
| `secure: false` hardcoded | Dynamic detection via X-Forwarded-Proto | Standard practice | Cookies protected in production |
| `crypto.randomUUID()` for tokens | `randomBytes(32)` (256-bit) | Best practice | Higher entropy, clearer security semantics |
| No body size limit | Content-Length pre-check | Standard practice | Prevents OOM from oversized payloads |

## Open Questions

1. **Should `corsHeaders` cache be invalidated on env change?**
   - What we know: The example caches `cachedOrigins` at module level. Env vars don't change at runtime in production.
   - Recommendation: Module-level cache is fine. If env vars need hot-reload, use a function-level read instead. Not critical for v1.1.

2. **Should the pending OAuth link use a DB table instead of a cookie?**
   - What we know: Cookie approach matches existing OAuth state pattern. DB approach is more robust but adds a table.
   - Recommendation: Cookie with encryption. Simpler, matches existing patterns, 5-minute expiry limits exposure.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (version from package.json) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | OAuth linking requires password confirmation when user has password | unit | `npx vitest run src/routes/auth/oauth/confirm-link/ -x` | No - Wave 0 |
| SEC-02 | CORS rejects disallowed origins, allows configured origins | unit | `npx vitest run src/lib/server/gateway/cors.test.ts -x` | No - Wave 0 |
| SEC-03 | `isSecureContext` detects HTTPS via X-Forwarded-Proto | unit | `npx vitest run src/lib/server/auth/cookies.test.ts -x` | No - Wave 0 |
| SEC-04 | Oversized Content-Length returns 413 | unit | `npx vitest run src/routes/v1/chat/completions/ -x` | No - Wave 0 |
| SEC-05 | Invitation token is 64 hex chars (256-bit) | unit | `npx vitest run src/lib/server/members.test.ts -x` | No - Wave 0 |
| SEC-06 | .env.example has no default secret values | manual-only | Visual inspection of `.env.example` | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/server/gateway/cors.test.ts` -- covers SEC-02 (CORS allowlist logic)
- [ ] `src/lib/server/auth/cookies.test.ts` -- covers SEC-03 (isSecureContext helper)
- [ ] Tests for SEC-01, SEC-04, SEC-05 depend on route/module structure; create alongside implementation

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all referenced source files
- `src/routes/auth/oauth/google/callback/+server.ts` -- OAuth linking vulnerability confirmed at lines 50-58
- `src/routes/auth/oauth/github/callback/+server.ts` -- Same pattern at lines 80-88
- `src/routes/v1/chat/completions/+server.ts` -- Wildcard CORS confirmed at lines 7-11
- `src/lib/server/db/schema.ts` -- Invitation table already has separate `token` column (line 205)
- `src/lib/server/members.ts` -- Token generation uses `crypto.randomUUID()` (line 54)
- `src/hooks.server.ts` -- Existing HTTPS detection pattern at line 31
- `.env.example` -- Verified clean after Phase 7 (no default secrets)

### Secondary (MEDIUM confidence)
- CORS `Vary: Origin` requirement from HTTP/1.1 specification (RFC 7231)
- X-Forwarded-Proto header convention for reverse proxy HTTPS detection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all primitives already exist in codebase
- Architecture: HIGH -- all files inspected, patterns clear, changes are localized
- Pitfalls: HIGH -- common web security patterns, well-documented in industry

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, no external dependency changes)
