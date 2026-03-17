# Phase 8: Security Hardening - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all known security vulnerabilities in auth, gateway CORS, session cookies, request validation, and invitation tokens. No new features — only hardening existing code for production safety.

</domain>

<decisions>
## Implementation Decisions

### OAuth account linking verification (SEC-01)
- When OAuth login matches an existing email/password account, redirect to a confirmation page
- User must enter their existing password to confirm the link
- If password is correct, link the OAuth identity and create session
- If user has no password (OAuth-only account), skip verification (no risk — they already own the OAuth identity)
- Both Google and GitHub callbacks follow the same flow
- No email challenge needed — password confirmation is simpler and more immediate

### CORS allowlist (SEC-02)
- Add `CORS_ALLOWED_ORIGINS` env var — comma-separated list of allowed origins
- Default: the app's own `APP_URL` (self-only)
- If env var is empty or unset, fall back to `APP_URL` only (never wildcard)
- Replace hardcoded `Access-Control-Allow-Origin: *` in all three `/v1/*` endpoints
- Add `CORS_ALLOWED_ORIGINS` to `.env.example` with comment explaining format

### Session cookie Secure flag (SEC-03)
- Detect HTTPS by checking `X-Forwarded-Proto` header or `url.protocol`
- Set `secure: true` on session cookies when HTTPS is detected
- Apply consistently in login, Google OAuth callback, and GitHub OAuth callback
- Keep `secure: false` for local development (HTTP)

### Request body size limit (SEC-04)
- Check `Content-Length` header before calling `request.json()`
- Default limit: 10MB (generous for LLM requests which can have long prompts)
- Configurable via `MAX_REQUEST_BODY_BYTES` env var
- Return 413 Payload Too Large with clear error message if exceeded
- Apply to `/v1/chat/completions` and `/v1/embeddings` (not `/v1/models` which is GET-only)

### Invitation token separation (SEC-05)
- Add a `token` column to `app_org_invitations` table — `randomBytes(32).toString('hex')`
- Keep `id` as the database record identifier (UUID)
- Invitation URLs use the `token` value, not `id`
- Lookup on acceptance uses `token` column with index
- Schema migration: add `token` column, backfill existing rows, make non-nullable

### .env.example cleanup (SEC-06)
- Phase 7 already removed default `LITELLM_MASTER_KEY` value and added generation instructions
- Verify no remaining default secret values exist in `.env.example`
- Add any new env vars introduced by this phase (`CORS_ALLOWED_ORIGINS`, `MAX_REQUEST_BODY_BYTES`)

### Claude's Discretion
- Exact error messages for 413 and CORS rejection
- Order of implementation within plans
- Whether to split into 1 or 2 plans
- Password confirmation UI page design details
- Index type for the new `token` column

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Security inventory
- `.planning/codebase/CONCERNS.md` — Security considerations section with file locations, risks, and fix approaches
- `.planning/REQUIREMENTS.md` — SEC-01 through SEC-06 requirement definitions

### Codebase patterns
- `.planning/codebase/CONVENTIONS.md` — Error handling patterns, validation patterns
- `.planning/codebase/STRUCTURE.md` — Where OAuth callbacks live, gateway endpoint locations

### Key source files
- `src/routes/auth/oauth/google/callback/+server.ts` — OAuth linking vulnerability (lines 43-58)
- `src/routes/auth/oauth/github/callback/+server.ts` — Same OAuth linking pattern
- `src/routes/v1/chat/completions/+server.ts` — Wildcard CORS (lines 7-11)
- `src/routes/v1/embeddings/+server.ts` — Wildcard CORS
- `src/routes/v1/models/+server.ts` — Wildcard CORS
- `src/routes/auth/login/+page.server.ts` — Session cookie `secure: false` (line 82)
- `src/lib/server/gateway/proxy.ts` — `request.json()` without size check (line 83)
- `src/lib/server/members.ts` — Invitation token = record ID (lines 54-56)
- `src/lib/server/db/schema.ts` — Invitation table schema
- `.env.example` — Env var template

### Prior phase context
- `.planning/phases/07-tech-debt-cleanup/07-CONTEXT.md` — Phase 7 already cleaned `.env.example` (DEBT-04/SEC-06 overlap)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/server/auth/password.ts`: Argon2 hash/verify — use for password confirmation flow
- `src/lib/server/auth/session.ts`: Session creation — update cookie `secure` flag here
- `src/hooks.server.ts`: Request interceptor — could enforce body size globally, but per-route is more targeted
- `src/lib/server/crypto.ts`: AES-256-GCM — not needed for tokens, but shows crypto pattern

### Established Patterns
- Zod `.safeParse()` for input validation — use for CORS origin validation
- `fail(status, { error })` for form validation errors — use for password confirmation
- SvelteKit `+server.ts` for API endpoints — CORS headers set in OPTIONS/POST handlers
- Fire-and-forget side effects — not applicable for security (must be synchronous)

### Integration Points
- OAuth callbacks: Both `google/callback/+server.ts` and `github/callback/+server.ts` need same linking flow
- Gateway endpoints: All 3 `/v1/*` routes need CORS update
- Session creation: 3 locations (login, Google callback, GitHub callback) need `secure` flag
- Invitation: `members.ts` (create) + `invite/[token]/+page.server.ts` (accept) + schema migration

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user deferred all decisions to Claude's discretion. Standard security approaches apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-security-hardening*
*Context gathered: 2026-03-17*
