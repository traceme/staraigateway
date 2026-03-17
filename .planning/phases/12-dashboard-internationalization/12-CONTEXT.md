# Phase 12: Dashboard Internationalization - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated users can use the entire dashboard in Chinese or English based on their preference. This covers: language preference storage, i18n infrastructure, language switcher UI, translation of all dashboard pages (org settings, members, API keys, usage, budgets, models), and translation of form validation errors and API error messages. Public pages (landing, auth) and email templates are Phase 13.

</domain>

<decisions>
## Implementation Decisions

### i18n Library & Architecture
- Use `svelte-i18n` (paraglide not mature enough for Svelte 5 runes) — reactive store-based, well-maintained
- Translation files: single `src/lib/i18n/` directory with `en.json` and `zh.json` at top level
- Flat key namespace with dot notation: `dashboard.title`, `members.invite`, `validation.email_required`
- Initialize i18n in root `+layout.svelte` — locale from user session data, fallback to `en`
- All translations loaded eagerly (two languages, small payload) — no lazy loading needed

### Language Preference Storage
- Add `language` column (`text`, default `'en'`) to `appUsers` table via Drizzle migration
- Persist user language choice in DB so it survives across sessions and devices
- Load language in `+layout.server.ts` from session user and pass to client
- For unauthenticated dashboard access (shouldn't happen — redirects to login), default to `en`

### Language Switcher UX
- Place language toggle in TopBar (header) — always visible, not buried in settings
- Simple dropdown or toggle: 🌐 EN / 中文
- Switching language: POST to an API endpoint that updates user preference in DB, then `invalidateAll()` to re-render — no full page reload
- Also accessible from account/org settings page for discoverability
- Default for new users: `en` (English)

### Translation Scope
- All dashboard pages under `/org/[slug]/` — dashboard, members, api-keys, provider-keys, usage, settings, models
- Shared layout components: Sidebar, TopBar, OrgSwitcher
- Org create page (`/org/create`)
- All Svelte components in `src/lib/components/` that render user-facing text
- `app.html` — dynamic `lang` attribute based on user locale

### Validation & Error Messages
- Zod schemas (`validation.ts`): Replace hardcoded English strings with i18n keys, resolve at display time in Svelte components (not in Zod itself — Zod runs server-side)
- Pattern: Zod returns error codes/keys, frontend maps them to translated strings
- API error responses from server routes: Return error codes, frontend translates to display messages
- Server-side flash messages: Return message keys, render translated text client-side

### String Extraction Strategy
- Extract all hardcoded English strings from ~53 files into `en.json` and `zh.json`
- Use `$t('key')` function from svelte-i18n in all `.svelte` files
- For server-side strings (page titles in `<svelte:head>`), use layout data to pass locale
- Dynamic content (dates, numbers, currency): Use `Intl.NumberFormat` and `Intl.DateTimeFormat` with locale parameter — no i18n library needed for formatting
- Currency always in USD cents (existing pattern) — format display only

### Claude's Discretion
- Exact key naming conventions and grouping within JSON files
- Whether to split JSON by page or keep single file (recommend single file for two languages)
- Svelte-i18n initialization details and store setup
- Exact TopBar switcher component design
- Migration file naming and ordering
- How to handle edge cases (missing translation keys — fallback to English)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in the following project files:

### Requirements
- `.planning/REQUIREMENTS.md` — I18N-01, I18N-02, I18N-05 define the acceptance criteria for this phase
- `.planning/ROADMAP.md` — Phase 12 success criteria (4 items)

### Existing Code (key files to understand before implementing)
- `src/lib/server/db/schema.ts` — User table needs `language` column addition
- `src/lib/server/auth/validation.ts` — Zod schemas with hardcoded English error messages
- `src/routes/+layout.server.ts` — Session/user data loading, where locale should be injected
- `src/routes/+layout.svelte` — Root layout, where i18n should be initialized
- `src/lib/components/layout/TopBar.svelte` — Where language switcher should be placed
- `src/lib/components/layout/Sidebar.svelte` — Navigation text to translate
- `src/app.html` — `lang` attribute needs to be dynamic

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TopBar.svelte`: Header component — language switcher goes here
- `Sidebar.svelte`: Navigation labels — all need translation
- `OrgSwitcher.svelte`: Org name display — label text needs translation
- Zod validation schemas in `validation.ts` — need error code pattern change
- `+layout.server.ts` / `+layout.svelte`: Session loading pipeline — locale injection point

### Established Patterns
- Svelte 5 runes (`$props()`, `$state()`, `$derived()`) — i18n store usage must be compatible
- Drizzle ORM for schema/migrations — add column via standard migration
- SvelteKit form actions for mutations — language switch can use form action or API route
- Server data loading in `+page.server.ts` → passed to components via `$props()`

### Integration Points
- `+layout.server.ts` → loads user session → add `language` to returned data
- `hooks.server.ts` → request handling → could set locale header
- All `+page.svelte` files under `/org/[slug]/` → wrap text with `$t()` calls
- `src/lib/server/budget/notifications.ts` → email strings (Phase 13, not this phase)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User delegated all implementation decisions to Claude's judgment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-dashboard-internationalization*
*Context gathered: 2026-03-17*
