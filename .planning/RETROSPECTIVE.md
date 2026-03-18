# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — LLMTokenHub MVP

**Shipped:** 2026-03-16
**Phases:** 6 | **Plans:** 17 | **Commits:** 99

### What Was Built
- Full auth system with email/password, Google/GitHub OAuth, sessions, and password reset
- Multi-tenant org system with member invites, Owner/Admin/Member roles
- BYO provider key management with AES-256-GCM encryption and China model support
- OpenAI-compatible gateway with streaming, tool use, retry/fallback, smart routing, Redis caching
- Usage tracking with cost dashboards, budget controls (hard/soft limits), email notifications
- Self-host Docker packaging (4-service stack), landing page, integration docs

### What Worked
- Wave-based parallel execution of plans within phases significantly sped up delivery
- GSD workflow's phase → plan → execute → verify cycle caught 3 integration gaps before shipping
- Building on established patterns (Lucia auth, Arctic OAuth, Drizzle ORM) avoided wheel reinvention
- Fire-and-forget pattern for non-critical side effects (notifications, lastUsedAt) kept gateway fast
- Vitest unit tests for gateway modules caught issues early in Phase 5

### What Was Inefficient
- SUMMARY.md files lacked `one_liner` field in frontmatter, requiring manual accomplishment extraction at milestone completion
- Some plan checkboxes in ROADMAP.md weren't updated during execution (Phases 1-4 had `[ ]` on completed plans)
- REQUIREMENTS.md traceability table fell behind during Phase 5 — 6 requirements still showed `Pending` when they were done
- Subagent sandbox restrictions prevented git commits from within executor agents, requiring orchestrator intervention

### Patterns Established
- Budget cascade pattern: individual > role default > org default (reusable for any hierarchical config)
- Lazy DB initialization via Proxy (avoids build-time env requirements)
- Ring buffer for streaming SSE extraction (bounded memory for unbounded streams)
- Cache-aside with fire-and-forget set (non-blocking caching)
- Separate form actions per settings section (independent saves in SvelteKit)

### Key Lessons
1. **Audit before archiving** — The milestone audit caught 3 real gaps (notifications not wired, LiteLLM missing from Docker) that would have shipped as silent bugs
2. **Keep traceability tables in sync** — Deferring REQUIREMENTS.md updates creates confusion at milestone time; update checkboxes as each phase completes
3. **In-memory Maps work for single-instance** — Rate limiting and round-robin with Maps is simpler than Redis for v1, but must revisit for horizontal scaling
4. **Chart.js direct canvas > wrapper libraries** — svelte-chartjs isn't Svelte 5 runes compatible; going direct avoids adapter issues
5. **Fire-and-forget needs .catch()** — Unhandled promise rejections from side effects can crash the process; always `.catch(() => {})` on fire-and-forget calls

### Cost Observations
- Model mix: Predominantly Opus for planning/execution, Sonnet for verification
- Sessions: ~8 sessions across 2 days
- Notable: 17 plans across 6 phases completed in under 2 hours of active execution time

---

## Milestone: v1.1 — Production Hardening

**Shipped:** 2026-03-17
**Phases:** 5 | **Plans:** 13 | **Commits:** 53

### What Was Built
- Tech debt cleanup: 7 debt items resolved (dead exports, DRY budget utils, DB transactions, env standardization, jsonb migration, session cleanup cron, connection pool config)
- Security hardening: 6 vulnerabilities fixed (OAuth linking, CORS, secure cookies, body limits, invitation tokens, env placeholders)
- Performance optimization: 5 hotspots optimized (Redis auth cache, budget snapshots, SMTP singleton, cache key fix, N+1 batch)
- Unit test coverage: 99 tests across 14 files covering all server-side business logic
- Integration/E2E/load testing: DB integration tests, full user journey E2E, budget enforcement E2E, autocannon load test, 80% coverage threshold

### What Worked
- Skipping research for well-understood phases (10, 11) saved time without sacrificing plan quality — test phases have clear scope from CONTEXT.md alone
- All 3 plans in Phase 10 executed in parallel (Wave 1) with zero file conflicts — domain-based splitting (gateway pure/DB-heavy/auth+members) was clean
- User delegating all decisions ("do as you decide") enabled fastest possible throughput through discuss→plan→execute pipeline
- Phase 9 PERF optimizations were verified working by Phase 10 unit tests catching regressions in the same session

### What Was Inefficient
- SUMMARY.md `one_liner` field still not populated by executor agents — same issue as v1.0
- Skipped milestone audit for v1.1 — all phases passed verification individually but cross-phase integration wasn't formally validated
- Phase 11 E2E tests import SvelteKit handlers directly rather than starting a real server — pragmatic but not true E2E

### Patterns Established
- Transaction rollback for DB integration test isolation (withTestTransaction helper)
- API-level E2E testing by importing SvelteKit POST handlers directly (avoids server lifecycle)
- autocannon for load testing with threshold-based pass/fail (p95 latency + error rate)
- Budget rolling snapshot with stale-check fallback to full SUM query

