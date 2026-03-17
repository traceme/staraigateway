---
phase: 8
slug: security-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | SEC-02, SEC-03, SEC-04 | grep | `grep 'CORS_ALLOWED_ORIGINS\|isSecureContext\|Content-Length' src/ -r --include='*.ts'` | ✅ | ⬜ pending |
| 08-01-02 | 01 | 1 | SEC-06 | grep | `grep -E 'CORS_ALLOWED_ORIGINS\|MAX_REQUEST_BODY' .env.example` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 1 | SEC-01 | file+grep | `test -f src/routes/auth/oauth/confirm-link/+page.svelte && grep 'verifyPassword' src/routes/auth/oauth/confirm-link/+page.server.ts` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | SEC-05 | grep | `grep "randomBytes(32)" src/lib/server/members.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers most phase requirements. OAuth confirm-link page is new but verifiable via file existence and grep.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OAuth linking requires password | SEC-01 | Requires real OAuth flow with existing account | 1. Create email/password account, 2. Sign in with Google using same email, 3. Verify password confirmation page appears |
| CORS rejects unauthorized origin | SEC-02 | Requires browser or curl with Origin header | `curl -H "Origin: https://evil.com" -I /v1/models` should not return `Access-Control-Allow-Origin: https://evil.com` |
| Secure cookie behind HTTPS | SEC-03 | Requires HTTPS environment | Deploy behind nginx with SSL, verify Set-Cookie includes `Secure` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
