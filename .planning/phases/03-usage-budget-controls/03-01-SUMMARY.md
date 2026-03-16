---
phase: 03-usage-budget-controls
plan: 01
subsystem: api
tags: [drizzle, usage-tracking, budget, gateway, sse, openai-compatible]

# Dependency graph
requires:
  - phase: 02-core-gateway
    provides: "Gateway proxy, API key auth, provider key storage"
provides:
  - "app_usage_logs table for per-request token/cost tracking"
  - "app_budgets table with role-scoped cascade"
  - "Usage extraction from streaming (SSE) and non-streaming responses"
  - "Pre-request budget enforcement with 429 rejection"
  - "Fire-and-forget usage logging in gateway proxy"
affects: [03-usage-budget-controls, 04-team-management, 05-smart-routing]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Fire-and-forget usage logging", "SSE ring buffer for usage extraction", "Budget cascade: individual > role > org default", "MODEL_PRICING lookup table"]

key-files:
  created:
    - src/lib/server/gateway/usage.ts
    - src/lib/server/gateway/budget.ts
    - src/lib/server/db/migrations/0003_usage_budgets.sql
  modified:
    - src/lib/server/db/schema.ts
    - src/lib/server/gateway/proxy.ts
    - src/lib/server/gateway/auth.ts
    - src/routes/v1/chat/completions/+server.ts
    - src/routes/v1/embeddings/+server.ts

key-decisions:
  - "MODEL_PRICING built-in table for cost calculation (admin override planned later)"
  - "Ring buffer (last 10 SSE lines) for streaming usage extraction without full buffering"
  - "Budget cascade: individual override > role default > org default in single query"
  - "Cents-based budget storage for integer precision (no floating point rounding)"

patterns-established:
  - "Fire-and-forget DB writes: logUsage() calls .then/.catch without await"
  - "SSE ring buffer: accumulate recent lines, extract usage on stream close"
  - "Budget cascade resolution: fetch all candidates in one query, apply priority in JS"

requirements-completed: [TRACK-01, BUDG-01, BUDG-02, BUDG-04]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 3 Plan 1: Usage Logging & Budget Enforcement Summary

**Usage logging with token/cost extraction for streaming and non-streaming responses, plus role-aware budget enforcement with 429 rejection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T01:39:26Z
- **Completed:** 2026-03-16T01:43:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Two new DB tables (app_usage_logs, app_budgets) with proper indexes for dashboard queries
- Usage extraction from both streaming SSE and non-streaming JSON responses
- Pre-request budget enforcement on /v1/chat/completions and /v1/embeddings
- Budget cascade: individual member > role-scoped default > org-wide default
- All usage logging is fire-and-forget (non-blocking)

## Task Commits

Each task was committed atomically:

1. **Task 1: DB schema for usage logs and budgets** - `c4fb678` (feat)
2. **Task 2: Usage logging and budget enforcement in gateway** - `543b02e` (feat)

## Files Created/Modified
- `src/lib/server/db/schema.ts` - Added appUsageLogs and appBudgets table definitions with indexes
- `src/lib/server/db/migrations/0003_usage_budgets.sql` - Raw SQL migration for both tables
- `src/lib/server/gateway/usage.ts` - MODEL_PRICING, extractUsageFromJSON/SSE, logUsage, calculateCost
- `src/lib/server/gateway/budget.ts` - checkBudget with role-aware cascade and spend aggregation
- `src/lib/server/gateway/proxy.ts` - Added usage extraction and logging for streaming/non-streaming
- `src/lib/server/gateway/auth.ts` - Added apiKeyId to GatewayAuth interface
- `src/routes/v1/chat/completions/+server.ts` - Pre-request budget check, 429 on hard limit
- `src/routes/v1/embeddings/+server.ts` - Pre-request budget check, 429 on hard limit

## Decisions Made
- Built-in MODEL_PRICING table with 14 models for cost calculation (admin override planned later)
- Ring buffer of last 10 SSE lines for streaming usage extraction (avoids full stream buffering)
- Single DB query fetches all candidate budgets (individual + role + org), cascade applied in JS
- Budget amounts stored in cents (integer) to avoid floating point precision issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Usage logging infrastructure ready for dashboard charts (Plan 03-02)
- Budget tables ready for admin UI configuration (Plan 03-03)
- Budget notification system can query soft limit hits from checkBudget results

## Self-Check: PASSED

All 8 files verified present. Both task commits (c4fb678, 543b02e) verified in git log.

---
*Phase: 03-usage-budget-controls*
*Completed: 2026-03-16*
