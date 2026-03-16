# Phase 7: Tech Debt Cleanup - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean up known tech debt in the codebase before hardening work begins. Remove dead exports, fix DRY violations, harden DB operations (transactions, pooling), standardize env var configuration, and migrate the `models` field to proper `jsonb`. No new features — only structural improvements to existing code.

</domain>

<decisions>
## Implementation Decisions

### Dead code removal (DEBT-01)
- Remove `validateApiKeyFromHash` from `api-keys.ts` — superseded by inline gateway query
- Remove `decryptProviderKeyById` from `provider-keys.ts` — superseded by inline decrypt in proxy
- Remove `checkLiteLLMHealth` from `litellm.ts` — Docker healthcheck handles this
- Verify no imports reference these before removing; if any do, update callers

### DRY extraction (DEBT-02)
- Extract `getBudgetResetDate` to `src/lib/server/budget/utils.ts`
- Both `gateway/budget.ts` and `budget/notifications.ts` import from the shared location
- Keep the function signature identical — pure refactor, no behavior change

### Invitation transaction (DEBT-03)
- Wrap `acceptInvitation` in a Drizzle transaction (`db.transaction()`)
- Both the member INSERT and invitation UPDATE happen atomically
- On failure, the entire operation rolls back — no orphaned member rows or stale invitations

### Env var standardization (DEBT-04)
- Standardize on `APP_URL` everywhere (drop `BASE_URL`)
- Update `.env.example` to use `APP_URL` with clear comment
- Add `CRON_SECRET` to `.env.example` with generation instruction: `openssl rand -hex 32`
- Change `LITELLM_MASTER_KEY` placeholder from `sk-master-key` to empty string with generation note
- All env vars in `.env.example` should have empty/commented values — no default secrets

### Models field migration (DEBT-05)
- Use `jsonb` column (not a normalized join table) — simpler migration, existing queries stay similar
- Create a Drizzle migration: ALTER COLUMN from `text` to `jsonb`
- Remove all manual `JSON.parse` calls for the `models` field in application code
- Drizzle's `json()` type handles serialization/deserialization automatically

### Session cleanup cron (DEBT-06)
- Add a cleanup endpoint at `src/routes/api/cron/cleanup/+server.ts`
- Protected by the same `CRON_SECRET` mechanism as the digest endpoint
- Deletes sessions where `expires_at < NOW()`
- Intended to run daily via external cron (same pattern as digest)

### DB connection pool (DEBT-07)
- Configure explicit pool options in `src/lib/server/db/index.ts`
- Settings: `max: 20`, `idle_timeout: 30` (seconds), `connect_timeout: 10` (seconds)
- These are reasonable defaults for a single-instance deployment with concurrent gateway requests
- Values configurable via env vars (`DB_POOL_MAX`, `DB_IDLE_TIMEOUT`, `DB_CONNECT_TIMEOUT`) with sensible defaults

### Claude's Discretion
- Exact ordering of cleanup tasks within plans
- Whether to split into 1 or 2 plans (migration-heavy vs code-cleanup)
- Test updates needed after dead code removal
- Any additional minor cleanup discovered during implementation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech debt inventory
- `.planning/codebase/CONCERNS.md` — Full tech debt inventory with file locations, impact, and fix approaches
- `.planning/REQUIREMENTS.md` — DEBT-01 through DEBT-07 requirement definitions

### Codebase patterns
- `.planning/codebase/CONVENTIONS.md` — Naming, import, and error handling conventions to follow during refactoring
- `.planning/codebase/STRUCTURE.md` — Directory layout and where to add new code (e.g., budget/utils.ts, cron endpoint)

### Key source files
- `src/lib/server/db/schema.ts` — Schema definitions, `models` field is line ~105
- `src/lib/server/db/index.ts` — DB connection setup (pool config target)
- `src/lib/server/members.ts` — `acceptInvitation` (transaction target, lines 94-148)
- `src/lib/server/gateway/budget.ts` — `getBudgetResetDate` duplicate (line 15)
- `src/lib/server/budget/notifications.ts` — `getBudgetResetDate` duplicate (line 12)
- `src/lib/server/api-keys.ts` — Dead export `validateApiKeyFromHash`
- `src/lib/server/provider-keys.ts` — Dead export `decryptProviderKeyById`
- `src/lib/server/litellm.ts` — Dead export `checkLiteLLMHealth`
- `.env.example` — Env var template (standardization target)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/server/redis.ts`: Lazy singleton pattern — use as reference for DB pool config approach
- `src/routes/api/cron/digest/+server.ts`: Existing cron endpoint pattern — session cleanup follows same structure
- `src/lib/server/db/index.ts`: Lazy Proxy pattern for DB — pool config goes here

### Established Patterns
- Fire-and-forget side effects: `.then(() => {}).catch(() => {})` — keep this pattern for non-critical DB updates
- Drizzle transactions: `db.transaction(async (tx) => { ... })` — use for invitation acceptance
- Zod validation in server actions: `.safeParse()` — maintain for any new validation
- Co-located tests: `*.test.ts` next to source — maintain for any new utility files

### Integration Points
- `getBudgetResetDate` consumers: `gateway/budget.ts` and `budget/notifications.ts` — both import from new `budget/utils.ts`
- Session cleanup: New cron endpoint wires into existing `app_sessions` table
- Models jsonb migration: Affects `gateway/proxy.ts`, `gateway/models.ts`, and `db/schema.ts`
- Env var changes: Affects `auth/oauth.ts`, `auth/email.ts`, `.env.example`, and deployment docs

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user deferred all decisions to Claude's discretion. Standard approaches apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-tech-debt-cleanup*
*Context gathered: 2026-03-17*
