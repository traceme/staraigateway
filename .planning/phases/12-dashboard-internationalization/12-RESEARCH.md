# Phase 12: Dashboard Internationalization - Research

**Researched:** 2026-03-17
**Domain:** Svelte i18n, SvelteKit server/client data flow, Drizzle migrations
**Confidence:** HIGH

## Summary

Phase 12 adds Chinese/English language support to all dashboard pages. The codebase is a SvelteKit app using Svelte 5 runes, Drizzle ORM with PostgreSQL, and Tailwind CSS. The scope is well-bounded: ~31 dashboard Svelte components + 8 page routes + 1 org create page need string extraction, a `language` column must be added to `appUsers`, and a language switcher must be placed in `TopBar.svelte`.

The user has locked `svelte-i18n` as the i18n library (v4.0.1, peer dep `svelte ^3 || ^4 || ^5`). The library uses Svelte stores (`$t`, `$locale`) which work in Svelte 5 via the `$store` auto-subscription syntax. There are known edge cases with `{@html}` hydration mismatches in Svelte 5, but this project does not use `{@html}` with translated content (only for SVG icons), so those issues are not relevant.

**Primary recommendation:** Use `svelte-i18n` with synchronous `addMessages()` loading (two small JSON files), initialize in root `+layout.svelte`, pass locale from server via layout data, and use `invalidateAll()` on language switch for instant reactivity.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use `svelte-i18n` (not paraglide) -- reactive store-based, well-maintained
- Translation files: single `src/lib/i18n/` directory with `en.json` and `zh.json` at top level
- Flat key namespace with dot notation: `dashboard.title`, `members.invite`, `validation.email_required`
- Initialize i18n in root `+layout.svelte` -- locale from user session data, fallback to `en`
- All translations loaded eagerly (two languages, small payload) -- no lazy loading needed
- Add `language` column (`text`, default `'en'`) to `appUsers` table via Drizzle migration
- Persist user language choice in DB so it survives across sessions and devices
- Load language in `+layout.server.ts` from session user and pass to client
- For unauthenticated dashboard access (redirects to login), default to `en`
- Language toggle in TopBar (header) -- always visible, not buried in settings
- Simple dropdown or toggle: globe icon EN / Chinese characters
- Switching language: POST to API endpoint updating user preference in DB, then `invalidateAll()` to re-render -- no full page reload
- Also accessible from account/org settings page for discoverability
- Default for new users: `en` (English)
- All dashboard pages under `/org/[slug]/` -- dashboard, members, api-keys, provider-keys, usage, settings, models
- Shared layout components: Sidebar, TopBar, OrgSwitcher
- Org create page (`/org/create`)
- All Svelte components in `src/lib/components/` that render user-facing text
- `app.html` -- dynamic `lang` attribute based on user locale
- Zod schemas return error codes/keys, frontend maps them to translated strings (not in Zod itself)
- API error responses from server routes: Return error codes, frontend translates to display messages
- Server-side flash messages: Return message keys, render translated text client-side
- Dynamic content (dates, numbers, currency): Use `Intl.NumberFormat` and `Intl.DateTimeFormat` with locale parameter
- Currency always in USD cents (existing pattern) -- format display only

### Claude's Discretion
- Exact key naming conventions and grouping within JSON files
- Whether to split JSON by page or keep single file (recommend single file for two languages)
- Svelte-i18n initialization details and store setup
- Exact TopBar switcher component design
- Migration file naming and ordering
- How to handle edge cases (missing translation keys -- fallback to English)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| I18N-01 | User can switch UI language between Chinese and English via account settings | Language switcher in TopBar + settings page, `language` column in appUsers, POST endpoint to update preference, `invalidateAll()` for instant re-render |
| I18N-02 | All dashboard pages render in user's selected language | svelte-i18n `$t()` function across ~31 components and 8+ page routes, `en.json` and `zh.json` translation files |
| I18N-05 | Error messages and validation feedback display in user's selected language | Zod schemas return error keys (not English strings), server actions return error codes, frontend resolves via `$t()` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte-i18n | 4.0.1 | i18n runtime (stores, formatters) | User decision. Supports Svelte 5, reactive stores, ICU message format |
| drizzle-orm | 0.38.x | DB schema migration for `language` column | Already in use, standard migration pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.NumberFormat | Built-in | Number/currency formatting with locale | Format spend amounts, token counts |
| Intl.DateTimeFormat | Built-in | Date formatting with locale | Format dates in tables (created, last used) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| svelte-i18n | @inlang/paraglide-sveltekit | Compiler-based, better tree-shaking, but user locked svelte-i18n |
| Eager loading | Lazy loading via `register()` | Lazy loading unnecessary -- only 2 languages, small payloads |
| Single JSON file | Per-page split files | Single file simpler for 2 languages, no code-splitting benefit |

