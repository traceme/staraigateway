# Phase 4: Dashboard & Team Management - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Full admin experience: Google/GitHub OAuth login, member invitation via email with role assignment (Owner/Admin/Member), member removal, admin can revoke any member's API keys and set per-key rate limits (RPM/TPM), and dedicated admin management pages for members, provider keys, API keys, and budgets. Team creation/grouping beyond roles is Phase 5 scope.

</domain>

<decisions>
## Implementation Decisions

### OAuth integration
- Add Google OAuth and GitHub OAuth as login options alongside existing email/password
- Login page shows 3 options: Google, GitHub, email/password (existing)
- Account linking by email: if user signs up with OAuth and email matches an existing account, link them automatically
- If OAuth user has no existing account, create one — skip email verification since OAuth provider already verified
- Store OAuth provider + provider user ID in a new `app_oauth_accounts` table linked to `app_users`
- Session management unchanged — OAuth just provides an alternative authentication path into the same session system

### Member invitation flow
- Admin/Owner sends invite from Members page: enter email + select role (Member/Admin)
- Invite email sent via existing Nodemailer infrastructure with a unique invite token
- If invitee has an existing account: clicking link adds them to the org with assigned role
- If invitee doesn't have an account: clicking link goes to signup page with org pre-linked — after signup, auto-joined to org
- Pending invitations shown in Members page with "Pending" badge and option to revoke
- Invite tokens expire after 7 days
- New `app_org_invitations` table: id, org_id, email, role, token, invited_by, expires_at, accepted_at

### Admin management pages
- Activate "Members" sidebar link (currently placeholder, "Coming in Phase 4")
- 4 dedicated management pages, all under `/org/[slug]/`:
  1. **Members** (`/members`) — table of all org members with name, email, role, joined date, usage this month; actions: change role, remove member, view member's keys
  2. **Provider Keys** — already exists from Phase 2, add admin-only actions if missing
  3. **API Keys** (`/api-keys`) — extend existing page: admin sees ALL org members' keys (not just their own), can revoke any key, can edit rate limits
  4. **Budgets** — already exists from Phase 3 (budget panel + defaults form), no changes needed
- Admin dashboard (`/dashboard`) — extend with org-wide usage KPIs from Phase 3 data, quick links to management pages
- Role-based access control: Members page and admin actions only visible to admin/owner roles

### Per-key rate limits
- RPM (requests per minute) and TPM (tokens per minute) fields on API key creation and edit forms
- Both fields optional — if unset, inherit org-wide defaults
- Org-wide default rate limits configurable in org settings (admin only)
- Enforcement: in-memory sliding window counter in SvelteKit process (single-instance deployment)
- When rate limit hit: HTTP 429 with OpenAI-compatible response + `Retry-After` header + `X-RateLimit-*` headers (Limit, Remaining, Reset)
- Error format: `{error: {message: 'Rate limit exceeded', type: 'rate_limit_exceeded'}}`
- Rate limit columns added to `app_api_keys` table: `rpm_limit` (integer, nullable) and `tpm_limit` (integer, nullable)
- Org-wide defaults stored in `app_organizations` table: `default_rpm_limit` and `default_tpm_limit` columns

### Claude's Discretion
- OAuth library choice (Arctic, custom, or SvelteKit auth adapter)
- Exact in-memory rate limiter data structure (sliding window vs fixed window)
- Members page sorting and filtering UX
- Admin dashboard KPI card selection and layout
- Invite email template design
- Rate limit header calculation precision

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in:

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-03, AUTH-04, ORG-02, ORG-03, ORG-04, AKEY-03, AKEY-05, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05

### Prior phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Auth system (sessions, password hashing, email verification), org model, sidebar layout, Nodemailer email infrastructure
- `.planning/phases/02-core-gateway/02-CONTEXT.md` — Provider key management, API key system (show-once, SHA-256 hashed), gateway routing
- `.planning/phases/03-usage-budget-controls/03-CONTEXT.md` — Usage logging, dashboard charts, budget system with role-based defaults

### Key implementation files
- `src/lib/server/auth/session.ts` — Session management to extend with OAuth paths
- `src/lib/server/db/schema.ts` — Existing 10 Drizzle tables, add app_oauth_accounts, app_org_invitations, rate limit columns
- `src/lib/components/layout/Sidebar.svelte` — Members link placeholder to activate
- `src/routes/org/[slug]/api-keys/` — Existing API key page to extend with admin view + rate limits
- `src/routes/org/[slug]/dashboard/` — Dashboard page to extend with admin KPIs
- `src/lib/server/gateway/proxy.ts` — Gateway proxy to add rate limit enforcement
- `src/lib/server/auth/email.ts` — Email infrastructure to extend with invitation template

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/server/auth/session.ts`: Custom session management (Lucia patterns) — extend with OAuth login path
- `src/lib/server/auth/email.ts` + `src/lib/server/auth/emails/`: Nodemailer infrastructure with HTML templates — add invite email
- `src/lib/components/layout/Sidebar.svelte`: Members nav item already present but disabled (`active: false`) — just flip to true
- `src/routes/org/[slug]/api-keys/`: Existing API key CRUD — extend with admin view showing all members' keys
- `src/lib/components/budget/BudgetPanel.svelte`: Slide-out panel pattern — reuse for member detail/key management
- `src/lib/server/gateway/budget.ts`: Budget check pattern in gateway — add rate limit check similarly

### Established Patterns
- Drizzle ORM with postgres.js driver, all tables use app_ prefix
- SvelteKit form actions for CRUD operations
- Slide-out panels for detail/edit views (provider keys, budgets)
- Fire-and-forget DB writes for non-blocking operations (gateway auth)
- Role check: `appOrgMembers` table with role column ('owner' | 'admin' | 'member')
- Tailwind CSS with zinc-950/zinc-900/blue-600 color palette

### Integration Points
- Auth routes (`src/routes/auth/`) — add OAuth callback routes
- Gateway proxy (`src/lib/server/gateway/proxy.ts`) — add rate limit check before forwarding
- Sidebar — activate Members link
- Dashboard — add admin KPI section
- API key creation form — add RPM/TPM fields
- Members page — new route `/org/[slug]/members/`

</code_context>

<specifics>
## Specific Ideas

- Members page should feel like GitHub's organization member list — clean table with role badges
- OAuth buttons should look like standard "Continue with Google/GitHub" buttons — recognizable, not custom
- Rate limit headers should match OpenAI's format exactly so IDE tools handle 429s correctly
- Admin view of API keys should clearly distinguish "your keys" from "other members' keys"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-dashboard-team-management*
*Context gathered: 2026-03-16*
