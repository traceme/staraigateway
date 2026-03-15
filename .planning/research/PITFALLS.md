# Domain Pitfalls

**Domain:** Multi-tenant LLM API Gateway SaaS (BYO keys, per-org isolation)
**Researched:** 2026-03-15
**Overall confidence:** MEDIUM-HIGH (based on LiteLLM codebase analysis, PRD review, and domain expertise)

---

## Critical Pitfalls

Mistakes that cause rewrites, data breaches, or business failure.

### Pitfall 1: Cross-Tenant API Key Leakage

**What goes wrong:** Org A's real provider API keys (OpenAI, Anthropic) are exposed to Org B's users or appear in logs, error messages, or response headers. In a BYO-key model, this is catastrophic -- you are literally leaking another company's billing credentials.

**Why it happens:** LiteLLM was designed for single-tenant use. Its config.yaml stores API keys globally, not per-org. When you bolt multi-tenancy on top, the request path (proxy_server.py -> router.py -> provider) carries real keys through multiple layers. Error responses from upstream providers often include the API key in error payloads. Logging at verbose levels dumps full request headers.

**Consequences:** Complete loss of customer trust. Potential financial liability (leaked keys can be abused before rotation). Immediate churn.

**Prevention:**
- Never store BYO keys in LiteLLM's config.yaml. Store them in your own database with per-org encryption (AES-256-GCM with per-org key derivation).
- Inject BYO keys into LiteLLM at request time via the `litellm_params` override, not through config.
- Scrub all upstream error responses before returning to users -- strip `api_key`, `authorization`, and `x-api-key` fields.
- Disable verbose logging in production entirely, or implement a key-redacting log filter.
- Implement integration tests that assert no API key substring appears in any response body or header.

**Detection:** Grep all outbound response bodies for key prefixes (`sk-`, `sk-ant-`, `sk-proj-`). Run this as a CI check.

**Phase:** Must be addressed in Phase 1 (foundation). This is the single biggest trust requirement.

---

### Pitfall 2: Spend Tracking Drift and Inaccurate Billing

**What goes wrong:** The cost displayed in your dashboard diverges from what the provider actually charges. Users see $50 in your dashboard but their OpenAI bill says $80. Or worse, budget limits don't trigger because spend tracking lags behind actual usage.

**Why it happens:** LiteLLM calculates cost from token counts in responses using its `model_prices_and_context_window.json` file. This has multiple failure modes:
1. **Stale pricing data** -- LLM providers change prices frequently (OpenAI has done 5+ price changes in 2 years). The JSON file lags.
2. **Streaming token count gaps** -- Some providers don't include `usage` in streaming responses, requiring estimation.
3. **Batched spend writes** -- LiteLLM uses `db_spend_update_writer.py` to batch spend updates. If the proxy crashes between a successful LLM call and the spend write, the spend is lost.
4. **Prompt caching cost differences** -- Anthropic cache reads are 10% of base price, but LiteLLM may not always distinguish cached vs. non-cached tokens correctly.
5. **China provider pricing** -- DeepSeek, Qwen, GLM pricing is in RMB, not USD. Currency conversion adds another drift vector.

**Consequences:** Users lose trust in the platform's core value proposition (cost tracking). Budget limits fail silently -- a user blows through their budget because the tracking was 30% behind reality.

**Prevention:**
- Cross-validate spend against provider billing APIs monthly (OpenAI and Anthropic both expose usage APIs).
- Add a "cost confidence" indicator: show users when pricing data was last updated.
- For BYO keys, surface the provider's own billing dashboard link prominently -- position your tracking as "estimate" not "invoice."
- Implement a spend buffer: trigger budget warnings at 80% and hard-stop at 90% of calculated limit to absorb tracking drift.
- Pin to specific LiteLLM versions and audit `model_prices_and_context_window.json` on each upgrade.
- For China providers, store pricing in the provider's native currency and convert at display time.

**Detection:** Weekly reconciliation job that compares aggregated spend per org-key against provider billing APIs where available. Alert on >5% drift.