**Installation:**
```bash
npm install svelte-i18n
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── i18n/
│   │   ├── index.ts          # Init svelte-i18n, addMessages, set fallback
│   │   ├── en.json            # English translations (~200-300 keys)
│   │   └── zh.json            # Chinese translations (~200-300 keys)
│   ├── components/
│   │   └── layout/
│   │       └── LanguageSwitcher.svelte  # Globe icon dropdown
│   └── server/
│       └── db/
│           └── schema.ts      # appUsers gets `language` column
├── routes/
│   ├── +layout.svelte         # Import i18n init, set $locale from server data
│   ├── +layout.server.ts      # Pass user.language to client
│   ├── api/
│   │   └── user/
│   │       └── language/
│   │           └── +server.ts # POST endpoint to update language preference
│   └── org/[slug]/            # All pages use $t() for text
└── app.html                   # Dynamic lang attribute via %sveltekit.head%
```

### Pattern 1: i18n Initialization (Synchronous)
**What:** Load both language dictionaries synchronously and initialize svelte-i18n
**When to use:** Always -- this is the entry point
**Example:**
```typescript
// src/lib/i18n/index.ts
import { addMessages, init, getLocaleFromNavigator } from 'svelte-i18n';
import en from './en.json';
import zh from './zh.json';

addMessages('en', en);
addMessages('zh', zh);

init({
  fallbackLocale: 'en',
  initialLocale: 'en' // Will be overridden by server data in +layout.svelte
});
```

### Pattern 2: Server-to-Client Locale Passing
**What:** Load user's language preference from DB in server layout, pass to client
**When to use:** Root layout load
**Example:**
```typescript
// src/routes/+layout.server.ts
export const load: LayoutServerLoad = async (event) => {
  return {
    user: event.locals.user,
    locale: event.locals.user?.language ?? 'en'
  };
};
```
```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '$lib/i18n';
  import { locale } from 'svelte-i18n';

  let { data, children } = $props();

  // Set locale reactively from server data
  $effect(() => {
    locale.set(data.locale);
  });
</script>
```

### Pattern 3: Translation Usage in Components
**What:** Use `$t()` store function for all user-facing text
**When to use:** Every component with hardcoded English text
**Example:**
```svelte
<script>
  import { t } from 'svelte-i18n';
</script>

<h1>{$t('dashboard.title')}</h1>
<p>{$t('dashboard.description')}</p>
<button>{$t('common.save')}</button>
```

### Pattern 4: Error Code Pattern for Validation
**What:** Zod schemas return generic error codes, frontend maps to translated strings
**When to use:** All form validation and API error handling
**Example:**
```typescript
// Server action returns error key, not English string
return fail(400, { errorKey: 'errors.email_invalid' });

// Or for Zod: use error code mapping
const parsed = createSchema.safeParse(data);
if (!parsed.success) {
  // Map Zod error to i18n key
  const zodError = parsed.error.errors[0];
  const errorKey = zodErrorToKey(zodError); // e.g., 'validation.name_required'
  return fail(400, { errorKey });
}
```
```svelte
<!-- In component -->
{#if form?.errorKey}
  <p class="text-red-400">{$t(form.errorKey)}</p>
{/if}
```

### Pattern 5: Language Switcher with Server Persistence
**What:** Language toggle posts to API, updates DB, then invalidates client data
**When to use:** TopBar language switcher component
**Example:**
```svelte
<script>
  import { locale } from 'svelte-i18n';
  import { invalidateAll } from '$app/navigation';

  async function switchLanguage(lang: string) {
    await fetch('/api/user/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang })
    });
    locale.set(lang);
    await invalidateAll(); // Re-runs all server loads
  }
</script>
```

