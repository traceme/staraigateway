# Phase 1: Foundation - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Auth system (email/password + session persistence + password reset), organization creation, org dashboard skeleton, database schema with LiteLLM integration scaffolding. OAuth (Google/GitHub) and member invitations are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Onboarding flow
- After signup + email verification, user lands on "Create Organization" page
- No empty dashboard state before org — org creation is mandatory first step
- Org creation is a simple form: org name + optional description
- After org creation, redirect to org dashboard with onboarding checklist

### Organization model
- One user can belong to multiple organizations (switch between them)
- User who creates org is automatically Owner
- Org has: name, slug (URL-friendly), description (optional), created_at
- Org slug used in dashboard URLs: `/org/{slug}/dashboard`

### Dashboard skeleton
- Empty org dashboard shows onboarding checklist:
  1. "Add your first LLM provider key" (links to Phase 2 feature, disabled/greyed in Phase 1)
  2. "Invite team members" (links to Phase 4 feature, disabled/greyed in Phase 1)
  3. "Create an API key" (links to Phase 2 feature, disabled/greyed in Phase 1)
- Sidebar navigation with placeholder items for future pages
- Top bar: org name, org switcher dropdown, user avatar/menu

### Email system
- Nodemailer with SMTP configuration (works with any provider)
- Self-host: configurable SMTP settings in environment variables
- SaaS: use Resend or similar transactional email service
- Emails needed in Phase 1: verification, password reset
- Plain, clean HTML email templates (not fancy — functional)

### Auth implementation
- Custom session management following Lucia patterns (~200 lines)
- Sessions stored in PostgreSQL (app_sessions table)
- Session token in HTTP-only cookie
- Password hashing with Argon2id
- Email verification required before first login
- Password reset via time-limited token sent by email

### Database schema
- Drizzle ORM for SvelteKit app tables (prefixed `app_`)
- LiteLLM owns its own tables via Prisma-Python (read-only from SvelteKit)
- App tables: app_users, app_sessions, app_organizations, app_org_members, app_email_verifications, app_password_resets
- On org creation, also create corresponding LiteLLM Organization via management API

### Claude's Discretion
- Exact SvelteKit project structure and routing layout
- UI component library choice (Skeleton UI, Bits UI, or custom with Tailwind)
- Form validation approach (Superforms, custom, or zod-based)
- Exact email template design
- Loading states and error handling patterns
- Development tooling (Vitest, Playwright, etc.)

</decisions>

<specifics>
## Specific Ideas

- Dashboard should feel like a modern SaaS admin panel (think Linear, Vercel, or Clerk dashboard)
- Keep it minimal — no unnecessary chrome or decoration
- Org switcher in top-left like GitHub/Vercel organization switcher

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Open WebUI (`open-webui/`): SvelteKit patterns, Tailwind setup, component structure — reference for our SvelteKit app
- LiteLLM (`litellm/`): Prisma schema defines Organization/Team/User tables we'll integrate with via management API

### Established Patterns
- Open WebUI uses SvelteKit with Python FastAPI backend — we'll use SvelteKit with Node.js/edge runtime instead
- LiteLLM's `LiteLLM_OrganizationTable` has: budget_id, models[], organization_alias, metadata — we map to this on org creation

### Integration Points
- LiteLLM management API (`/organization/new`, `/organization/info`) for creating orgs
- Shared PostgreSQL database — Drizzle reads LiteLLM tables, writes only to app_* tables
- LiteLLM health endpoint (`/health`) for integration verification

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-15*
