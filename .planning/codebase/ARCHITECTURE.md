# Architecture

**Analysis Date:** 2026-03-16

## Pattern Overview

**Overall:** Full-stack SvelteKit application with a dual-purpose design — a web management dashboard AND an OpenAI-compatible API gateway in a single Node.js process.

**Key Characteristics:**
- SvelteKit file-system routing handles both UI pages (SSR) and API endpoints in the same app
- Two distinct authentication systems operate in parallel: cookie-based sessions for the web UI, and Bearer API key auth for `/v1/*` gateway routes
- The gateway layer (`src/lib/server/gateway/`) is an in-process middleware pipeline (not a separate service) sitting in front of LiteLLM
- All app-owned DB tables carry an `app_` prefix to coexist with LiteLLM's Prisma-managed tables in the same PostgreSQL database
- Redis is optional — caching silently degrades to no-op when `REDIS_URL` is absent

## Layers

**Route Layer:**
- Purpose: HTTP request handling, authentication guards, form actions
- Location: `src/routes/`
- Contains: SvelteKit `+page.server.ts` (SSR load + form actions), `+layout.server.ts` (auth checks, shared data), `+server.ts` (pure API endpoints)
- Depends on: Server lib modules in `src/lib/server/`
- Used by: Browser clients (UI), AI tools via OpenAI-compatible API

**Gateway Layer:**
- Purpose: LLM proxy pipeline — auth, budget, rate limiting, smart routing, caching, load balancing, usage logging
- Location: `src/lib/server/gateway/`
- Contains: `auth.ts`, `budget.ts`, `cache.ts`, `load-balancer.ts`, `models.ts`, `proxy.ts`, `rate-limit.ts`, `routing.ts`, `usage.ts`
- Depends on: `db`, `redis`, `crypto`, `providers`
- Used by: `/v1/chat/completions`, `/v1/embeddings`, `/v1/models` route handlers

**Auth Layer:**
- Purpose: Web session management, OAuth, email flows, password handling
- Location: `src/lib/server/auth/`
- Contains: `session.ts`, `oauth.ts`, `password.ts`, `validation.ts`, `email.ts`, `emails/`
- Depends on: `db`, `nodemailer`, `arctic` (OAuth), `@node-rs/argon2` (password hashing)
- Used by: Auth route handlers in `src/routes/auth/`

**Data Layer:**
- Purpose: Database schema definition, connection singleton, migrations
- Location: `src/lib/server/db/`
- Contains: `schema.ts` (all table definitions), `index.ts` (lazy Drizzle singleton)
- Depends on: `drizzle-orm`, `postgres` driver
- Used by: All server-side modules

**Component Layer:**
- Purpose: Svelte UI components organized by domain
- Location: `src/lib/components/`
- Contains: Feature-grouped `.svelte` files (api-keys, budget, dashboard, landing, layout, members, models, provider-keys, settings, usage)
- Depends on: Chart.js for usage visualizations
- Used by: Route `+page.svelte` files

**Types Layer:**
- Purpose: Shared TypeScript types derived directly from DB schema
- Location: `src/lib/types/index.ts`
- Contains: `InferSelectModel` / `InferInsertModel` derived types for all tables, `OrgRole` union type
- Used by: Server modules and Svelte components via `$lib/types`

## Data Flow

**Web UI Request Flow:**

1. Browser sends request with `auth_session` cookie
2. `src/hooks.server.ts` intercepts all requests — validates session token (SHA-256 hashed, compared to DB), populates `event.locals.user`
3. `src/routes/+layout.server.ts` passes `user` to all pages via `load()`
4. Org-scoped `src/routes/org/[slug]/+layout.server.ts` checks org membership, loads org context + budget warning, populates `currentOrg`, `membership`, `userOrgs`
5. Child page `+page.server.ts` calls `await parent()` to inherit layout data, then loads page-specific data
6. Svelte components render SSR on server, hydrate on client

**API Gateway Request Flow (LLM calls):**

1. Client sends `POST /v1/chat/completions` with `Authorization: Bearer sk-th-...`
2. `src/hooks.server.ts` bypasses session auth for `/v1/*` routes
3. Route handler (`src/routes/v1/chat/completions/+server.ts`) calls `authenticateApiKey()` — SHA-256 hashes the Bearer token, looks up in `app_api_keys`, joins `app_organizations`
4. `checkBudget()` queries `app_budgets` with cascade (individual > role default > org default), sums `app_usage_logs` for current billing period
5. If budget allows: `proxyToLiteLLM()` is called, which:
   a. Checks in-memory sliding window rate limit (RPM/TPM)
   b. Parses request body, applies smart routing (cheap vs. expensive model by token count)
   c. Checks Redis cache for non-streaming requests
   d. Queries `app_provider_keys` for active keys matching the model
   e. Orders keys via round-robin (`load-balancer.ts`)
   f. Decrypts provider key (AES-256-GCM), adds provider-specific auth header
   g. Forwards to LiteLLM with exponential backoff retry (max 3 retries for 429/500/503)
   h. Falls back to next key on failure
   i. Extracts token usage from response (JSON or SSE stream)
   j. Writes usage log to `app_usage_logs` (fire-and-forget)
   k. Caches successful non-streaming response in Redis

