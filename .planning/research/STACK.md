# Technology Stack

**Project:** LLMTokenHub - Multi-tenant LLM API Gateway SaaS
**Researched:** 2026-03-15
**Overall confidence:** MEDIUM (web search unavailable; recommendations based on reference codebase analysis, training data up to May 2025, and version checks against local repos)

## Recommended Stack

### Core Framework — SvelteKit + Node.js

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| SvelteKit | ^2.5 | Full-stack web framework | Project constraint. SSR + API routes in one framework. Open WebUI reference uses @sveltejs/kit ^2.5.27 successfully. Svelte 5 runes provide fine-grained reactivity for dashboard charts. | HIGH |
| Svelte | ^5.0 | UI framework | Svelte 5 is stable and used by Open WebUI. Runes replace stores for cleaner state management. Smaller bundle than React. | HIGH |
| @sveltejs/adapter-node | ^2.0 | Node.js deployment adapter | Self-hosted docker-compose needs a Node server, not static. Open WebUI uses this exact adapter. | HIGH |
| TypeScript | ^5.5 | Type safety | Non-negotiable for a multi-tenant SaaS. Catches API contract drift early. | HIGH |
| Vite | ^5.4 | Build tool | Ships with SvelteKit. Fast HMR for dashboard development. | HIGH |

### Proxy Engine — LiteLLM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| LiteLLM | ^1.82 | LLM API proxy/gateway | Project constraint. 100+ providers, Virtual Keys, cost tracking, budget enforcement, rate limiting all built-in. Local repo has v1.82.1. | HIGH |
| Python | >=3.10,<4.0 | LiteLLM runtime | LiteLLM requires Python >=3.9, but 3.10+ needed for MCP support and modern type hints. | HIGH |
| FastAPI | >=0.120.1 | LiteLLM's HTTP server | Built into LiteLLM proxy. Not a choice — it is the proxy's framework. | HIGH |
| Prisma (Python) | ^0.11.0 | LiteLLM's database ORM | LiteLLM uses prisma-client-py for all DB operations. Its schema already has Organization, Team, User, VerificationToken, Budget, SpendLog tables. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16 | Primary data store | Project constraint. LiteLLM requires PostgreSQL for production. Shared between SvelteKit app and LiteLLM proxy. Single DB simplifies deployment. | HIGH |
| Drizzle ORM | ^0.38 | SvelteKit database access | Type-safe, zero-overhead SQL. Schema-as-code in TypeScript. Generates migrations. Much lighter than Prisma JS (no binary engine). Works alongside LiteLLM's Prisma-Python on the same PostgreSQL. | MEDIUM |
| postgres (pg driver) | ^3.4 | PostgreSQL driver for Node.js | `postgres` (porsager/postgres) is the fastest Node.js PostgreSQL driver. Native ESM, zero dependencies. Drizzle has first-class support for it. Preferred over `pg` (callback-based, heavier). | MEDIUM |

**Why Drizzle over Prisma JS:** LiteLLM already owns the PostgreSQL schema via Prisma-Python. Adding Prisma JS would create a second schema source-of-truth and a second migration pipeline on the same database — a maintenance nightmare. Drizzle can introspect the existing LiteLLM tables (`drizzle-kit introspect`) and define additional SvelteKit-only tables (sessions, oauth accounts) without conflicting with LiteLLM's Prisma migrations.

**Why NOT Kysely:** Drizzle has better SvelteKit ecosystem integration, more active development, and simpler migration tooling.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom auth (Lucia-inspired) | N/A | Session management | Lucia (the library) was deprecated in early 2025. Its author recommends implementing sessions yourself following the Lucia guide patterns. This is ~200 lines of code: session table, cookie management, middleware. Avoids dependency on unmaintained library. | MEDIUM |
| Arctic | ^2.0 | OAuth provider integration | From the Lucia author. Lightweight OAuth 2.0 client library. Supports Google, GitHub, and 50+ providers. No framework lock-in. ~5KB. Actively maintained. | MEDIUM |
| argon2 | latest | Password hashing | Winner of Password Hashing Competition. More resistant to GPU/ASIC attacks than bcrypt. For email/password auth. | HIGH |
| @oslojs/crypto + @oslojs/encoding | latest | Crypto utilities | Session token generation, CSRF tokens. From Lucia ecosystem. Lightweight, no native dependencies. | MEDIUM |

**Why NOT Auth.js (@auth/sveltekit):** Auth.js is opinionated about database schema (creates its own tables), has a history of breaking changes between versions, and its SvelteKit adapter has been unstable. For a multi-tenant SaaS where auth integrates with LiteLLM's existing user/org model, custom auth gives full control over the user-to-organization-to-key relationship.

**Why NOT Better Auth:** Newer library with less battle-testing. Custom auth with Arctic is equally simple and gives more control over the multi-tenant user model.

**Why NOT Clerk/Auth0:** External SaaS dependency. Breaks the self-host story entirely. Cost scales with users. Cannot run in air-gapped environments.

### UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.0 | Utility-first CSS | Open WebUI uses Tailwind v4. Fast iteration on dashboard layouts. No CSS-in-JS runtime cost. | HIGH |
| Bits UI | ^1.0 | Headless component primitives | Accessible, unstyled Svelte components (dialogs, dropdowns, tabs). Svelte-native, unlike ports of React libraries. Open WebUI uses bits-ui. | MEDIUM |
| Chart.js | ^4.5 | Dashboard charts | Usage graphs, cost trends, token consumption. Open WebUI uses it. Lighter than D3 for standard chart types. | MEDIUM |
| Lucide Svelte | latest | Icons | Consistent icon set, tree-shakable, Svelte-native. | LOW |

**Why NOT shadcn-svelte:** shadcn-svelte is built on Bits UI anyway. For a dashboard-focused app, using Bits UI directly + Tailwind gives more control without the copy-paste component model that shadcn encourages. However, shadcn-svelte is a reasonable alternative if the team prefers pre-styled components — it would accelerate the initial build at the cost of flexibility.

### API & Data Fetching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| SvelteKit load functions | built-in | Server-side data loading | Native SvelteKit pattern. Type-safe with `PageData`. No additional library needed. | HIGH |
| SvelteKit form actions | built-in | Mutations (create/update/delete) | Progressive enhancement. Works without JS. Perfect for settings/admin pages. | HIGH |
| Superforms | ^2.0 | Form validation & handling | Best SvelteKit form library. Server+client validation with Zod schemas. Handles optimistic UI, error states, multi-step forms. | MEDIUM |
| Zod | ^3.23 | Schema validation | Shared validation between client and server. Generates TypeScript types. Used by Superforms and Drizzle-Zod. | HIGH |

**Why NOT tRPC:** SvelteKit's built-in load functions + form actions already provide type-safe server-client communication. tRPC adds complexity without proportional benefit in a SvelteKit monolith.

### Infrastructure & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker | latest | Containerization | Required for self-host story. LiteLLM, SvelteKit app, PostgreSQL each in containers. | HIGH |
| Docker Compose | v2 | Multi-container orchestration | Single `docker-compose.yml` for self-hosted deployment. Matches project constraint. | HIGH |
| Nginx | latest | Reverse proxy + TLS | Routes traffic to SvelteKit (dashboard) and LiteLLM (API). TLS termination. Rate limiting at edge. SSE passthrough for streaming. | HIGH |
| Redis | ^7.0 | Caching + rate limiting | LiteLLM supports Redis for distributed rate limiting and response caching. Essential for multi-tenant rate limit enforcement. | MEDIUM |

### Monitoring & Observability

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| LiteLLM built-in logging | N/A | Request/spend logging | LiteLLM logs every request with cost, tokens, latency to its SpendLog table. This IS the usage dashboard data source. | HIGH |
| Prometheus metrics | via LiteLLM | System monitoring | LiteLLM exposes Prometheus metrics endpoint. Standard for infrastructure monitoring. | MEDIUM |

### Development Tools

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pnpm | ^9.0 | Package manager | Faster, stricter than npm. Disk-efficient via content-addressable store. Workspace support if needed. | MEDIUM |
| Vitest | ^1.6 | Unit/integration testing | Native Vite integration. Same config as SvelteKit. Fast. Open WebUI uses it. | HIGH |
| Playwright | latest | E2E testing | Official SvelteKit recommendation for E2E. Cross-browser. | MEDIUM |
| ESLint + Prettier | latest | Linting + formatting | Standard SvelteKit tooling. Svelte plugin for .svelte files. | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM (Node.js) | Drizzle ORM | Prisma JS | Would conflict with LiteLLM's Prisma-Python on same DB. Two migration systems = trouble. |
| ORM (Node.js) | Drizzle ORM | Kysely | Drizzle has better migration tooling, more SvelteKit ecosystem momentum. |
| Auth | Custom + Arctic | Auth.js (@auth/sveltekit) | Opinionated schema, unstable SvelteKit adapter, poor fit for multi-tenant model. |
| Auth | Custom + Arctic | Better Auth | Too new, less proven. Custom is equally simple for our needs. |
| Auth | Custom + Arctic | Clerk / Auth0 / Supabase Auth | External SaaS dependency. Breaks self-host story. Cost scales with users. |
| CSS | Tailwind v4 | UnoCSS | Tailwind has larger ecosystem, better docs, more battle-tested. |
| UI Components | Bits UI | shadcn-svelte | shadcn-svelte wraps Bits UI. Direct use gives more control for dashboard. |
| Charts | Chart.js | D3.js | D3 is overkill for standard dashboards. Chart.js covers bar/line/pie with less code. |
| Charts | Chart.js | Apache ECharts | Heavier bundle. Chart.js sufficient for v1. ECharts worth considering for complex visualizations later. |
| API Layer | SvelteKit native | tRPC | Unnecessary complexity in a SvelteKit monolith. |
| PG Driver | postgres | pg | `postgres` is faster, ESM-native, zero-dep. `pg` is callback-era. |
| Package Mgr | pnpm | npm / yarn | pnpm is faster and handles monorepo workspaces better. |
| Frontend | SvelteKit | Next.js | Project constraint is SvelteKit. Also: smaller bundles, simpler mental model. |
| Proxy | LiteLLM | Custom proxy | LiteLLM gives 100+ providers for free. Would take months to replicate. |
| Password Hash | argon2 | bcrypt | argon2 is newer, more GPU-resistant. bcrypt is acceptable fallback if argon2 native build fails. |