### Pattern 6: Dynamic `lang` Attribute on `<html>`
**What:** Set the `lang` attribute dynamically based on user locale
**When to use:** For accessibility and SEO
**Example:**
```typescript
// In hooks.server.ts resolve options
return resolve(event, {
  transformPageChunk: ({ html }) =>
    html.replace('%lang%', event.locals.user?.language ?? 'en')
});
```
```html
<!-- app.html -->
<html lang="%lang%">
```

### Pattern 7: Locale-Aware Number/Date Formatting
**What:** Use `Intl` APIs with the user's locale for formatting
**When to use:** Dates in tables, currency amounts, large numbers
**Example:**
```typescript
// Replace: d.toLocaleDateString('en-US', { ... })
// With:
function formatDate(date: Date | string | null, locale: string): string {
  if (!date) return $t('common.never');
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(d);
}

// Replace: n.toLocaleString('en-US')
// With:
function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}
```

### Anti-Patterns to Avoid
- **Translating inside Zod schemas:** Zod runs server-side where there is no reactive locale. Return error keys, translate client-side.
- **Using `{@html $t('key')}` for translated HTML:** Known hydration mismatch issue in Svelte 5 with svelte-i18n. Keep translations as plain text.
- **String concatenation for translated phrases:** Use ICU message format placeholders: `$t('members.count', { values: { count: 5 } })` not `$t('members.label') + ': ' + count`.
- **Hardcoding locale in formatting functions:** The codebase currently has `toLocaleDateString('en-US', ...)` and `toLocaleString('en-US')` in several places. These must all use the dynamic locale.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Translation lookup with fallback | Custom key resolver | svelte-i18n `$t()` | Handles fallback locale, missing keys, interpolation |
| Locale-aware formatting | Custom date/number formatters | `Intl.DateTimeFormat`, `Intl.NumberFormat` | Browser-native, handles all locale quirks |
| Reactive locale switching | Manual store + re-render logic | svelte-i18n `locale` store + `invalidateAll()` | Built-in reactivity, triggers all store updates |
| Pluralization | If/else count logic | ICU plural format in svelte-i18n | `{count, plural, one {# item} other {# items}}` |

## Common Pitfalls

### Pitfall 1: Svelte 5 Store Syntax with svelte-i18n
**What goes wrong:** In Svelte 5, `$t` could be confused with rune syntax. Svelte 5 treats `$state`, `$derived`, `$effect` etc. as runes, but `$t` from stores still works via the `$store` auto-subscription.
**Why it happens:** Svelte 5 introduced runes that look like store subscriptions.
**How to avoid:** Import `t` (not `$t`) from svelte-i18n and use `$t` in templates. This is the standard Svelte store pattern that works in both Svelte 4 and 5.
**Warning signs:** Compilation errors about `$t` not being a valid rune.

### Pitfall 2: Server-Side vs Client-Side Locale
**What goes wrong:** The locale is set client-side by svelte-i18n but server layouts/actions don't have access to it.
**Why it happens:** svelte-i18n stores are client-only.
**How to avoid:** Server routes that return error messages should return error *keys* (not translated strings). The client-side component resolves the key to the translated string using `$t()`.
**Warning signs:** Error messages appearing in English regardless of locale setting.

### Pitfall 3: Missing Translation Keys Fail Silently
**What goes wrong:** A typo in a translation key shows the raw key string instead of translated text.
**Why it happens:** svelte-i18n returns the key path as fallback when no translation is found.
**How to avoid:** Use a consistent key naming convention. During development, add a `handleMissingMessage` callback that logs warnings. Keep keys organized by page/feature namespace.
**Warning signs:** Raw dotted key paths appearing in the UI (e.g., `dashboard.welcom` instead of "Welcome").

### Pitfall 4: Form Action Error Migration
**What goes wrong:** Existing form actions return `{ error: 'Human readable string' }`. After i18n, these strings need to become keys, but changing the shape breaks existing components.
**Why it happens:** The current pattern uses `error` for display strings, and i18n requires a two-step change (server returns key, client translates).
**How to avoid:** Add an `errorKey` field alongside the existing `error` field. Components check `errorKey` first and fall back to `error`. This allows incremental migration.
**Warning signs:** Error messages showing i18n keys to users, or components not displaying errors at all.

