---
phase: 15-model-catalog
plan: 02
subsystem: ui
tags: [svelte, drizzle, i18n, model-catalog, pricing]

# Dependency graph
requires:
  - phase: 15-model-catalog-01
    provides: discoverModelsForKey populates appProviderKeys.models jsonb column
provides:
  - Dynamic model catalog page iterating discovered models from DB
  - Nullable pricing enrichment from MODEL_PRICING map
  - CatalogModel exported type for downstream use
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nullable pricing enrichment: lookup MODEL_PRICING[modelId] with ?? null fallback"
    - "Provider name resolution via getProvider(key.provider) instead of model-name prefix inference"
    - "Null-safe sort comparator with nulls-last ordering"

key-files:
  created: []
  modified:
    - src/routes/org/[slug]/models/+page.server.ts
    - src/lib/components/models/ModelPricingTable.svelte
    - src/lib/i18n/en.json
    - src/lib/i18n/zh.json

key-decisions:
  - "Iterate discovered models from appProviderKeys.models instead of hardcoded MODEL_PRICING keys"
  - "Remove hasKey column since all displayed models have active keys by definition"
  - "Null pricing displays as N/A rather than $0 or crashing"

patterns-established:
  - "Nullable pricing enrichment: models not in MODEL_PRICING get null, UI shows N/A"
  - "Provider name from DB record via getProvider() instead of model-name prefix heuristic"

requirements-completed: [MODEL-02]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 15 Plan 02: Dynamic Model Catalog Summary

**Dynamic catalog page aggregating discovered models from provider keys with nullable pricing enrichment and N/A display**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T09:35:40Z
- **Completed:** 2026-03-18T09:37:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Catalog page now shows ALL models discovered from active provider keys, not just 14 hardcoded MODEL_PRICING entries
- Models not in MODEL_PRICING display "N/A" for pricing and context window instead of crashing or showing $0
- Removed hasKey column since all displayed models have active keys by definition
- Fixed contextWindow column label bug (was using common.name, now uses models.table.context_window)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor catalog page server load to dynamic discovery with pricing enrichment** - `9963478` (feat)
2. **Task 2: Update ModelPricingTable for nullable pricing and remove hasKey column, add i18n keys** - `21b37fd` (feat)

## Files Created/Modified
- `src/routes/org/[slug]/models/+page.server.ts` - Rewrote to iterate discovered models from appProviderKeys.models, enrich with MODEL_PRICING, export CatalogModel type
- `src/lib/components/models/ModelPricingTable.svelte` - Nullable Model type, removed hasKey column, null-safe formatPrice and sort, fixed context_window label
- `src/lib/i18n/en.json` - Added models.table.context_window key
- `src/lib/i18n/zh.json` - Added models.table.context_window key (Chinese)

## Decisions Made
- Iterate discovered models from appProviderKeys.models instead of hardcoded MODEL_PRICING keys -- models are now data-driven
- Remove hasKey column entirely since all models in the list have active keys by definition (inverted logic)
- Null pricing displays as "N/A" rather than $0 or throwing -- graceful degradation for unknown models
- Provider name resolved from DB record via getProvider() rather than model-name prefix heuristic -- more accurate

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Model catalog is fully dynamic and data-driven
- Phase 15 (Model Catalog) is complete -- all plans executed
- v1.2 milestone (Feature Expansion) is complete

---
*Phase: 15-model-catalog*
*Completed: 2026-03-18*
