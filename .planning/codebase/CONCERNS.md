# Codebase Concerns

**Analysis Date:** 2026-03-17

---

## Tech Debt

**In-memory rate limiter not horizontally scalable:**
- Issue: `windows` Map and `rotationCounters` Map in `rate-limit.ts` and `load-balancer.ts` are process-local. Each Node.js instance has its own state. Running 2+ app replicas means a user's 100 RPM limit becomes effectively N×100 RPM.
- Files: `src/lib/server/gateway/rate-limit.ts` (line 22), `src/lib/server/gateway/load-balancer.ts` (line 7)
- Impact: Rate limiting and round-robin load balancing silently break under horizontal scaling. Users can exceed their limits simply by having requests hit different replicas.
- Fix approach: Move sliding window counters to Redis (sorted sets + ZADD/ZCOUNT/EXPIRE pattern). Round-robin state also needs Redis if multi-replica operation is required.

**MODEL_PRICING hardcoded lookup table:**
- Issue: `MODEL_PRICING` in `usage.ts` is a static map of 14 models with hardcoded dollar rates. Unknown models silently return `$0` cost, meaning usage is logged with zero cost and budget enforcement never triggers for those models.
- Files: `src/lib/server/gateway/usage.ts` (lines 15–30, line 34)
- Impact: Any new model (e.g., a new Claude or GPT release) will have all its usage recorded as $0 cost, budget limits will never enforce, and spend totals will be wrong until the table is manually updated.
- Fix approach: Fetch pricing from LiteLLM's `/model_prices_and_context_window` endpoint at startup (or periodically), fall back to static table. Alternatively, parse cost from LiteLLM's response body which includes a `cost` field on proxied responses.

**`content-length` body size check is bypassable:**
- Issue: The gateway in `chat/completions/+server.ts` and `embeddings/+server.ts` only checks `Content-Length` header for body size enforcement. A client can omit `Content-Length` entirely and stream an arbitrarily large body — the check is silently skipped.
- Files: `src/routes/v1/chat/completions/+server.ts` (lines 13–25), `src/routes/v1/embeddings/+server.ts` (lines 13–25)
- Impact: Malicious or buggy clients can send multi-GB bodies, potentially exhausting memory.
- Fix approach: Either enforce via Nginx `client_max_body_size` (already mentioned in PRD), or wrap the `request.json()` call with a size check against the actual body bytes, not just the header.

**`updatedAt` on users not auto-refreshed:**
- Issue: `app_users.updated_at` exists in schema (`schema.ts` line 27) but no application code ever calls `.set({ updatedAt: new Date() })` when user fields change (e.g., name update in settings).
- Files: `src/lib/server/db/schema.ts` (line 27), no corresponding update calls in `src/routes/org/[slug]/settings/`
- Impact: Audit column is misleading — `updated_at` always shows the creation time for users.
- Fix approach: Add `updatedAt: new Date()` to any `db.update(appUsers)` calls when implemented.

**Budget reset date ignores months with < resetDay days:**
- Issue: `getBudgetResetDate` creates dates like `new Date(year, month, 31)` for February. JavaScript silently normalizes this to March 3rd (or 2nd in leap years), causing the reset to trigger in the wrong month.
- Files: `src/lib/server/budget/utils.ts` (lines 5–13)
- Impact: Users with `resetDay > 28` in short months will have their budget period start on an incorrect date.
- Fix approach: Clamp `resetDay` to the actual last day of the month: `Math.min(resetDay, new Date(year, month + 1, 0).getDate())`.

**CORS origins cached forever in process memory:**
- Issue: `getAllowedOrigins()` in `cors.ts` caches the `CORS_ALLOWED_ORIGINS` env var into a module-level `cachedOrigins` Set on first call and never invalidates it. Changing the env var requires a full process restart.
- Files: `src/lib/server/gateway/cors.ts` (lines 3–13)
- Impact: Minor operational friction, not a security risk. Expected behavior for a Node.js process, but worth documenting.

---

## Known Bugs

**Budget snapshot race condition under concurrent requests:**
- Symptoms: Under high concurrency, two simultaneous requests can both pass the budget check (`checkBudget` returns `allowed: true`), then both fire `updateSpendSnapshot` independently. The snapshot increments twice but the hard limit is checked before either increment completes.
- Files: `src/lib/server/gateway/budget.ts`, `src/lib/server/gateway/usage.ts` (line 119–127)
- Trigger: Multiple concurrent API requests from the same user near their budget limit
- Workaround: The stale-SUM fallback path corrects the snapshot on the next request, so brief overages are self-healing. For strict enforcement, use a Redis atomic counter with `INCR` + compare-and-swap.

