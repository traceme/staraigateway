# Coding Conventions

**Analysis Date:** 2026-03-16

## Naming Patterns

**Files:**
- Server modules use kebab-case: `api-keys.ts`, `load-balancer.ts`, `rate-limit.ts`
- Svelte components use PascalCase: `CreateKeyModal.svelte`, `KpiCard.svelte`
- SvelteKit route files follow framework convention: `+page.server.ts`, `+layout.svelte`
- Test files are co-located with source using `.test.ts` suffix: `cache.test.ts`, `proxy.test.ts`

**Functions:**
- camelCase throughout: `generateApiKey`, `fetchWithRetry`, `selectKeyRoundRobin`
- Async functions that query DB are named by operation: `getUserApiKeys`, `validateApiKeyFromHash`, `createApiKey`
- Boolean-returning predicates use verb form: `revokeApiKey` returns `boolean`
- Pure utility functions are named descriptively: `estimateTokenCount`, `generateCacheKey`, `calculateCost`

**Variables:**
- camelCase: `effectiveModel`, `matchingKeys`, `lastErrorResponse`, `rotationCounters`
- Constants use SCREAMING_SNAKE_CASE: `RETRYABLE_STATUSES`, `MAX_RETRIES`, `BASE_DELAY_MS`, `WINDOW_MS`, `MODEL_PRICING`
- Boolean flags use `is` prefix: `isStreaming`, `isActive`, `isAdmin`, `isOrgDefault`

**Types / Interfaces:**
- PascalCase for exported types: `GatewayAuth`, `RateLimitResult`, `BudgetCheckResult`, `ApiKeyMetadata`
- Local-only interfaces are also PascalCase: `RequestEntry`, `UsageData`
- DB-inferred types named after the table entity: `User`, `Session`, `Organization`, `OrgMember`, `ApiKey`
- Insert types prefixed with `New`: `NewUser`, `NewOrganization`, `NewApiKey`
- Union literal types use string literals: `OrgRole = 'owner' | 'admin' | 'member'`

**Svelte Component Props:**
- Props are typed using a local `Props` type block at the top of `<script>`:
  ```typescript
  type Props = {
    label: string;
    value: string;
    trend?: { direction: 'up' | 'down'; percent: number };
  };
  let { label, value, trend }: Props = $props();
  ```
- Event callbacks follow `on` prefix naming: `onclose`, `oncreated`

## Code Style

**Formatting:**
- Tabs for indentation (TypeScript/Svelte files)
- Single quotes for strings in TypeScript
- Trailing commas in multi-line objects/arrays
- No explicit formatter config file at project root — relies on editor defaults

**TypeScript:**
- `strict: true` mode enabled in `tsconfig.json`
- `checkJs: true` — JavaScript files are also type-checked
- `moduleResolution: "bundler"` (modern SvelteKit mode)
- `esModuleInterop: true` and `forceConsistentCasingInFileNames: true`

**Linting:**
- No ESLint config at project root (no `.eslintrc*` found in root)
- Type safety enforced via `svelte-check` (`npm run check`)

## Import Organization

**Order:**
1. SvelteKit/framework imports (`@sveltejs/kit`, `$app/*`)
2. Environment imports (`$env/dynamic/private`)
3. Internal `$lib` server modules (`$lib/server/db`, `$lib/server/auth/*`)
4. Peer modules within same directory (e.g., `./auth`, `./usage`)
5. Type-only imports at end (`import type { ... }`)

**Path Aliases:**
- `$lib` → `src/lib/` (configured in both `vite.config.ts` and `vitest.config.ts`)
- `$env/dynamic/private` → SvelteKit private env (mocked in tests via `src/lib/server/__mocks__/env.ts`)
- `$app/forms`, `$app/navigation` — SvelteKit built-in aliases

**Example:**
```typescript
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { loginSchema } from '$lib/server/auth/validation';
import type { Actions, PageServerLoad } from './$types';
```

## Error Handling