## Architecture Notes on LiteLLM Integration

The key architectural insight: LiteLLM already has a complete multi-tenant data model (Organizations, Teams, Users, VerificationTokens/API Keys, Budgets, SpendLogs). The SvelteKit app should NOT duplicate this.

**Recommended: Hybrid approach.**
- **Writes:** Call LiteLLM management API (`/organization/new`, `/key/generate`, `/team/new`, etc.) from SvelteKit server routes. This keeps LiteLLM's in-memory cache and Redis cache consistent.
- **Reads:** Query LiteLLM tables directly via Drizzle for dashboard operations (spend aggregations, usage analytics). This avoids being bottlenecked by LiteLLM's API for read-heavy dashboard operations.
- **App-only data:** SvelteKit owns its own `app_*` tables for auth sessions, OAuth accounts, org invitations, onboarding state.

## Database Schema Strategy

```
PostgreSQL Database
  |
  |-- LiteLLM-owned tables (managed by Prisma-Python migrations)
  |     LiteLLM_OrganizationTable
  |     LiteLLM_TeamTable
  |     LiteLLM_UserTable
  |     LiteLLM_VerificationToken (API keys)
  |     LiteLLM_BudgetTable
  |     LiteLLM_SpendLog
  |     LiteLLM_ProxyModelTable
  |     LiteLLM_CredentialsTable
  |     ... (20+ tables)
  |
  |-- SvelteKit-owned tables (managed by Drizzle migrations)
  |     app_sessions (auth sessions)
  |     app_oauth_accounts (Google/GitHub OAuth links)
  |     app_invitations (org invite tokens)
  |     app_onboarding_state (setup wizard progress)
  |     app_org_settings (per-org config beyond LiteLLM)
  |
  |-- Views (optional, for dashboard query performance)
  |     v_org_daily_spend (aggregated from SpendLog)
  |     v_member_usage (joins User + SpendLog)
```

**Prefix SvelteKit tables with `app_`** to clearly distinguish from LiteLLM's `LiteLLM_` prefixed tables and avoid future naming collisions.

## Installation

```bash
# Frontend / Dashboard (SvelteKit)
pnpm create svelte@latest dashboard
cd dashboard
pnpm add -D @sveltejs/adapter-node svelte-check typescript
pnpm add -D tailwindcss @tailwindcss/postcss @tailwindcss/typography
pnpm add drizzle-orm postgres zod
pnpm add -D drizzle-kit
pnpm add bits-ui chart.js lucide-svelte
pnpm add sveltekit-superforms
pnpm add arctic @oslojs/crypto @oslojs/encoding
pnpm add argon2  # or bcrypt as fallback

# Dev tools
pnpm add -D vitest @testing-library/svelte playwright eslint prettier

# LiteLLM Proxy (Python, via Docker)
# Use Docker image: ghcr.io/berriai/litellm:v1.82.1
# Or pip: pip install 'litellm[proxy]'

# Infrastructure (docker-compose.yml)
# postgres:16-alpine
# redis:7-alpine
# ghcr.io/berriai/litellm:v1.82.1
# node:22-alpine (for SvelteKit app)
# nginx:alpine
```

## Version Pinning Strategy

- **Frameworks:** Pin major+minor: `@sveltejs/kit: ^2.5`, `svelte: ^5.0`
- **Pre-1.0 libraries:** Pin carefully: `drizzle-orm: ^0.38` (minor can be breaking)
- **LiteLLM:** Pin exact version in Docker: `ghcr.io/berriai/litellm:v1.82.1` — LiteLLM ships breaking changes in minor versions frequently
- **Infrastructure images:** Use specific tags in production: `postgres:16.4-alpine`, `redis:7.4-alpine`
- **Node.js:** Pin to LTS: `node:22` (matches local environment)

## Sources

- LiteLLM pyproject.toml in local repo (v1.82.1, dependencies verified)
- LiteLLM schema.prisma in local repo (full multi-tenant schema analyzed)
- Open WebUI package.json in local repo (SvelteKit ^2.5.27, Svelte ^5.0, Tailwind ^4.0, Bits UI, Chart.js verified)
- LiteLLM CLAUDE.md in local repo (architecture, development patterns, database patterns)
- Training data (May 2025): Drizzle ORM, Arctic, Lucia deprecation, Superforms, oslo packages — MEDIUM confidence, versions should be verified against npm registry before implementation