**Phase:** Phase 2 (after basic proxy works). But the architecture decision (treating your tracking as estimates, not invoices) must be made in Phase 1.

---

### Pitfall 3: Per-Org Proxy Isolation Architecture Mismatch

**What goes wrong:** The project calls for "per-org serverless-style lightweight proxy instances" but this is extremely complex to implement correctly and may be over-engineered for 20-100 person teams.

**Why it happens:** LiteLLM is a stateful Python process (FastAPI + Prisma + Redis connections). "Serverless-style" implies cold starts, which conflict with LiteLLM's 15-20 second startup time (Prisma migrations, provider client initialization). Running one LiteLLM instance per org means N PostgreSQL connection pools, N Redis connections, and N processes for N orgs -- at 100 orgs this is unsustainable on a single VM.

**Consequences:** Either: (a) cold start latency of 15-20 seconds kills user experience, (b) keeping all instances warm burns excessive memory/connections, or (c) you spend months building a custom orchestration layer that belongs in Phase 5, not Phase 1.

**Prevention:**
- Start with a shared LiteLLM instance with logical multi-tenancy (org isolation at the application layer, not process layer). LiteLLM already has Organization, Team, and Key hierarchies in its schema.
- Use LiteLLM's existing `organization_id` field on keys and spend logs for isolation.
- Inject per-org BYO API keys at request time via middleware that looks up the org from the Virtual Key, fetches the org's provider keys, and overrides `litellm_params`.
- Defer process-level isolation to a later phase when you have proven product-market fit and need stronger security boundaries.

**Detection:** If you find yourself writing Kubernetes operators or container orchestration code before having 10 paying customers, stop.

**Phase:** Phase 1 should use shared-instance logical isolation. Phase 4+ can add process isolation if enterprise customers demand it.

---

### Pitfall 4: LiteLLM Upgrade Breakage

**What goes wrong:** A LiteLLM upgrade breaks your production proxy. Database migrations fail, API behavior changes, or new version drops support for a provider configuration you depend on.

**Why it happens:** LiteLLM releases frequently (multiple times per week). The PRD already warns "do not use `:latest` tag." But the problem is deeper:
- Prisma schema changes can be backwards-incompatible.
- The `schema.prisma` file exists in multiple locations (`proxy/`, `litellm-proxy-extras/`, `litellm-js/spend-logs/`) and they can drift.
- LiteLLM's codebase has many TODO/FIXME comments in critical auth and spend tracking paths (observed in codebase grep), indicating ongoing refactoring.
- Provider transformation code changes frequently as providers update their APIs.

**Consequences:** Unplanned downtime. Data corruption if migrations fail mid-way. Hours of debugging "what changed."

**Prevention:**
- Fork LiteLLM or pin to a specific commit hash, not just a version tag.
- Maintain a comprehensive integration test suite that validates: (a) all configured models respond, (b) Virtual Key auth works, (c) spend tracking writes correctly, (d) budget limits trigger.
- Run upgrades on a staging environment first with production-like data.
- Keep your custom multi-tenancy layer as a thin middleware layer on top of LiteLLM, not deep modifications to LiteLLM internals. This makes upgrades a "swap the dependency" operation.
- Document every LiteLLM internal you depend on (specific Prisma models, specific API endpoints, specific Python functions).

**Detection:** Automated smoke tests on every dependency upgrade. Diff the Prisma schema between versions before applying.

**Phase:** Phase 1 must establish the upgrade strategy. Every phase must include LiteLLM version pinning in its deliverables.

---

### Pitfall 5: China Provider Integration Complexity

**What goes wrong:** China model support (DeepSeek, Qwen/DashScope, GLM/Zhipu, Doubao/Volcengine, Moonshot) is treated as "just another provider" but has fundamentally different requirements.

