---
phase: 03-usage-budget-controls
plan: 02
subsystem: ui
tags: [svelte, chart.js, dashboard, usage-tracking, drizzle, tailwind]

# Dependency graph
requires:
  - phase: 03-usage-budget-controls
    provides: "Usage logging tables, MODEL_PRICING, budget enforcement"
provides:
  - "Usage dashboard with KPI cards, daily cost trend chart, breakdown bar charts"
  - "Tabbed usage view: Overview, By Member (with role), By Model"
  - "Role-based cost breakdown cards (TRACK-03 per-team via roles)"
  - "Models pricing page with sortable table and active key status"
  - "Reusable chart and table components for future dashboards"
affects: [03-usage-budget-controls, 04-team-management]

# Tech tracking
tech-stack:
  added: [chart.js]
  patterns: ["Chart.js canvas rendering with onMount/onDestroy lifecycle", "URL param-driven tab and time range state", "Derived sorted data with $derived.by()"]

key-files:
  created:
    - src/routes/org/[slug]/usage/+page.server.ts
    - src/routes/org/[slug]/usage/+page.svelte
    - src/lib/components/usage/KpiCard.svelte
    - src/lib/components/usage/UsageTabs.svelte
    - src/lib/components/usage/CostTrendChart.svelte
    - src/lib/components/usage/BreakdownBarChart.svelte
    - src/lib/components/usage/TimeRangePicker.svelte
    - src/lib/components/usage/UsageTable.svelte
    - src/routes/org/[slug]/models/+page.server.ts
    - src/routes/org/[slug]/models/+page.svelte
    - src/lib/components/models/ModelPricingTable.svelte
  modified:
    - src/lib/components/layout/Sidebar.svelte
    - src/lib/server/gateway/usage.ts

key-decisions:
  - "Chart.js direct canvas rendering (not svelte-chartjs wrapper) for Svelte 5 compatibility"
  - "URL search params for tab and time range state (shareable URLs)"
  - "Role summary cards on By Member tab as TRACK-03 per-team breakdown via roles"

patterns-established:
  - "Chart.js lifecycle: create on onMount, destroy on onDestroy, recreate via $effect"
  - "URL-driven state: goto() with replaceState for tab/filter changes"
  - "Sortable tables with $derived.by() for reactive sorting"

requirements-completed: [TRACK-02, TRACK-03, TRACK-04, TRACK-05]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 3 Plan 2: Usage Dashboard & Models Pricing Page Summary

**Usage dashboard with Chart.js trend/breakdown charts, role-based member breakdown (TRACK-03), and sortable models pricing table**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T01:44:42Z
- **Completed:** 2026-03-16T01:47:42Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Usage page with 3 KPI cards (total spend, requests, avg cost), daily cost line chart, breakdown bar charts, and sortable tables
- Three-tab view: Overview (by model), By Member (with role column and role summary cards for TRACK-03), By Model
- Models page with sortable pricing table showing provider, model, input/output prices, context window, and active key status
- Both Usage and Models sidebar items activated with proper routing

## Task Commits

Each task was committed atomically:

1. **Task 1: Server data loading, sidebar updates, and reusable UI components** - `bf0265c` (feat)
2. **Task 2: Usage page assembly and Models pricing page** - `a7d2a2a` (feat)

## Files Created/Modified
- `src/routes/org/[slug]/usage/+page.server.ts` - Server loader with KPI aggregates, daily trends, member/model/role breakdowns
- `src/routes/org/[slug]/usage/+page.svelte` - Usage dashboard with tabs, charts, tables, empty state
- `src/lib/components/usage/KpiCard.svelte` - Stat card with label, value, optional trend indicator
- `src/lib/components/usage/UsageTabs.svelte` - Tab bar: Overview / By Member / By Model
- `src/lib/components/usage/CostTrendChart.svelte` - Chart.js line chart for daily cost trends
- `src/lib/components/usage/BreakdownBarChart.svelte` - Chart.js horizontal bar chart for cost breakdown
- `src/lib/components/usage/TimeRangePicker.svelte` - Quick toggles (7d, 30d) + custom date range picker
- `src/lib/components/usage/UsageTable.svelte` - Generic sortable data table
- `src/routes/org/[slug]/models/+page.server.ts` - Loads MODEL_PRICING with active key status from DB
- `src/routes/org/[slug]/models/+page.svelte` - Models page with search and pricing table
- `src/lib/components/models/ModelPricingTable.svelte` - Sortable model pricing table with status indicators
- `src/lib/components/layout/Sidebar.svelte` - Activated Usage item, added Models item with cpu icon
- `src/lib/server/gateway/usage.ts` - Exported MODEL_PRICING for models page import

## Decisions Made
- Used Chart.js directly via canvas element (not svelte-chartjs) for Svelte 5 runes compatibility
- Tab and time range state stored in URL search params for shareable/bookmarkable URLs
- Role summary cards on By Member tab serve as TRACK-03 per-team breakdown (full team management deferred to Phase 4)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Exported MODEL_PRICING from usage.ts**
- **Found during:** Task 1 (preparing for Task 2 models page import)
- **Issue:** MODEL_PRICING was `const` (not exported), but models page server loader needs to import it
- **Fix:** Changed `const MODEL_PRICING` to `export const MODEL_PRICING` in usage.ts
- **Files modified:** src/lib/server/gateway/usage.ts
- **Verification:** Models page server loader successfully imports MODEL_PRICING
- **Committed in:** bf0265c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for models page to access pricing data. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Usage dashboard ready for viewing once API requests generate usage logs
- Models pricing table populated from MODEL_PRICING constant
- Budget configuration UI (Plan 03-03) can build on this foundation
- Role-based breakdown ready for Phase 4 team management expansion

## Self-Check: PASSED

All 13 files verified present. Both task commits (bf0265c, a7d2a2a) verified in git log.

---
*Phase: 03-usage-budget-controls*
*Completed: 2026-03-16*
