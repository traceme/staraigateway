---
status: passed
phase: 08-security-hardening
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md
started: 2026-03-17T16:50:00Z
updated: 2026-03-17T16:55:00Z
---

## Current Test

[all tests complete]

## Tests

### 1. CORS Allowlist on Gateway Endpoints
expected: getCorsHeaders imported and used in all 3 /v1/* endpoints (chat/completions, embeddings, models), no wildcard "*" Access-Control-Allow-Origin
result: pass

### 2. Body Size Limits
expected: MAX_REQUEST_BODY_BYTES parsed and enforced in chat/completions and embeddings POST handlers before auth
result: pass

### 3. Secure Cookie Detection
expected: isSecureContext helper in auth/cookies.ts, used in all cookie-set locations (hooks.server.ts, login, google callback, github callback, confirm-link)
result: pass

### 4. 256-bit Invitation Tokens
expected: randomBytes(32) used in members.ts for invitation token generation (replacing UUID)
result: pass

### 5. OAuth Account Linking Protection
expected: confirm-link page exists (+page.server.ts + +page.svelte), OAuth callbacks check passwordHash before linking, password-protected accounts redirect to confirmation
result: pass

### 6. Env Placeholders
expected: CORS_ALLOWED_ORIGINS and MAX_REQUEST_BODY_BYTES present in .env.example
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
