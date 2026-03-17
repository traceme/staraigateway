# Codebase Structure

**Analysis Date:** 2026-03-17

## Directory Layout

```
llmtokenhub/                        # Project root (StarAIGateway)
├── src/                            # All application source code
│   ├── app.html                    # SvelteKit HTML shell
│   ├── app.css                     # Global CSS (Tailwind entry)
│   ├── app.d.ts                    # TypeScript ambient declarations (locals, etc.)
│   ├── hooks.server.ts             # Global server middleware (session auth)
│   ├── lib/
│   │   ├── components/             # Svelte UI components, grouped by feature
│   │   │   ├── api-keys/           # CreateKeyModal, KeyCreatedModal, RateLimitFields, SmartRoutingToggle
│   │   │   ├── auth/               # OAuthButtons
│   │   │   ├── budget/             # BudgetBanner, BudgetDefaultsForm, BudgetPanel
│   │   │   ├── dashboard/          # AdminKpiCards, OnboardingChecklist
│   │   │   ├── docs/               # CodeBlock, IntegrationGuide, ToolTabs
│   │   │   ├── landing/            # LandingNav, LandingHero, FeaturesGrid, CostComparison, SelfHostCta, LandingFooter
│   │   │   ├── layout/             # OrgSwitcher, Sidebar, TopBar
│   │   │   ├── members/            # InvitePanel, MemberActionMenu, MembersTable, RoleBadge
│   │   │   ├── models/             # ModelPricingTable
│   │   │   ├── provider-keys/      # ProviderCard, ProviderPanel
│   │   │   ├── settings/           # CacheTtlSetting, OrgSettingsForm, SmartRoutingSettings
│   │   │   └── usage/              # BreakdownBarChart, CostTrendChart, KpiCard, TimeRangePicker, UsageTable, UsageTabs
│   │   ├── server/                 # Server-only code (never imported by .svelte files)
│   │   │   ├── db/
│   │   │   │   ├── index.ts        # Drizzle connection singleton + proxy
│   │   │   │   ├── schema.ts       # All table definitions (app_ prefix)
│   │   │   │   └── migrations/     # Supplementary SQL migration files
│   │   │   ├── auth/
│   │   │   │   ├── session.ts      # Session create/validate/invalidate
│   │   │   │   ├── password.ts     # Argon2 hash/verify
│   │   │   │   ├── email.ts        # Nodemailer send functions
│   │   │   │   ├── oauth.ts        # Arctic Google/GitHub clients
│   │   │   │   ├── validation.ts   # Zod schemas for auth forms
│   │   │   │   ├── cookies.ts      # isSecureContext helper
│   │   │   │   └── emails/         # Email templates: verification, invitation, password-reset, budget-warning, admin-digest
│   │   │   ├── gateway/
│   │   │   │   ├── auth.ts         # Bearer token auth, GatewayAuth interface, Redis cache-aside
│   │   │   │   ├── budget.ts       # Budget cascade check, BudgetCheckResult
│   │   │   │   ├── proxy.ts        # Core proxy pipeline (smart routing, cache, load balance, retry, usage log)
│   │   │   │   ├── usage.ts        # logUsage, calculateCost, MODEL_PRICING, updateSpendSnapshot
│   │   │   │   ├── rate-limit.ts   # In-memory sliding window RPM/TPM limiter
│   │   │   │   ├── routing.ts      # estimateTokenCount, selectModelTier
│   │   │   │   ├── load-balancer.ts # Round-robin key selection
│   │   │   │   ├── cache.ts        # Redis response cache (generateCacheKey, get/set)
│   │   │   │   ├── models.ts       # getAvailableModels (aggregates from provider keys)
│   │   │   │   └── cors.ts         # getCorsHeaders
│   │   │   ├── budget/
│   │   │   │   ├── notifications.ts # checkAndNotifyBudgets, sendAdminDigest
│   │   │   │   └── utils.ts         # getBudgetResetDate
│   │   │   ├── __integration__/     # Integration test fixtures and tests
│   │   │   │   ├── setup.ts
│   │   │   │   └── db.integration.test.ts
│   │   │   ├── __mocks__/           # Vitest module mocks
│   │   │   │   └── env.ts
│   │   │   ├── api-keys.ts          # generateApiKey, createApiKey, getUserApiKeys, revokeApiKey
│   │   │   ├── members.ts           # Member invite/list/remove operations
│   │   │   ├── provider-keys.ts     # Provider key CRUD
│   │   │   ├── providers.ts         # PROVIDERS registry, ProviderDef, getProvider
│   │   │   ├── litellm.ts           # createLiteLLMOrganization (LiteLLM admin API)
│   │   │   ├── redis.ts             # getRedis lazy singleton
│   │   │   └── crypto.ts            # encrypt/decrypt (AES-256-GCM)
│   │   └── types/
│   │       └── index.ts             # Drizzle-inferred TS types: User, Session, Organization, etc.
│   ├── routes/
│   │   ├── +layout.server.ts        # Root layout load: passes user to all pages
│   │   ├── +layout.svelte           # Root layout wrapper
│   │   ├── +page.server.ts          # Landing page server (redirect if logged in)
│   │   ├── +page.svelte             # Public landing page
│   │   ├── auth/
│   │   │   ├── +layout.svelte       # Auth pages wrapper (centered card layout)
│   │   │   ├── login/               # Email/password + OAuth login
│   │   │   ├── signup/              # Registration
│   │   │   ├── logout/              # Session invalidation
│   │   │   ├── verify-email/        # Email verification token handler
│   │   │   ├── forgot-password/     # Request reset email
│   │   │   ├── reset-password/      # Reset with token
│   │   │   ├── invite/[token]/      # Accept org invitation
│   │   │   └── oauth/
│   │   │       ├── google/          # Google OAuth initiation
│   │   │       │   └── callback/    # Google OAuth callback
│   │   │       ├── github/          # GitHub OAuth initiation
│   │   │       │   └── callback/    # GitHub OAuth callback
│   │   │       └── confirm-link/    # Link OAuth to existing account
│   │   ├── org/
│   │   │   ├── create/              # Create new organization
│   │   │   └── [slug]/
│   │   │       ├── +layout.server.ts # Org auth guard + budget warning load
│   │   │       ├── +layout.svelte    # Sidebar + TopBar + BudgetBanner shell
│   │   │       ├── dashboard/        # Admin KPI cards + onboarding checklist
│   │   │       ├── api-keys/         # List/create/revoke API keys
│   │   │       ├── usage/
│   │   │       │   ├── +page.*       # Usage charts and table
│   │   │       │   └── budget/+server.ts # Budget CRUD API endpoint
│   │   │       ├── models/           # Model pricing table
│   │   │       ├── members/          # Member list, invite, role management
│   │   │       ├── provider-keys/
│   │   │       │   ├── +page.*       # Provider key management
│   │   │       │   └── validate/+server.ts # Validate provider key against provider API
│   │   │       └── settings/         # Org settings: name, smart routing, cache TTL, rate limits
│   │   ├── docs/
│   │   │   └── integrations/         # Integration guide page (Cursor, Continue.dev, etc.)
│   │   ├── v1/
│   │   │   ├── chat/completions/+server.ts  # POST /v1/chat/completions (gateway)
│   │   │   ├── embeddings/+server.ts        # POST /v1/embeddings (gateway)
│   │   │   └── models/+server.ts            # GET /v1/models (gateway)
│   │   └── api/
│   │       └── cron/
│   │           ├── cleanup/+server.ts  # DELETE expired sessions
│   │           └── digest/+server.ts   # Send admin budget digest emails
│   └── __e2e__/                     # End-to-end tests
│       ├── setup.ts
│       ├── user-journey.e2e.test.ts
│       └── budget-enforcement.e2e.test.ts
├── drizzle/                         # Drizzle migration output
│   ├── 0000_blue_whiplash.sql       # Initial schema migration
│   ├── 0001_models_text_to_jsonb.sql
│   └── meta/                        # Drizzle migration metadata
├── docs/                            # Project documentation
├── scripts/                         # Dev tooling scripts (load-test.ts, etc.)
├── .planning/                       # GSD planning documents
│   ├── codebase/                    # Codebase analysis documents (this file)
│   ├── phases/                      # Phase plans
│   └── ...
├── build/                           # Compiled adapter-node output (gitignored)
├── .svelte-kit/                     # SvelteKit generated files (gitignored)
├── node_modules/                    # Dependencies (gitignored)
├── package.json
├── svelte.config.js                 # SvelteKit config (adapter-node)
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── drizzle.config.ts                # Drizzle-kit config
├── Dockerfile
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example                     # Environment variable documentation
└── CLAUDE.md
```

