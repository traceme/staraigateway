# Phase 5: Advanced Gateway & Launch - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-harden the gateway with auto-retries, provider fallbacks, smart routing (cheap vs expensive model tiers), exact-match response caching (Redis), and round-robin load balancing across multiple provider keys. Package the product for self-hosting via docker-compose and create a single-page landing page with integration docs for Cursor, Continue.dev, and Claude Code.

</domain>

<decisions>
## Implementation Decisions

### Retry & fallback strategy
- Auto-retry on provider errors: 429, 500, 503
- Exponential backoff between retries (3 attempts max)
- After retries exhausted on primary key, fall back to next active provider key that supports the same model
- If all keys for a model are exhausted, return the last error to the client
- Retry logic wraps the existing `fetch` to LiteLLM in proxy.ts

### Smart routing
- Token count heuristic: short input (<500 tokens) routes to cheap tier, long input routes to expensive tier
- 2 tiers: cheap (GPT-4o-mini, Haiku, Flash) and expensive (GPT-4o, Sonnet, Pro)
- Opt-in per API key: admin enables "smart routing" on specific keys via a toggle in key creation/edit form
- Keys without smart routing enabled use the exact model requested (current behavior)
- Admin configures tier model mappings in org settings page (new "Smart Routing" section)
- Add `smartRouting` boolean column to `app_api_keys` table
- Add `smartRoutingCheapModel` and `smartRoutingExpensiveModel` text columns to `app_organizations` table

### Caching (Redis)
- Semantic caching via exact match on normalized prompt: hash of (model + messages array after whitespace trim)
- Redis required — caching only works when `REDIS_URL` env var is configured; no Redis = no caching, no errors
- Default TTL: 1 hour, admin-configurable in org settings
- Cache key format: `cache:{orgId}:{sha256(model+messages)}`
- Only cache successful non-streaming responses (streaming responses are not cached)
- Add `cacheTtlSeconds` integer column to `app_organizations` (default 3600)
- Redis added to docker-compose.yml as optional service

### Load balancing
- Round-robin across multiple active keys for the same provider+model
- In-memory counter per org+provider to track rotation index
- Replaces current "first matching key wins" logic in proxy.ts
- Combined with retry/fallback: if round-robin key fails after retries, move to next key

### Self-host package
- Docker-compose with 3 services: llmtokenhub (SvelteKit app), postgres, redis
- LiteLLM runs embedded within the SvelteKit process (not a separate container)
- `.env.example` file with all variables documented (DATABASE_URL, REDIS_URL, ENCRYPTION_KEY, SMTP settings, OAuth client IDs, etc.)
- Dockerfile for the SvelteKit app (multi-stage build: install deps, build, production image)
- Self-host config guide as markdown doc in `docs/self-host.md`

### Landing page
- Single-page with sections: hero + value prop, features grid, cost comparison (per-seat vs pooled API), self-host CTA, footer
- Built as a SvelteKit route at `/` (root path, no auth required)
- Authenticated users who visit `/` redirect to their org dashboard
- Clean, modern design consistent with the dashboard aesthetic (zinc/blue palette)

### Integration docs
- Step-by-step guides with numbered instructions and config snippets for each tool
- Separate section per tool: Cursor, Continue.dev, Claude Code
- Each section: what to install/configure, where to paste the API base URL and key, verification step
- Screenshot placeholders (actual screenshots added manually later)
- Docs live at `docs/integrations.md` or as a SvelteKit page at `/docs/integrations`

### Claude's Discretion
- Exact retry backoff timing and jitter
- Redis client library choice (ioredis vs redis)
- Token counting approach for smart routing heuristic (approximate vs tiktoken)
- Landing page copy and exact section order
- Dockerfile base image and optimization
- Whether integration docs are static markdown or a SvelteKit page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in:

### Requirements
- `.planning/REQUIREMENTS.md` — GW-06, GW-07, GW-08, GW-09, GW-10, SHIP-01, SHIP-02, SHIP-03, SHIP-04

### Prior phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Auth system, email infrastructure, dashboard skeleton
- `.planning/phases/02-core-gateway/02-CONTEXT.md` — Gateway proxy architecture, provider key management, SSE pass-through, LiteLLM integration
- `.planning/phases/03-usage-budget-controls/03-CONTEXT.md` — Usage logging, budget enforcement, fire-and-forget patterns
- `.planning/phases/04-dashboard-team-management/04-CONTEXT.md` — Rate limiting, org settings page, admin API key management

### Key implementation files
- `src/lib/server/gateway/proxy.ts` — Gateway proxy to add retry/fallback/routing/caching/load balancing
- `src/lib/server/gateway/auth.ts` — API key auth with effective rate limits, extend with smartRouting flag
- `src/lib/server/gateway/rate-limit.ts` — In-memory rate limiter pattern (reuse for load balancer state)
- `src/lib/server/db/schema.ts` — Add smartRouting, cache TTL, routing model columns
- `src/routes/org/[slug]/settings/` — Org settings page to extend with smart routing + cache TTL config
- `src/routes/org/[slug]/api-keys/` — API key forms to add smart routing toggle

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/server/gateway/proxy.ts`: Gateway proxy with streaming + non-streaming paths — extend with retry wrapper and cache check
- `src/lib/server/gateway/rate-limit.ts`: In-memory Map-based sliding window — pattern reusable for round-robin counters
- `src/lib/server/gateway/usage.ts`: Usage extraction from responses — cache should skip logging on cache hits (or log separately)
- `src/routes/org/[slug]/settings/`: Org settings page with OrgSettingsForm — extend with smart routing config and cache TTL
- `src/lib/components/api-keys/RateLimitFields.svelte`: Rate limit input fields — add smart routing toggle nearby in key form
- `src/lib/server/gateway/budget.ts`: Budget check pattern — cache check would go before budget check (cached responses are free)

### Established Patterns
- Drizzle ORM with postgres.js driver, all tables use app_ prefix
- Fire-and-forget DB writes for non-blocking operations
- SvelteKit form actions for CRUD operations
- In-memory Map for ephemeral state (rate limiter)
- Conditional features based on env vars (OAuth providers: null when env vars missing)
- Slide-out panels for detail/edit views

### Integration Points
- Gateway proxy (proxy.ts) — primary integration point for all gateway features
- Provider key selection — replace "first match" with round-robin + fallback chain
- Org settings — add smart routing and cache config sections
- API key creation form — add smart routing toggle
- Docker deployment — new Dockerfile + docker-compose.yml at project root
- Landing page — new route at `/` with auth redirect

</code_context>

<specifics>
## Specific Ideas

- Landing page cost comparison should show the 40-60% savings calculation from the PRD (80% of usage is below subscription break-even)
- Integration docs should feel like Vercel's integration guides — clean, copy-pasteable, no fluff
- Smart routing tier config should be visual — drag models between cheap/expensive columns or simple dropdown selects
- Cache hit responses should include `X-Cache: HIT` header so users know when a cached response was returned

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-advanced-gateway-launch*
*Context gathered: 2026-03-16*
