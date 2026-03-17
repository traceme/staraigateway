# Phase 9: Performance Optimization - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize the gateway hot path with Redis caching and efficient queries. Fix cache key collisions, batch notification queries, and make SMTP transport a singleton. No new features — only performance improvements to existing code paths.

</domain>

<decisions>
## Implementation Decisions

### Redis auth caching (PERF-01)
- Cache the full `GatewayAuth` result in Redis keyed by `auth:{keyHash}`
- TTL: 60 seconds — short enough that key revocation takes effect quickly, long enough to eliminate DB queries on burst traffic
- On cache hit, skip the DB SELECT+JOIN entirely; still fire-and-forget `lastUsedAt` update
- Invalidation: no explicit invalidation needed — 60s TTL handles key revocation/deactivation naturally
- Graceful degradation: if Redis unavailable, fall back to DB query (current behavior)
- Store as JSON string, parse on read

### Budget spend rolling snapshot (PERF-02)
- Add a `spend_snapshot_cents` integer column and `snapshot_updated_at` timestamp to `app_budgets` table
- After each gateway request, update the snapshot incrementally: `spend_snapshot_cents += request_cost_cents` (fire-and-forget)
- `checkBudget()` reads the snapshot value directly instead of running `SUM(cost)` over all usage logs
- Snapshot resets to 0 when `snapshot_updated_at < resetDate` (budget period rolled over)
- Fallback: if snapshot is stale or null, do a one-time full SUM to re-seed, then update snapshot
- This changes budget check from O(N logs) to O(1) per request

### SMTP transport singleton (PERF-03)
- Convert `getTransport()` to a lazy singleton — create once, reuse across all sends
- Store in module-level variable, initialize on first call
- Nodemailer transports maintain connection pools internally — reusing avoids TCP/TLS handshake per email
- If SMTP config env vars are missing, return null (current behavior, just cached)

### Cache key normalization fix (PERF-04)
- Remove the `.replace(/\s+/g, ' ')` normalization from `generateCacheKey()`
- Hash the raw `JSON.stringify(messages)` output directly — `JSON.stringify` already produces deterministic output for the same input object
- This ensures messages with different whitespace in content produce different cache keys
- Two requests with identical parsed JSON objects will still hit the same cache (because `JSON.stringify` is deterministic for same structure)

### Budget notification query batching (PERF-05)
- Replace the per-member `SUM(cost)` loop in `resolveMemberBudgets()` with a single grouped query
- Query: `SELECT userId, SUM(cost) FROM app_usage_logs WHERE orgId = ? AND createdAt >= ? GROUP BY userId`
- Join result with member list in application code
- This changes N+1 queries to 2 queries (members + grouped spend) regardless of org size

### Claude's Discretion
- Exact Redis serialization format for cached auth
- Whether to add an index on `app_usage_logs(orgId, createdAt)` for the grouped spend query
- Migration script details for the `spend_snapshot_cents` column
- Order of implementation within plans
- Whether to split into 1 or 2 plans

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Performance requirements
- `.planning/REQUIREMENTS.md` — PERF-01 through PERF-05 requirement definitions and success criteria

### Key source files
- `src/lib/server/gateway/auth.ts` — Gateway auth (PERF-01 target: add Redis cache layer)
- `src/lib/server/gateway/budget.ts` — Budget check with full SUM scan (PERF-02 target: rolling snapshot)
- `src/lib/server/gateway/cache.ts` — Cache key generation with whitespace bug (PERF-04 target: remove normalization)
- `src/lib/server/auth/email.ts` — SMTP transport recreated per send (PERF-03 target: lazy singleton)
- `src/lib/server/budget/notifications.ts` — N+1 budget queries in `resolveMemberBudgets()` (PERF-05 target: batch query)
- `src/lib/server/redis.ts` — Redis lazy singleton pattern (reference for auth caching)
- `src/lib/server/gateway/usage.ts` — Usage logging (integration point for snapshot updates)
- `src/lib/server/db/schema.ts` — Schema definitions (migration target for snapshot columns)
- `src/lib/server/budget/utils.ts` — Shared `getBudgetResetDate` utility

### Codebase patterns
- `.planning/codebase/CONVENTIONS.md` — Naming, error handling, fire-and-forget patterns
- `.planning/codebase/ARCHITECTURE.md` — Gateway pipeline flow, data layer patterns

### Prior phase context
- `.planning/phases/07-tech-debt-cleanup/07-CONTEXT.md` — DB pool config, getBudgetResetDate extraction
- `.planning/phases/08-security-hardening/08-CONTEXT.md` — CORS, body size limits on /v1/* endpoints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/server/redis.ts`: Lazy singleton pattern with `getRedis()` — use same pattern for auth cache get/set helpers
- `src/lib/server/gateway/cache.ts`: Existing `getCachedResponse`/`setCachedResponse` — auth caching follows same Redis get/setex pattern
- `src/lib/server/budget/utils.ts`: Shared `getBudgetResetDate()` — used by both budget check and notifications

### Established Patterns
- Fire-and-forget side effects: `.then(() => {}).catch(() => {})` — use for snapshot updates after gateway requests
- Redis graceful degradation: all Redis calls wrapped in try/catch returning null on failure
- Module-level singletons: DB connection uses Proxy pattern, Redis uses lazy init — SMTP transport follows same approach
- Drizzle ORM migrations: ALTER TABLE for new columns, consistent with Phase 7's jsonb migration

### Integration Points
- Auth caching: Wraps existing `authenticateApiKey()` — callers unchanged
- Snapshot update: Called from `usage.ts` `logUsage()` after successful request logging
- Batch query: Internal to `notifications.ts` — external API unchanged
- SMTP singleton: Internal to `email.ts` — all send functions unchanged
- Cache key fix: Internal to `cache.ts` — callers unchanged

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user deferred all decisions to Claude's discretion. Standard performance optimization approaches apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-performance-optimization*
*Context gathered: 2026-03-17*
