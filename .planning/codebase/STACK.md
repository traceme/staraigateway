# Technology Stack

**Analysis Date:** 2026-03-16

## Languages

**Primary:**
- TypeScript 5.x - All server logic, route handlers, library code in `src/`
- Svelte 5.x - UI components in `src/lib/components/` and route pages in `src/routes/`

**Secondary:**
- CSS (Tailwind v4) - Styling via `src/app.css` and component-level classes
- SQL - Migration files in `src/lib/server/db/migrations/`

## Runtime

**Environment:**
- Node.js 22 (alpine) - specified in `Dockerfile` base image

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- SvelteKit 2.x (`@sveltejs/kit ^2.16.0`) - Full-stack web framework; handles routing, SSR, server actions, and API endpoints
- Adapter: `@sveltejs/adapter-node ^5.2.12` - Produces a standalone Node.js server via `npm run build`

**UI:**
- Svelte 5.x - Reactive component framework
- Tailwind CSS 4.x (`tailwindcss ^4.0.0`) - Utility-first CSS, integrated via `@tailwindcss/vite` Vite plugin
- `@tailwindcss/typography ^0.5.16` - Prose styling for docs pages
- Chart.js 4.x (`chart.js ^4.5.1`) - Client-side usage charts (cost trends, breakdown bars) in `src/lib/components/usage/`

**Database ORM:**
- Drizzle ORM 0.38.x (`drizzle-orm ^0.38.0`) - Type-safe SQL query builder targeting PostgreSQL
- Drizzle Kit 0.30.x (`drizzle-kit ^0.30.0`) - Schema migration tool; config at `drizzle.config.ts`, schema at `src/lib/server/db/schema.ts`, output migrations to `drizzle/`

**Testing:**
- Vitest 4.x (`vitest ^4.1.0`) - Unit/integration test runner; config at `vitest.config.ts`
- `@vitest/coverage-v8 ^4.1.0` - V8-based coverage reporting

**Build/Dev:**
- Vite 6.x (`vite ^6.0.0`) - Dev server and production bundler; config at `vite.config.ts`

## Key Dependencies

**Authentication:**
- `@node-rs/argon2 ^2.0.2` - Native Argon2id password hashing (used in `src/lib/server/auth/password.ts`)
- `@oslojs/crypto ^1.0.1` - SHA-256 for session token hashing (used in `src/lib/server/auth/session.ts`)
- `@oslojs/encoding ^1.1.0` - Base32 encoding for session tokens
- `arctic ^3.7.0` - OAuth 2.0 client library for Google and GitHub (used in `src/lib/server/auth/oauth.ts`)

**Database/Cache:**
- `postgres ^3.4.0` - PostgreSQL client (low-level driver used by Drizzle)
- `ioredis ^5.10.0` - Redis client for response caching (used in `src/lib/server/redis.ts`)

**Email:**
- `nodemailer ^6.9.0` - SMTP email sending for verification, password reset, invitations, and budget alerts (used in `src/lib/server/auth/email.ts`)

**Validation:**
- `zod ^3.24.0` - Runtime schema validation for form inputs and API payloads

**Cryptography:**
- Node.js built-in `crypto` module - AES-256-GCM encryption of provider API keys (used in `src/lib/server/crypto.ts`)

## Configuration

**Environment:**
- Configured via environment variables; `.env.example` documents all keys
- Required: `DATABASE_URL`, `ENCRYPTION_KEY`
- Optional: `REDIS_URL`, `LITELLM_API_URL`, `LITELLM_MASTER_KEY`, `BASE_URL`, `SMTP_*`, `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*`, `CRON_SECRET`
- SvelteKit accesses private env vars via `$env/dynamic/private`

**TypeScript:**
- `strict: true` mode
- `moduleResolution: "bundler"` (Vite-compatible)
- Path alias `$lib` → `src/lib/` (configured in `vitest.config.ts` for test environment)

**Build:**
- `vite.config.ts` — plugins: `tailwindcss()`, `sveltekit()`
- `svelte.config.js` — adapter: node, preprocessor: vitePreprocess
- `drizzle.config.ts` — dialect: postgresql, schema: `./src/lib/server/db/schema.ts`

## Platform Requirements

**Development:**
- Node.js 22+
- PostgreSQL 16 (or Docker Compose service)
- Redis 7 (optional, Docker Compose service)
- LiteLLM proxy running (optional, Docker Compose service)

**Production:**
- Docker with multi-stage build (builder: `node:22-alpine`, runner: `node:22-alpine`)
- Exposes port 3000
- `NODE_ENV=production`, runs `node build`
- `docker-compose.yml` orchestrates: app + litellm + postgres:16-alpine + redis:7-alpine

---

*Stack analysis: 2026-03-16*