## Directory Purposes

**`src/lib/server/gateway/`:**
- Purpose: All gateway pipeline logic for the OpenAI-compatible `/v1/*` API surface
- Contains: One file per concern — auth, budget, proxy, usage, rate-limit, routing, load-balancer, cache, models, cors
- Key files: `proxy.ts` is the core orchestrator; `auth.ts` defines `GatewayAuth`; `usage.ts` holds `MODEL_PRICING`

**`src/lib/server/auth/`:**
- Purpose: Web UI user identity — sessions, passwords, email, OAuth
- Contains: Stateless pure functions for each auth operation; email template functions
- Key files: `session.ts` (sliding window sessions), `oauth.ts` (Arctic OAuth clients), `validation.ts` (Zod schemas)

**`src/lib/server/db/`:**
- Purpose: Database access layer
- Contains: Schema (single file for all tables), connection singleton, supplementary migration SQL
- Key files: `schema.ts` is the single source of truth for all table shapes; `index.ts` exposes `db` proxy

**`src/lib/components/`:**
- Purpose: Reusable Svelte 5 UI components, organized by feature domain
- Contains: PascalCase `.svelte` files. Each folder maps to a page or feature area.
- Key files: `layout/Sidebar.svelte`, `layout/TopBar.svelte` — persistent chrome for org pages

