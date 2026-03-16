---
phase: 7
slug: tech-debt-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 7 — Validation Strategy

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
| 07-01-01 | 01 | 1 | DEBT-01 | grep/compile | `grep -r 'validateApiKeyFromHash\|decryptProviderKeyById\|checkLiteLLMHealth' src/ --include='*.ts'` returns empty | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | DEBT-02 | grep | `grep -r 'getBudgetResetDate' src/ --include='*.ts'` shows single definition in budget/utils.ts | ✅ | ⬜ pending |
| 07-01-03 | 01 | 1 | DEBT-04 | grep | `grep 'APP_URL' .env.example` returns match AND `grep 'BASE_URL' .env.example` returns empty | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | DEBT-03 | grep | `grep 'db.transaction' src/lib/server/members.ts` returns match | ✅ | ⬜ pending |
| 07-02-02 | 02 | 1 | DEBT-05 | grep/schema | `grep 'jsonb' src/lib/server/db/schema.ts` returns match for models AND `grep 'JSON.parse' src/lib/server/gateway/proxy.ts src/lib/server/gateway/models.ts` returns empty | ✅ | ⬜ pending |
| 07-02-03 | 02 | 1 | DEBT-06 | file | `test -f src/routes/api/cron/cleanup/+server.ts` | ❌ W0 | ⬜ pending |
| 07-02-04 | 02 | 1 | DEBT-07 | grep | `grep 'max:' src/lib/server/db/index.ts` returns match | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. No new test files needed — all validations are grep/file-existence checks on the refactored code.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| jsonb migration runs cleanly | DEBT-05 | Requires running migration against real DB | Run `npm run db:migrate` against test database, verify no errors |
| Invitation rollback on crash | DEBT-03 | Requires simulating mid-transaction failure | Manually test or verify via unit test in Phase 10 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
