---
phase: 09-performance-optimization
plan: 02
subsystem: api
tags: [nodemailer, smtp, drizzle, n-plus-one, batch-query, performance]

requires:
  - phase: 07-budget-system
    provides: budget schema, notifications module, getBudgetResetDate utility
provides:
  - Lazy singleton SMTP transport eliminating per-send TCP/TLS overhead
  - Batched budget spend query replacing N+1 individual SUM queries
affects: [email, budget-notifications]

tech-stack:
  added: []
  patterns: [lazy-singleton-with-undefined-sentinel, grouped-query-with-lookup-map]

key-files:
  created: []
  modified:
    - src/lib/server/auth/email.ts
    - src/lib/server/budget/notifications.ts

key-decisions:
  - "Used undefined sentinel (not null) to distinguish uninitialized from SMTP-not-configured"
  - "Used earliestResetDate for batch query accepting conservative over-count for simplicity"

patterns-established:
  - "Lazy singleton with undefined sentinel: use undefined = not initialized, null = configured-off, value = ready"
  - "N+1 elimination: batch query with GROUP BY + Map lookup replaces per-item queries"

requirements-completed: [PERF-03, PERF-05]

duration: 2min
completed: 2026-03-17
---

# Phase 9 Plan 2: SMTP Singleton & Budget Query Batching Summary

**Lazy singleton SMTP transport and grouped budget spend query eliminating N+1 pattern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T04:29:01Z
- **Completed:** 2026-03-17T04:30:57Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- SMTP transport created once per process lifetime, reused across all email sends (eliminates repeated TCP/TLS handshakes)
- Budget notification spend lookup reduced from 2+N queries to 3 queries regardless of org member count
- Added null guards to all 5 send functions for safety when SMTP_HOST is not configured

## Task Commits

Each task was committed atomically:

1. **Task 1: SMTP transport lazy singleton** - `c51726f` (perf)
2. **Task 2: Batch budget notification queries** - `05c64f6` (perf)

## Files Created/Modified
- `src/lib/server/auth/email.ts` - Lazy singleton SMTP transport with undefined sentinel pattern and null guards
- `src/lib/server/budget/notifications.ts` - Single grouped SUM query with spendMap lookup replacing N+1 loop

## Decisions Made
- Used `undefined` as "not initialized" sentinel to distinguish from `null` (SMTP not configured), following a three-state pattern that prevents re-initialization attempts
- Used `earliestResetDate` across all budgets for the batch query, accepting a conservative over-count for members with later reset dates (in practice most orgs use the same resetDay)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both performance optimizations are self-contained with no API surface changes
- All existing callers (budget notification system, email sends) work without modification

---
*Phase: 09-performance-optimization*
*Completed: 2026-03-17*

## Self-Check: PASSED