### Pitfall 5: Hardcoded Locale in Formatting Functions
**What goes wrong:** Several components use `toLocaleDateString('en-US')` or `toLocaleString('en-US')`. After i18n these still show English-formatted dates/numbers.
**Why it happens:** Easy to miss -- they're embedded in helper functions, not obvious template text.
**How to avoid:** Search for all occurrences of `'en-US'`, `'en'` locale hardcoding in components. Replace with dynamic locale from svelte-i18n's `$locale` store.
**Warning signs:** Dates and numbers still formatted in English style when Chinese is selected.

### Pitfall 6: `app.html` lang Attribute
**What goes wrong:** The `<html lang="en">` is hardcoded in `app.html`. It needs to be dynamic.
**Why it happens:** SvelteKit's `app.html` is a static template.
**How to avoid:** Use `hooks.server.ts` `resolve` with `transformPageChunk` to replace a placeholder with the actual locale.
**Warning signs:** Accessibility tools reporting wrong document language.

## Code Examples

### Current Files Requiring String Extraction

**Dashboard components (31 files):**
- `src/lib/components/layout/Sidebar.svelte` -- 7 nav labels ("Dashboard", "Provider Keys", etc.)
- `src/lib/components/layout/TopBar.svelte` -- "Log out", aria labels
- `src/lib/components/layout/OrgSwitcher.svelte` -- "Create new organization"
- `src/lib/components/dashboard/OnboardingChecklist.svelte` -- "Get Started", 3 checklist items
- `src/lib/components/dashboard/AdminKpiCards.svelte` -- 4 KPI labels ("Members", "Active Keys", etc.)
- `src/lib/components/api-keys/CreateKeyModal.svelte` -- modal text, form labels
- `src/lib/components/api-keys/KeyCreatedModal.svelte` -- success message
- `src/lib/components/api-keys/RateLimitFields.svelte` -- field labels
- `src/lib/components/api-keys/SmartRoutingToggle.svelte` -- toggle label
- `src/lib/components/budget/BudgetBanner.svelte` -- budget warning text
- `src/lib/components/budget/BudgetDefaultsForm.svelte` -- form labels
- `src/lib/components/budget/BudgetPanel.svelte` -- budget panel text
- `src/lib/components/members/InvitePanel.svelte` -- invite form
- `src/lib/components/members/MemberActionMenu.svelte` -- action items
- `src/lib/components/members/MembersTable.svelte` -- table headers
- `src/lib/components/members/RoleBadge.svelte` -- role labels
- `src/lib/components/models/ModelPricingTable.svelte` -- table headers
- `src/lib/components/settings/CacheTtlSetting.svelte` -- setting label
- `src/lib/components/settings/OrgSettingsForm.svelte` -- form labels
- `src/lib/components/settings/SmartRoutingSettings.svelte` -- setting labels
- `src/lib/components/usage/TimeRangePicker.svelte` -- range options
- `src/lib/components/usage/CostTrendChart.svelte` -- chart labels
- `src/lib/components/usage/UsageTable.svelte` -- table headers
- `src/lib/components/usage/BreakdownBarChart.svelte` -- chart labels
- `src/lib/components/usage/UsageTabs.svelte` -- tab labels
- `src/lib/components/usage/KpiCard.svelte` -- card labels
- `src/lib/components/docs/IntegrationGuide.svelte` -- guide text
- `src/lib/components/docs/ToolTabs.svelte` -- tab labels

**Page routes (9 files):**
- `src/routes/org/[slug]/dashboard/+page.svelte` -- page title, link text
- `src/routes/org/[slug]/api-keys/+page.svelte` -- page title, table headers, status labels, confirm dialogs
- `src/routes/org/[slug]/members/+page.svelte` -- page title
- `src/routes/org/[slug]/provider-keys/+page.svelte` -- page title, provider card text
- `src/routes/org/[slug]/usage/+page.svelte` -- page title, tab labels
- `src/routes/org/[slug]/settings/+page.svelte` -- page title, form labels
- `src/routes/org/[slug]/models/+page.svelte` -- page title
- `src/routes/org/create/+page.svelte` -- page title, form labels
- `src/routes/org/[slug]/+layout.svelte` -- (layout container, minimal text)

