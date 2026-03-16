# Testing Patterns

**Analysis Date:** 2026-03-16

## Test Framework

**Runner:**
- Vitest `^4.1.0`
- Config: `vitest.config.ts` (project root)

**Assertion Library:**
- Vitest built-in (`expect`) — no separate assertion library

**Run Commands:**
```bash
npm run test          # Run all tests once (vitest run)
npm run test:watch    # Watch mode (vitest)
npx vitest run --coverage   # Coverage report (v8 provider via @vitest/coverage-v8)
```

## Test File Organization

**Location:**
- Co-located with source files in the same directory as the module under test
- Pattern: `src/lib/server/gateway/cache.ts` → `src/lib/server/gateway/cache.test.ts`

**Naming:**
- File: `{module-name}.test.ts`
- Suite: `describe('{functionName}', ...)` — one `describe` block per exported function being tested
- Test: `it('{expected behavior in plain English}', ...)`

**Structure:**
```
src/lib/server/gateway/
├── cache.ts
├── cache.test.ts
├── load-balancer.ts
├── load-balancer.test.ts
├── proxy.ts
├── proxy.test.ts
├── routing.ts
└── routing.test.ts
```

Only the `gateway/` subdirectory has tests. No tests exist for auth, budget, members, or route handlers.

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { functionUnderTest } from './module';

describe('functionUnderTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does X when Y', () => {
    // arrange
    // act
    // assert
    expect(result).toBe(expected);
  });
});
```

**Patterns:**
- `beforeEach(() => { vi.clearAllMocks(); })` — used consistently to reset mock state between tests
- `afterEach` used only when global state must be restored (e.g., `globalThis.fetch` patching)
- Single `expect` per test in most cases — tests are narrow and focused
- Test descriptions are full sentences describing behavior, not function signatures

## Mocking

**Framework:** Vitest built-in `vi` mock utilities

**Module Mock Pattern (for `$lib` alias modules):**
```typescript
// Declared BEFORE the import of the module under test
vi.mock('$lib/server/redis', () => ({
  getRedis: vi.fn(() => null)
}));

import { getRedis } from '$lib/server/redis';
const mockGetRedis = vi.mocked(getRedis);
```
This pattern is required because `$lib/server/redis` imports from SvelteKit's build environment. The mock must be declared before the module under test is imported.

**Env Mock:**
`$env/dynamic/private` is redirected to `src/lib/server/__mocks__/env.ts` via `vitest.config.ts` path alias:
```typescript
// vitest.config.ts
resolve: {
  alias: {
    '$env/dynamic/private': path.resolve(__dirname, 'src/lib/server/__mocks__/env.ts')
  }
}
```
`src/lib/server/__mocks__/env.ts` exports an empty object: `export const env: Record<string, string | undefined> = {};`

**Global Fetch Mock Pattern:**
```typescript
const originalFetch = globalThis.fetch;

beforeEach(() => { vi.restoreAllMocks(); });
afterEach(() => { globalThis.fetch = originalFetch; });

it('retries on 429', async () => {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response('rate limited', { status: 429 })
  );
  globalThis.fetch = mockFetch;
  // ...
  expect(mockFetch).toHaveBeenCalledTimes(4);
});
```

**What to Mock:**
- External I/O dependencies: `$lib/server/redis` (Redis client)
- Global Web APIs that must be controlled: `globalThis.fetch`
- SvelteKit build-time imports: `$env/dynamic/private`

**What NOT to Mock:**
- Pure functions with no side effects (tested directly: `estimateTokenCount`, `generateCacheKey`, `selectKeyRoundRobin`, `selectModelTier`)
- In-memory data structures that are part of the module under test (e.g., rotation counters in load-balancer)

## Fixtures and Factories

**Test Data:**
- Inline literals — no fixture files or factory functions
- Simple arrays and objects created inline per test:
  ```typescript
  const keys = ['key-a', 'key-b', 'key-c'];
  const messages = [{ role: 'user', content: 'hello' }];
  ```
- Unique org IDs per test to avoid state leakage from in-memory counters:
  ```typescript
  // Use a unique org to avoid state from other tests
  const result = selectKeyRoundRobin(keys, 'org-rr2', 'openai');
  ```

**Location:**
- No dedicated fixtures directory — all data is inline in test files

## Coverage

**Requirements:** No enforced coverage thresholds configured

**Provider:** `@vitest/coverage-v8` (installed as devDependency)

**View Coverage:**
```bash
npx vitest run --coverage
```

## Test Types

**Unit Tests:**
- All existing tests are unit tests for pure/near-pure server utility functions
- Scope: single function per `describe` block
- Dependencies mocked where necessary (Redis, fetch)
- DB layer is NOT tested — no integration tests for Drizzle ORM queries

**Integration Tests:**
- Not present in the codebase

**E2E Tests:**
- Not present in the codebase

## Common Patterns

**Testing stateful in-memory modules (side effects persist between tests):**
Use unique identifiers per test to avoid cross-test contamination:
```typescript
it('consecutive calls rotate through keys', () => {
  const first = selectKeyRoundRobin(keys, 'org-rr2', 'openai');
  const second = selectKeyRoundRobin(keys, 'org-rr2', 'openai');
  expect(first).toEqual(['key-a', 'key-b', 'key-c']);
  expect(second).toEqual(['key-b', 'key-c', 'key-a']);
});
```

**Testing retry/fallback behavior:**
Use `vi.fn().mockResolvedValueOnce(...).mockResolvedValueOnce(...)` to sequence responses:
```typescript
const mockFetch = vi.fn()
  .mockResolvedValueOnce(new Response('err', { status: 503 }))
  .mockResolvedValueOnce(new Response('ok', { status: 200 }));
globalThis.fetch = mockFetch;
const response = await fetchWithRetry('http://test.com/api', { method: 'POST' });
expect(response.status).toBe(200);
expect(mockFetch).toHaveBeenCalledTimes(2);
```

**Testing null/no-op behavior (best-effort operations):**
```typescript
it('is no-op when Redis not available', async () => {
  mockGetRedis.mockReturnValue(null);
  // Should not throw
  await setCachedResponse('cache:org-1:abc', '{"data": "test"}', 3600);
});
```

**Testing regex/format contracts:**
```typescript
it('produces format "cache:{orgId}:{sha256hex}"', () => {
  const key = generateCacheKey('org-1', 'gpt-4o', [{ role: 'user', content: 'hello' }]);
  expect(key).toMatch(/^cache:org-1:[a-f0-9]{64}$/);
});
```

**Testing boundary values:**
```typescript
it('returns expensiveModel at exactly 500 tokens', () => {
  expect(selectModelTier(500, 'gpt-4o-mini', 'gpt-4o')).toBe('gpt-4o');
});
```

## Coverage Gaps

**Untested areas:**
- `src/lib/server/gateway/auth.ts` — API key authentication (DB join, hash lookup)
- `src/lib/server/gateway/budget.ts` — Budget cascade logic, period spend calculation
- `src/lib/server/gateway/rate-limit.ts` — Sliding window RPM/TPM enforcement
- `src/lib/server/gateway/usage.ts` — Token extraction from JSON/SSE, cost calculation
- `src/lib/server/auth/` — All auth flows (password, session, OAuth, email)
- `src/lib/server/api-keys.ts` — Key generation, validation, revocation
- `src/routes/` — All SvelteKit server actions and load functions

---

*Testing analysis: 2026-03-16*
