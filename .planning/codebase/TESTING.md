# Testing Patterns

**Analysis Date:** 2026-03-17

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts` at project root

**Assertion Library:**
- Vitest built-in (`expect`)

**Run Commands:**
```bash
npm run test              # Run all tests with coverage (vitest run --coverage)
npm run test:unit         # Run all tests without coverage
npm run test:integration  # Integration tests only (src/lib/server/__integration__/**/*.test.ts)
npm run test:e2e          # E2E tests only (src/__e2e__/**/*.test.ts)
npm run test:watch        # Watch mode
npm run test:load         # Load test script (npx tsx scripts/load-test.ts)
```

## Test File Organization

**Location:**
- Unit tests: co-located with source files as `{module}.test.ts`
- Integration tests: `src/lib/server/__integration__/` directory
- E2E tests: `src/__e2e__/` directory
- Mocks: `src/lib/server/__mocks__/` directory

**Naming:**
- `{module}.test.ts` for unit and integration tests
- `{scenario}.e2e.test.ts` for end-to-end tests (e.g., `user-journey.e2e.test.ts`, `budget-enforcement.e2e.test.ts`)

**Structure:**
```
src/
├── __e2e__/
│   ├── setup.ts                          # E2E seed helpers + DB utilities
│   ├── user-journey.e2e.test.ts
│   └── budget-enforcement.e2e.test.ts
├── lib/
│   └── server/
│       ├── __integration__/
│       │   ├── setup.ts                  # Integration DB connection + schema push
│       │   └── db.integration.test.ts
│       ├── __mocks__/
│       │   └── env.ts                    # $env/dynamic/private mock
│       ├── api-keys.test.ts              # Co-located unit test
│       ├── gateway/
│       │   ├── auth.test.ts
│       │   ├── budget.test.ts
│       │   ├── cache.test.ts
│       │   ├── load-balancer.test.ts
│       │   ├── proxy.test.ts
│       │   ├── rate-limit.test.ts
│       │   ├── routing.test.ts
│       │   └── usage.test.ts
│       ├── auth/
│       │   ├── email.test.ts
│       │   ├── password.test.ts
│       │   ├── session.test.ts
│       │   └── validation.test.ts
│       └── members.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks declared BEFORE module under test is imported
vi.mock('$lib/server/db', () => ({ db: { select: vi.fn(), update: vi.fn() } }));

import { functionUnderTest } from './module';

