# Phase 9: Performance Optimization - Research

**Researched:** 2026-03-17
**Domain:** Gateway hot path optimization (Redis caching, query optimization, singleton patterns)
**Confidence:** HIGH

## Summary

Phase 9 addresses five discrete performance problems in the gateway and notification pipelines. All changes are internal optimizations with no API surface changes. The codebase already has the patterns and infrastructure needed -- Redis lazy singleton (`redis.ts`), fire-and-forget side effects, Drizzle ORM with PostgreSQL, and Vitest for testing.

The five optimizations are: (1) Redis auth caching to eliminate per-request DB auth queries, (2) rolling spend snapshot to replace full usage log SUM scans, (3) SMTP transport lazy singleton, (4) cache key whitespace normalization bug fix, and (5) N+1 query batching for budget notifications. Each is self-contained with clear before/after boundaries and testable success criteria.

**Primary recommendation:** Implement all five changes in 1-2 plans. The cache key fix (PERF-04) is a one-liner. SMTP singleton (PERF-03) is similarly trivial. Auth caching (PERF-01), budget snapshot (PERF-02), and notification batching (PERF-05) require more care but follow established codebase patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **PERF-01 (Redis auth caching):** Cache full `GatewayAuth` as JSON in Redis keyed by `auth:{keyHash}`, 60s TTL, skip DB on hit, fire-and-forget `lastUsedAt` update, graceful degradation to DB on Redis failure, no explicit invalidation
- **PERF-02 (Budget spend snapshot):** Add `spend_snapshot_cents` integer + `snapshot_updated_at` timestamp to `app_budgets`, incremental update after each request, `checkBudget()` reads snapshot instead of SUM, reset when `snapshot_updated_at < resetDate`, fallback full SUM to re-seed if stale/null
- **PERF-03 (SMTP singleton):** Convert `getTransport()` to lazy singleton in module-level variable, Nodemailer connection pool reuse, return null if SMTP env vars missing
- **PERF-04 (Cache key fix):** Remove `.replace(/\s+/g, ' ')` normalization from `generateCacheKey()`, hash raw `JSON.stringify(messages)` directly
- **PERF-05 (Notification batching):** Replace per-member SUM loop with single `SELECT userId, SUM(cost) ... GROUP BY userId` query, join with member list in application code

### Claude's Discretion
- Exact Redis serialization format for cached auth
- Whether to add an index on `app_usage_logs(orgId, createdAt)` for the grouped spend query
- Migration script details for the `spend_snapshot_cents` column
- Order of implementation within plans
- Whether to split into 1 or 2 plans

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Gateway auth result cached in Redis with short TTL | Redis `getRedis()` singleton exists, `getCachedResponse`/`setCachedResponse` pattern in `cache.ts` provides template, `GatewayAuth` interface defined in `auth.ts` |
| PERF-02 | Budget spend uses rolling snapshot instead of full log scan | `appBudgets` schema in `schema.ts` needs 2 new columns, `logUsage()` in `usage.ts` is the integration point for incremental update, `getBudgetResetDate()` in `budget/utils.ts` for period detection |
| PERF-03 | Email transporter is a lazy singleton | `email.ts` calls `getTransport()` per send (5 call sites), Redis singleton in `redis.ts` is the reference pattern |
| PERF-04 | Cache key normalization fixed | `cache.ts` line 9 has the `.replace(/\s+/g, ' ')` that must be removed, existing test `cache.test.ts` line 18-24 asserts whitespace collision (test must be updated) |
| PERF-05 | Budget notification queries batched | `notifications.ts` `resolveMemberBudgets()` lines 63-74 run per-member SUM query, existing `app_usage_logs_org_created_idx` index supports grouped query |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ioredis | (existing) | Redis client for auth caching | Already used via `redis.ts` singleton |
| drizzle-orm | (existing) | DB queries, schema, migrations | Already used throughout data layer |
| nodemailer | (existing) | SMTP email sending | Already used in `email.ts` |
| vitest | (existing) | Unit testing | Already configured with path aliases |

### Supporting
No new libraries needed. All optimizations use existing dependencies.

## Architecture Patterns

### Pattern 1: Redis Cache-Aside for Auth (PERF-01)

**What:** Wrap `authenticateApiKey()` with a Redis cache layer. On each request, check Redis first; on miss, query DB and populate cache.