**Server routes needing error key changes (6 files):**
- `src/routes/org/[slug]/api-keys/+page.server.ts` -- 8 error strings
- `src/routes/org/[slug]/members/+page.server.ts` -- 6 error strings
- `src/routes/org/[slug]/provider-keys/+page.server.ts` -- error strings
- `src/routes/org/[slug]/settings/+page.server.ts` -- error strings
- `src/routes/org/[slug]/usage/budget/+server.ts` -- error strings
- `src/routes/org/create/+page.server.ts` -- error strings

### Translation Key Structure (Recommended)
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "create": "Create",
    "edit": "Edit",
    "close": "Close",
    "loading": "Loading...",
    "never": "Never",
    "active": "Active",
    "revoked": "Revoked",
    "confirm": "Are you sure?",
    "log_out": "Log out"
  },
  "nav": {
    "dashboard": "Dashboard",
    "provider_keys": "Provider Keys",
    "api_keys": "API Keys",
    "members": "Members",
    "usage": "Usage",
    "models": "Models",
    "settings": "Settings"
  },
  "org_switcher": {
    "create_new": "Create new organization"
  },
  "dashboard": {
    "title": "{orgName} Dashboard",
    "manage_members": "Manage Members",
    "view_api_keys": "View API Keys",
    "budget_settings": "Budget Settings",
    "empty_message": "Your dashboard will show usage stats and team activity once you set up provider keys."
  },
  "api_keys": {
    "title": "API Keys",
    "description": "Personal API keys for accessing LLM models through Cursor, Continue.dev, Claude Code, and other tools.",
    "create": "Create API Key",
    "my_keys": "My Keys",
    "all_keys": "All Keys",
    "no_keys": "No API keys yet",
    "no_keys_hint": "Create one to get started.",
    "no_org_keys": "No API keys in this organization",
    "table": {
      "name": "Name",
      "key": "Key",
      "status": "Status",
      "created": "Created",
      "last_used": "Last Used",
      "owner": "Owner",
      "rpm": "RPM",
      "tpm": "TPM"
    },
    "revoke": "Revoke",
    "revoking": "Revoking...",
    "revoke_confirm": "Are you sure you want to revoke this API key? This cannot be undone.",
    "edit_rate_limits": "Edit Rate Limits"
  },
  "kpi": {
    "members": "Members",
    "active_keys": "Active Keys",
    "spend_this_month": "Spend This Month",
    "requests_this_month": "Requests This Month"
  },
  "onboarding": {
    "get_started": "Get Started",
    "add_provider_key": "Add your first LLM provider key",
    "invite_members": "Invite team members",
    "create_api_key": "Create an API key"
  },
  "validation": {
    "name_required": "Name is required",
    "name_too_long": "Name must be 50 characters or less",
    "email_invalid": "Please enter a valid email address",
    "key_id_required": "Key ID is required",
    "invalid_role": "Invalid role"
  },
  "errors": {
    "not_authenticated": "Not authenticated",
    "org_not_found": "Organization not found",
    "key_not_found": "API key not found",
    "key_not_in_org": "API key not found in this organization",
    "create_key_failed": "Failed to create API key",
    "only_admins_invite": "Only admins can invite members",
    "only_admins_remove": "Only admins can remove members",
    "only_admins_revoke_invite": "Only admins can revoke invitations",
    "only_owner_change_role": "Only the owner can change roles",
    "only_admins_revoke_keys": "Only owners and admins can revoke keys",
    "only_admins_rate_limits": "Only owners and admins can update rate limits",
    "invite_failed": "Failed to send invitation",
    "role_change_failed": "Failed to change role",
    "remove_failed": "Failed to remove member",
    "revoke_invite_failed": "Failed to revoke invitation"
  },
  "language": {
    "switch": "Language",
    "en": "English",
    "zh": "Chinese (Simplified)"
  }
}
```

### Drizzle Migration
```typescript
// In schema.ts - add to appUsers
language: text('language').notNull().default('en'),

