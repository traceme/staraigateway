# Codebase Structure

**Analysis Date:** 2026-03-16

## Directory Layout

```
llmtokenhub/
├── src/
│   ├── app.css                     # Global Tailwind CSS entry
│   ├── app.d.ts                    # SvelteKit ambient type declarations (App.Locals)
│   ├── app.html                    # HTML shell template
│   ├── hooks.server.ts             # Request interceptor: session auth + locals population
│   ├── lib/
│   │   ├── components/             # Svelte UI components (domain-grouped)
│   │   │   ├── api-keys/           # API key management UI
│   │   │   ├── auth/               # OAuth buttons
│   │   │   ├── budget/             # Budget banners, panels, forms
│   │   │   ├── dashboard/          # KPI cards, onboarding checklist
│   │   │   ├── docs/               # Integration guide, code blocks
│   │   │   ├── landing/            # Public marketing page sections
│   │   │   ├── layout/             # Sidebar, TopBar, OrgSwitcher
│   │   │   ├── members/            # Members table, invite panel, role badge
│   │   │   ├── models/             # Model pricing table
│   │   │   ├── provider-keys/      # Provider key cards and panel
│   │   │   ├── settings/           # Org settings forms
│   │   │   └── usage/              # Charts, tables, time pickers
│   │   ├── server/                 # Server-only modules (never imported by browser)
│   │   │   ├── api-keys.ts         # API key CRUD and SHA-256 hashing
│   │   │   ├── crypto.ts           # AES-256-GCM encrypt/decrypt
│   │   │   ├── litellm.ts          # LiteLLM admin API client
│   │   │   ├── members.ts          # Org membership helpers
│   │   │   ├── provider-keys.ts    # Provider key CRUD
│   │   │   ├── providers.ts        # Static PROVIDERS registry (ProviderDef[])
│   │   │   ├── redis.ts            # Lazy Redis singleton (optional)
│   │   │   ├── auth/               # Web auth: sessions, OAuth, password, email
│   │   │   │   ├── email.ts        # Nodemailer transport wrapper
│   │   │   │   ├── oauth.ts        # Arctic OAuth provider setup
│   │   │   │   ├── password.ts     # Argon2 hash/verify
│   │   │   │   ├── session.ts      # Session create/validate/invalidate
│   │   │   │   ├── validation.ts   # Zod schemas for auth forms
│   │   │   │   └── emails/         # Email template functions
│   │   │   │       ├── admin-digest.ts
│   │   │   │       ├── budget-warning.ts
│   │   │   │       ├── invitation.ts
│   │   │   │       ├── password-reset.ts
│   │   │   │       └── verification.ts
│   │   │   ├── budget/
│   │   │   │   └── notifications.ts  # Budget soft-limit alerts + admin digest
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Drizzle singleton (lazy proxy)
│   │   │   │   ├── schema.ts         # All table definitions (app_ prefix)
│   │   │   │   └── migrations/       # Raw SQL migration files
│   │   │   ├── gateway/              # LLM API gateway pipeline
│   │   │   │   ├── auth.ts           # Bearer key auth → GatewayAuth
│   │   │   │   ├── budget.ts         # Pre-request budget check
│   │   │   │   ├── cache.ts          # Redis cache get/set
│   │   │   │   ├── load-balancer.ts  # Round-robin key selection
│   │   │   │   ├── models.ts         # Aggregate models from provider keys
│   │   │   │   ├── proxy.ts          # Core proxy: retry, fallback, streaming
│   │   │   │   ├── rate-limit.ts     # In-memory sliding window RPM/TPM
│   │   │   │   ├── routing.ts        # Smart routing: token estimation, model tier
│   │   │   │   ├── usage.ts          # Usage extraction, cost calculation, log write
│   │   │   │   ├── cache.test.ts     # Unit tests
│   │   │   │   ├── load-balancer.test.ts
│   │   │   │   ├── proxy.test.ts
│   │   │   │   └── routing.test.ts
│   │   │   └── __mocks__/
│   │   │       └── env.ts            # Vitest mock for $env/dynamic/private
│   │   └── types/
│   │       └── index.ts              # Drizzle-inferred TypeScript types + OrgRole
│   └── routes/
│       ├── +layout.server.ts         # Root layout: passes user to all pages
│       ├── +layout.svelte            # Root layout component
│       ├── +page.server.ts           # Root: redirect authenticated → org dashboard
│       ├── +page.svelte              # Landing page (unauthenticated)
│       ├── api/
│       │   └── cron/digest/
│       │       └── +server.ts        # Admin digest cron endpoint
│       ├── auth/                     # All authentication pages
│       │   ├── +layout.svelte        # Auth layout wrapper
│       │   ├── forgot-password/
│       │   ├── invite/[token]/
│       │   ├── login/
│       │   ├── logout/
│       │   ├── oauth/
│       │   │   ├── github/           # GitHub OAuth initiation + callback
│       │   │   └── google/           # Google OAuth initiation + callback
│       │   ├── reset-password/
│       │   ├── signup/
│       │   └── verify-email/
│       ├── docs/
│       │   └── integrations/
│       │       └── +page.svelte      # Integration guide page
│       ├── org/
│       │   ├── create/               # Org creation flow
│       │   └── [slug]/               # Org-scoped pages (require membership)
│       │       ├── +layout.server.ts # Org auth guard + shared org context
│       │       ├── +layout.svelte    # Org layout (sidebar + topbar)
│       │       ├── api-keys/         # API key management page
│       │       ├── dashboard/        # Org overview dashboard
│       │       ├── members/          # Member management + invites
│       │       ├── models/           # Model pricing table
│       │       ├── provider-keys/    # Provider key management + validation endpoint
│       │       ├── settings/         # Org settings (smart routing, cache TTL)
│       │       └── usage/            # Usage analytics + budget endpoint
│       └── v1/                       # OpenAI-compatible API gateway
│           ├── chat/completions/
│           │   └── +server.ts        # POST /v1/chat/completions
│           ├── embeddings/
│           │   └── +server.ts        # POST /v1/embeddings
│           └── models/
│               └── +server.ts        # GET /v1/models
├── .env.example                      # Environment variable template (safe to read)
├── docker-compose.yml                # Full-stack deployment config
├── Dockerfile                        # Node.js app container
├── drizzle.config.ts                 # Drizzle Kit config (schema path, migrations out)
├── package.json                      # Dependencies and scripts
├── svelte.config.js                  # SvelteKit + adapter-node config
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                    # Vite config
└── vitest.config.ts                  # Vitest test runner config
```