**E2E tests use `as any` for RequestHandler invocation:**
- Symptoms: Both e2e test files invoke `POST({ request } as any)` which bypasses the SvelteKit `RequestHandler` type. If the handler signature changes (e.g., adding `locals`, `params`, etc.), tests silently pass with an incomplete event object.
- Files: `src/__ e2e__/budget-enforcement.e2e.test.ts` (lines 130, 159), `src/__e2e__/user-journey.e2e.test.ts` (lines 104, 128)
- Trigger: Any future handler that accesses `event.locals` or `event.params` will throw a runtime error in tests without a TypeScript compile-time error.
- Workaround: Build a minimal `RequestEvent`-shaped object rather than casting to `any`.

**`inviteMember` does not check expired existing invitations:**
- Symptoms: If a previous invitation to the same email expired, `inviteMember` throws "This email has already been invited" instead of allowing a new invitation. The check looks for `isNull(acceptedAt)` but does not exclude expired invites.
- Files: `src/lib/server/members.ts` (lines 39–52)
- Trigger: Re-inviting an email address after their 7-day invite token expires
- Workaround: Admin must use `revokeInvitation` first to delete the stale invite before re-inviting.

---

## Security Considerations

**LiteLLM image tag not pinned (`main-latest`):**
- Risk: `docker-compose.yml` uses `ghcr.io/berriai/litellm:main-latest` — a rolling tag. A breaking change or compromised image pushed to `main-latest` would be pulled on next `docker compose pull`.
- Files: `docker-compose.yml` (line 22)
- Current mitigation: None
- Recommendations: Pin to a specific release tag (e.g., `ghcr.io/berriai/litellm:v1.40.0`) and update intentionally.

**CRON_SECRET compared with timing-unsafe string equality:**
- Risk: `token !== env.CRON_SECRET` in cron endpoints uses JavaScript string `!==` which is not constant-time. Theoretically exploitable via timing side-channel to brute-force the secret.
- Files: `src/routes/api/cron/cleanup/+server.ts` (line 18), `src/routes/api/cron/digest/+server.ts` (line 18)
- Current mitigation: The secret is long (openssl rand -hex 32 = 64 chars), making practical timing attacks extremely difficult.
- Recommendations: Use `crypto.timingSafeEqual(Buffer.from(token), Buffer.from(env.CRON_SECRET))` for defense-in-depth.

**Invitation token is a raw hex string in URL:**
- Risk: Invitation token (`randomBytes(32).toString('hex')`) is included in email links and stored unhashed in `app_org_invitations.token`. If the database is read by an attacker, all pending invitation tokens are immediately usable.
- Files: `src/lib/server/members.ts` (line 55), `src/lib/server/db/schema.ts` (line 205)
- Current mitigation: Tokens are random (256-bit), expiry is 7 days.
- Recommendations: Store only the SHA-256 hash of the token in the database, same pattern as session tokens and API keys.

**Password reset token also stored unhashed:**
- Risk: Same as invitation token — `app_password_resets.id` appears to be the token itself stored directly, unlike session tokens which are hashed.
- Files: `src/lib/server/db/schema.ts` (lines 86–93), `src/routes/auth/reset-password/+page.server.ts`
- Current mitigation: Tokens are time-limited; `expiresAt` enforced on use.
- Recommendations: Hash reset tokens before storage.

**GitHub OAuth is declared in `oauth.ts` but no GitHub callback route exists:**
- Risk: The `github` OAuth client is initialized when `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` are set, but only a Google callback exists at `src/routes/auth/oauth/google/callback/+server.ts`. Enabling GitHub OAuth via env vars would silently fail with no useful error.
- Files: `src/lib/server/auth/oauth.ts` (lines 11–14), missing `src/routes/auth/oauth/github/callback/+server.ts`
- Current mitigation: GitHub OAuth silently does nothing if not wired up.
- Recommendations: Either add the GitHub callback route or remove the `github` export from `oauth.ts`.

**Redis connection error silently suppressed:**
- Risk: `redis.on('error', () => {})` in `redis.ts` swallows all Redis errors with an empty handler. Redis connection failures (auth errors, wrong URL, network issues) produce no log output and no alerting.
- Files: `src/lib/server/redis.ts` (line 25)
- Current mitigation: App degrades gracefully (no caching, DB fallback for auth cache), but operators have no visibility into Redis health.
- Recommendations: `redis.on('error', (err) => console.error('[Redis]', err.message))` at minimum.

---

## Performance Bottlenecks

