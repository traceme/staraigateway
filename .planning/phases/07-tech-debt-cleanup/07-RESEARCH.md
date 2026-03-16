# Phase 7: Tech Debt Cleanup - Research

**Researched:** 2026-03-17
**Domain:** Codebase cleanup — dead code removal, DRY extraction, DB hardening, env standardization, schema migration
**Confidence:** HIGH

## Summary

Phase 7 addresses seven discrete tech debt items across the LLMTokenHub codebase. All items are well-scoped refactoring tasks with no new feature work. The codebase uses SvelteKit with Drizzle ORM on postgres.js (the `postgres` npm package by porsager), and all changes stay within established patterns.

The highest-risk item is DEBT-05 (models field migration from text to jsonb) because it involves a schema migration and touches three gateway files. The lowest-risk items are DEBT-01 (dead export removal) and DEBT-02 (DRY extraction), which are pure code deletions and moves. All other items (transaction wrapping, env standardization, pool config, cron endpoint) follow existing patterns already present in the codebase.

**Primary recommendation:** Execute code-only changes first (DEBT-01, DEBT-02, DEBT-04, DEBT-07), then DB-touching changes (DEBT-03, DEBT-05, DEBT-06), to minimize risk of partial states.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- DEBT-01: Remove `validateApiKeyFromHash` from `api-keys.ts`, `decryptProviderKeyById` from `provider-keys.ts`, `checkLiteLLMHealth` from `litellm.ts`
- DEBT-02: Extract `getBudgetResetDate` to `src/lib/server/budget/utils.ts`, both consumers import from there
- DEBT-03: Wrap `acceptInvitation` in `db.transaction()` for atomic member insert + invitation update
- DEBT-04: Standardize on `APP_URL` (drop `BASE_URL`), add `CRON_SECRET` to `.env.example`, change `LITELLM_MASTER_KEY` placeholder to empty
- DEBT-05: Use `jsonb` column (not join table), create Drizzle migration, remove manual `JSON.parse` calls
- DEBT-06: Session cleanup cron at `src/routes/api/cron/cleanup/+server.ts`, same `CRON_SECRET` pattern as digest
- DEBT-07: Pool options in `src/lib/server/db/index.ts` with `max: 20`, `idle_timeout: 30`, `connect_timeout: 10`, configurable via env vars

### Claude's Discretion
- Exact ordering of cleanup tasks within plans
- Whether to split into 1 or 2 plans (migration-heavy vs code-cleanup)
- Test updates needed after dead code removal
- Any additional minor cleanup discovered during implementation

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEBT-01 | Remove dead exports (`validateApiKeyFromHash`, `decryptProviderKeyById`, `checkLiteLLMHealth`) | Verified: grep confirms these exports are defined but never imported anywhere in `src/`. Safe to delete. |
| DEBT-02 | Extract shared `getBudgetResetDate` to `budget/utils.ts` | Verified: identical function exists in `gateway/budget.ts` (line 15) and `budget/notifications.ts` (line 12). Pure function, no side effects. |
| DEBT-03 | Invitation acceptance wrapped in DB transaction | Verified: `acceptInvitation` in `members.ts` (lines 134-146) does INSERT then UPDATE as separate statements. Drizzle `db.transaction(async (tx) => {})` API confirmed. |
| DEBT-04 | Env var names standardized, `CRON_SECRET` added to `.env.example` | Verified: `.env.example` uses `BASE_URL` but code reads `env.APP_URL`. `CRON_SECRET` not listed. `LITELLM_MASTER_KEY` has `sk-master-key` placeholder. |
| DEBT-05 | `models` field migrated from JSON text to `jsonb` column | Verified: `schema.ts` line 105 defines `models: text('models')`. `JSON.parse` appears in `proxy.ts` (2x), `models.ts` (1x). Drizzle provides `jsonb()` column type. |
| DEBT-06 | Session cleanup cron (prune expired sessions) | Verified: `app_sessions` table has `expiresAt` column. Existing digest cron at `api/cron/digest/+server.ts` provides exact pattern to follow. |
| DEBT-07 | DB connection pool explicitly configured | Verified: `db/index.ts` creates `postgres(connectionString)` with no options. postgres.js defaults: `max: 10`, `idle_timeout: null`, `connect_timeout: 30`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.38.0 | ORM — schema, queries, transactions, migrations | Already in use; provides `db.transaction()`, `jsonb()` column type |
| postgres | ^3.4.0 | PostgreSQL client (postgres.js by porsager) | Already in use; pool config via constructor options |
| drizzle-kit | ^0.30.0 | Migration generation | Already in use; `npm run db:generate` creates SQL migrations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.1.0 | Test runner | Existing tests; update after dead code removal |

