# Codebase Concerns

**Analysis Date:** 2026-03-16

## Tech Debt

**In-memory rate limiter does not survive restarts or scale horizontally:**
- Issue: `src/lib/server/gateway/rate-limit.ts` stores all rate limit windows in a module-level `Map`. Every process restart (deploy, crash, scale-out) resets all counters. In a multi-replica deployment, each replica tracks its own window, so actual per-key throughput can be N×limit where N is the replica count.
- Files: `src/lib/server/gateway/rate-limit.ts`
- Impact: Rate limits become unenforceable under horizontal scale or after any process restart. High-volume teams can inadvertently exceed upstream provider quotas.
- Fix approach: Move the sliding window to Redis using a sorted set or a dedicated Redis rate-limit library (e.g., `rate-limiter-flexible` with Redis backend).

**In-memory round-robin counter does not persist or distribute:**
- Issue: `src/lib/server/gateway/load-balancer.ts` uses a module-level `Map<string, number>` for rotation counters. Same failure mode as the rate limiter — resets on restart, not shared across replicas.
- Files: `src/lib/server/gateway/load-balancer.ts`
- Impact: Load distribution among provider keys is skewed after restarts; all replicas start from index 0 simultaneously, creating request bursts to the first key.
- Fix approach: Store counters in Redis with INCR, or accept the limitation as low-severity if single-replica deployment is the target.

**Hardcoded model pricing table will go stale:**
- Issue: `src/lib/server/gateway/usage.ts` contains a static `MODEL_PRICING` dict of 14 models. Unknown models silently return cost=0, meaning usage accrues but is tracked as free. Pricing changes (provider price cuts, new model versions) require code deploys.
- Files: `src/lib/server/gateway/usage.ts` (lines 14–29)
- Impact: Budget enforcement is inaccurate for any model not in the table or whose price has changed. Org admins may see underreported costs, allowing users to exceed true spend limits.
- Fix approach: Fetch pricing from LiteLLM's `/model/info` or `/v1/model/info` endpoint at startup and cache in Redis/DB, falling back to hardcoded values.

**`models` field stored as raw JSON string in DB:**
- Issue: `appProviderKeys.models` is a `text` column containing a JSON-stringified `string[]`. Every consumer (proxy, model listing, budget notifications) must `JSON.parse` this field individually, with individual `try/catch` blocks scattered across at least 3 files.
- Files: `src/lib/server/gateway/proxy.ts` (lines 151–159), `src/lib/server/gateway/models.ts` (lines 34–36), `src/lib/server/db/schema.ts` (line 105)
- Impact: If any insertion path stores malformed JSON, the key silently disappears from routing with no error. Parse failures are swallowed (`catch { return false }`), making debugging hard.
- Fix approach: Use a proper `jsonb` column in PostgreSQL (Drizzle supports `json()`) or normalize models into a separate `app_provider_key_models` join table.

**`getBudgetResetDate` is duplicated:**
- Issue: The identical `getBudgetResetDate(resetDay)` function is defined verbatim in both `src/lib/server/gateway/budget.ts` (line 15) and `src/lib/server/budget/notifications.ts` (line 12).
- Files: `src/lib/server/gateway/budget.ts`, `src/lib/server/budget/notifications.ts`
- Impact: If reset logic needs to change (e.g., month-end edge cases), only one copy may get updated, causing inconsistent behavior between enforcement and reporting.
- Fix approach: Extract to a shared `src/lib/server/budget/utils.ts` and import from both files.

**No database connection pooling configuration:**
- Issue: `src/lib/server/db/index.ts` creates a `postgres()` client with no pool size, timeout, or idle settings. The `postgres.js` library defaults to a max of 10 connections.
- Files: `src/lib/server/db/index.ts`
- Impact: Under concurrent load (many simultaneous API proxy requests), the pool can exhaust, causing queued requests and increased latency. No visibility into pool exhaustion.
- Fix approach: Pass explicit pool options (`max`, `idle_timeout`, `connect_timeout`) and expose pool metrics if needed.

**`CRON_SECRET` env var name mismatch in .env.example:**
- Issue: `src/routes/api/cron/digest/+server.ts` reads `env.CRON_SECRET` but `.env.example` does not list `CRON_SECRET` as a required variable. The cron endpoint returns a 500 if the variable is missing, rather than a configuration error.
- Files: `src/routes/api/cron/digest/+server.ts` (line 8), `.env.example`
- Impact: Operators may unknowingly deploy without the cron secret configured, causing the digest endpoint to be permanently broken with a 500.
- Fix approach: Add `CRON_SECRET` to `.env.example` with a generation instruction. Also change the 500 to a 503 "Service Unavailable" with a clear message.