**`checkBudget` executes 2–3 DB queries on every gateway request:**
- Problem: Each `/v1/chat/completions` and `/v1/embeddings` request runs: (1) a member role lookup, (2) a budget candidates query, and (3) optionally a full `SUM()` aggregation against `app_usage_logs` when the snapshot is stale. At 100 RPS this is 200–300+ DB queries/second on the budget tables alone.
- Files: `src/lib/server/gateway/budget.ts` (lines 18–98)
- Cause: No per-request budget result caching. The auth result is cached in Redis (60s TTL) but budget is always re-queried.
- Improvement path: Cache the `BudgetCheckResult` in Redis keyed by `userId:orgId` with a short TTL (5–10 seconds). Accept brief budget overruns in exchange for dramatically reduced DB load.

**`proxyToLiteLLM` queries ALL active provider keys on every request:**
- Problem: The proxy fetches all active provider keys for the org on every request (`src/lib/server/gateway/proxy.ts` lines 141–150), then filters by model in-process. For an org with many keys, this is unnecessary data transfer.
- Files: `src/lib/server/gateway/proxy.ts` (lines 141–150)
- Cause: No model-scoped query; retrieves all active keys then filters.
- Improvement path: Add a `model` filter to the DB query using `jsonb` containment (`@>`) or a separate junction table for key-to-model mapping.

**`resolveMemberBudgets` in notifications uses `earliestResetDate` across all members:**
- Problem: The batch spend query in `notifications.ts` uses the earliest reset date across all budgets, which may pull in more historical rows than needed for members with more recent reset dates. Not critical at small scale, but inflates the `SUM()` scan as the usage table grows.
- Files: `src/lib/server/budget/notifications.ts` (lines 49–70)
- Cause: Optimization for single query vs per-member queries, but uses a conservative earliest date.
- Improvement path: For large orgs, consider per-reset-date grouping or a materialized spend view.

**`app_usage_logs` will grow unbounded:**
- Problem: There is no partitioning, archival, or TTL on `app_usage_logs`. The cleanup cron (`/api/cron/cleanup`) only deletes expired sessions, not old usage records.
- Files: `src/lib/server/db/schema.ts` (lines 147–177), `src/routes/api/cron/cleanup/+server.ts`
- Cause: No data retention policy implemented.
- Improvement path: Add a cron job to delete/archive usage logs older than N months. Consider PostgreSQL table partitioning by `created_at` for query performance at scale.

---

## Fragile Areas

**`extractUsageFromSSEText` relies on only last 10 SSE lines:**
- Files: `src/lib/server/gateway/proxy.ts` (lines 263–329), `src/lib/server/gateway/usage.ts` (lines 58–80)
- Why fragile: The streaming proxy buffers only the most recent 10 lines (`MAX_RECENT = 10`) to extract usage data from SSE. LiteLLM typically puts usage in the last chunk, but if a provider's final chunk is followed by extra blank lines or comments, the usage chunk could shift outside the window.
- Safe modification: Increase `MAX_RECENT` to 20 or buffer only `data:` prefixed lines. Alternatively, accumulate usage tokens from incremental delta chunks if the provider streams them per-chunk.

**`db` singleton via Proxy swallows initialization errors silently:**
- Files: `src/lib/server/db/index.ts` (lines 5–27)
- Why fragile: `DATABASE_URL` is read from `process.env` (not `$env/dynamic/private`), so it bypasses SvelteKit's env validation. The `getDb()` function throws if the var is missing, but only at first access — this could manifest as a runtime crash on the first request rather than at startup.
- Safe modification: Eagerly initialize the DB client at module load time, or add a health check endpoint that validates DB connectivity before accepting traffic.

**`getBudgetResetDate` is called with `budget.resetDay` which can be 1–28 but the `resetDay` DB column default is 1:**
- Files: `src/lib/server/budget/utils.ts`, `src/lib/server/db/schema.ts` (line 230)
- Why fragile: If a future migration or direct DB operation sets `resetDay = 0` or `resetDay = 29+`, the date calculation produces unexpected months. No validation exists at the read layer; validation only exists in the write handler.
- Safe modification: Add a guard in `getBudgetResetDate`: `const day = Math.max(1, Math.min(28, resetDay))`.

**`validateProviderKey` assumes Google returns `{ models: [...] }` but Google AI Studio changed its `/v1beta/models` response format:**
- Files: `src/lib/server/provider-keys.ts` (lines 151–157)
- Why fragile: The model name parser expects `m.name ?? m.id` for Google responses. Google returns names like `models/gemini-1.5-pro` with the `models/` prefix, which becomes the model identifier stored in `appProviderKeys.models`. If the proxy later compares `effectiveModel` to these stored names, the prefix mismatch will cause "No provider configured for model" errors.
- Safe modification: Strip the `models/` prefix when parsing Google model names: `m.name?.replace(/^models\//, '') ?? m.id`.