**Why it happens:**
1. **Network topology:** China providers' APIs are hosted behind the Great Firewall. A proxy running outside China has high latency (200-500ms+ added). A proxy running inside China can't reach OpenAI/Anthropic without a compliant cross-border solution.
2. **API compatibility gaps:** China providers claim OpenAI compatibility but have subtle differences (function calling format, streaming chunk format, error codes, rate limit headers). LiteLLM's support for these providers is less battle-tested than for OpenAI/Anthropic.
3. **Pricing in RMB:** Cost tracking needs dual-currency support.
4. **Regulatory:** China's AI regulations require real-name verification for API access, content filtering for sensitive topics, and data residency within China. Your BYO-key model shifts compliance to the customer, but you still need to not break when providers return content-filtered responses.
5. **Payment:** China orgs may need to pay via Alipay/WeChat Pay, not Stripe.

**Consequences:** China market support becomes a 3-month project instead of a 1-week "add some config" task. Or worse, it ships half-baked and creates a poor experience that damages the brand in the target market.

**Prevention:**
- Treat China provider support as a distinct workstream, not an afterthought.
- Test every China provider integration end-to-end, especially streaming and function calling.
- Design the cost tracking system for multi-currency from day one (store amounts with currency code).
- For the SaaS version, plan for a China-region deployment (Alibaba Cloud or Tencent Cloud) that handles China providers with low latency, with the global deployment handling Western providers.
- Build provider-specific error handling that translates China provider errors into user-friendly messages (many return Chinese error messages).

**Detection:** If you're testing China providers from a non-China network and seeing >300ms latency, your users will see the same. Test from a China-based server.

**Phase:** Phase 2 should include basic China provider support (DeepSeek and Qwen at minimum). Phase 3 should address deployment topology for China-region.

---

## Moderate Pitfalls

### Pitfall 6: Streaming Response Complexity

**What goes wrong:** Streaming (SSE) works in basic cases but breaks under load, through reverse proxies, or with certain providers. Users see truncated responses, frozen streams, or duplicate chunks.

**Why it happens:** LiteLLM proxies SSE streams, but adding multi-tenant middleware (key injection, spend tracking, content filtering) to a streaming pipeline is much harder than for batch requests. Each middleware must process chunks without buffering the entire response. Nginx default settings (`proxy_buffering on`) break SSE. Provider-specific streaming formats differ subtly.

**Prevention:**
- Test streaming end-to-end through your full stack (client -> Nginx -> your app -> LiteLLM -> provider) from day one.
- Configure Nginx with `proxy_buffering off`, `X-Accel-Buffering: no`, and appropriate timeouts for SSE.
- Implement streaming-aware spend tracking that counts tokens from `usage` chunks (when available) or estimates from chunk content.
- Add streaming health checks that verify complete responses, not just first-chunk latency.

**Phase:** Phase 1 must validate streaming works. Phase 2 should harden it.

---

### Pitfall 7: Rate Limiting at the Wrong Layer

**What goes wrong:** You implement rate limiting per Virtual Key, but upstream providers rate-limit per API key. When multiple orgs happen to use the same provider, or one org's burst exhausts the shared provider key's rate limit, other orgs get 429 errors.

**Why it happens:** In the BYO-key model, each org brings their own provider keys, so this is less of an issue -- but it still happens when:
1. Multiple orgs use free-tier provider keys with low limits.
2. A single org's team of 50 people all hit the API simultaneously.
3. LiteLLM's internal rate limiter (`parallel_request_limiter_v3`) and the provider's rate limiter are not coordinated.

**Prevention:**
- Expose provider rate limit information to users ("Your OpenAI key is Tier 2, supporting 450K TPM").
- Implement per-org rate limiting that respects estimated provider limits, not just arbitrary per-key limits.
- Queue requests that would exceed provider limits rather than immediately failing.
- Surface 429 errors with actionable messages ("Your OpenAI key rate limit reached. Upgrade to Tier 3 or add a fallback provider").

**Phase:** Phase 2 (basic rate limiting). Phase 3 (smart rate limiting with provider-awareness).

---

### Pitfall 8: Virtual Key Proliferation and Management Debt