### Alternatives Considered
None. All changes use the existing stack. No new dependencies required.

## Architecture Patterns

### Pattern 1: Dead Export Removal (DEBT-01)
**What:** Delete exported functions that are never imported elsewhere.
**When to use:** Function has been superseded by inline logic in another module.
**Verification:** Run `grep -r "functionName" src/` to confirm zero import sites before deletion.

Files to modify:
- `src/lib/server/api-keys.ts` — delete `validateApiKeyFromHash` (lines 115-148), its JSDoc, and the unused imports it pulls in (if any become unused)
- `src/lib/server/provider-keys.ts` — delete `decryptProviderKeyById` (lines 169-181)
- `src/lib/server/litellm.ts` — delete `checkLiteLLMHealth` (lines 35-42)

**Confirmed safe:** grep shows these three functions are only defined, never imported anywhere in `src/`.

### Pattern 2: DRY Extraction (DEBT-02)
**What:** Move duplicated pure function to a shared utility module.
**Structure:**
```
src/lib/server/budget/
  utils.ts         # NEW — shared budget utilities
  notifications.ts # MODIFIED — import from utils.ts
```

The function `getBudgetResetDate(resetDay: number): Date` is identical in both files. Extract to `budget/utils.ts` and import from both `gateway/budget.ts` and `budget/notifications.ts`.

**Convention:** Co-locate test as `src/lib/server/budget/utils.test.ts`.

### Pattern 3: Transaction Wrapping (DEBT-03)
**What:** Wrap multi-statement DB operation in a Drizzle transaction.
**API:**
```typescript
// Source: https://orm.drizzle.team/docs/transactions
await db.transaction(async (tx) => {
  await tx.insert(appOrgMembers).values({ ... });
  await tx.update(appOrgInvitations).set({ acceptedAt: new Date() }).where(...);
});
```

Key behavior: If either statement throws, Drizzle automatically rolls back. The `tx` object replaces `db` for all queries inside the callback. The read queries before the transaction (invitation lookup, member check) stay outside the transaction since they are read-only preconditions.

### Pattern 4: Schema Migration — text to jsonb (DEBT-05)
**What:** Change `models` column from `text` to `jsonb` in PostgreSQL.
**Steps:**
1. Update `schema.ts`: change `models: text('models')` to `models: jsonb('models').$type<string[]>()`
2. Run `npm run db:generate` to produce a migration (ALTER COLUMN type)
3. The generated SQL will be: `ALTER TABLE app_provider_keys ALTER COLUMN models TYPE jsonb USING models::jsonb;`
4. Remove `JSON.parse` calls in `proxy.ts` and `models.ts` — Drizzle handles serialization
5. Check `provider-keys.ts` `createProviderKey` — models are stored via `validateProviderKey` result; verify insertion still works with jsonb

**Import:** `import { jsonb } from 'drizzle-orm/pg-core';` — already available, just not used yet.

**Critical note:** The `USING models::jsonb` cast requires existing data to be valid JSON. If any row has malformed data, the migration will fail. The migration should handle this edge case (e.g., `USING COALESCE(models::jsonb, '[]'::jsonb)`).

### Pattern 5: Pool Configuration (DEBT-07)
**What:** Pass explicit pool options to the `postgres()` constructor.
**postgres.js defaults (verified from source):**
- `max: 10` (or 3 on Cloudflare)
- `idle_timeout: null` (connections never time out)
- `connect_timeout: 30` (seconds)
- `max_lifetime: null` (no max lifetime)

**Target config:**
```typescript
const client = postgres(connectionString, {
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
});
```

**Note:** All values are in **seconds** for postgres.js (not milliseconds). The `idle_timeout` of 30s means connections idle for 30 seconds are closed. This is reasonable for a server that handles bursts of API requests.

### Pattern 6: Cron Endpoint (DEBT-06)
**What:** New SvelteKit API route following existing digest cron pattern.
**Structure:** `src/routes/api/cron/cleanup/+server.ts`
**Auth:** Same `CRON_SECRET` Bearer token check as `digest/+server.ts`
**Query:** `DELETE FROM app_sessions WHERE expires_at < NOW()`

Using Drizzle:
```typescript
import { lt } from 'drizzle-orm';
await db.delete(appSessions).where(lt(appSessions.expiresAt, new Date()));
```

