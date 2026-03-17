# Architecture

**Analysis Date:** 2026-03-17

## Pattern Overview

**Overall:** Multi-tenant SvelteKit monolith with dual API surface

**Key Characteristics:**
- A single SvelteKit application that serves two distinct audiences simultaneously: (1) end-user browser sessions via the web UI and (2) programmatic clients (IDE plugins, CLI tools) via an OpenAI-compatible REST API at `/v1/*`
- The `/v1/*` routes act as a gateway layer that proxies upstream to a LiteLLM instance, with all auth/budget/rate-limit enforcement happening in SvelteKit before the request ever reaches LiteLLM
- All server-side logic lives under `src/lib/server/` with a clear sub-module structure; the gateway pipeline (`src/lib/server/gateway/`) is completely decoupled from the web UI session logic (`src/lib/server/auth/`)
- The database schema uses an `app_` prefix on every table to coexist peacefully with LiteLLM's own Prisma-managed tables in the same PostgreSQL database

## Layers

**Route/Controller Layer:**
- Purpose: Receives HTTP requests, dispatches to service functions, returns typed responses
- Location: `src/routes/`
- Contains: `+page.server.ts` (form actions + SSR load), `+server.ts` (pure API endpoints), `+layout.server.ts` (shared load guards)
- Depends on: `$lib/server/*` service modules
- Used by: SvelteKit adapter-node HTTP handler

**Gateway Pipeline Layer:**
- Purpose: Enforces auth, budget, rate limiting, smart routing, caching, and load balancing before proxying to LiteLLM
- Location: `src/lib/server/gateway/`
- Contains: `auth.ts`, `budget.ts`, `rate-limit.ts`, `routing.ts`, `load-balancer.ts`, `cache.ts`, `proxy.ts`, `usage.ts`, `models.ts`, `cors.ts`
- Depends on: `$lib/server/db`, `$lib/server/redis`, `$lib/server/crypto`, `$lib/server/providers`
- Used by: `src/routes/v1/chat/completions/+server.ts`, `src/routes/v1/embeddings/+server.ts`, `src/routes/v1/models/+server.ts`

**Auth/Session Layer:**
- Purpose: Manages web UI user sessions, email verification, password reset, OAuth login
- Location: `src/lib/server/auth/`
- Contains: `session.ts`, `password.ts`, `email.ts`, `oauth.ts`, `validation.ts`, `cookies.ts`, `emails/`
- Depends on: `$lib/server/db`, `@oslojs/crypto`, `@node-rs/argon2`, `arctic`, `nodemailer`
- Used by: `src/routes/auth/*` page server files, `src/hooks.server.ts`

**Service Layer:**
- Purpose: Domain operations for API key management, member management, provider key management
- Location: `src/lib/server/`
- Contains: `api-keys.ts`, `members.ts`, `provider-keys.ts`, `providers.ts`, `litellm.ts`, `redis.ts`, `crypto.ts`
- Depends on: `$lib/server/db`
- Used by: `src/routes/org/[slug]/*` server files

**Database Layer:**
- Purpose: Schema definition and connection pooling
- Location: `src/lib/server/db/`
- Contains: `schema.ts` (all table definitions), `index.ts` (lazy singleton connection + proxy), `migrations/` (supplementary SQL files)
- Depends on: `drizzle-orm`, `postgres` (connection driver)
- Used by: All `$lib/server/*` modules via `import { db } from '$lib/server/db'`

**UI Component Layer:**
- Purpose: Svelte 5 components organized by feature domain
- Location: `src/lib/components/`
- Contains: Feature folders (`api-keys/`, `auth/`, `budget/`, `dashboard/`, `docs/`, `landing/`, `layout/`, `members/`, `models/`, `provider-keys/`, `settings/`, `usage/`)
- Depends on: `$app/stores`, props only — no server imports
- Used by: `src/routes/**/*.svelte` page files

**Shared Types Layer:**
- Purpose: TypeScript types derived from Drizzle schema inference
- Location: `src/lib/types/index.ts`
- Contains: `User`, `Session`, `Organization`, `OrgMember`, `ProviderKey`, `ApiKey`, `OrgRole`, and corresponding `New*` insert types
- Depends on: `$lib/server/db/schema`
- Used by: All layers for type-safe DB row handling

