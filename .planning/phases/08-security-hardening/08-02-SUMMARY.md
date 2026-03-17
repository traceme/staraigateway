---
phase: 08-security-hardening
plan: 02
subsystem: auth/oauth
tags: [security, oauth, account-linking]
dependency_graph:
  requires: [08-01]
  provides: [oauth-account-link-verification]
  affects: [auth-flow]
tech_stack:
  added: []
  patterns: [encrypted-cookie-handoff, password-confirmation-gate]
key_files:
  created:
    - src/routes/auth/oauth/confirm-link/+page.server.ts
    - src/routes/auth/oauth/confirm-link/+page.svelte
  modified:
    - src/routes/auth/oauth/google/callback/+server.ts
    - src/routes/auth/oauth/github/callback/+server.ts
decisions:
  - Encrypted cookie with 5-minute TTL for pending OAuth link data
  - OAuth-only accounts (no passwordHash) skip verification and link directly
metrics:
  duration: 3min
  completed: 2026-03-17
requirements: [SEC-01]
---

# Phase 08 Plan 02: OAuth Account Linking Verification Summary

OAuth account linking now requires password confirmation when matching an existing email/password account, preventing silent account takeover via OAuth (SEC-01).

## What Was Done

### Task 1: Update OAuth callbacks (c3bbd00)
- Modified Google and GitHub OAuth callbacks to check `passwordHash` on existing users
- Users with passwords get an encrypted `oauth_pending_link` cookie (AES-256-GCM, 5-min expiry) and redirect to `/auth/oauth/confirm-link`
- OAuth-only accounts (no password) continue to link directly without verification

### Task 2: Create confirm-link page (fad9497)
- Created `+page.server.ts` with load function that validates pending link cookie, and form action that verifies password via Argon2
- Created `+page.svelte` with dark zinc theme matching existing auth pages
- On valid password: links OAuth account, creates session, redirects to home
- On invalid password: shows inline error
- On missing/expired cookie: redirects to `/auth/login?error=oauth_link_expired`

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c3bbd00 | Redirect OAuth logins to password confirmation for existing accounts |
| 2 | fad9497 | Add OAuth confirm-link page with password verification |
