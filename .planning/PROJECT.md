# LLMTokenHub

## What This Is

A multi-tenant LLM API gateway where companies create organizations, submit their own provider API keys (OpenAI, Anthropic, Google, DeepSeek, Qwen, GLM, Doubao, and 100+ more), and team members generate personal API keys to access LLMs through a unified OpenAI-compatible endpoint. Features smart routing, fallback chains, Redis caching, budget controls with email notifications, and a full admin dashboard. Available as SaaS or self-hosted via Docker Compose.

## Core Value

Any company can sign up, plug in their LLM API keys, and immediately give their entire team controlled, budget-tracked access to AI models — without per-seat subscriptions and without exposing real API keys to end users.

## Requirements

### Validated

- ✓ Multi-tenant organization system (company signup, member invites, roles) — v1.0
- ✓ BYO API key management (companies submit OpenAI, Anthropic, Google, China model keys) — v1.0
- ✓ Per-member API key generation (members create personal keys to access LLMs) — v1.0
- ✓ LiteLLM-based proxy routing (per-org serverless-style lightweight proxy) — v1.0
- ✓ Usage & cost tracking dashboard (per-member token usage, cost by model, daily/monthly trends) — v1.0
- ✓ Budget controls (per-member/per-team monthly spend limits with alerts) — v1.0
- ✓ Member management (invite, assign admin/member roles, revoke access) — v1.0
- ✓ API key management UI (create/revoke keys, view usage, set per-key rate limits) — v1.0
- ✓ Auth system (email/password + OAuth via Google/GitHub) — v1.0
- ✓ OpenAI-compatible API endpoint (works with Cursor, Continue.dev, Claude Code) — v1.0
- ✓ Smart model routing (cheap models for simple tasks, expensive for complex) — v1.0
- ✓ Fallback chains (auto-switch provider when one is down) — v1.0
- ✓ Self-host package (docker-compose for companies to deploy themselves) — v1.0
- ✓ Landing/marketing page — v1.0

- ✓ Tech debt cleanup (dead exports, DRY fixes, jsonb migration, session cron, pool config) — v1.1
- ✓ Security hardening (OAuth linking, CORS, secure cookies, body limits, token separation) — v1.1
- ✓ Performance optimization (Redis auth cache, budget snapshots, SMTP singleton, N+1 fix) — v1.1
- ✓ Unit test coverage (99 tests across 14 files, gateway + auth + members) — v1.1
- ✓ Integration, E2E, and load testing (DB integration, user journey E2E, load test, 80% coverage) — v1.1

### Active

(None — next milestone not yet planned)

## Completed Milestones

- **v1.0 MVP** — Full platform shipped (auth, orgs, gateway, budgets, dashboard, Docker)
- **v1.1 Production Hardening** — Security, performance, test coverage, tech debt cleanup

### Out of Scope

- Built-in chat UI — v1 is API + dashboard only, users bring their own tools (Cursor, etc.)
- Reselling API access — BYO keys only, no markup/billing on usage
- Mobile app — web dashboard only
- Real-time collaboration features
- Custom model fine-tuning or hosting

## Technical Architecture

**Tech stack:** SvelteKit (Svelte 5 runes), Tailwind CSS v4, Drizzle ORM + postgres.js, PostgreSQL, Redis (ioredis), LiteLLM proxy, Node.js built-in crypto (AES-256-GCM, SHA-256).

**Auth:** Custom session management using Lucia patterns + Arctic for OAuth (Google/GitHub). Oslo crypto for session token hashing.

**Gateway:** Retry with exponential backoff + jitter on 429/500/503, provider fallback loop, smart routing (~4 chars/token heuristic), Redis cache-aside pattern, round-robin load balancing with in-memory Map.

**Budget:** Cascade system (individual > role default > org default), cents-based storage for precision, fire-and-forget notification side effects.

**Deployment:** Multi-stage Dockerfile (node:22-alpine), 4-service docker-compose (app + litellm + postgres + redis).

**Reference implementations** in repo: LiteLLM (`litellm/`), Open WebUI (`open-webui/`), LibreChat (`LibreChat/`).

Target market: 20-100 person teams, especially in China where domestic model support is a differentiator.

## Constraints

- **Tech Stack**: SvelteKit frontend, LiteLLM as proxy core, PostgreSQL for data, Redis for caching
- **Deployment**: Single Cloud VM for SaaS, docker-compose for self-host
- **Provider Support**: Must support all 100+ LiteLLM providers including China models
- **API Compatibility**: Must be OpenAI-compatible (`/v1/chat/completions`) for IDE plugin integration
- **Auth**: Email/password + Google/GitHub OAuth

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BYO keys only (no reselling) | Simpler business model, no billing complexity, focus on platform value | ✓ Good |
| Build on LiteLLM | 100+ providers already supported, Virtual Keys, cost tracking built-in | ✓ Good |
| SvelteKit for dashboard | Fast, lightweight, consistent with Open WebUI reference code | ✓ Good |
| Self-hostable from v1 | Key differentiator for data sovereignty needs | ✓ Good |
| Drizzle ORM (not Prisma) | Avoid dual-Prisma migration conflicts with LiteLLM | ✓ Good |
| Custom session management (Lucia patterns + Arctic) | Lightweight, modern, supports PKCE for OAuth | ✓ Good |
| Lazy DB initialization via Proxy | Avoids build-time DATABASE_URL requirement | ✓ Good |
| Node.js built-in crypto for encryption | No external dependency for AES-256-GCM and SHA-256 | ✓ Good |
| In-memory Map for rate limit windows | Simpler than Redis for single-instance deployment | ⚠️ Revisit for multi-instance |
| Chart.js direct canvas (not svelte-chartjs) | svelte-chartjs not compatible with Svelte 5 runes | ✓ Good |
| ioredis for Redis client | Mature, lazy connect, retry strategies | ✓ Good |
| Fire-and-forget for gateway side effects | Non-blocking notification and usage logging | ✓ Good |
| Redis cache-aside for gateway auth | 60s TTL reduces per-request DB queries, graceful degradation | ✓ Good |
| Budget rolling snapshots | O(1) budget checks via incremental snapshot column, full SUM fallback | ✓ Good |
| vi.mock() for unit test mocking | No DI refactoring needed, matches existing codebase patterns | ✓ Good |
| Docker Compose test PostgreSQL | Real DB for integration tests, transaction rollback isolation | ✓ Good |
| autocannon for load testing | Zero external deps, Node.js native, scriptable with thresholds | ✓ Good |

## Context

Shipped v1.1 with ~8,700 LOC (6,161 source + 2,518 test TypeScript) across 51 modified files.
All v1.0 tech debt resolved. 99 unit tests + integration/E2E/load tests. 80% coverage enforced.
Gateway optimized: Redis auth cache (60s), budget O(1) snapshots, SMTP singleton.
Security hardened: CORS allowlist, secure cookies, body limits, invitation token separation.

## Tech Debt

(None known — all v1.0 tech debt resolved in v1.1)

---
*Last updated: 2026-03-17 after v1.1 milestone*