**Server actions (SvelteKit `Actions`):**
- Use `fail(status, { error: 'message' })` for validation and not-found errors
- Use `error(status, 'message')` from `@sveltejs/kit` for hard auth guards (401, 404 unauthenticated)
- Always validate form input with Zod `safeParse` before proceeding:
  ```typescript
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return fail(400, { error: parsed.error.errors[0].message });
  }
  ```

**Gateway/service functions:**
- Use try/catch blocks with empty catch for best-effort operations (fire-and-forget):
  ```typescript
  try {
    setCachedResponse(cacheKey, responseBody, auth.org.cacheTtlSeconds);
  } catch {
    // Silently fail
  }
  ```
- Return typed result objects (not throw) for expected failure states:
  ```typescript
  interface BudgetCheckResult { allowed: boolean; ... }
  export async function checkBudget(auth): Promise<BudgetCheckResult>
  ```
- Return `null` for "not found" patterns from DB lookups
- Error responses are standardized via private `errorResponse()` helper in `proxy.ts`:
  ```typescript
  function errorResponse(status: number, message: string, type: string): Response {
    return new Response(JSON.stringify({ error: { message, type, code: type } }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  ```

**Pattern: skip-and-continue over throw:**
- When iterating over multiple provider keys, decryption failures use `continue` to skip to the next key rather than bubbling an error
- Network errors per-key also `continue` to the next key

## Logging

**Framework:** No structured logging library — uses fire-and-forget DB writes.

**Patterns:**
- Usage is logged via `logUsage()` in `src/lib/server/gateway/usage.ts`
- `logUsage` is synchronous fire-and-forget: `.then(() => {}).catch(() => {})`
- Background DB side-effects (e.g., `lastUsedAt` update in `auth.ts`) also use `.then(() => {}).catch(() => {})`
- No `console.log` / `console.error` calls observed in production code

## Comments

**When to Comment:**
- Block-level JSDoc on all exported functions in server modules:
  ```typescript
  /**
   * Generate a deterministic cache key for a request.
   * Format: cache:{orgId}:{sha256hex}
   */
  export function generateCacheKey(...): string
  ```
- Multi-step flows get inline section comments with `---` delimiters:
  ```typescript
  // --- Smart Routing: substitute model for small requests ---
  // --- Cache check (non-streaming only) ---
  // --- Find all active provider keys ---
  ```
- Inline comments explain non-obvious values: `// 1 initial + 3 retries = 4 total calls`
- Schema fields with restricted value sets have inline union comments: `// 'owner' | 'admin' | 'member'`

## Function Design

**Size:** Functions vary — gateway `proxyToLiteLLM` in `src/lib/server/gateway/proxy.ts` is intentionally large (~490 lines) because it encodes a multi-step request pipeline. Pure utility functions are small (under 20 lines).

**Parameters:** Prefer explicit named parameters over options objects for simple utility functions. Complex gateway functions accept a flat parameter list.

**Return Values:**
- Async DB functions return typed result objects or arrays
- `null` for absence / not found
- `boolean` for mutation success/failure (`revokeApiKey`)
- Structured result interfaces for status checks (`BudgetCheckResult`, `RateLimitResult`)

## Module Design

**Exports:**
- Named exports throughout — no default exports in server modules
- Each module exports exactly what it provides (no barrel re-exports in server code)

**Barrel Files:**
- `src/lib/types/index.ts` acts as a barrel for DB-inferred TypeScript types only
- No component barrel files; components are imported directly by path

## Validation

**Library:** Zod (`zod ^3.24.0`)

**Patterns:**
- Schemas defined at module level, not inside functions: `export const signupSchema = z.object({...})`
- Inline schemas for route-specific forms (defined in `+page.server.ts` directly)
- Always use `.safeParse()` — never `.parse()` (avoids thrown exceptions in server actions)
- Normalize input during validation: `.toLowerCase().trim()` applied in schema definition

---

*Convention analysis: 2026-03-16*
