---
phase: 15
slug: model-catalog
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose src/lib/server/gateway/models.test.ts src/lib/server/provider-keys.test.ts` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose src/lib/server/gateway/models.test.ts src/lib/server/provider-keys.test.ts`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | MODEL-01 | unit | `npx vitest run src/lib/server/provider-keys.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | MODEL-01 | unit | `npx vitest run src/lib/server/gateway/models.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 2 | MODEL-02 | unit | `npx vitest run src/routes/org/\\[slug\\]/models/models.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 2 | MODEL-03 | unit | `npx vitest run src/lib/server/provider-keys.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/server/provider-keys.test.ts` — stubs for MODEL-01 (discoverModelsForKey), MODEL-03 (trigger on key CRUD)
- [ ] `src/lib/server/gateway/models.test.ts` — stubs for MODEL-01 (getAvailableModels aggregation)

*Existing test infrastructure (vitest) covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Catalog page renders models with pricing | MODEL-02 | UI rendering requires browser | Navigate to /org/[slug]/models, verify table shows discovered models with provider, pricing columns |
| Key deletion removes models from catalog | MODEL-03 | Requires UI + DB interaction | Delete a provider key, reload models page, verify models from that provider are gone |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
