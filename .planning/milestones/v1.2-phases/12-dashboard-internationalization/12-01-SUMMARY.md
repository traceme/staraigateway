---
phase: 12-dashboard-internationalization
plan: 01
subsystem: ui
tags: [svelte-i18n, i18n, internationalization, drizzle, sveltekit]

# Dependency graph
requires: []
provides:
  - svelte-i18n initialization with en/zh translations (200+ keys)
  - language column on appUsers table
  - POST /api/user/language endpoint for language persistence
  - LanguageSwitcher component in TopBar
  - Dynamic HTML lang attribute via transformPageChunk
  - Server-to-client locale passing via layout data
affects: [12-02-PLAN, dashboard-string-extraction]

# Tech tracking
tech-stack:
  added: [svelte-i18n]
  patterns: [$t() translation lookup, transformPageChunk for dynamic HTML attributes, invalidateAll for reactive locale switching]

key-files:
  created:
    - src/lib/i18n/index.ts
    - src/lib/i18n/en.json
    - src/lib/i18n/zh.json
    - src/lib/components/layout/LanguageSwitcher.svelte
    - src/routes/api/user/language/+server.ts
    - drizzle/0002_add_user_language.sql
    - src/lib/i18n/__tests__/translations.test.ts
    - src/lib/i18n/__tests__/i18n.test.ts
  modified:
    - src/lib/server/db/schema.ts
    - src/hooks.server.ts
    - src/app.html
    - src/routes/+layout.server.ts
    - src/routes/+layout.svelte
    - src/lib/components/layout/TopBar.svelte

key-decisions:
  - "Synchronous addMessages loading for both locales (no lazy loading needed for 2 languages)"
  - "transformPageChunk with %lang% placeholder for dynamic HTML lang attribute"
  - "resolveWithLang helper in hooks.server.ts to apply transformPageChunk to all resolve paths"

patterns-established:
  - "$t() function from svelte-i18n for all user-facing text"
  - "locale.set() with invalidateAll() for reactive language switching"
  - "Server-to-client locale flow: DB -> session -> layout load -> $effect -> locale.set"

requirements-completed: [I18N-01]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 12 Plan 01: i18n Infrastructure Summary

**svelte-i18n with 200+ translation keys (en/zh), DB-persisted language preference, and TopBar language switcher with reactive locale switching**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T23:23:11Z
- **Completed:** 2026-03-17T23:28:19Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- svelte-i18n installed and initialized with synchronous message loading for both en and zh locales
- 200+ translation keys covering all dashboard namespaces (common, nav, dashboard, api_keys, members, provider_keys, usage, budget, models, settings, org_create, validation, errors, language, docs, kpi, onboarding, org_switcher)
- language column added to appUsers with DB migration, POST endpoint for persistence
- LanguageSwitcher component with globe icon dropdown in TopBar, reactive switching without page reload
- Dynamic HTML lang attribute via hooks.server.ts transformPageChunk
- 9 passing tests verifying translation key completeness and i18n initialization

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n infrastructure** - `45adbcd` (feat) - TDD: library, translations, DB migration, API endpoint, tests
2. **Task 2: Client-side integration** - `d5cf7c1` (feat) - Layout locale passing, language switcher, dynamic HTML lang

## Files Created/Modified
- `src/lib/i18n/index.ts` - svelte-i18n initialization with addMessages
- `src/lib/i18n/en.json` - English translation dictionary (200+ keys)
- `src/lib/i18n/zh.json` - Chinese translation dictionary (200+ keys)
- `src/lib/server/db/schema.ts` - Added language column to appUsers
- `drizzle/0002_add_user_language.sql` - DB migration for language column
- `src/routes/api/user/language/+server.ts` - POST endpoint for language preference
- `src/lib/components/layout/LanguageSwitcher.svelte` - Globe icon dropdown component
- `src/lib/components/layout/TopBar.svelte` - Added LanguageSwitcher import and placement
- `src/hooks.server.ts` - transformPageChunk for dynamic HTML lang attribute
- `src/app.html` - %lang% placeholder replacing hardcoded "en"
- `src/routes/+layout.server.ts` - Pass locale from server to client
- `src/routes/+layout.svelte` - Import i18n, reactive locale.set from server data
- `src/lib/i18n/__tests__/translations.test.ts` - 7 tests for key completeness
- `src/lib/i18n/__tests__/i18n.test.ts` - 2 tests for initialization

## Decisions Made
- Used synchronous addMessages loading instead of lazy register() -- only 2 languages, small payloads
- Created resolveWithLang helper in hooks.server.ts to avoid duplicating transformPageChunk across all resolve paths
- User type automatically includes language field via InferSelectModel from updated schema (no manual type changes needed)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Run `drizzle/0002_add_user_language.sql` migration on deployment.

## Next Phase Readiness
- i18n infrastructure complete, ready for Plan 02 (dashboard string extraction)
- All $t() keys defined in en.json and zh.json for Plan 02 to wire into components
- Pre-existing svelte-check errors in auth and dashboard pages are unrelated to i18n changes

---
*Phase: 12-dashboard-internationalization*
*Completed: 2026-03-17*
