# Milestones

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