### Key Lessons
1. **Test phases don't need research** — When modules-to-test and patterns are documented in CONTEXT.md, research adds overhead without new insights
2. **Domain-based plan splitting prevents conflicts** — Splitting test plans by module domain (not alphabetically or by complexity) enables safe parallel execution
3. **Rolling snapshots beat full aggregation** — Budget O(1) snapshot with incremental update is dramatically faster than SUM queries, and stale-check fallback keeps correctness
4. **vi.mock() is sufficient** — No DI refactoring needed when the framework supports module-level mocking; the codebase stayed unchanged
5. **Coverage thresholds belong in vitest config** — `coverage.thresholds` in vitest.config.ts is simpler and more reliable than CI scripts

### Cost Observations
- Model mix: 100% Opus for all agents (planning, execution, verification)
- Sessions: ~3 sessions across 1 day
- Notable: 13 plans across 5 phases completed in a single day; entire v1.1 from Phase 7 discuss through Phase 11 verify

---

## Milestone: v1.2 — Feature Expansion

**Shipped:** 2026-03-18
**Phases:** 4 | **Plans:** 8 | **Files:** 119 modified

### What Was Built
- Full bilingual i18n (Chinese/English) across 27 dashboard components, 9 page routes, 6 server actions
- Public page locale detection (browser Accept-Language, cookie persistence), auth page translations
- Bilingual email templates for all 5 email types with language preference threading
- Org admin audit logs with fire-and-forget recording across 9 mutation types
- Audit log viewer with cursor-based pagination and filtering
- Auto-discovery model catalog from LiteLLM with pricing enrichment

### What Worked
- Fire-and-forget pattern (established in v1.0 for notifications) reused seamlessly for audit logging and model discovery — consistent codebase pattern
- svelte-i18n with synchronous addMessages avoided async loading complexity; $t() reactivity worked cleanly with Svelte 5 runes
- errorKey pattern for server action i18n kept server/client cleanly separated (server returns key, client translates)
- Phases 14 and 15 executed independently of i18n phases — parallel milestone work with zero conflicts

### What Was Inefficient
- SUMMARY.md `one_liner` field still not populated by executor agents — third milestone with this gap
- Phase 13 plan checkboxes in ROADMAP.md still showing `[ ]` despite being complete (same issue as v1.0)
- MODEL_PRICING hardcoded rather than fetched dynamically from LiteLLM — known tech debt

### Patterns Established
- errorKey pattern: server actions return i18n keys via `fail()`, client components translate via `$t(form?.errorKey)`
- zodErrorToKey: shared helper maps Zod validation errors to i18n keys
- isZh conditional pattern for bilingual email templates (simple, readable)
- detectLocale() priority chain: user.language > cookie > Accept-Language > 'en'
- Cursor-based compound pagination (createdAt, id) for append-heavy audit tables
- Fire-and-forget model discovery triggered by provider key CRUD

### Key Lessons
1. **i18n is a cross-cutting concern** — touching 27 components + 9 routes + 6 server files means i18n should be planned for from v1.0 to avoid massive retro-wiring
2. **errorKey pattern > translated server errors** — keeping translations client-side simplifies server logic and avoids locale threading through every server action
3. **Fire-and-forget is a project idiom** — notifications, audit logs, model discovery all use the same pattern; consistency makes the codebase predictable
4. **Cursor pagination > offset pagination** — for append-heavy tables (audit logs, usage), cursor-based avoids drift and performs better at scale
5. **Hardcoded pricing is acceptable for v1** — dynamic pricing fetch adds complexity; N/A display for unknown pricing is honest and non-breaking

### Cost Observations
- Model mix: Opus for planning/execution, quality profile throughout
- Sessions: ~2 sessions in 1 day
- Notable: 8 plans across 4 phases completed in ~10 hours wall clock, ~20 min active execution

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 6 | Established GSD workflow with wave-based parallel execution |
| v1.1 | ~3 | 5 | Skipped research for test phases, delegated all decisions to Claude |
| v1.2 | ~2 | 4 | Parallel independent phases (i18n vs audit vs catalog), fire-and-forget as project idiom |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 20 | Gateway modules | Node.js built-in crypto (no external deps for encryption/hashing) |
| v1.1 | 99+ | 80%+ enforced | autocannon (load testing), @vitest/coverage-v8 (coverage) |
| v1.2 | 99+ | 80%+ enforced | svelte-i18n (i18n), cursor pagination, fire-and-forget audit/discovery |

### Top Lessons (Verified Across Milestones)

1. Audit milestones before archiving — catches integration gaps that per-phase verification misses
2. Keep tracking documents in sync during execution, not just at milestone boundaries
3. SUMMARY.md one_liner field needs to be populated by executor agents — two milestones now with missing one-liners
4. Domain-based plan splitting enables safe parallel execution across both feature and test phases
