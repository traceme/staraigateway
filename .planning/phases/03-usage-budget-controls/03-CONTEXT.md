# Phase 3: Usage & Budget Controls - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Request logging with token/cost tracking per API call, usage dashboards (per-member and per-model breakdowns with trend charts), model pricing display, hard/soft spend limits per member with configurable monthly reset, and budget notifications (in-dashboard + email). Team-level budgets use org members grouped by role (no separate teams table yet — Phase 4 adds team management). Smart routing, fallbacks, and caching are Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Usage logging & cost data
- Intercept gateway responses to extract usage data — parse LiteLLM response `usage{}` field after each request before passing to client
- For streaming: buffer final SSE chunk which contains `usage{}` with token counts, log after stream completes
- Cost calculation: LiteLLM's `model_cost_map` as default pricing source, with a built-in pricing table for admin overrides and custom models
- Log fields per request: timestamp, user_id, org_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency_ms, status (success/error), is_streaming, endpoint path (/chat/completions vs /embeddings), request size bytes, response size bytes, error message if failed

### Dashboard charts & layout
- Line + bar combo charts: line chart for daily cost trends over time, bar chart for per-model or per-member breakdown (Vercel/Stripe analytics style)
- Time ranges: quick toggles for Last 7 days and Last 30 days, plus date range picker for custom periods
- Tabbed view on a single Usage page: Overview (org total), By Member, By Model — each tab has its own chart + table
- No separate "per-team" view yet (no teams table — use org members grouped by role until Phase 4)

### Model pricing display
- Dedicated "Models" page in sidebar showing all available models
- Table columns: provider, model name, input price per 1M tokens, output price per 1M tokens, context window size, whether org has an active key for it
- Sortable table

### Budget configuration
- Per-member budget via slide-out panel on member list: hard limit ($), soft limit ($), both optional
- Org-wide default budget applies to all members unless overridden individually
- Configurable reset day of month (1-28), default: 1st — all member budgets reset on that day
- When hard limit is hit: reject with HTTP 429, OpenAI-compatible error: `{error: {message: 'Monthly budget exceeded ($X/$Y). Contact your admin.', type: 'budget_exceeded'}}`
- Soft limit: request proceeds, but notification is triggered

### Budget notifications
- In-dashboard warning banner + email notification
- Single threshold at 90% of budget
- Member gets: dashboard banner ("You've used $90 of your $100 limit") + email notification
- Admin gets: daily digest email if any members crossed 90% threshold (batched, not per-event)
- Nodemailer SMTP infrastructure already available from Phase 1

### Claude's Discretion
- Chart library choice (Chart.js, D3, Recharts, or lightweight alternative)
- Exact usage log table schema and indexing strategy
- How to efficiently aggregate usage data for dashboard queries
- Budget check timing (pre-request vs post-request enforcement)
- Daily digest email scheduling mechanism
- Loading states and error handling for dashboard charts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in:

### Requirements
- `.planning/REQUIREMENTS.md` — TRACK-01 through TRACK-05, BUDG-01 through BUDG-05

### Prior phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Email system setup (Nodemailer/SMTP), dashboard skeleton, sidebar layout
- `.planning/phases/02-core-gateway/02-CONTEXT.md` — Gateway proxy architecture, SSE pass-through, provider key storage

### Key implementation files
- `src/lib/server/gateway/proxy.ts` — Gateway proxy where usage logging intercept will be added
- `src/lib/server/gateway/auth.ts` — API key auth with fire-and-forget lastUsedAt pattern (reuse for usage logging)
- `src/lib/server/db/schema.ts` — Existing 8 Drizzle tables, add usage_logs and budget tables
- `src/routes/org/[slug]/dashboard/+page.svelte` — Existing dashboard page to extend with usage charts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/server/gateway/proxy.ts`: Gateway proxy — intercept point for logging. Currently passes through with no usage extraction
- `src/lib/server/gateway/auth.ts`: Fire-and-forget DB update pattern (used for lastUsedAt) — reuse for non-blocking usage logging
- `src/lib/server/auth/email.ts` + `src/lib/server/auth/emails/`: Nodemailer email infrastructure — extend with budget notification templates
- `src/routes/org/[slug]/dashboard/`: Dashboard shell — extend with usage tabs and charts
- `src/lib/server/db/schema.ts`: 8 Drizzle tables with app_ prefix — add app_usage_logs, app_budgets tables

### Established Patterns
- Drizzle ORM with postgres.js driver, all tables use app_ prefix
- Fire-and-forget DB writes for non-blocking operations (from gateway/auth.ts)
- SvelteKit form actions for CRUD operations
- Tailwind CSS for styling, modern SaaS aesthetic (Linear/Vercel reference)
- Lazy DB initialization via Proxy for build-time safety

### Integration Points
- Gateway proxy (proxy.ts) — add response interception for usage logging
- Dashboard layout — add "Usage" and "Models" sidebar nav items
- Member list page — add budget slide-out panel
- Email system — add budget notification email templates
- LiteLLM model_cost_map — read for default pricing data

</code_context>

<specifics>
## Specific Ideas

- Charts should feel like Vercel/Stripe analytics — clean, not cluttered
- Budget rejection message must be OpenAI-compatible so IDE tools (Cursor, Continue.dev) display it correctly
- Daily admin digest should be concise — just a list of members approaching/exceeding limits, not a full report

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-usage-budget-controls*
*Context gathered: 2026-03-16*