## Directory Purposes

**`src/lib/server/gateway/`:**
- Purpose: The LLM proxy pipeline — all logic that executes on every API request
- Contains: 9 focused modules, each owning one concern (auth, budget, cache, rate-limit, routing, load-balancer, models, proxy, usage)
- Key files: `proxy.ts` (orchestrator), `auth.ts` (GatewayAuth type + key lookup)

**`src/lib/server/auth/`:**
- Purpose: Web session management and all auth flows (password, OAuth, email verification)
- Contains: Core session/password/OAuth modules + `emails/` subdirectory for transactional email templates
- Key files: `session.ts` (sliding window sessions), `oauth.ts` (Arctic OAuth setup)

**`src/lib/server/db/`:**
- Purpose: Database access — schema as source of truth, lazy singleton connection
- Contains: `schema.ts` (all 10 tables), `index.ts` (Drizzle proxy singleton), `migrations/` (SQL files)
- Key files: `schema.ts` — all types are derived from here via `$lib/types`

**`src/lib/components/`:**
- Purpose: Reusable Svelte UI components, one subdirectory per domain feature
- Contains: Feature-scoped `.svelte` files (no barrel files — import directly by path)
- Key files: `layout/Sidebar.svelte`, `layout/TopBar.svelte`, `usage/CostTrendChart.svelte`

**`src/routes/org/[slug]/`:**
- Purpose: All authenticated org-scoped pages; `[slug]` is the org's URL slug
- Contains: 7 feature sections, each with a `+page.server.ts` and `+page.svelte`
- Key files: `+layout.server.ts` (the org auth guard — all child pages inherit verified membership)

**`src/routes/v1/`:**
- Purpose: OpenAI-compatible API surface; these are the endpoints AI tools connect to
- Contains: 3 endpoints matching OpenAI's API structure

## Key File Locations

**Entry Points:**
- `src/hooks.server.ts`: First code run on every request; establishes auth context
- `src/app.html`: HTML shell with `%sveltekit.head%` and `%sveltekit.body%` markers
- `src/routes/+page.svelte`: Landing page / redirect hub