### Anti-Patterns to Avoid
- **Changing function signatures during refactoring:** The `getBudgetResetDate` extraction must keep the exact same signature and behavior. No "improvements" during DRY extraction.
- **Broadening transaction scope:** Only wrap the two mutation statements (INSERT + UPDATE) in the transaction. Don't include read queries or email sends inside the transaction.
- **Forgetting to update imports after dead code removal:** After deleting `validateApiKeyFromHash`, check if any imports in `api-keys.ts` become unused (e.g., `appUsers`, `appOrganizations`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON column handling | Manual `JSON.parse`/`JSON.stringify` | Drizzle `jsonb()` column type | Handles serialization automatically, type-safe with `$type<T>()` |
| DB transactions | Sequential statements with try/catch | `db.transaction(async (tx) => {})` | Automatic rollback on error, connection reuse |
| Migration SQL | Hand-written ALTER TABLE | `npm run db:generate` (drizzle-kit) | Generates correct SQL from schema diff, tracks migration state |

## Common Pitfalls

### Pitfall 1: jsonb Migration Data Cast Failure
**What goes wrong:** `ALTER COLUMN models TYPE jsonb` fails because a row has malformed JSON in the text column (e.g., empty string, truncated JSON).
**Why it happens:** The `text` column has no validation on insert; any string can be stored.
**How to avoid:** Use `USING COALESCE(nullif(models, '')::jsonb, 'null'::jsonb)` in the migration SQL, or pre-check data before migrating. If `models` is nullable and null should remain null, the cast handles it natively.
**Warning signs:** Migration fails with `invalid input syntax for type json`.

### Pitfall 2: Drizzle jsonb Returns Object, Not String
**What goes wrong:** After migration, code that expected `key.models` to be a `string` and called `JSON.parse()` on it now gets a runtime error because `key.models` is already a `string[]` (Drizzle deserializes jsonb automatically).
**Why it happens:** Developer removes `JSON.parse` in some places but misses others, or downstream consumers outside the three known files also access the field.
**How to avoid:** Search the entire codebase for all references to `.models` on provider key objects. Known locations: `proxy.ts` (2x), `models.ts` (1x), `provider-keys.ts` (getProviderKeys returns it). The `validateProviderKey` function returns `models: string[]` which gets stored — verify the INSERT path works with jsonb (Drizzle serializes automatically).
**Warning signs:** `TypeError: JSON.parse is not a function` or `Unexpected token` errors.

### Pitfall 3: Transaction Scope Too Broad
**What goes wrong:** Including the invitation lookup query inside the transaction holds a DB connection longer than necessary, or including email sends inside the transaction causes the transaction to stay open during network I/O.
**Why it happens:** Developer wraps everything in the transaction for "safety."
**How to avoid:** Only wrap the two mutation statements. Read queries and side effects stay outside.

### Pitfall 4: Env Var Rename Breaks Existing Deployments
**What goes wrong:** Changing `.env.example` from `BASE_URL` to `APP_URL` is fine, but if any code still reads `BASE_URL`, existing deployments break.
**Why it happens:** The code already reads `env.APP_URL`, not `env.BASE_URL`. The `.env.example` is the only place `BASE_URL` appears in the project.
**How to avoid:** Verify that no server code reads `env.BASE_URL`. Grep confirmed: only `.env.example` line 19 uses `BASE_URL`. The code reads `env.APP_URL`. This is purely a documentation fix.

### Pitfall 5: Pool Config with process.env vs SvelteKit env
**What goes wrong:** `db/index.ts` currently uses `process.env.DATABASE_URL` (not SvelteKit's `$env/dynamic/private`). New pool env vars should follow the same pattern.
**Why it happens:** The DB module initializes before SvelteKit's env module is available.
**How to avoid:** Use `process.env.DB_POOL_MAX` etc. (matching the existing `process.env.DATABASE_URL` pattern in that file), not `env.DB_POOL_MAX` from `$env/dynamic/private`.

## Code Examples

### Extract getBudgetResetDate to budget/utils.ts
```typescript
// src/lib/server/budget/utils.ts
/**
 * Calculate the budget reset date for a given reset day.
 * If current day < resetDay, reset date is in previous month.
 */
export function getBudgetResetDate(resetDay: number): Date {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	if (now.getDate() < resetDay) {
		return new Date(year, month - 1, resetDay);
	}
	return new Date(year, month, resetDay);
}
```

### Transaction-Wrapped acceptInvitation (relevant mutation section)
```typescript
// Inside acceptInvitation, replace lines 134-146 with:
await db.transaction(async (tx) => {
	await tx.insert(appOrgMembers).values({
		id: crypto.randomUUID(),
		orgId: invitation.orgId,
		userId,
		role: invitation.role
	});

	await tx
		.update(appOrgInvitations)
		.set({ acceptedAt: new Date() })
		.where(eq(appOrgInvitations.id, invitation.id));
});
```

### Schema Change for models jsonb
```typescript
// src/lib/server/db/schema.ts — change line 105
// Before:
models: text('models'),
// After:
import { jsonb } from 'drizzle-orm/pg-core';
// ...
models: jsonb('models').$type<string[]>(),
```

### Pool Config in db/index.ts
```typescript
const client = postgres(connectionString, {
	max: parseInt(process.env.DB_POOL_MAX || '20'),
	idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
	connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
});
```

### Session Cleanup Cron Endpoint
```typescript
// src/routes/api/cron/cleanup/+server.ts
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { appSessions } from '$lib/server/db/schema';
import { lt } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ request }) => {
	if (!env.CRON_SECRET) {
		return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token || token !== env.CRON_SECRET) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const result = await db
		.delete(appSessions)
		.where(lt(appSessions.expiresAt, new Date()))
		.returning({ id: appSessions.id });

	return new Response(
		JSON.stringify({ success: true, sessionsDeleted: result.length }),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};
```

### Updated .env.example (relevant section)
```bash
# Public URL of your instance (used for OAuth callbacks and email links)
# Must match the URL users access in their browser
APP_URL=

# LiteLLM proxy (optional -- if running LiteLLM separately)
LITELLM_API_URL=http://localhost:4000
# Generate with: openssl rand -hex 32
LITELLM_MASTER_KEY=

# Cron job authentication secret (required for /api/cron/* endpoints)
# Generate with: openssl rand -hex 32
CRON_SECRET=
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `text` column + manual `JSON.parse` | `jsonb` column with ORM handling | Drizzle 0.28+ | Type-safe, no parse errors, queryable |
| Sequential DB writes | `db.transaction()` | Drizzle 0.17+ | Atomic operations, automatic rollback |
| No pool config | Explicit `max`, `idle_timeout`, `connect_timeout` | postgres.js 3.x | Prevents pool exhaustion under load |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEBT-01 | Dead exports removed, no compile errors | unit | `npx vitest run` + `npm run check` | Existing tests cover unrelated areas; svelte-check validates no broken imports |
| DEBT-02 | `getBudgetResetDate` works correctly from shared location | unit | `npx vitest run src/lib/server/budget/utils.test.ts` | Wave 0 |
| DEBT-03 | `acceptInvitation` atomicity (both ops succeed or both roll back) | integration | Manual — requires DB | Wave 0 (basic unit test for transaction structure) |
| DEBT-04 | `.env.example` has correct vars | manual-only | Visual review of `.env.example` | N/A |
| DEBT-05 | `models` field is jsonb, no `JSON.parse` calls remain | unit + migration | `npx vitest run` + grep verification | Existing proxy.test.ts may need updating |
| DEBT-06 | Session cleanup cron deletes expired sessions | integration | Manual — requires DB | Wave 0 |
| DEBT-07 | Pool config applied with env var overrides | unit | `npx vitest run src/lib/server/db/` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --coverage` + `npm run check`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/server/budget/utils.test.ts` -- covers DEBT-02 (getBudgetResetDate edge cases: day < reset, day >= reset, month boundaries)
- [ ] Update `proxy.test.ts` if it mocks or references `JSON.parse` on models field -- covers DEBT-05

## Open Questions

1. **Migration safety for existing data**
   - What we know: The `models` column currently stores JSON-stringified `string[]` or null.
   - What's unclear: Whether any rows have malformed JSON or empty strings (not null).
   - Recommendation: Add a `USING` clause in the migration SQL to handle edge cases. If possible, run a pre-check query: `SELECT id FROM app_provider_keys WHERE models IS NOT NULL AND models::jsonb IS NULL` (this would error on malformed data, confirming the issue).

2. **Drizzle migration output directory**
   - What we know: `drizzle.config.ts` sets `out: './drizzle'` but the `./drizzle` directory does not exist. Existing migration is in `src/lib/server/db/migrations/`.
   - What's unclear: Whether the project uses drizzle-kit's standard migration flow or a custom one.
   - Recommendation: Run `npm run db:generate` and see where output goes. May need to reconcile the two locations or update `drizzle.config.ts`.

## Sources

### Primary (HIGH confidence)
- **postgres.js source code** (`node_modules/postgres/src/index.js`) — pool option names and defaults verified directly: `max: 10`, `idle_timeout: null`, `connect_timeout: 30` (seconds)
- **drizzle-orm types** (`node_modules/drizzle-orm/pg-core/columns/jsonb.d.ts`) — `jsonb()` column type with `$type<T>()` confirmed
- **Project source files** — all seven debt items verified by reading actual source code and running grep

### Secondary (MEDIUM confidence)
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) — `db.transaction()` API, auto-rollback behavior
- [postgres.js GitHub](https://github.com/porsager/postgres) — connection options documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, versions confirmed from package.json
- Architecture: HIGH — all patterns verified against existing codebase conventions
- Pitfalls: HIGH — all pitfall scenarios verified by reading actual source code

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, no fast-moving dependencies)
