---
phase: 14
slug: audit-logs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/server/audit.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/server/audit.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | AUDIT-01 | unit | `npx vitest run src/lib/server/audit.test.ts -x` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | AUDIT-01 | unit | `npx vitest run src/lib/server/audit.test.ts -x` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | AUDIT-02 | manual | Manual -- SvelteKit page load | N/A | ⬜ pending |
| 14-02-02 | 02 | 2 | AUDIT-02 | manual | Manual -- role check in load | N/A | ⬜ pending |
| 14-03-01 | 03 | 2 | AUDIT-03 | unit | `npx vitest run src/lib/server/audit.test.ts -x` | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 2 | AUDIT-03 | unit | `npx vitest run src/lib/server/audit.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/server/audit.test.ts` — stubs for AUDIT-01 (recordAuditEvent insert, error handling)
- [ ] `src/lib/i18n/__tests__/translations.test.ts` — verify audit.* keys exist in both locales

*Existing Vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audit log page loads entries with actor names | AUDIT-02 | SvelteKit page load requires full app context | Navigate to `/org/{slug}/audit-log` as admin, verify entries display |
| Non-admin redirected from audit page | AUDIT-02 | Requires role-based session | Navigate to `/org/{slug}/audit-log` as regular member, verify redirect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