## Data Flow

**OpenAI-compatible API request (primary gateway flow):**

1. External client sends `POST /v1/chat/completions` with `Authorization: Bearer sk-th-*`
2. `src/hooks.server.ts` skips session cookie auth for `/v1/*` paths, passes through
3. `src/routes/v1/chat/completions/+server.ts` validates body size (configurable `MAX_REQUEST_BODY_BYTES`)
4. `gateway/auth.ts::authenticateApiKey` extracts `sk-th-*` token, SHA-256 hashes it, checks Redis cache then DB (`app_api_keys` joined with `app_organizations`); populates `GatewayAuth` with effective rate limits and org settings
5. `gateway/budget.ts::checkBudget` fetches user's budget via cascade: individual > role default > org default; reads spend from snapshot or SUM query if snapshot is stale; returns `BudgetCheckResult`
6. Hard budget limit hit → 429 response. Soft limit hit → fire-and-forget email notifications via `budget/notifications.ts`
7. `gateway/proxy.ts::proxyToLiteLLM` runs full pipeline:
   a. In-memory sliding window rate limit check (`gateway/rate-limit.ts`)
   b. Smart routing: estimate token count, optionally substitute cheap/expensive model (`gateway/routing.ts`)
   c. Redis cache lookup for non-streaming requests (`gateway/cache.ts`)
   d. DB lookup for active provider keys matching effective model
   e. Round-robin key ordering (`gateway/load-balancer.ts`)
   f. Per-key retry loop with exponential backoff (max 3 retries on 429/500/503)
   g. Decrypt provider API key with AES-256-GCM (`crypto.ts`)
   h. Forward to `LITELLM_API_URL` with decrypted key in appropriate auth header
8. On success: extract token usage from JSON or SSE stream, calculate cost from `MODEL_PRICING` table, fire-and-forget `logUsage` and `updateSpendSnapshot` to DB; set Redis cache for non-streaming
9. Return response with `x-ratelimit-*` headers and `X-Cache: HIT/MISS` header

**Web UI session authentication flow:**

1. Browser sends request with `auth_session` cookie
2. `src/hooks.server.ts::handle` validates token: SHA-256 hash, DB lookup in `app_sessions`, sliding window extension if within 15 days of expiry
3. Sets `event.locals.user` and `event.locals.session` for all downstream route handlers
4. `src/routes/org/[slug]/+layout.server.ts` checks `locals.user`, resolves org by slug, verifies membership, loads budget warning data for `BudgetBanner`
5. Child page `load` functions read `locals.user` and return typed page data to Svelte components

**State Management:**
- Server state: PostgreSQL via Drizzle ORM (authoritative)
- Gateway hot path caching: Redis (optional, graceful degradation when absent) — auth cache TTL 60s, response cache TTL configurable per org (`cacheTtlSeconds`)
- In-process state: `Map<keyId, RequestEntry[]>` for rate limit sliding windows; `Map<orgId:provider, counter>` for round-robin counters (both in `src/lib/server/gateway/rate-limit.ts` and `load-balancer.ts` module scope)
- Client state: Svelte 5 `$state()` runes in `.svelte` files; `$app/stores` for page URL

## Key Abstractions

**GatewayAuth:**
- Purpose: Resolved identity context for a gateway API request — carries userId, orgId, apiKeyId, effective rate limits, and org settings (smart routing models, cache TTL)
- Definition: `src/lib/server/gateway/auth.ts` (`interface GatewayAuth`)
- Pattern: Resolved once per request by `authenticateApiKey`, passed through the entire gateway pipeline; cached in Redis keyed by `auth:{keyHash}` for 60s

**Budget Cascade:**
- Purpose: Tiered budget inheritance so admins can set org-wide defaults with per-user overrides
- Files: `src/lib/server/gateway/budget.ts`, `src/lib/server/budget/utils.ts`, `src/lib/server/budget/notifications.ts`
- Pattern: Single DB query fetches all candidate budgets (individual + role + org default), then `find()` cascade selects with priority: individual > role default > org default