**`src/routes/v1/`:**
- Purpose: The externally-accessible OpenAI-compatible API
- Contains: Only thin handler files that delegate immediately to gateway service modules
- Key files: `chat/completions/+server.ts` is the primary endpoint

**`src/routes/org/[slug]/`:**
- Purpose: All authenticated org-scoped web pages
- Contains: Each subdirectory is one page with a paired `+page.server.ts` and `+page.svelte`
- Key files: `+layout.server.ts` is the auth guard and data preloader for the entire org section

## Key File Locations

**Entry Points:**
- `src/hooks.server.ts`: Global middleware — run on every request
- `src/routes/+layout.server.ts`: Root layout load
- `src/routes/v1/chat/completions/+server.ts`: Primary API gateway entry
- `src/routes/org/[slug]/+layout.server.ts`: Org section auth guard

**Configuration:**
- `svelte.config.js`: SvelteKit adapter (adapter-node, no special options)
- `drizzle.config.ts`: Drizzle-kit pointing to `src/lib/server/db/schema.ts`
- `vitest.config.ts`: Test runner config with coverage and workspace setup
- `.env.example`: Documents all required env vars

**Core Logic:**
- `src/lib/server/gateway/proxy.ts`: Full gateway pipeline
- `src/lib/server/gateway/auth.ts`: Bearer token resolution + Redis cache
- `src/lib/server/gateway/budget.ts`: Budget cascade and spend checking
- `src/lib/server/db/schema.ts`: Authoritative data model
- `src/lib/server/providers.ts`: Supported LLM provider registry
- `src/lib/server/crypto.ts`: AES-256-GCM encrypt/decrypt for provider keys

**Testing:**
- `src/lib/server/gateway/*.test.ts`: Unit tests co-located with gateway modules
- `src/lib/server/auth/*.test.ts`: Unit tests co-located with auth modules
- `src/lib/server/__integration__/`: DB integration tests with real Postgres
- `src/__e2e__/`: Full end-to-end tests

