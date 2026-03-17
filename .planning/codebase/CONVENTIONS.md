# Coding Conventions

**Analysis Date:** 2026-03-17

## Naming Patterns

**Files:**
- Server modules use `kebab-case`: `api-keys.ts`, `load-balancer.ts`, `rate-limit.ts`
- Test files are co-located and named `{module}.test.ts`: `auth.test.ts`, `budget.test.ts`
- Svelte components use `PascalCase`: `CreateKeyModal.svelte`, `BudgetBanner.svelte`
- SvelteKit route files follow framework convention: `+page.svelte`, `+server.ts`, `+layout.server.ts`
- Email template modules live under `src/lib/server/auth/emails/` with `kebab-case`: `budget-warning.ts`, `password-reset.ts`

**Functions:**
- Exported async service functions use `camelCase` verb-noun: `authenticateApiKey`, `createApiKey`, `checkBudget`, `validateSession`
- Internal helpers use `camelCase` and are unexported: `getCachedAuth`, `setCachedAuth`, `hashToken`, `getTransport`
- SvelteKit request handlers are exported as uppercase HTTP methods: `export const POST`, `export const OPTIONS`

**Variables:**
- `camelCase` throughout; module-level constants use `UPPER_SNAKE_CASE`: `AUTH_CACHE_TTL`, `SESSION_DURATION_MS`, `MAX_RETRIES`, `BASE_DELAY_MS`, `RETRYABLE_STATUSES`

**Types and Interfaces:**
- Exported interfaces use `PascalCase`: `GatewayAuth`, `SessionValidationResult`, `ApiKeyMetadata`, `RateLimitResult`
- DB-inferred types are derived via Drizzle helpers: `type User = InferSelectModel<typeof appUsers>` in `src/lib/types/index.ts`
- Role literals typed as union: `type OrgRole = 'owner' | 'admin' | 'member'`

**Database Tables:**
- All Drizzle schema tables are named with `app_` prefix (snake_case SQL) to coexist with LiteLLM's Prisma tables: `app_users`, `app_api_keys`, `app_usage_logs`
- TypeScript table variables use `camelCase` with `app` prefix: `appUsers`, `appApiKeys`, `appUsageLogs` (see `src/lib/server/db/schema.ts`)

## Code Style

**Formatting:**
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- Tabs for indentation (observed in all source files)
- No linter config file detected (no `.eslintrc`, no `biome.json`); TypeScript type checking is the primary code quality gate via `npm run check`

**Module System:**
- ESM-only (`"type": "module"` in `package.json`)
- `moduleResolution: "bundler"` (SvelteKit/Vite native)

## Import Organization

**Order (observed pattern):**
1. Node built-ins: `import { createHash } from 'crypto'`
2. Framework/external packages: `import { db } from '$lib/server/db'`
3. Internal schema/types: `import { appApiKeys } from '$lib/server/db/schema'`
4. ORM helpers: `import { eq, and } from 'drizzle-orm'`
5. Sibling modules: `import type { GatewayAuth } from './auth'`

**Path Aliases:**
- `$lib` → `src/lib` (configured in vitest.config.ts and SvelteKit)
- `$env/dynamic/private` → mocked at `src/lib/server/__mocks__/env.ts` during tests

## Error Handling

**Gateway Errors:**
- Errors returned as OpenAI-compatible JSON via private `errorResponse(status, message, type)` helper in `src/lib/server/gateway/proxy.ts`
- Error body shape: `{ error: { message, type, code } }`
- Non-critical async failures (cache writes, lastUsedAt updates) use fire-and-forget `.then(() => {}).catch(() => {})` pattern

**Service Errors:**
- Business rule violations throw `new Error('descriptive message')` (e.g., `throw new Error('Invitation not found')`)
- Callers are expected to catch and convert to HTTP responses at the route layer
- SMTP failures in `src/lib/server/members.ts` are caught and logged with `console.warn` — graceful degradation