**Configuration:**
- `drizzle.config.ts`: Points Drizzle Kit at `src/lib/server/db/schema.ts` and `./drizzle` for migrations
- `svelte.config.js`: Uses `adapter-node` for standalone Node.js deployment
- `vite.config.ts`: Vite build configuration
- `vitest.config.ts`: Test runner setup

**Core Logic:**
- `src/lib/server/gateway/proxy.ts`: Central proxy orchestrator (most complex file)
- `src/lib/server/db/schema.ts`: Canonical data model — all tables defined here
- `src/lib/server/providers.ts`: Static list of all supported LLM providers
- `src/lib/types/index.ts`: All TypeScript types exported from a single location

**Testing:**
- `src/lib/server/gateway/*.test.ts`: Gateway unit tests co-located with source files
- `src/lib/server/__mocks__/env.ts`: Mock for SvelteKit's `$env/dynamic/private`

## Naming Conventions

**Files:**
- Svelte components: PascalCase (e.g., `CreateKeyModal.svelte`, `BudgetBanner.svelte`)
- Server modules: kebab-case (e.g., `api-keys.ts`, `load-balancer.ts`, `rate-limit.ts`)
- SvelteKit routing files: SvelteKit convention (`+page.svelte`, `+page.server.ts`, `+server.ts`, `+layout.svelte`, `+layout.server.ts`)

**Directories:**
- Component subdirs: kebab-case, domain-named (e.g., `api-keys/`, `provider-keys/`, `usage/`)
- Route subdirs: kebab-case (e.g., `forgot-password/`, `verify-email/`)
- Dynamic route segment: `[slug]`, `[token]` (SvelteKit convention)

**TypeScript:**
- Interfaces and types: PascalCase (e.g., `GatewayAuth`, `ProviderDef`, `BudgetCheckResult`)
- Functions: camelCase (e.g., `authenticateApiKey`, `proxyToLiteLLM`, `checkBudget`)
- DB table constants: camelCase prefixed with `app` (e.g., `appUsers`, `appApiKeys`)
- Exported constants: SCREAMING_SNAKE_CASE for static config (e.g., `PROVIDERS`, `MODEL_PRICING`, `RETRYABLE_STATUSES`)

## Where to Add New Code

**New gateway middleware (e.g., IP allowlist, custom header injection):**
- Implementation: `src/lib/server/gateway/your-feature.ts`
- Wire-up: Add call in `src/lib/server/gateway/proxy.ts` at the appropriate pipeline step
- Tests: `src/lib/server/gateway/your-feature.test.ts` (co-locate)

**New org-scoped page (e.g., audit logs):**
- Create: `src/routes/org/[slug]/audit-logs/+page.server.ts` and `+page.svelte`
- Data loading: Call `await parent()` to inherit org context from layout
- Navigation: Add entry to `src/lib/components/layout/Sidebar.svelte`
- Components: `src/lib/components/audit-logs/` (new domain subdirectory)

**New API endpoint (e.g., `/v1/completions`):**
- Create: `src/routes/v1/completions/+server.ts`
- Pattern: Follow `src/routes/v1/chat/completions/+server.ts` — authenticate, check budget, call `proxyToLiteLLM()`

**New transactional email:**
- Template function: `src/lib/server/auth/emails/your-email.ts`
- Sending: Import into relevant server module and call `sendEmail()` from `src/lib/server/auth/email.ts`

**New DB table:**
- Add to `src/lib/server/db/schema.ts` with `app_` prefix
- Run `npm run db:generate` to generate migration
- Export types from `src/lib/types/index.ts`

**Utility helpers:**
- Shared server helpers: `src/lib/server/` (domain-appropriate module)
- No barrel `index.ts` files — import by specific file path using `$lib/server/module-name`

## Special Directories

**`.svelte-kit/`:**
- Purpose: SvelteKit build artifacts and generated types
- Generated: Yes
- Committed: No

**`build/`:**
- Purpose: Production build output from `adapter-node`
- Generated: Yes
- Committed: No

**`src/lib/server/db/migrations/`:**
- Purpose: Raw SQL migration files generated by Drizzle Kit
- Generated: Yes (by `npm run db:generate`)
- Committed: Yes — migrations are version-controlled

**`.planning/`:**
- Purpose: GSD planning documents (milestones, phases, codebase analysis)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-16*