**State Management:**
- Server state: PostgreSQL via Drizzle ORM; in-memory rate limit windows (per-process, not shared across replicas)
- Client state: Svelte component local state + SvelteKit form action return values
- Cache state: Redis (optional), keyed as `cache:{orgId}:{sha256(model+messages)}`

## Key Abstractions

**GatewayAuth:**
- Purpose: Authenticated identity for a gateway API request — combines user, org, key config, and effective limits
- Examples: `src/lib/server/gateway/auth.ts`
- Pattern: Returned by `authenticateApiKey()`, threaded through all gateway functions as context

**ProviderDef:**
- Purpose: Static definition of a supported LLM provider (auth header style, model discovery endpoint, base URL)
- Examples: `src/lib/server/providers.ts` — 10 providers defined (OpenAI, Anthropic, Google, Azure, Mistral, Cohere, DeepSeek, Qwen, GLM, Doubao, Custom)
- Pattern: Looked up by `getProvider(id)` during proxy request to select correct auth header

**Budget Cascade:**
- Purpose: Layered spending limits — individual user overrides role defaults, which override org-wide default
- Examples: `src/lib/server/gateway/budget.ts`, `src/routes/org/[slug]/+layout.server.ts`
- Pattern: Single query fetches all candidate budgets, `find()` applies priority order: `userId match > role match > isOrgDefault`

**Encrypted Provider Key:**
- Purpose: API keys for LLM providers stored encrypted at rest
- Examples: `src/lib/server/crypto.ts` — AES-256-GCM with random 96-bit IV per encryption
- Pattern: Stored as `iv_hex:ciphertext_hex:authTag_hex` in `app_provider_keys.encrypted_key`

## Entry Points

**Web Application:**
- Location: `src/app.html` (HTML shell), `src/routes/+layout.svelte` (root Svelte layout)
- Triggers: Browser navigation, SSR request
- Responsibilities: Renders the full application; unauthenticated users see the landing page (`src/routes/+page.svelte`); authenticated users are redirected to their org dashboard

**SvelteKit Server Hook:**
- Location: `src/hooks.server.ts`
- Triggers: Every HTTP request
- Responsibilities: Session validation and `locals` population; exempts `/v1/*` from session auth

**API Gateway:**
- Location: `src/routes/v1/chat/completions/+server.ts`, `src/routes/v1/embeddings/+server.ts`, `src/routes/v1/models/+server.ts`
- Triggers: OpenAI-compatible API calls from IDE plugins, CLI tools, chat UIs
- Responsibilities: Full gateway pipeline — auth, budget, rate limit, proxy, usage logging

**Cron Endpoint:**
- Location: `src/routes/api/cron/digest/+server.ts`
- Triggers: External cron job with `Authorization: Bearer {CRON_SECRET}`
- Responsibilities: Sends admin digest emails for all organizations

## Error Handling

**Strategy:** Fail fast with OpenAI-compatible error response shapes for gateway routes; SvelteKit `fail()` / `error()` helpers for form actions and page loads.

**Patterns:**
- Gateway errors return `{ error: { message, type, code } }` JSON with appropriate HTTP status (401, 404, 429, 502)
- Budget exceeded returns HTTP 429 with `type: 'budget_exceeded'`
- Rate limit exceeded returns HTTP 429 with `x-ratelimit-*` headers and `Retry-After`
- All keys exhausted: logs usage with `'error'` status, returns last error response or 502
- Form actions use `return fail(status, { error: message })` caught by Svelte components
- Network errors during proxy are caught per-key, allowing fallback to next key

## Cross-Cutting Concerns

**Logging:** `console.error()` only for cron failures; all LLM request outcomes logged to `app_usage_logs` table via fire-and-forget `logUsage()` in `src/lib/server/gateway/usage.ts`

**Validation:** Zod schemas on all form actions (e.g., `createSchema`, `revokeSchema` in page server files); input validation at gateway for required `model` field

**Authentication:** Two independent systems — cookie sessions (web UI, 30-day sliding window) and SHA-256-hashed API keys (gateway, prefix `sk-th-`)

**Encryption:** AES-256-GCM via Node.js `crypto` module in `src/lib/server/crypto.ts`; used only for provider keys at rest

**CORS:** All `/v1/*` endpoints return `Access-Control-Allow-Origin: *` to allow browser-based tool integrations

---

*Architecture analysis: 2026-03-16*