## Naming Conventions

**Files:**
- SvelteKit route files: SvelteKit convention (`+page.svelte`, `+page.server.ts`, `+server.ts`, `+layout.svelte`, `+layout.server.ts`)
- Server modules: `kebab-case.ts` (e.g., `api-keys.ts`, `rate-limit.ts`, `load-balancer.ts`)
- Components: `PascalCase.svelte` (e.g., `BudgetPanel.svelte`, `CreateKeyModal.svelte`)
- Test files: `<module>.test.ts` co-located with the module being tested; integration tests in `__integration__/`; e2e tests in `__e2e__/`

**Database tables:**
- All tables prefixed `app_` (e.g., `app_users`, `app_api_keys`) to avoid collisions with LiteLLM's tables in the shared DB

**Variables/Functions:**
- camelCase for functions and variables
- UPPER_SNAKE_CASE for module-level constants (e.g., `MODEL_PRICING`, `RETRYABLE_STATUSES`, `SESSION_DURATION_MS`)
- `PascalCase` for interfaces and types (e.g., `GatewayAuth`, `BudgetCheckResult`, `ProviderDef`)

**API key format:**
- User-facing API keys always prefixed `sk-th-` (e.g., `sk-th-<base64url>`)
- Session cookies named `auth_session`
- Redis keys: `auth:{keyHash}` (auth cache), `cache:{orgId}:{sha256hex}` (response cache)

## Where to Add New Code

**New gateway feature (e.g., new enforcement check):**
- Add module: `src/lib/server/gateway/<feature>.ts`
- Unit test: `src/lib/server/gateway/<feature>.test.ts`
- Wire into pipeline: `src/lib/server/gateway/proxy.ts` or the relevant `/v1/*/+server.ts`

**New org page (e.g., `/org/[slug]/billing`):**
- Page server: `src/routes/org/[slug]/billing/+page.server.ts`
- Page UI: `src/routes/org/[slug]/billing/+page.svelte`
- Components: `src/lib/components/billing/` (new folder if needed)
- Auth guard is inherited from `src/routes/org/[slug]/+layout.server.ts` — no extra work needed

**New API endpoint (REST, not gateway):**
- Create: `src/routes/api/<name>/+server.ts`
- Add cron auth if admin-only (see `src/routes/api/cron/cleanup/+server.ts` for pattern)

**New DB table:**
- Add to: `src/lib/server/db/schema.ts`
- Generate migration: `npm run db:generate`
- Add Drizzle-inferred type to: `src/lib/types/index.ts`

**New UI component:**
- Add to appropriate feature folder: `src/lib/components/<feature>/ComponentName.svelte`
- Use Svelte 5 runes syntax (`$props()`, `$state()`)

**Utilities:**
- Shared helpers: `src/lib/server/<domain>.ts` (follow existing module pattern)
- Client-side utilities: not currently needed; all logic is server-side

## Special Directories

**`build/`:**
- Purpose: Compiled adapter-node output from `npm run build`
- Generated: Yes (by SvelteKit build)
- Committed: No (in `.gitignore`)

**`.svelte-kit/`:**
- Purpose: SvelteKit generated route types, client bundles, adapter build output
- Generated: Yes (by SvelteKit dev/build)
- Committed: No

**`drizzle/`:**
- Purpose: SQL migration files generated by `drizzle-kit generate`
- Generated: Yes (by drizzle-kit)
- Committed: Yes — migration files are the DB change history

**`src/lib/server/db/migrations/`:**
- Purpose: Supplementary SQL migration files that aren't part of the main drizzle migration sequence (e.g., `0003_usage_budgets.sql`, `0004_budget_snapshot.sql`)
- Generated: Partially
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents — milestones, phases, codebase analysis
- Generated: No (human + AI authored)
- Committed: Yes

---

*Structure analysis: 2026-03-17*
