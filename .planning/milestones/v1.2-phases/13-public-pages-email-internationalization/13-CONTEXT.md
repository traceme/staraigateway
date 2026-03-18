# Phase 13: Public Pages & Email Internationalization - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Unauthenticated visitors and email recipients experience the product in their preferred language. This covers: landing page translation, auth page translation (login, signup, password reset, verify email, invite accept, OAuth confirm-link), browser locale detection for unauthenticated users, manual language switch on public pages, and bilingual email templates. Dashboard i18n is already complete (Phase 12).

</domain>

<decisions>
## Implementation Decisions

### Public Page Locale Detection
- For unauthenticated users: detect browser locale via `Accept-Language` header in hooks.server.ts
- Map `zh-*` variants (zh-CN, zh-TW, zh-HK) to `zh`, everything else falls back to `en`
- Pass detected locale to public pages via `event.locals` (same pattern as authenticated locale)
- Unauthenticated users can manually switch language on public pages via a lightweight switcher (cookie-based persistence, no DB)

### Public Page Language Switcher
- Add LanguageSwitcher to public pages (landing, auth pages) — reuse existing component from Phase 12
- For unauthenticated users: store preference in a cookie (`lang=en` or `lang=zh`, 1 year expiry, SameSite=Lax)
- Cookie preference overrides browser locale detection
- Once authenticated, cookie preference is ignored in favor of DB preference

### Landing Page Translation
- Wire existing landing page (`+page.svelte`) with `$t()` calls
- Translate FeaturesGrid, CostComparison components
- Add translation keys for all landing page content to en.json and zh.json
- Include SEO meta tags in both languages (title, description)

### Auth Page Translation
- Wire all auth pages: login, signup, forgot-password, reset-password, verify-email, invite/[token], oauth/confirm-link
- Add translation keys for auth-specific content to en.json and zh.json
- Auth form validation errors already use errorKey pattern from Phase 12 — extend to auth-specific errors

### Email Templates
- All email templates in `notifications.ts` (verification, password reset, invitation, budget warning, admin digest) rendered in recipient's stored language preference
- For users without a stored preference (e.g., invitation to new user): fall back to English
- Email templates use simple string interpolation with language-specific template objects (not svelte-i18n — emails are server-side only)
- Create `src/lib/server/email-templates.ts` with `getTemplate(type, language)` function
- Template structure: subject + body (HTML) per language per template type

### Claude's Discretion
- Exact email HTML structure and styling
- Cookie name and configuration details
- How to structure email template code (objects vs files)
- SEO meta tag content for Chinese version
- Whether to add `hreflang` link tags for SEO

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — I18N-03, I18N-04 define acceptance criteria for this phase
- `.planning/ROADMAP.md` — Phase 13 success criteria (4 items)

### Phase 12 Foundation (MUST read to understand existing i18n setup)
- `.planning/phases/12-dashboard-internationalization/12-CONTEXT.md` — Phase 12 decisions (svelte-i18n, DB storage, $t() pattern)
- `src/lib/i18n/index.ts` — svelte-i18n initialization
- `src/lib/i18n/en.json` — Existing English translations (extend, don't replace)
- `src/lib/i18n/zh.json` — Existing Chinese translations (extend, don't replace)

### Existing Code (key files to modify)
- `src/routes/+page.svelte` — Landing page
- `src/lib/components/landing/FeaturesGrid.svelte` — Landing features
- `src/lib/components/landing/CostComparison.svelte` — Landing cost comparison
- `src/routes/auth/login/+page.svelte` — Login page
- `src/routes/auth/signup/+page.svelte` — Signup page
- `src/routes/auth/forgot-password/+page.svelte` — Forgot password
- `src/routes/auth/reset-password/+page.svelte` — Reset password
- `src/routes/auth/verify-email/+page.svelte` — Email verification
- `src/routes/auth/invite/[token]/+page.svelte` — Invite acceptance
- `src/routes/auth/oauth/confirm-link/+page.svelte` — OAuth confirm link
- `src/hooks.server.ts` — Request handling (locale detection point)
- `src/lib/server/budget/notifications.ts` — Email templates

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LanguageSwitcher.svelte`: Already built in Phase 12 — reuse on public pages (needs cookie fallback for unauthenticated)
- `src/lib/i18n/index.ts`: svelte-i18n already initialized — just add more keys to en.json/zh.json
- `$t()` pattern: Established across 27+ dashboard components — same pattern for public pages
- `errorKey` pattern: Server actions return error keys — extend to auth server actions

### Established Patterns
- svelte-i18n with eager loading (both languages loaded upfront)
- Server passes locale via `+layout.server.ts` → client sets via `$effect`
- `transformPageChunk` in hooks.server.ts for dynamic HTML lang attribute

### Integration Points
- `hooks.server.ts` — Add Accept-Language detection for unauthenticated requests + cookie reading
- `+layout.server.ts` — Pass locale for unauthenticated users (cookie → Accept-Language → 'en')
- `notifications.ts` — Replace hardcoded English email strings with language-aware templates
- en.json/zh.json — Extend with landing, auth, and email translation keys

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

*Phase: 13-public-pages-email-internationalization*
*Context gathered: 2026-03-17*
