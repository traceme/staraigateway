---
phase: 9
slug: performance-optimization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 9 — Validation Strategy

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
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | PERF-01 | unit | `npx vitest run src/lib/server/gateway/auth.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | PERF-04 | unit | `npx vitest run src/lib/server/gateway/cache.test.ts` | ✅ | ⬜ pending |
| 09-01-03 | 01 | 1 | PERF-03 | unit | `npx vitest run src/lib/server/auth/email.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | PERF-02 | unit | `npx vitest run src/lib/server/gateway/budget.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 2 | PERF-05 | unit | `npx vitest run src/lib/server/budget/notifications.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/server/gateway/auth.test.ts` — stubs for PERF-01 (Redis auth cache hit/miss/degradation)
- [ ] `src/lib/server/auth/email.test.ts` — stubs for PERF-03 (SMTP singleton reuse)
- [ ] `src/lib/server/gateway/budget.test.ts` — stubs for PERF-02 (snapshot read instead of SUM)
- [ ] `src/lib/server/budget/notifications.test.ts` — stubs for PERF-05 (batch query, not N+1)

*Existing `cache.test.ts` already covers cache key generation — test assertions need updating for PERF-04.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