**`APP_URL` env var inconsistency:**
- Issue: `src/lib/server/auth/oauth.ts` reads `env.APP_URL`. `src/lib/server/auth/email.ts` reads `env.APP_URL` via `getAppUrl()`. But `.env.example` defines `BASE_URL`, not `APP_URL`. The example value points to port 3000 while OAuth uses 5173 as the fallback.
- Files: `src/lib/server/auth/oauth.ts` (line 4), `src/lib/server/auth/email.ts` (line 26), `.env.example` (line 19)
- Impact: OAuth callbacks and email links point to the wrong URL if the operator only sets `BASE_URL`. Social login and invite emails break silently in production.
- Fix approach: Standardize on one variable name throughout (`APP_URL` or `BASE_URL`) and update `.env.example` accordingly.

## Known Bugs

**Cache key normalizer collapses distinct messages:**
- Symptoms: Two requests with different content that differ only in internal whitespace produce the same cache key and receive the same cached response.
- Files: `src/lib/server/gateway/cache.ts` (line 9)
- Trigger: The normalization is `.replace(/\s+/g, ' ').trim()` applied to the entire JSON-stringified messages array. `"hello  world"` and `"hello world"` in user content collapse to the same hash. This also means `"role": "user"` and `"role":  "user"` (extra space in key) deduplicate incorrectly.
- Workaround: None at the gateway level; turn off caching or accept occasional wrong cache hits.

**Streaming token count may be zero on usage-less providers:**
- Symptoms: Streaming responses from providers that do not include `usage` in the final SSE chunk (some providers only include it if `stream_options: { include_usage: true }` is set) log 0 input/0 output tokens. Budget and rate limiting based on token counts are then inaccurate for streaming requests.
- Files: `src/lib/server/gateway/proxy.ts` (lines 278–318), `src/lib/server/gateway/usage.ts` (lines 57–79)
- Trigger: Any streaming request to a provider that omits `usage` in SSE.
- Workaround: None; users must configure `stream_options` on the client side.

**`secure: false` hardcoded in session cookie for login and OAuth callbacks:**
- Symptoms: Session cookies are always set with `secure: false` in `src/routes/auth/login/+page.server.ts` (line 82) and both OAuth callback handlers. The hooks.server.ts sets `secure` conditionally based on hostname but the initial cookie creation never does.
- Files: `src/routes/auth/login/+page.server.ts` (line 82), `src/routes/auth/oauth/google/callback/+server.ts` (line 87), `src/routes/auth/oauth/github/callback/+server.ts`
- Trigger: Deployed behind HTTPS; the cookie is transmitted without the Secure flag, making it accessible over plain HTTP.
- Workaround: Operator must ensure the reverse proxy enforces HTTPS, but the cookie itself is not protected at the application layer.

**Budget `resolveMemberBudgets` issues N+1 queries:**
- Symptoms: Digest emails and soft-limit notifications become slow for large orgs.
- Files: `src/lib/server/budget/notifications.ts` (lines 59–103)
- Trigger: For each member in an org, one separate `SELECT ... FROM app_usage_logs` query is issued. An org with 50 members causes 50 sequential DB round trips on every soft-limit hit or digest send.
- Workaround: None; acceptable for small teams but degrades linearly with org size.

## Security Considerations

