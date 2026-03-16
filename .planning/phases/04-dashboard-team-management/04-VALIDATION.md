---
phase: 04
slug: dashboard-team-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts or "none — Wave 0 installs" |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | AUTH-03, AUTH-04 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | ORG-02, ORG-03, ORG-04 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | AKEY-03, AKEY-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | DASH-01, DASH-02, DASH-03, DASH-04, DASH-05 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test framework setup (vitest) if not already configured
- [ ] Test stubs for OAuth callback handling
- [ ] Test stubs for invitation flow (create, accept, expire)
- [ ] Test stubs for rate limiter (RPM/TPM sliding window)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth redirect + callback | AUTH-03 | Requires real Google OAuth credentials | Configure Google OAuth app, click "Continue with Google", verify redirect and session creation |
| GitHub OAuth redirect + callback | AUTH-04 | Requires real GitHub OAuth credentials | Configure GitHub OAuth app, click "Continue with GitHub", verify redirect and session creation |
| Invitation email delivery | ORG-02 | Requires SMTP connection | Send invite, check email inbox for invitation link |
| Budget banner display at 90% | DASH-05 | Visual rendering | Trigger 90% budget usage, verify banner appears in dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
