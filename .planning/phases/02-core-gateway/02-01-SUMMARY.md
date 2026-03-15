---
phase: 02-core-gateway
plan: 01
subsystem: database, api, ui
tags: [drizzle, aes-256-gcm, encryption, provider-keys, svelte, crud]

requires:
  - phase: 01-foundation
    provides: "Drizzle ORM schema with app_ prefix tables, SvelteKit org layout with role-based access"
provides:
  - "appProviderKeys table with AES-256-GCM encrypted key storage"
  - "appApiKeys table with SHA-256 hashed key lookup"
  - "Provider key CRUD operations (create, read, update, delete)"
  - "Provider key validation via /models endpoint"
  - "Provider catalog with global, china, and custom providers"
  - "Provider keys management UI (card grid + slide-out panel)"
  - "decryptProviderKeyById() for gateway proxy usage"
affects: [02-02, 02-03, 03-usage-analytics]

tech-stack:
  added: [Node.js crypto (aes-256-gcm)]
  patterns: [encrypted-at-rest provider keys, provider catalog pattern, slide-out panel UI]

key-files:
  created:
    - src/lib/server/crypto.ts
    - src/lib/server/providers.ts
    - src/lib/server/provider-keys.ts
    - src/routes/org/[slug]/provider-keys/+page.server.ts
    - src/routes/org/[slug]/provider-keys/+page.svelte
    - src/routes/org/[slug]/provider-keys/validate/+server.ts
    - src/lib/components/provider-keys/ProviderCard.svelte
    - src/lib/components/provider-keys/ProviderPanel.svelte
  modified:
    - src/lib/server/db/schema.ts
    - src/lib/types/index.ts
    - src/lib/components/layout/Sidebar.svelte
    - .env.example

key-decisions:
  - "Node.js built-in crypto for AES-256-GCM (no external dependency needed)"
  - "IV:ciphertext:authTag hex format for encrypted key storage (simple, parseable)"
  - "Direct DB lookups in form actions instead of parent() (SvelteKit limitation: parent() not available in RequestEvent)"
  - "Base URL field shown for both custom and azure providers (Azure needs resource-specific URL)"

patterns-established:
  - "Encrypted storage pattern: encrypt before insert, decrypt on read (via crypto.ts)"
  - "Provider catalog pattern: centralized provider definitions with group/auth/endpoint metadata"
  - "Admin-only route pattern: resolveOrgAdmin() helper for direct DB role checks in actions/endpoints"

requirements-completed: [PKEY-01, PKEY-02, PKEY-03, PKEY-04, PKEY-05]

duration: 6min
completed: 2026-03-15
---

# Phase 2 Plan 1: Provider Key Management Summary

**AES-256-GCM encrypted provider key storage with CRUD operations, /models validation, and management UI featuring card grid with Global/China sections and slide-out panel**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-15T16:15:48Z
- **Completed:** 2026-03-15T16:21:33Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Two new database tables (appProviderKeys with encrypted storage, appApiKeys with hashed lookup)
- Full CRUD operations for provider keys with AES-256-GCM encryption at rest
- Key validation endpoint that calls provider /models APIs to discover available models
- Provider catalog with 11 providers across global, china, and custom categories
- Polished management UI with card grid layout and slide-out panel for key management
- Role-based access control (owner/admin only) on all operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Database schema + encryption module + provider catalog** - `135ddea` (feat)
2. **Task 2: Provider key CRUD + validation server logic** - `7de2803` (feat)
3. **Task 3: Provider keys management UI** - `e962e1d` (feat)

## Files Created/Modified
- `src/lib/server/db/schema.ts` - Added appProviderKeys and appApiKeys table definitions
- `src/lib/types/index.ts` - Added ProviderKey, ApiKey, NewProviderKey, NewApiKey types
- `src/lib/server/crypto.ts` - AES-256-GCM encrypt/decrypt using Node.js crypto
- `src/lib/server/providers.ts` - Provider catalog with global/china/custom providers
- `src/lib/server/provider-keys.ts` - CRUD operations with encrypted storage
- `src/routes/org/[slug]/provider-keys/+page.server.ts` - Page load + form actions with role checks
- `src/routes/org/[slug]/provider-keys/+page.svelte` - Provider keys page with card grid
- `src/routes/org/[slug]/provider-keys/validate/+server.ts` - POST endpoint for key validation
- `src/lib/components/provider-keys/ProviderCard.svelte` - Provider card with key count badge
- `src/lib/components/provider-keys/ProviderPanel.svelte` - Slide-out panel with add/validate/manage forms
- `src/lib/components/layout/Sidebar.svelte` - Activated Provider Keys nav item
- `.env.example` - Added ENCRYPTION_KEY with generation instructions

## Decisions Made
- Used Node.js built-in crypto for AES-256-GCM (no external dependency needed, always available)
- Stored encrypted keys as IV:ciphertext:authTag hex format (simple, portable, parseable)
- Used direct DB lookups in form actions and server endpoints instead of parent() (SvelteKit's parent() is only available in load functions, not in RequestEvent used by actions)
- Show base URL input for both custom and azure providers since Azure needs resource-specific URLs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed parent() usage in form actions and server endpoints**
- **Found during:** Task 2 (CRUD + validation server logic)
- **Issue:** Plan specified using parent() in form actions, but SvelteKit's parent() is only available in load functions, not in RequestEvent
- **Fix:** Created resolveOrgAdmin() helper that does direct DB lookups for org and membership, used in all form actions and the validate endpoint
- **Files modified:** src/routes/org/[slug]/provider-keys/+page.server.ts, src/routes/org/[slug]/provider-keys/validate/+server.ts
- **Verification:** TypeScript compiles clean, build succeeds
- **Committed in:** 7de2803 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for SvelteKit API correctness. No scope creep.

## Issues Encountered
None beyond the parent() deviation documented above.

## User Setup Required
- Add ENCRYPTION_KEY to .env (64 hex character string, 32 bytes)
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Run database migration to create new tables: `npm run db:push` or `npm run db:migrate`

## Next Phase Readiness
- Provider key CRUD and encrypted storage ready for gateway proxy (Plan 03)
- decryptProviderKeyById() exported for gateway to retrieve plaintext keys
- Provider catalog provides endpoint and auth header info for routing
- API keys table ready for Plan 02 (API key management)

---
*Phase: 02-core-gateway*
*Completed: 2026-03-15*