// Migration SQL generated by drizzle-kit:
// ALTER TABLE "app_users" ADD COLUMN "language" text NOT NULL DEFAULT 'en';
```

### Language Switch API Endpoint
```typescript
// src/routes/api/user/language/+server.ts
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated');

  const { language } = await request.json();
  if (language !== 'en' && language !== 'zh') {
    error(400, 'Invalid language');
  }

  await db
    .update(appUsers)
    .set({ language, updatedAt: new Date() })
    .where(eq(appUsers.id, locals.user.id));

  return json({ success: true });
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| svelte-i18n v3 (Svelte 3/4 only) | svelte-i18n v4.0.1 (Svelte 3/4/5) | Oct 2024 | Peer dep updated to include `^5` |
| Paraglide for Svelte 5 | Paraglide still maturing | 2024-2025 | User chose svelte-i18n which is more proven |
| Custom `$_` alias | `$t` / `$_` / `$format` all work | Stable | All are aliases for the same formatter store |

**Notes on Svelte 5 compatibility:**
- svelte-i18n 4.0.1 officially supports Svelte 5 via peer dependencies
- Known issues with `{@html}` hydration mismatches (#262 on GitHub) -- not relevant to this project since translations are plain text
- The `$t` store subscription syntax works correctly in Svelte 5 templates alongside runes

## Open Questions

1. **Exact number of translation keys needed**
   - What we know: ~31 components + ~9 pages need extraction, estimated 200-300 keys
   - What's unclear: Exact count requires full audit of every string in every component
   - Recommendation: Create initial en.json/zh.json with common + nav + error keys first, then extract per-page keys incrementally during implementation

2. **Chinese translations quality**
   - What we know: Need native-quality zh.json
   - What's unclear: Whether Claude-generated Chinese translations are sufficient or need human review
   - Recommendation: Generate initial translations, flag for review. Use standard enterprise software terminology for Chinese UI.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --include 'src/lib/i18n/**/*.test.ts'` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | Language preference stored and loaded from DB | unit | `npx vitest run --include 'src/lib/i18n/**/*.test.ts' -x` | No -- Wave 0 |
| I18N-01 | Language switch API endpoint | unit | `npx vitest run --include 'src/routes/api/user/language/**/*.test.ts' -x` | No -- Wave 0 |
| I18N-02 | Translation files have matching keys in en.json and zh.json | unit | `npx vitest run --include 'src/lib/i18n/**/*.test.ts' -x` | No -- Wave 0 |
| I18N-05 | Error keys map to translation entries | unit | `npx vitest run --include 'src/lib/i18n/**/*.test.ts' -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --include 'src/lib/i18n/**/*.test.ts'`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/i18n/i18n.test.ts` -- covers I18N-01 (init, locale switching), I18N-02 (key completeness between en/zh)
- [ ] `src/routes/api/user/language/language.test.ts` -- covers I18N-01 (API endpoint for language persistence)
- [ ] Translation key completeness test: verify en.json and zh.json have identical key sets

## Sources

### Primary (HIGH confidence)
- svelte-i18n package.json (GitHub raw) -- confirmed v4.0.1, peer dep `svelte ^3 || ^4 || ^5`
- svelte-i18n Getting Started docs (GitHub raw) -- `addMessages`, `init`, `$t` usage patterns
- svelte-i18n Formatting docs (GitHub raw) -- `$t`, `$number`, `$date`, interpolation, plurals
- Project source code -- full audit of schema.ts, validation.ts, hooks.server.ts, all layout/page files

### Secondary (MEDIUM confidence)
- svelte-i18n GitHub issues -- Svelte 5 compatibility issues (#248, #253, #261, #262), PR #253 merged for Svelte 5 support
- svelte-i18n GitHub README -- maintainer note about planned reworking (singleton to instances)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- svelte-i18n 4.0.1 confirmed via package.json, Svelte 5 peer dep verified
- Architecture: HIGH -- based on direct code inspection of all affected files, svelte-i18n official docs
- Pitfalls: HIGH -- Svelte 5 issues verified via GitHub issues, code patterns identified from codebase audit
- Translation scope: MEDIUM -- file count confirmed (31 components + 9 pages), but exact key count estimated

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, svelte-i18n unlikely to break)