**When to use:** High-frequency lookups with short acceptable staleness (60s TTL).

**Implementation approach:**

```typescript
// In auth.ts - add cache wrapper
import { getRedis } from '$lib/server/redis';

const AUTH_CACHE_TTL = 60; // seconds

export async function authenticateApiKey(request: Request): Promise<GatewayAuth | null> {
    // ... extract keyHash as before ...

    // Try Redis cache first
    try {
        const redis = getRedis();
        if (redis) {
            const cached = await redis.get(`auth:${keyHash}`);
            if (cached) {
                const auth = JSON.parse(cached) as GatewayAuth;
                // Fire-and-forget lastUsedAt update
                db.update(appApiKeys).set({ lastUsedAt: new Date() })
                    .where(eq(appApiKeys.keyHash, keyHash))
                    .then(() => {}).catch(() => {});
                return auth;
            }
        }
    } catch {
        // Redis failure - fall through to DB
    }

    // ... existing DB query ...

    // Cache the result
    try {
        const redis = getRedis();
        if (redis && result) {
            redis.setex(`auth:${keyHash}`, AUTH_CACHE_TTL, JSON.stringify(result))
                .catch(() => {});
        }
    } catch {
        // Cache write failure is non-critical
    }

    return result;
}
```

**Key details:**
- `keyHash` is the SHA-256 hex of the raw API key -- already computed, use as Redis key
- Store as `JSON.stringify(GatewayAuth)` -- the interface contains only strings, numbers, booleans, and a nested object with the same types. No Dates or functions. Safe for JSON round-trip.
- `lastUsedAt` update still fires on cache hit (uses `keyHash` WHERE clause since we don't store raw `keyId` outside the cached object -- actually we do, `apiKeyId` is in `GatewayAuth`)
- On Redis failure at any step, gracefully fall through to existing DB path

### Pattern 2: Rolling Spend Snapshot (PERF-02)

**What:** Add `spend_snapshot_cents` and `snapshot_updated_at` columns to `app_budgets`. After each gateway request, increment the snapshot. Budget check reads snapshot instead of running SUM.

**Schema migration:**

```sql
-- Migration: 0004_budget_snapshot
ALTER TABLE app_budgets ADD COLUMN spend_snapshot_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_budgets ADD COLUMN snapshot_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
```

**Schema update in `schema.ts`:**

```typescript
// Add to appBudgets table definition
spendSnapshotCents: integer('spend_snapshot_cents').notNull().default(0),
snapshotUpdatedAt: timestamp('snapshot_updated_at', { withTimezone: true }).notNull().defaultNow()
```

**Budget check modification (`budget.ts`):**

```typescript
// Replace the SUM query with snapshot read
const resetDate = getBudgetResetDate(budget.resetDay);

let currentSpendCents: number;
if (budget.snapshotUpdatedAt && budget.snapshotUpdatedAt >= resetDate) {
    // Snapshot is current period - use directly
    currentSpendCents = budget.spendSnapshotCents;
} else {
    // Snapshot is stale/null - re-seed from full SUM
    const result = await db.select({
        totalCost: sql<string>`COALESCE(SUM(CAST(${appUsageLogs.cost} AS numeric)), 0)`
    }).from(appUsageLogs).where(
        and(eq(appUsageLogs.orgId, auth.orgId), eq(appUsageLogs.userId, auth.userId), gte(appUsageLogs.createdAt, resetDate))
    );
    currentSpendCents = Math.round(parseFloat(result[0]?.totalCost ?? '0') * 100);
    // Update snapshot (fire-and-forget)
    db.update(appBudgets).set({
        spendSnapshotCents: currentSpendCents,
        snapshotUpdatedAt: new Date()
    }).where(eq(appBudgets.id, budget.id)).then(() => {}).catch(() => {});
}
```

**Incremental update in `usage.ts`:**

```typescript
// After logUsage, update budget snapshot incrementally
// Need to look up the effective budget for this user to get the budget ID
// This is a fire-and-forget side effect
```

**Critical detail:** The incremental update after `logUsage()` needs the budget ID. Options:
1. Pass budget info through from `checkBudget()` result (preferred -- avoids extra query)
2. Look up budget again in `logUsage()` (wasteful)

**Recommendation:** Extend `BudgetCheckResult` to include `budgetId` so the caller can pass it to the snapshot update function. Or create a separate `updateBudgetSnapshot(budgetId, costCents)` function called from the gateway pipeline after `logUsage()`.

### Pattern 3: Module-Level Lazy Singleton (PERF-03)

**What:** Store the Nodemailer transport in a module-level variable, create once on first use.

```typescript
// In email.ts
let transport: nodemailer.Transporter | null | undefined; // undefined = not yet initialized

function getTransport(): nodemailer.Transporter | null {
    if (transport !== undefined) return transport;

    if (!env.SMTP_HOST) {
        transport = null;
        return null;
    }

    transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT) || 587,
        secure: Number(env.SMTP_PORT) === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    });
    return transport;
}
```

**Key details:**
- Use `undefined` as "not initialized" sentinel to distinguish from `null` (SMTP not configured)
- Nodemailer transports manage their own connection pools internally
- Each `sendMail()` call reuses the same SMTP connection or creates a new one from the pool
- All 5 send functions just call `getTransport()` -- no changes needed to send functions themselves except removing the local `const transport = getTransport()` and using the shared one

### Pattern 4: Cache Key Fix (PERF-04)

**What:** Remove whitespace normalization from `generateCacheKey()`.

**Before:**
```typescript
const normalized = JSON.stringify(messages).replace(/\s+/g, ' ').trim();
```

**After:**
```typescript
const raw = JSON.stringify(messages);
```

**Why this works:** `JSON.stringify` is deterministic for the same input object structure. Two identical JavaScript objects produce the same JSON string. But messages with different whitespace *in their content* (e.g., `"hello  world"` vs `"hello world"`) are semantically different messages to an LLM and should produce different cache keys.

**Test update:** The existing test `cache.test.ts` line 18-24 asserts that whitespace-different messages produce the SAME key. This test must be inverted to assert they produce DIFFERENT keys.

### Pattern 5: Grouped Query for N+1 Elimination (PERF-05)

**What:** Replace per-member SUM loop with a single grouped query.

**Before (N+1):**
```typescript
for (const member of members) {
    const spendResult = await db.select({
        total: sql`COALESCE(SUM(CAST(cost AS numeric)), 0)`
    }).from(appUsageLogs).where(
        and(eq(orgId), eq(userId, member.userId), gte(createdAt, resetDate))
    );
}
```

**After (2 queries total):**
```typescript
// Single grouped query for all members
const spendByUser = await db.select({
    userId: appUsageLogs.userId,
    total: sql<string>`COALESCE(SUM(CAST(${appUsageLogs.cost} AS numeric)), 0)`
}).from(appUsageLogs).where(
    and(
        eq(appUsageLogs.orgId, orgId),
        gte(appUsageLogs.createdAt, resetDate)
    )
).groupBy(appUsageLogs.userId);

// Build lookup map
const spendMap = new Map(spendByUser.map(r => [r.userId, parseFloat(r.total)]));

// Then for each member:
const currentSpendDollars = spendMap.get(member.userId) ?? 0;
```

**Index consideration:** The existing `app_usage_logs_org_created_idx` on `(org_id, created_at)` covers the WHERE clause of this grouped query. Adding `user_id` to the index would make it a covering index for the GROUP BY, but the existing index should perform well enough since the grouped query already filters by org+date range first. **Recommendation: skip the extra index for now** -- it can be added later if profiling shows need.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis connection management | Custom connection pool | `ioredis` with `getRedis()` singleton | Already handles reconnect, retry, error suppression |
| SMTP connection pooling | Manual TCP connection reuse | Nodemailer built-in pooling | Nodemailer transports handle connection lifecycle automatically |
| Cache serialization | Custom binary format | `JSON.stringify`/`JSON.parse` | GatewayAuth is plain data types, JSON round-trips cleanly |
| Budget snapshot race conditions | Distributed locks | Eventual consistency with 60s tolerance | Budget checks are advisory (soft limit) or per-request (hard limit stops next request, not current) |

**Key insight:** These optimizations should be minimal changes to existing code. Do not introduce new abstractions, new modules, or new patterns. Follow the existing fire-and-forget, try/catch graceful degradation patterns.

## Common Pitfalls

### Pitfall 1: Stale Auth Cache After Key Revocation
**What goes wrong:** User revokes an API key, but it remains valid for up to 60 seconds in Redis cache.
**Why it happens:** No explicit cache invalidation -- relies on TTL expiry.
**How to avoid:** This is an accepted tradeoff per the user's decision. 60s is short enough for security purposes. Document it in code comments.
**Warning signs:** If TTL is accidentally increased, revocation delay grows proportionally.

### Pitfall 2: Budget Snapshot Drift
**What goes wrong:** Snapshot drifts from actual spend due to failed incremental updates or concurrent requests.
**Why it happens:** Fire-and-forget updates can silently fail; concurrent requests may read stale snapshot.
**How to avoid:** The fallback SUM re-seed on period rollover corrects drift monthly. For mid-period drift, accept eventual consistency -- budget enforcement is advisory (hard limit checked per-request, not retroactive).
**Warning signs:** Large discrepancy between snapshot and actual SUM. Consider adding a periodic reconciliation job in v2 if needed.

### Pitfall 3: Budget Snapshot Incremental Update Requires Budget ID
**What goes wrong:** `logUsage()` doesn't know which budget row to update.
**Why it happens:** The gateway pipeline separates budget check and usage logging.
**How to avoid:** Thread `budgetId` through the pipeline -- add it to `BudgetCheckResult` or pass as a separate parameter. Alternatively, create a `updateSpendSnapshot(orgId, userId, costCents)` function that does its own budget lookup (simpler but one extra query).
**Warning signs:** If snapshot never increments, budget check falls back to SUM every time (defeating the purpose).

### Pitfall 4: Test Assertion Flip for Cache Key
**What goes wrong:** Existing test asserts whitespace messages produce SAME key. After fix, they must produce DIFFERENT keys.
**Why it happens:** Test was written to match the (buggy) behavior.
**How to avoid:** Update the test assertion from `expect(key1).toBe(key2)` to `expect(key1).not.toBe(key2)` and update the test description.

### Pitfall 5: SMTP Singleton and Hot Reload in Dev
**What goes wrong:** Module-level singleton persists across HMR cycles in development, potentially holding a stale SMTP transport.
**Why it happens:** Vite HMR may not fully reset module-level state.
**How to avoid:** Not a production concern. In dev, if SMTP config changes, restart the dev server. This matches the Redis singleton behavior already in the codebase.

## Code Examples

### Redis Auth Cache Get/Set

```typescript
// Source: Follows existing pattern in cache.ts getCachedResponse/setCachedResponse
const AUTH_CACHE_TTL = 60;

async function getCachedAuth(keyHash: string): Promise<GatewayAuth | null> {
    try {
        const redis = getRedis();
        if (!redis) return null;
        const cached = await redis.get(`auth:${keyHash}`);
        if (!cached) return null;
        return JSON.parse(cached) as GatewayAuth;
    } catch {
        return null;
    }
}

async function setCachedAuth(keyHash: string, auth: GatewayAuth): Promise<void> {
    try {
        const redis = getRedis();
        if (!redis) return;
        await redis.setex(`auth:${keyHash}`, AUTH_CACHE_TTL, JSON.stringify(auth));
    } catch {
        // Cache write failure is non-critical
    }
}
```

### Drizzle Grouped Query with Aggregate

```typescript
// Source: Drizzle ORM pattern for GROUP BY with aggregates
const spendByUser = await db
    .select({
        userId: appUsageLogs.userId,
        total: sql<string>`COALESCE(SUM(CAST(${appUsageLogs.cost} AS numeric)), 0)`
    })
    .from(appUsageLogs)
    .where(
        and(
            eq(appUsageLogs.orgId, orgId),
            gte(appUsageLogs.createdAt, resetDate)
        )
    )
    .groupBy(appUsageLogs.userId);
```

### Budget Snapshot Incremental Update

```typescript
// Source: Follows fire-and-forget pattern from usage.ts logUsage
export function updateSpendSnapshot(budgetId: string, costCents: number): void {
    db.update(appBudgets)
        .set({
            spendSnapshotCents: sql`${appBudgets.spendSnapshotCents} + ${costCents}`,
            snapshotUpdatedAt: new Date()
        })
        .where(eq(appBudgets.id, budgetId))
        .then(() => {})
        .catch(() => {});
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full SUM on every budget check | Rolling snapshot with periodic reconciliation | Standard optimization pattern | O(1) vs O(N) per request |
| Per-request DB auth lookup | Cache-aside with short TTL | Standard optimization pattern | Eliminates DB round-trip on 99%+ of burst requests |
| N+1 member spend queries | Single grouped query | Standard SQL optimization | O(1) queries vs O(N) per notification run |

## Open Questions

1. **Snapshot incremental update integration point**
   - What we know: `logUsage()` in `usage.ts` is fire-and-forget, called after the response is sent. The budget ID is available in `checkBudget()` result.
   - What's unclear: Exact threading of `budgetId` through the gateway pipeline to the usage logging step.
   - Recommendation: Add `budgetId: string | null` to `BudgetCheckResult`. In the gateway pipeline (`proxy.ts`), after `logUsage()`, call `updateSpendSnapshot(budgetResult.budgetId, costCents)` as fire-and-forget. If `budgetId` is null (no budget configured), skip the update.

2. **Cost conversion: dollars to cents for snapshot**
   - What we know: `logUsage()` receives cost in dollars (float). Snapshot stores cents (integer).
   - What's unclear: Where exactly to do the conversion.
   - Recommendation: `Math.round(cost * 100)` at the call site, same as `budget.ts` line 82 already does.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest, configured in `vitest.config.ts`) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run src/lib/server/gateway/` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | Auth cache hit returns cached data, skips DB | unit | `npx vitest run src/lib/server/gateway/auth.test.ts -x` | No - Wave 0 |
| PERF-01 | Auth cache miss falls through to DB, populates cache | unit | `npx vitest run src/lib/server/gateway/auth.test.ts -x` | No - Wave 0 |
| PERF-01 | Redis failure degrades to DB query | unit | `npx vitest run src/lib/server/gateway/auth.test.ts -x` | No - Wave 0 |
| PERF-02 | Budget check uses snapshot when current period | unit | `npx vitest run src/lib/server/gateway/budget.test.ts -x` | No - Wave 0 |
| PERF-02 | Budget check re-seeds snapshot when stale | unit | `npx vitest run src/lib/server/gateway/budget.test.ts -x` | No - Wave 0 |
| PERF-02 | Snapshot increments after usage log | unit | `npx vitest run src/lib/server/gateway/budget.test.ts -x` | No - Wave 0 |
| PERF-03 | Transport created once, reused across sends | unit | `npx vitest run src/lib/server/auth/email.test.ts -x` | No - Wave 0 |
| PERF-04 | Different-whitespace messages produce different cache keys | unit | `npx vitest run src/lib/server/gateway/cache.test.ts -x` | Yes - update existing |
| PERF-05 | N members resolved with 2 queries (not N+1) | unit | `npx vitest run src/lib/server/budget/notifications.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/server/gateway/ src/lib/server/auth/ src/lib/server/budget/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/server/gateway/auth.test.ts` -- covers PERF-01 (mock Redis, mock DB)
- [ ] `src/lib/server/gateway/budget.test.ts` -- covers PERF-02 (mock DB, snapshot logic)
- [ ] `src/lib/server/auth/email.test.ts` -- covers PERF-03 (mock nodemailer, verify singleton)
- [ ] `src/lib/server/budget/notifications.test.ts` -- covers PERF-05 (mock DB, verify query count)
- [ ] Update `src/lib/server/gateway/cache.test.ts` -- covers PERF-04 (flip assertion)

## Sources

### Primary (HIGH confidence)
- Source code analysis of all 8 target files listed in CONTEXT.md canonical references
- `vitest.config.ts` -- test infrastructure configuration
- `schema.ts` -- current table definitions and indexes
- `0003_usage_budgets.sql` -- migration format precedent

### Secondary (MEDIUM confidence)
- Drizzle ORM GROUP BY with `sql` template tag -- verified from existing codebase usage in `budget.ts` and `notifications.ts`
- ioredis `setex`/`get` API -- verified from existing usage in `cache.ts`
- Nodemailer transport pooling -- based on Nodemailer documentation (transports maintain internal connection pool)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- all patterns follow existing codebase conventions, source code reviewed
- Pitfalls: HIGH -- derived from direct code analysis of integration points
- Validation: MEDIUM -- test patterns verified from existing `cache.test.ts`, but new test files need creation

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no external dependencies changing)
