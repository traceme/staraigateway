# Technology Stack

**Analysis Date:** 2026-03-17

## Languages

**Primary:**
- TypeScript 5.x - All source code (`src/**/*.ts`, `src/**/*.svelte`)

**Secondary:**
- SQL - Drizzle migration files (`src/lib/server/db/migrations/*.sql`)

## Runtime

**Environment:**
- Node.js 22 (Alpine) - confirmed in `Dockerfile`: `FROM node:22-alpine`

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- SvelteKit 2.16+ (`@sveltejs/kit`) - Full-stack web framework; handles routing, SSR, server actions, API endpoints
- Svelte 5.0+ - UI component framework with runes syntax

**Adapter:**
- `@sveltejs/adapter-node` 5.x - Produces a standalone Node.js server (`build/` dir); runs as `node build`

**Build/Dev:**
- Vite 6.x - Build tool and dev server
- `@sveltejs/vite-plugin-svelte` 5.x - Svelte compilation in Vite
- `@tailwindcss/vite` 4.x - Tailwind CSS integration

**Testing:**
- Vitest 4.x - Unit and integration test runner; config in `vitest.config.ts`
- `@vitest/coverage-v8` 4.x - Code coverage via V8

## Key Dependencies

**Critical:**
- `drizzle-orm` 0.38 - TypeScript-first ORM for PostgreSQL; schema defined in `src/lib/server/db/schema.ts`
- `postgres` 3.4 - Low-level PostgreSQL driver used by drizzle; connection pool in `src/lib/server/db/index.ts`
- `ioredis` 5.10 - Redis client for response caching and auth cache-aside; lazy singleton in `src/lib/server/redis.ts`
- `arctic` 3.7 - OAuth 2.0 client library for Google and GitHub flows; used in `src/lib/server/auth/oauth.ts`
- `@node-rs/argon2` 2.x - Native argon2 password hashing (memory=19456, time=2); used in `src/lib/server/auth/password.ts`
- `@oslojs/crypto` + `@oslojs/encoding` - SHA-256 session token hashing, base32 encoding; used in `src/lib/server/auth/session.ts`
- `nodemailer` 6.9 - Transactional email via SMTP; used in `src/lib/server/auth/email.ts`
- `zod` 3.24 - Runtime validation for form inputs and API payloads
- `chart.js` 4.5 - Client-side charts for usage analytics dashboards

**Infrastructure:**
- `drizzle-kit` 0.30 (dev) - CLI for schema migrations and Drizzle Studio; commands in `package.json` (`db:generate`, `db:migrate`, `db:push`, `db:studio`)
- `autocannon` 8.x (dev) - HTTP load testing; used in `scripts/load-test.ts`
- `tailwindcss` 4.x (dev) - Utility CSS framework

## Configuration

**Environment:**
- Configured via environment variables; template at `.env.example`
- Required: `DATABASE_URL`, `ENCRYPTION_KEY` (64 hex chars for AES-256-GCM), `CRON_SECRET`
- Optional: `REDIS_URL`, `LITELLM_API_URL`, `LITELLM_MASTER_KEY`, `APP_URL`, `SMTP_*`, `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*`, `CORS_ALLOWED_ORIGINS`, `MAX_REQUEST_BODY_BYTES`, `DB_POOL_MAX`, `DB_IDLE_TIMEOUT`, `DB_CONNECT_TIMEOUT`
- SvelteKit reads these via `$env/dynamic/private` at runtime (not baked into the build)

**Build:**
- `svelte.config.js` - SvelteKit config, uses `adapter-node`
- `vite.config.ts` - Vite config with Tailwind + SvelteKit plugins
- `tsconfig.json` - TypeScript in strict mode, `moduleResolution: "bundler"`
- `drizzle.config.ts` - Points at `src/lib/server/db/schema.ts`, dialect postgresql, migrations output to `drizzle/`

## Platform Requirements

**Development:**
- Node.js 22+
- PostgreSQL 16+ (or Docker)
- Redis 7+ (optional, enables caching)
- LiteLLM proxy (optional, enables actual LLM proxying)

**Production:**
- Docker Compose: `docker-compose.yml` orchestrates app + litellm + postgres:16-alpine + redis:7-alpine
- App exposed on port 3000 (inside container)
- Two-stage Docker build: `builder` stage compiles with Vite, production stage is minimal Alpine with only `build/` and pruned `node_modules/`

---

*Stack analysis: 2026-03-17*
