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

### Active

(None yet — define with `/gsd:new-milestone`)

### Out of Scope

- Built-in chat UI — v1 is API + dashboard only, users bring their own tools (Cursor, etc.)
- Reselling API access — BYO keys only, no markup/billing on usage
- Mobile app — web dashboard only
- Real-time collaboration features
- Custom model fine-tuning or hosting

## Context

Shipped v1.0 MVP with ~10,500 LOC (TypeScript + Svelte) across 201 files.

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

## Tech Debt

- Dead export: `validateApiKeyFromHash` in api-keys.ts (superseded by inline gateway query)
- Dead export: `decryptProviderKeyById` in provider-keys.ts (superseded by inline decrypt in proxy)
- Dead export: `checkLiteLLMHealth` in litellm.ts (Docker healthcheck handles this)
- Minor DRY: `getBudgetResetDate` logic duplicated in gateway/budget.ts and budget/notifications.ts

---
*Last updated: 2026-03-16 after v1.0 milestone*
