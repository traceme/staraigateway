---
phase: 13-public-pages-email-internationalization
plan: 01
subsystem: i18n-public-pages
tags: [i18n, landing-page, auth-pages, locale-detection]
dependency_graph:
  requires: [12-01, 12-02]
  provides: [public-page-i18n, browser-locale-detection, cookie-lang-persistence]
  affects: [hooks.server.ts, layout.server.ts, all-landing-components, all-auth-pages]
tech_stack:
  added: []
  patterns: [cookie-based-locale-for-unauthenticated, accept-language-parsing, authenticated-prop-pattern]
key_files:
  created: []
  modified:
    - src/hooks.server.ts
    - src/app.d.ts
    - src/routes/+layout.server.ts
    - src/lib/components/layout/LanguageSwitcher.svelte
    - src/routes/auth/+layout.svelte
    - src/lib/components/landing/LandingNav.svelte
    - src/lib/components/landing/LandingHero.svelte
    - src/lib/components/landing/FeaturesGrid.svelte
    - src/lib/components/landing/CostComparison.svelte
    - src/lib/components/landing/SelfHostCta.svelte
    - src/lib/components/landing/LandingFooter.svelte
    - src/routes/+page.svelte
    - src/routes/auth/login/+page.svelte
    - src/routes/auth/signup/+page.svelte
    - src/routes/auth/forgot-password/+page.svelte
    - src/routes/auth/reset-password/+page.svelte
    - src/routes/auth/verify-email/+page.svelte
    - src/routes/auth/invite/[token]/+page.svelte
    - src/routes/auth/oauth/confirm-link/+page.svelte
    - src/lib/i18n/en.json
    - src/lib/i18n/zh.json
decisions:
  - detectLocale() helper with priority: user.language > cookie > Accept-Language > 'en'
  - LanguageSwitcher authenticated prop for cookie-based vs API-based language switching
  - Cookie 'lang' with 1-year maxAge for unauthenticated locale persistence
metrics:
  duration: 293s
  completed: 2026-03-18
---

# Phase 13 Plan 01: Public Pages & Auth i18n Summary

Browser locale detection for unauthenticated users with complete en/zh translations for all public pages (landing + 7 auth pages) via cookie persistence and Accept-Language parsing.

## What Was Done

### Task 1: Browser locale detection, cookie persistence, and public page locale plumbing (dfcf6ad)

- Added `detectLocale()` helper in `hooks.server.ts` with priority chain: authenticated user language > `lang` cookie > Accept-Language header (zh-* variant detection) > 'en' default
- Added `locale?: string` to `App.Locals` interface in `app.d.ts`
- Set `event.locals.locale` for all request paths (v1 API, no-token, authenticated)
- Updated `resolveWithLang` to use `locals.locale` for HTML lang attribute
- Extended `LanguageSwitcher` with `authenticated` prop - when false, sets cookie + reloads instead of POSTing to API
- Added `LanguageSwitcher` to auth layout (top-right corner) and `LandingNav`
- Updated `+layout.server.ts` to return locale from `event.locals.locale`

### Task 2: Translate landing page and all auth pages with $t() wiring (3461534)

- Added 35 `landing.*` translation keys covering all landing page text (nav, hero, features, cost comparison, self-host CTA, footer)
- Added `auth.*` translation keys covering all 7 auth pages (login, signup, forgot-password, reset-password, verify-email, invite, oauth confirm-link)
- Added shared `auth.email_label`, `auth.password_label`, `auth.name_label` keys
- Complete Chinese translations for all new keys in `zh.json`
- Wired `$t()` into all 6 landing components - no hardcoded English strings remain
- Wired `$t()` into all 7 auth pages - no hardcoded English strings remain
- `npm run build` passes without errors

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Build succeeds without errors
- All landing components use `$t()` calls
- All auth pages use `$t()` calls
- `hooks.server.ts` contains Accept-Language parsing with zh-* variant detection
- `hooks.server.ts` reads 'lang' cookie for unauthenticated users
- LanguageSwitcher visible on auth layout and landing nav
- en.json and zh.json contain matching translation keys

## Self-Check: PASSED

All 21 modified files exist on disk. Both commit hashes (dfcf6ad, 3461534) verified in git log.
