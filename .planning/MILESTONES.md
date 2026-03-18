# Milestones

## v1.2 Feature Expansion (Shipped: 2026-03-18)

**Phases:** 4 | **Plans:** 8 | **Files modified:** 119 | **LOC:** +7,546 / -583 (~14,460 total)
**Timeline:** 2026-03-18 (1 day)

**Key accomplishments:**
- Full bilingual i18n (Chinese/English) across all 27 dashboard components, 9 page routes, and 6 server actions with svelte-i18n
- Public page locale detection (browser Accept-Language, cookie persistence) and auth page translations
- Bilingual email templates for all 5 email types with language preference threading
- Org admin audit logs with fire-and-forget recording across all 9 mutation types
- Audit log viewer with cursor-based pagination and filtering by action type/date range
- Auto-discovery model catalog from LiteLLM with pricing enrichment and reactive key-change updates

**Archives:** [Roadmap](milestones/v1.2-ROADMAP.md) | [Requirements](milestones/v1.2-REQUIREMENTS.md) | [Audit](milestones/v1.2-MILESTONE-AUDIT.md)

---

## v1.1 Production Hardening (Shipped: 2026-03-17)

**Phases:** 5 | **Plans:** 13 | **Commits:** 53 | **LOC:** 3,296 additions (6,161 source + 2,518 test)
**Timeline:** 2026-03-17 (1 day)

**Key accomplishments:**
- Tech debt cleanup: removed dead exports, extracted shared budget utils, added DB transactions, standardized env vars, migrated to jsonb, added session cleanup cron, configured connection pool
- Security hardening: OAuth linking protection, CORS allowlist, secure cookies, body size limits, invitation token separation, env placeholder cleanup
- Performance optimization: Redis auth cache (60s TTL), budget rolling snapshots (O(1) checks), SMTP lazy singleton, cache key normalization fix, N+1 batch query fix
- Unit test coverage: 99 tests across 14 files covering gateway (auth, budget, rate-limit, usage, api-keys), auth flows (session, password, validation, email), and member management
- Integration/E2E/load testing: DB integration tests against real PostgreSQL, E2E user journey + budget enforcement tests, autocannon load test (100 concurrent/1000 requests), 80% coverage threshold enforcement

**Archives:** [Roadmap](milestones/v1.1-ROADMAP.md) | [Requirements](milestones/v1.1-REQUIREMENTS.md)

---

## v1.0 LLMTokenHub MVP (Shipped: 2026-03-16)

**Phases:** 6 | **Plans:** 17 | **Commits:** 99 | **LOC:** ~10,500 TS/Svelte
**Timeline:** 2026-03-15 → 2026-03-16 (2 days)
**Audit:** Passed (49/49 requirements, 10/10 E2E flows)

**Key accomplishments:**
- Full auth system: email/password signup, Google/GitHub OAuth, session management, password reset
- Multi-tenant organizations: member invites, Owner/Admin/Member roles, team management
- BYO provider key management: AES-256-GCM encryption, validation, China model support (DeepSeek, Qwen, GLM, Doubao)
- OpenAI-compatible gateway: streaming SSE, tool use pass-through, retry/fallback, smart routing, Redis semantic caching, round-robin load balancing
- Usage & budget controls: per-request cost logging, trend dashboards, hard/soft spend limits, email notifications, cron digest
- Self-host Docker packaging: 4-service stack (app + LiteLLM + PostgreSQL + Redis), landing page, integration docs for Cursor/Continue.dev/Claude Code

**Archives:** [Roadmap](milestones/v1.0-ROADMAP.md) | [Requirements](milestones/v1.0-REQUIREMENTS.md) | [Audit](milestones/v1.0-MILESTONE-AUDIT.md)

---