describe('functionUnderTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('describes the expected behavior precisely', async () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- `beforeEach(() => vi.clearAllMocks())` is standard in every suite that uses mocks
- `beforeAll`/`afterAll` used in integration and E2E suites for DB lifecycle
- Nested `describe` blocks for grouping by sub-function within a module (e.g., `describe('checkRateLimit', ...)` inside `describe('rate-limit', ...)`)

## Mocking

**Framework:** Vitest `vi.mock()` and `vi.fn()`

**Critical rule: mocks must be declared before the module under test is imported:**
```typescript
// CORRECT — mock first, then import
vi.mock('$lib/server/db', () => ({
  db: { select: vi.fn(), update: vi.fn() }
}));
import { authenticateApiKey } from './auth';

// WRONG — import before mock causes mock to be ignored
```

**Drizzle ORM chain mocking:**
Drizzle's query builder uses method chaining. The pattern for mocking is to build a chain object where each method returns itself or the final resolved value:
```typescript
function mockDbSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result)
  };
  vi.mocked(db.select).mockReturnValue(chain as never);
  return chain;
}
```

**Sequential DB calls (multiple select calls in one function):**
When the function under test calls `db.select` multiple times, use `mockImplementation` with a counter:
```typescript
function mockDbSelectSequence(results: unknown[][]) {
  let callIndex = 0;
  vi.mocked(db.select).mockImplementation(() => {
    const currentResult = results[callIndex] ?? [];
    callIndex++;
    // return chain that resolves to currentResult...
  });
}
```
See `src/lib/server/gateway/budget.test.ts` for full implementation.

**Mocking `$env/dynamic/private`:**
The vitest config aliases `$env/dynamic/private` to `src/lib/server/__mocks__/env.ts`:
```typescript
// src/lib/server/__mocks__/env.ts
export const env: Record<string, string | undefined> = {};

// In E2E tests — set env BEFORE importing app modules
import { env } from '$env/dynamic/private';
env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
env.DATABASE_URL = TEST_DATABASE_URL;
```

**Mocking `globalThis.fetch`:**
Used in proxy and E2E tests to intercept upstream HTTP calls:
```typescript
const originalFetch = globalThis.fetch;
globalThis.fetch = vi.fn(async (url, init) => {
  if (url.includes('/v1/chat/completions')) {
    return new Response(JSON.stringify({ ... }), { status: 200 });
  }
  return originalFetch(url, init);
});
// Restore in afterEach/afterAll
globalThis.fetch = originalFetch;
```

**What to Mock:**
- `$lib/server/db` — DB operations in unit tests
- `$lib/server/db/schema` — schema objects (mocked as plain objects with field name strings)
- `$lib/server/redis` — Redis client
- `drizzle-orm` operators (`eq`, `and`, `gte`, etc.) — return their args for testability
- External crypto libraries (`@oslojs/encoding`, `@oslojs/crypto/sha2`) when testing session logic
- `globalThis.fetch` for HTTP interception in proxy and E2E tests

**What NOT to Mock:**
- Pure functions with no side effects (routing, rate-limit math, cache key generation)
- The `crypto` Node built-in — used directly in unit tests for `generateApiKey`

## Fixtures and Factories

**Factory functions:**
Tests use helper factory functions to create test data with sensible defaults and selective overrides:
```typescript
function makeBudget(overrides: Record<string, unknown> = {}) {
  return {
    id: 'budget-1',
    orgId: 'org-1',
    userId: null as string | null,
    hardLimitCents: null as number | null,
    softLimitCents: null as number | null,
    resetDay: 1,
    isOrgDefault: false,
    createdAt: new Date(),
    spendSnapshotCents: 0,
    snapshotUpdatedAt: new Date('2026-03-10T00:00:00Z'),
    ...overrides
  };
}
```

**E2E seed helpers:**
E2E setup in `src/__e2e__/setup.ts` exports named seeder functions for each entity:
```typescript
export async function seedUserAndOrg(db) { ... }  // returns { userId, orgId }
export async function seedProviderKey(db, orgId, encryptedKey, models) { ... }
export async function seedApiKey(db, orgId, userId) { ... }  // returns { fullKey, keyHash, apiKeyId }
export async function seedBudget(db, orgId, userId, hardLimitCents) { ... }  // returns budgetId
```

**Integration test helpers:**
`src/lib/server/__integration__/setup.ts` exports:
- `getTestDb()` — singleton Drizzle client connected to test DB
- `pushSchema()` — runs `drizzle-kit push --force` with `TEST_DATABASE_URL`
- `withTestTransaction(fn)` — wraps test in a transaction that always rolls back (isolation)
- `truncateAllTables()` — TRUNCATE CASCADE on all `app_` tables
- `cleanupTestDb()` — closes the postgres connection pool

**Test database:**
- URL: `postgresql://postgres:postgres@localhost:5433/staraigateway_test` (default)
- Overridable via `TEST_DATABASE_URL` env var
- Schema pushed fresh on each test suite with `drizzle-kit push --force`

**Location:**
- Unit test data: inline within test files using factory functions
- Integration/E2E fixture helpers: `src/lib/server/__integration__/setup.ts` and `src/__e2e__/setup.ts`

## Coverage

**Requirements:**
- Lines: 80% threshold
- Functions: 80% threshold
- Configured in `vitest.config.ts` under `test.coverage.thresholds`

**Scope:**
- Coverage measured only over `src/lib/server/**/*.ts`
- Excludes test files, `__mocks__`, and `__integration__` directories

**Coverage provider:** `@vitest/coverage-v8`

**View Coverage:**
```bash
npm run test              # Generates coverage report (vitest run --coverage)
```

## Test Types

**Unit Tests:**
- Scope: individual exported functions with all I/O dependencies mocked
- Location: co-located with source files
- DB mock pattern: Drizzle chain mocking (`mockDbSelectChain`, `mockDbSelectSequence`)
- Examples: `src/lib/server/gateway/auth.test.ts`, `src/lib/server/gateway/budget.test.ts`

**Integration Tests:**
- Scope: Drizzle ORM + real PostgreSQL — validates schema constraints, joins, aggregations
- Location: `src/lib/server/__integration__/`
- Requires: local PostgreSQL on port 5433 (`staraigateway_test` database)
- Uses `truncateAllTables()` in `afterAll` for cleanup
- Examples: `src/lib/server/__integration__/db.integration.test.ts`

**E2E Tests:**
- Scope: full gateway request pipeline — real DB + mocked upstream LLM responses via `globalThis.fetch`
- Location: `src/__e2e__/`
- Pattern: import SvelteKit route handler directly (`import { POST } from '../routes/v1/chat/completions/+server'`), call with a synthetic `Request` object
- Env setup: populate `env` mock object before importing app modules
- Examples: `src/__e2e__/user-journey.e2e.test.ts`, `src/__e2e__/budget-enforcement.e2e.test.ts`

**Load Tests:**
- Framework: `autocannon` (configured via `@types/autocannon`)
- Script: `scripts/load-test.ts`
- Run: `npm run test:load`

## Common Patterns

**Fake timers for rate limit and time-dependent tests:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('allows after window expires', () => {
  vi.advanceTimersByTime(61_000);
  // now check behavior
});
```

**Testing async error boundaries:**
```typescript
it('returns null on Redis failure', async () => {
  const mockRedis = {
    get: vi.fn().mockRejectedValue(new Error('conn'))
  };
  mockGetRedis.mockReturnValue(mockRedis as never);
  const result = await functionUnderTest(...);
  expect(result).toBeNull(); // graceful degradation
});
```

**Testing database constraint violations in integration tests:**
```typescript
it('enforces unique constraint on organization slug', async () => {
  const slug = `unique-slug-${randomUUID().slice(0, 8)}`;
  await db.insert(appOrganizations).values(makeOrg({ slug }));

  await expect(
    db.insert(appOrganizations).values(makeOrg({ slug }))
  ).rejects.toThrow();
});
```

**Testing HTTP response shape:**
```typescript
const response = await POST({ request } as any);
expect(response.status).toBe(200);
const body = await response.json();
expect(body.choices[0].message.content).toBe('Hello from E2E test!');
```

**E2E import pattern — dynamic import for route handlers:**
```typescript
// Dynamic import AFTER env is set up
const { POST } = await import('../routes/v1/chat/completions/+server');
```
This ensures env vars are set before the module initializes.

---

*Testing analysis: 2026-03-17*