**What goes wrong:** Over time, orgs accumulate hundreds of Virtual Keys with unclear ownership, no expiration, and stale budget allocations. Revoking an employee's access means hunting through keys to find theirs.

**Why it happens:** LiteLLM's key model is flat -- keys belong to users and teams but there's no lifecycle management. No automatic expiration, no "offboarding" workflow, no key rotation policy.

**Prevention:**
- Require key expiration dates (default 90 days, admin-configurable).
- Build an "offboarding" API that revokes all keys for a user across all orgs.
- Show "last used" timestamp prominently in key management UI.
- Implement key naming conventions and search/filter in the UI.
- Add org-level policies: max keys per user, mandatory expiration, auto-disable after N days of inactivity.

**Phase:** Phase 2 (basic key lifecycle). Phase 3 (policies and automation).

---

### Pitfall 9: Dashboard Performance with Large Spend Logs

**What goes wrong:** The usage/cost dashboard becomes unusable as spend data grows. Loading a monthly cost breakdown for a 100-person org takes 30+ seconds or times out.

**Why it happens:** LiteLLM's `LiteLLM_SpendLogs` table grows rapidly (one row per request). For a 50-person org averaging 100 requests/day/person, that's 150K rows/month. Aggregation queries without proper indexing or pre-aggregation are slow. The Prisma ORM materializes full result sets in memory (noted in LiteLLM's CLAUDE.md: "Bound large result sets").

**Consequences:** The dashboard -- your core value proposition UI -- feels broken. Users switch to checking provider billing directly, undermining your platform's value.

**Prevention:**
- Pre-aggregate spend data: hourly and daily rollups into summary tables, not real-time aggregation of raw logs.
- Partition spend logs by date (PostgreSQL native partitioning).
- Implement cursor-based pagination for all log views (LiteLLM's CLAUDE.md explicitly warns against skip-based pagination).
- Archive spend logs older than 90 days to cold storage.
- Index spend logs on `(organization_id, created_at)` and `(user_id, created_at)`.

**Phase:** Phase 2 (basic dashboard with simple queries). Phase 3 (pre-aggregation and partitioning before hitting scale).

---

### Pitfall 10: BYO Key Validation and Health Checking

**What goes wrong:** A user submits an invalid, expired, or rate-limited API key. The platform accepts it silently, and the user only discovers it's broken when they try to make their first LLM call -- getting a cryptic error.

**Why it happens:** Validating a BYO key means making a test API call to the provider, which has cost (small but nonzero), latency, and reliability implications. Different providers have different validation endpoints (or none at all).

**Prevention:**
- Validate BYO keys on submission by making a minimal API call (e.g., list models endpoint, which is free for most providers).
- Show key health status in the UI: "Active", "Invalid", "Rate Limited", "Unknown."
- Run periodic background health checks on stored keys (daily).
- For China providers where validation endpoints differ, maintain a per-provider validation strategy.
- Provide clear error messages when a key fails: "Your Anthropic key returned 401 (invalid). Please check the key in your Anthropic dashboard."

**Phase:** Phase 1 (basic validation on submission). Phase 2 (health checks and status).

---

## Minor Pitfalls

### Pitfall 11: OpenAI API Compatibility Edge Cases

**What goes wrong:** IDE plugins (Cursor, Continue.dev, Claude Code) break because your proxy doesn't handle edge cases in the OpenAI API format -- tool_choice behavior, response_format: json_schema, vision/image inputs, or specific streaming delta formats.

**Prevention:**
- Maintain an integration test suite that replays real requests from Cursor, Continue.dev, and Claude Code.
- Track which OpenAI SDK version each major client uses and test against it.
- When LiteLLM translates non-OpenAI providers to OpenAI format, validate the output against the OpenAI API spec.

**Phase:** Ongoing from Phase 1. Add tests as new clients are supported.

---

### Pitfall 12: Self-Host vs. SaaS Feature Divergence

**What goes wrong:** The self-hosted and SaaS versions gradually diverge, requiring double the testing and maintenance. Features built for SaaS break in self-host, or self-host customers demand SaaS-only features.

**Prevention:**
- Use the same codebase with feature flags, not separate codebases.
- Self-host should be "SaaS minus multi-org plus BYO infrastructure." The core proxy, key management, and dashboard code is identical.
- Define clearly what's SaaS-only (user signup, billing, multi-org) vs. shared (proxy, dashboard, key management).
- Ship self-host as a docker-compose with documented env vars, not a custom installer.

**Phase:** Phase 1 (architecture must support both from the start). Phase 3 (ship self-host package).

---

### Pitfall 13: Secret Rotation Without Downtime

**What goes wrong:** When a customer rotates their BYO API key, there's a window where the old key is invalid but the proxy still uses it, causing all requests to fail.

**Prevention:**
- Support multiple active keys per provider per org (old + new) with graceful cutover.
- Cache provider keys with short TTL (5 minutes) so rotations propagate quickly.
- Allow users to "test" a new key before making it primary.

**Phase:** Phase 2.

---

### Pitfall 14: Ignoring LiteLLM's Existing Multi-Tenancy Primitives

**What goes wrong:** You build custom org/team/user management from scratch, duplicating what LiteLLM already provides (Organizations, Teams, Virtual Keys, Budgets -- all in the Prisma schema). Then your custom layer and LiteLLM's layer conflict or drift.

**Prevention:**
- Map your domain model onto LiteLLM's existing schema: your "Organization" = LiteLLM's `LiteLLM_OrganizationTable`, your "Team" = `LiteLLM_TeamTable`, your "Member" = `LiteLLM_UserTable` + membership tables.
- Extend LiteLLM's schema (add columns) rather than creating parallel tables where possible.
- Use LiteLLM's existing management API endpoints (`/organization/new`, `/team/new`, `/key/generate`) rather than reimplementing CRUD.
- Where LiteLLM's primitives don't fit (e.g., BYO key storage, org-level settings), add your own tables that reference LiteLLM's IDs.

**Phase:** Phase 1 (data model design). This decision locks in the entire architecture.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: Foundation** | Over-engineering isolation (Pitfall 3) | Start with shared-instance, logical isolation |
| **Phase 1: Foundation** | Ignoring LiteLLM primitives (Pitfall 14) | Map domain model to existing schema first |
| **Phase 1: Foundation** | Key leakage in MVP rush (Pitfall 1) | Security review before any external access |
| **Phase 2: Core Features** | Spend tracking drift (Pitfall 2) | Design as "estimates" from day one, add reconciliation |
| **Phase 2: Core Features** | Dashboard performance (Pitfall 9) | Pre-aggregation architecture, not afterthought |
| **Phase 2: Core Features** | China provider complexity (Pitfall 5) | Dedicated workstream, test from China network |
| **Phase 3: Polish** | Rate limiting wrong layer (Pitfall 7) | Provider-aware rate limiting |
| **Phase 3: Polish** | Self-host divergence (Pitfall 12) | Feature flags, same codebase |
| **Phase 4: Scale** | LiteLLM upgrade breakage (Pitfall 4) | Integration test suite, staging environment |
| **Phase 4: Scale** | Key management debt (Pitfall 8) | Lifecycle policies, auto-expiration |

---

## Sources

- LiteLLM codebase analysis: `litellm/proxy/schema.prisma` (multi-tenancy schema), `litellm/CLAUDE.md` (development patterns and known issues)
- LiteLLM CLAUDE.md warnings: HTTP client cache safety, DB schema sync issues, spend batching, N+1 query warnings, Prisma pagination guidance
- Project PRD (`prd.md`): Cost model, architecture description, deployment patterns, known troubleshooting issues
- PROJECT.md: Requirements, constraints, key architectural decisions
- Direct codebase grep: TODO/FIXME/HACK patterns in proxy auth and spend tracking code paths (MEDIUM confidence -- indicates ongoing development in critical paths)
- Domain expertise on multi-tenant SaaS, LLM provider API patterns, China market requirements (MEDIUM confidence -- based on training data, not verified with current sources due to WebSearch unavailability)
