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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 6 | Established GSD workflow with wave-based parallel execution |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 20 | Gateway modules | Node.js built-in crypto (no external deps for encryption/hashing) |

### Top Lessons (Verified Across Milestones)

1. Audit milestones before archiving — catches integration gaps that per-phase verification misses
2. Keep tracking documents in sync during execution, not just at milestone boundaries