---

## Scaling Limits

**Single-process Node.js, no clustering:**
- Current capacity: 1 CPU core utilized (SvelteKit adapter-node runs single process by default)
- Limit: CPU-bound latency spikes at high concurrency; estimated ~500–1000 RPS before noticeable queuing
- Scaling path: Use `NODE_CLUSTER_WORKERS=N` env var with adapter-node, or deploy behind a load balancer with multiple container replicas. Note: in-memory rate limiter must be migrated to Redis first.

**PostgreSQL connection pool capped at 20:**
- Current capacity: `max: 20` connections (configurable via `DB_POOL_MAX`)
- Limit: At 20 concurrent DB-heavy requests (auth + budget + usage log each needing a connection), pool saturation can cause request queuing
- Scaling path: Increase `DB_POOL_MAX` or deploy PgBouncer as a connection pooler in transaction mode.

---

## Dependencies at Risk

**`arctic` OAuth library (v3.x) has small community:**
- Risk: `arctic` is a niche OAuth client for the Lucia auth ecosystem. If maintainer abandons the project, it may not receive updates for new OAuth provider changes or security advisories.
- Impact: Google/GitHub OAuth sign-in would break if provider APIs change without a library update.
- Migration plan: The OAuth flow (`oauth.ts`) is minimal (~15 lines); migrating to `openid-client` or `@auth/core` providers is feasible.

**`@node-rs/argon2` requires native bindings:**
- Risk: `@node-rs/argon2` is a Rust-compiled native addon distributed as pre-built binaries per platform. If a build target is not prebuilt (e.g., unusual Linux distro or architecture), the install fails silently or falls back to a non-native implementation.
- Impact: Deployment fails on unsupported platforms; Docker base image must match a supported ABI.
- Migration plan: Pure-JS `argon2` package exists as fallback but is slower. The Docker image (`node:20-alpine`) is a supported target.

---

## Missing Critical Features

**No request body size enforcement for actual stream (only Content-Length header):**
- Problem: The `MAX_REQUEST_BODY_BYTES` check relies on the `Content-Length` header which is optional in HTTP/1.1 and always absent for chunked transfer encoding.
- Blocks: Reliable protection against oversized request bodies without Nginx `client_max_body_size` in front.

**No usage log pagination — dashboard loads all rows:**
- Problem: Usage page server loads (`src/routes/org/[slug]/usage/+page.server.ts`) may load unbounded rows from `app_usage_logs` as usage grows.
- Blocks: Dashboard performance degrades linearly with usage table size. Pagination or time-bounded queries are not implemented.

**No GitHub OAuth callback route:**
- Problem: `oauth.ts` exports a `github` client but `src/routes/auth/oauth/github/` does not exist.
- Blocks: GitHub OAuth cannot be enabled even with credentials set.

---

## Test Coverage Gaps

**No tests for `proxyToLiteLLM` end-to-end happy path:**
- What's not tested: The full `proxyToLiteLLM` flow (model selection → cache check → key selection → LiteLLM request → usage logging → cache set) has no unit or integration test. Only `fetchWithRetry` is tested in isolation.
- Files: `src/lib/server/gateway/proxy.ts`, `src/lib/server/gateway/proxy.test.ts`
- Risk: Silent regressions in the critical request path
- Priority: High

**No tests for `validateProviderKey`:**
- What's not tested: Provider key validation (model discovery, auth header variants, Google model name parsing) is entirely untested.
- Files: `src/lib/server/provider-keys.ts` (lines 104–164)
- Risk: Model name format bugs (e.g., Google's `models/` prefix) go undetected
- Priority: Medium

**No tests for `members.ts` invite/acceptance flows:**
- What's not tested: `inviteMember` with expired invite re-invite edge case, `acceptInvitation` transaction rollback on error
- Files: `src/lib/server/members.ts`
- Risk: Invitation state corruption under failure conditions
- Priority: Medium

**No tests for budget API endpoint input validation:**
- What's not tested: `POST /org/[slug]/usage/budget` input validation (negative limits, float precision, missing required fields) has no test coverage.
- Files: `src/routes/org/[slug]/usage/budget/+server.ts`
- Risk: Invalid budget values stored in DB causing downstream calculation errors
- Priority: Medium

**`src/lib/server/litellm.ts` entirely untested:**
- What's not tested: `createLiteLLMOrganization` fetch call, error handling, response parsing
- Files: `src/lib/server/litellm.ts`
- Risk: LiteLLM org creation silently broken on API changes
- Priority: Low (non-critical path, graceful no-op on failure)

---

*Concerns audit: 2026-03-17*
