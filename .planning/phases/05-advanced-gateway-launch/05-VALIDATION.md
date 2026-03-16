---
phase: 05
slug: advanced-gateway-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts or "none — Wave 0 installs" |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | GW-06, GW-07, GW-10 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | GW-08, GW-09 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | GW-08, GW-09 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | SHIP-01, SHIP-02, SHIP-03, SHIP-04 | manual | Manual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test framework setup (vitest + @vitest/coverage-v8) if not already configured
- [ ] `vitest.config.ts` — Vitest configuration for SvelteKit project
- [ ] Test stubs for retry/fallback logic (mock fetch)
- [ ] Test stubs for round-robin key selection
- [ ] Test stubs for token estimation + tier selection
- [ ] Test stubs for cache key generation, get/set with mock Redis

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker compose brings up app, postgres, redis | SHIP-01 | Requires Docker runtime | `docker compose up -d && curl http://localhost:3000` |
| Landing page renders at `/` for unauthenticated users | SHIP-02 | Visual rendering | Visit `http://localhost:3000/` without auth, verify hero + features + cost comparison |
| Integration docs cover Cursor, Continue.dev, Claude Code | SHIP-03 | Content review | Navigate to docs page, verify numbered steps for each tool |
| Self-host guide is complete and accurate | SHIP-04 | Content review | Review `docs/self-host.md`, verify env var docs match `.env.example` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