**Wildcard CORS on gateway endpoints:**
- Risk: All three `/v1/*` endpoints (`/v1/chat/completions`, `/v1/embeddings`, `/v1/models`) respond with `Access-Control-Allow-Origin: *`. This means any webpage on the internet can make authenticated API requests in a user's browser if they have the key available in JavaScript context (e.g., stored in localStorage).
- Files: `src/routes/v1/chat/completions/+server.ts` (lines 7–11), `src/routes/v1/embeddings/+server.ts` (lines 7–11), `src/routes/v1/models/+server.ts` (lines 7–11)
- Current mitigation: Bearer token authentication still applies; attackers need the actual `sk-th-*` key.
- Recommendations: Restrict CORS to trusted origins (the app's own domain, registered IDE origins) via an allowlist configured through an env var. Wildcard CORS is only safe if API keys are never exposed to browser JavaScript.

**OAuth callback silently links accounts by email without verification:**
- Risk: If a user registers with email/password for `alice@corp.com`, then an attacker creates a Google OAuth account with `alice@corp.com`, the OAuth callback at `src/routes/auth/oauth/google/callback/+server.ts` (lines 43–58) silently links the attacker's Google account to Alice's existing account and grants full access.
- Files: `src/routes/auth/oauth/google/callback/+server.ts` (lines 43–58), `src/routes/auth/oauth/github/callback/+server.ts`
- Current mitigation: None. The check only verifies the Google `sub` is not already linked; if the email matches an existing user, the OAuth account is linked unconditionally.
- Recommendations: Before linking an OAuth identity to an existing email/password account, require the user to authenticate with their existing password or explicitly confirm the link via an email challenge.

**Invitation token is `crypto.randomUUID()`:**
- Risk: UUIDs (128-bit, version 4) are cryptographically random but only have 122 bits of entropy. The token is also used as the invitation record's primary key (`id`) in `src/lib/server/members.ts` (line 54–55), causing the same value to be used for both purposes.
- Files: `src/lib/server/members.ts` (lines 54–56)
- Current mitigation: 122-bit entropy is computationally sufficient for brute-force resistance. No immediate risk.
- Recommendations: Use separate values for the invitation `id` and the shareable `token`. Generate the token with `randomBytes(32).toString('hex')` for clarity and to avoid semantic confusion between record IDs and secrets.

**`LITELLM_MASTER_KEY` in `.env.example`:**
- Risk: `.env.example` contains `LITELLM_MASTER_KEY=sk-master-key` as a placeholder. Operators who copy this file without changing the value will deploy with the well-known default master key, allowing anyone who reads the example to authenticate to LiteLLM directly.
- Files: `.env.example` (line 16)
- Current mitigation: The app itself does not use `LITELLM_MASTER_KEY` in any server code (it's for LiteLLM configuration), but the risk exists in deployments.
- Recommendations: Change the placeholder to an empty value and add a generation note identical to `ENCRYPTION_KEY`.

**No request body size limit on `/v1/*` endpoints:**
- Risk: A client can submit an arbitrarily large JSON body to `/v1/chat/completions`. The entire body is read with `request.json()` into memory in `proxy.ts` (line 83) before any validation.
- Files: `src/lib/server/gateway/proxy.ts` (line 83)
- Current mitigation: Underlying runtime (SvelteKit + Node) has some default limits, but they are not explicitly configured.
- Recommendations: Add an explicit body size check before parsing, or configure SvelteKit's `bodySize` limit.

## Performance Bottlenecks

**Per-request DB round-trip for auth on every API call:**
- Problem: Every request to `/v1/chat/completions` or `/v1/embeddings` calls `authenticateApiKey()` which issues a DB join query (appApiKeys + appOrganizations), then a fire-and-forget `UPDATE lastUsedAt`, and then `checkBudget()` which issues two more queries (member role lookup + budget fetch + usage aggregate). That is 4–5 DB queries synchronously in the hot path before the request reaches LiteLLM.
- Files: `src/lib/server/gateway/auth.ts`, `src/lib/server/gateway/budget.ts`
- Cause: No caching of auth or budget results between requests.
- Improvement path: Cache the `GatewayAuth` result in Redis keyed by `keyHash` with a short TTL (30–60 seconds). Cache the budget result per user with a very short TTL (5–10 seconds) since precision is not critical pre-request.

**Budget aggregate query scans all usage logs since reset date:**
- Problem: `checkBudget()` runs `SUM(cost) FROM app_usage_logs WHERE org_id=? AND user_id=? AND created_at >= resetDate` on every request. As the table grows (high-volume teams generate thousands of rows/day), this scan becomes expensive even with the composite index.
- Files: `src/lib/server/gateway/budget.ts` (lines 78–92)
- Cause: No materialized running total; each check recomputes from raw logs.
- Improvement path: Maintain a `app_budget_snapshots` table with a daily or hourly rollup, and only sum from the snapshot + recent unbucketed rows. Or use a Redis counter incremented on each logged cost value, reset on the budget reset day.

**Nodemailer creates a new transporter on every email send:**
- Problem: `src/lib/server/auth/email.ts` calls `getTransport()` (which calls `nodemailer.createTransport(...)`) inside every `send*Email` function. This creates a new TCP connection pool per email.
- Files: `src/lib/server/auth/email.ts` (lines 9–18)
- Cause: The transporter is not cached as a module-level singleton.
- Improvement path: Create the transporter once at module load and export it, or use a lazy singleton pattern matching `getRedis()`.

## Fragile Areas

**`proxyToLiteLLM` function is 489 lines and does too much:**
- Files: `src/lib/server/gateway/proxy.ts`
- Why fragile: The function handles smart routing, cache lookup, key selection, retry loop, streaming passthrough, non-streaming response, usage logging, and cache store — all in a single function body. Streaming and non-streaming paths share variable scope, making it easy to introduce regressions when modifying one path. The streaming path uses a closure over `recentLines` with a bounded buffer of 10 lines, which may miss the `usage` chunk in long responses from providers that emit it earlier in the stream.
- Safe modification: Any change to the streaming path must be accompanied by end-to-end manual testing with a real streaming provider. Consider extracting `handleStreamingResponse()` and `handleNonStreamingResponse()` as separate functions.
- Test coverage: Unit tests only cover `fetchWithRetry` and `RETRYABLE_STATUSES`. The full proxy flow, including smart routing fallback, streaming usage extraction, and cache interaction, has no tests.

**Budget enforcement is pre-request only (no mid-stream cutoff):**
- Files: `src/routes/v1/chat/completions/+server.ts`, `src/lib/server/gateway/budget.ts`
- Why fragile: Budget is checked before the request starts. A user exactly at their limit can start a very long completion (e.g., 100k token generation) that runs to completion, potentially exceeding the budget by the full cost of that request. The post-request cost is logged only after the response is finished.
- Safe modification: Accept this as a design limitation for now. Documenting it prevents surprising behavior if admins notice overage.
- Test coverage: No test exercises the budget-exceeded path in the proxy flow.

**OAuth state verification uses cookies that may not be set under some proxy configs:**
- Files: `src/routes/auth/oauth/google/+server.ts`, `src/routes/auth/oauth/google/callback/+server.ts`, `src/routes/auth/oauth/github/+server.ts`, `src/routes/auth/oauth/github/callback/+server.ts`
- Why fragile: The OAuth PKCE state and code verifier are stored in short-lived cookies. If the app is deployed behind a reverse proxy that strips cookies, or if the user's browser blocks third-party cookies in an embedded context, the callback state verification fails silently with a redirect to `/auth/login?error=oauth_failed`.
- Safe modification: Ensure the reverse proxy passes `Cookie` headers and that the app is accessed on the same domain as the callback URL.
- Test coverage: None.

**Invitation acceptance has no transaction:**
- Files: `src/lib/server/members.ts` (lines 94–148)
- Why fragile: `acceptInvitation` performs two separate DB writes: `INSERT INTO app_org_members` then `UPDATE app_org_invitations SET acceptedAt`. If the process crashes between these two statements, the member row exists but the invitation remains "pending", allowing the invitation to be accepted again by the same or a different user.
- Safe modification: Wrap both writes in a Drizzle transaction.
- Test coverage: None.

## Scaling Limits

**`appUsageLogs` table grows unboundedly:**
- Current capacity: No partition, archival, or TTL strategy. Every API call (success or error) appends one row.
- Limit: At 1,000 requests/day across a 50-person team, the table grows by ~365,000 rows/year. Query performance degrades for budget aggregate and usage dashboard queries as the table size grows into millions of rows.
- Scaling path: Add a monthly partition key on `created_at`, or implement a background job that rolls up rows older than 90 days into an `app_usage_summaries` table and deletes the raw logs.

**`app_sessions` table is never pruned:**
- Current capacity: Sessions expire after 30 days but are only deleted on access (when `validateSession` detects expiry). Sessions for users who never return accumulate indefinitely.
- Limit: Not critical at small scale, but causes table bloat over time.
- Scaling path: Add a cron job or DB scheduled task to `DELETE FROM app_sessions WHERE expires_at < NOW()`.

## Test Coverage Gaps

**Gateway proxy end-to-end flow:**
- What's not tested: Smart routing model substitution, cache hit/miss paths, multi-key fallback on retryable errors, streaming usage extraction, budget-exceeded path, and the full auth → budget → proxy chain.
- Files: `src/lib/server/gateway/proxy.ts`, `src/routes/v1/chat/completions/+server.ts`
- Risk: Regressions in the core revenue-generating path go undetected until production.
- Priority: High

**Auth flows (signup, login, OAuth, password reset):**
- What's not tested: No tests exist for any route in `src/routes/auth/`. Registration uniqueness enforcement, email verification token expiry, password reset token replay, and OAuth account linking are all untested.
- Files: `src/routes/auth/**`
- Risk: Security regressions in authentication are silent.
- Priority: High

**Budget enforcement logic:**
- What's not tested: `checkBudget()` cascade resolution (individual → role → org default), soft limit notification trigger, and hard limit enforcement result in the request path.
- Files: `src/lib/server/gateway/budget.ts`, `src/lib/server/budget/notifications.ts`
- Risk: Budget overrides and cascade rules may be silently broken by schema or query changes.
- Priority: High

**Member management:**
- What's not tested: `inviteMember`, `acceptInvitation`, `removeMember`, `changeRole` in `src/lib/server/members.ts` have no tests. Edge cases like duplicate invitation, expired token, and removing-already-removed member are untested.
- Files: `src/lib/server/members.ts`
- Risk: Multi-step flows with multiple DB writes are prone to partial-failure bugs.
- Priority: Medium

---

*Concerns audit: 2026-03-16*