**Crypto/DB Failure Isolation:**
- Redis failures fall back silently to DB: `try { ... } catch { return null; }` pattern (see `getCachedAuth` in `src/lib/server/gateway/auth.ts`)
- Decrypt failures skip that provider key and try the next: `catch { continue; }` in `src/lib/server/gateway/proxy.ts`

**`verifyPassword` pattern:**
- Returns `false` on exception rather than throwing, in `src/lib/server/auth/password.ts`

## Validation

**Input validation uses Zod:**
- Schema objects exported from `src/lib/server/auth/validation.ts`
- Schemas apply transforms at parse time: `.toLowerCase().trim()` on emails
- Usage: `schema.safeParse(data)` for error inspection, `schema.parse(data)` when throwing on failure is acceptable

## Logging

**Framework:** `console.warn` only (no structured logging library)

**Patterns:**
- Non-critical failures (SMTP, graceful degradation) use `console.warn`
- No `console.log` in production paths — errors silent or propagated
- All LLM usage is logged asynchronously via `logUsage` (fire-and-forget) in `src/lib/server/gateway/usage.ts`

## Comments

**When to Comment:**
- JSDoc-style block comments on every exported function explaining semantics, not mechanics
- Inline comments explain non-obvious decisions: "Cache write failure is non-critical", "Fire-and-forget lastUsedAt update"
- SQL comments explain table prefix rationale: `// All tables use app_ prefix to coexist with LiteLLM's Prisma-managed tables`
- Business logic comments explain cascade precedence: `// Effective limits: per-key override ?? org default ?? null`

**Example JSDoc pattern:**
```typescript
/**
 * Authenticate an API request using a Bearer sk-th-* API key.
 * Extracts the token from the Authorization header, hashes it with SHA-256,
 * and looks it up in appApiKeys. Returns user/org info with effective rate limits or null.
 * Uses Redis cache-aside with 60s TTL; gracefully degrades to DB on Redis failure.
 */
export async function authenticateApiKey(request: Request): Promise<GatewayAuth | null> {
```

## Function Design

**Size:** Functions are focused and single-purpose. Complex orchestration (e.g., `proxyToLiteLLM` in `src/lib/server/gateway/proxy.ts`) is broken into logical sections with comment headers (`// --- Smart Routing ---`, `// --- Cache check ---`).

**Parameters:**
- Simple scalar IDs: `(orgId: string, userId: string, name: string)`
- Auth context passed as `GatewayAuth` object rather than individual fields
- Optional parameters default to sensible values: `retries = MAX_RETRIES`

**Return Values:**
- Functions that can fail return `T | null` rather than throwing: `authenticateApiKey`, `validateSession`, `getCachedResponse`
- Boolean success signals on mutating operations: `revokeApiKey` returns `Promise<boolean>`
- DB mutations return inserted/updated row via `.returning()` for confirmation

## Module Design

**Exports:**
- Named exports only — no default exports in server modules
- Types exported alongside functions from the same file (e.g., `export interface GatewayAuth` in `src/lib/server/gateway/auth.ts`)
- Type-only re-exports collected in `src/lib/types/index.ts`

**Barrel Files:**
- `src/lib/types/index.ts` is the only barrel — aggregates all DB-inferred types
- No barrel files in server modules; consumers import directly from the specific module

**Gateway Module Separation:**
Each gateway concern is its own file under `src/lib/server/gateway/`:
- `auth.ts` — API key authentication
- `budget.ts` — budget enforcement
- `cache.ts` — Redis response caching
- `cors.ts` — CORS headers
- `load-balancer.ts` — round-robin key selection
- `proxy.ts` — main orchestration + retry logic
- `rate-limit.ts` — in-memory RPM/TPM tracking
- `routing.ts` — smart model selection
- `usage.ts` — token counting + cost logging

---

*Convention analysis: 2026-03-17*