**Provider Key:**
- Purpose: Encrypted credentials for an external LLM provider API key, scoped to an org
- Schema: `app_provider_keys` in `src/lib/server/db/schema.ts`
- Pattern: Stored as `iv_hex:ciphertext_hex:authTag_hex` (AES-256-GCM); decrypted at request time in `proxy.ts` via `src/lib/server/crypto.ts`

**PROVIDERS registry:**
- Purpose: Static registry of all supported LLM providers with their auth header conventions, base URLs, and model discovery endpoints
- Location: `src/lib/server/providers.ts`
- Pattern: `PROVIDERS: ProviderDef[]` constant; `getProvider(id)` lookup used in `proxy.ts` to determine whether to send `Authorization: Bearer`, `x-api-key`, or `api-key` header

## Entry Points

**SvelteKit server hook:**
- Location: `src/hooks.server.ts`
- Triggers: Every HTTP request (both session web UI and `/v1/*` API calls)
- Responsibilities: Session cookie validation, populates `event.locals.user` and `event.locals.session`; skips session auth for `/v1/*` paths

**OpenAI chat completions endpoint:**
- Location: `src/routes/v1/chat/completions/+server.ts`
- Triggers: `POST /v1/chat/completions`
- Responsibilities: Orchestrates the full gateway pipeline — auth → budget check → proxy (which runs rate limit + smart routing + cache + load balance + retry + usage log)

**OpenAI embeddings endpoint:**
- Location: `src/routes/v1/embeddings/+server.ts`
- Triggers: `POST /v1/embeddings`
- Responsibilities: Identical pipeline to chat completions, forwards to LiteLLM `/v1/embeddings`

**OpenAI models endpoint:**
- Location: `src/routes/v1/models/+server.ts`
- Triggers: `GET /v1/models`
- Responsibilities: Authenticates API key, returns aggregated model list from all active provider keys for the org

**Root layout load:**
- Location: `src/routes/+layout.server.ts`
- Triggers: Every page render
- Responsibilities: Passes `locals.user` to all page components

**Org layout load:**
- Location: `src/routes/org/[slug]/+layout.server.ts`
- Triggers: Every `/org/[slug]/*` page render
- Responsibilities: Resolves org by slug, verifies membership, loads budget warning data

**Cron endpoints:**
- Location: `src/routes/api/cron/cleanup/+server.ts`, `src/routes/api/cron/digest/+server.ts`
- Triggers: External cron scheduler via `Authorization: Bearer {CRON_SECRET}`
- Responsibilities: Cleanup expired sessions; send admin digest emails

## Error Handling

**Strategy:** Fail fast, return OpenAI-compatible JSON error bodies at the gateway layer; use SvelteKit's `fail()` and `error()` helpers at the web UI layer

**Patterns:**
- Gateway layer: All error responses follow `{ error: { message, type, code } }` format matching OpenAI's API convention; HTTP status codes map to: 400 bad request, 401 auth failure, 404 no provider, 413 payload too large, 429 rate/budget limit exceeded, 502 upstream failure
- Retry logic: `fetchWithRetry` in `proxy.ts` retries 429/500/503 with exponential backoff + jitter (base 500ms, up to 3 retries), falls back to next provider key on persistent failure
- Fire-and-forget operations (usage logging, spend snapshot update, auth cache write, Redis cache write) are all `.catch(() => {})` — non-critical side effects never block or error responses
- Web UI layer: Form actions return `fail(statusCode, { errors })` for validation; page loads throw `error(404)` or `redirect(302)` for access control
- Redis/cache failures: All Redis calls wrapped in try/catch with graceful null returns; app functions fully without Redis

## Cross-Cutting Concerns

**Logging:** `console.warn` for non-critical LiteLLM/email failures; no structured logging framework. Usage data logged to `app_usage_logs` table (queryable).
**Validation:** Zod schemas in `src/lib/server/auth/validation.ts` for web form inputs; manual field checks in gateway endpoints for API requests.
**Authentication:** Two separate auth paths — session cookies (web UI, handled in `hooks.server.ts`) and `sk-th-*` Bearer tokens (gateway API, handled in `gateway/auth.ts`). These are completely independent and do not share middleware.

---

*Architecture analysis: 2026-03-17*
