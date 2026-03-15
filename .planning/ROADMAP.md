# Roadmap: LLMTokenHub

## Overview

LLMTokenHub goes from zero to a multi-tenant LLM API gateway SaaS in five phases. We start with authentication and organization scaffolding, then build the core product loop (BYO keys + member API keys + proxy), add usage tracking and budget controls, build out the full dashboard and team management experience, and finish with advanced gateway features and self-host packaging. Each phase delivers a coherent, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth system, org creation, database schema, LiteLLM integration scaffolding
- [ ] **Phase 2: Core Gateway** - BYO provider keys, member API keys, OpenAI-compatible proxy endpoint
- [ ] **Phase 3: Usage & Budget Controls** - Request logging, cost tracking dashboards, spend limits and alerts
- [ ] **Phase 4: Dashboard & Team Management** - Full admin dashboard, member invitations, roles, OAuth providers
- [ ] **Phase 5: Advanced Gateway & Launch** - Smart routing, fallbacks, caching, self-host package, landing page

## Phase Details

### Phase 1: Foundation
**Goal**: A user can create an account, create an organization, and see their org dashboard -- the multi-tenant skeleton is working end-to-end with LiteLLM's data model
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-05, ORG-01, ORG-05
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password and land on a logged-in dashboard
  2. User session persists across browser refreshes and restarts
  3. User can create a new organization and is automatically its owner
  4. User can view their organization dashboard (even if empty)
  5. User can reset a forgotten password via email link
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — SvelteKit scaffold and database schema
- [ ] 01-02-PLAN.md — Complete auth system (signup, login, sessions, email verification, password reset)
- [ ] 01-03-PLAN.md — Organization creation, LiteLLM integration, app layout shell with dashboard, sidebar, and org switcher

### Phase 2: Core Gateway
**Goal**: An org admin can add their LLM provider API keys, members can generate personal API keys, and those keys work with Cursor/Continue.dev/Claude Code via OpenAI-compatible endpoints
**Depends on**: Phase 1
**Requirements**: PKEY-01, PKEY-02, PKEY-03, PKEY-04, PKEY-05, AKEY-01, AKEY-02, AKEY-04, GW-01, GW-02, GW-03, GW-04, GW-05
**Success Criteria** (what must be TRUE):
  1. Admin can add, update, and remove provider API keys (including China model providers) and keys are encrypted at rest
  2. Admin can validate a submitted provider key works before saving it
  3. Member can create and revoke personal API keys scoped to their organization
  4. A member's API key successfully authenticates a streaming chat completion request to /v1/chat/completions with tool use
  5. The /v1/embeddings and /v1/models endpoints work with member API keys
**Plans**: 3 plans

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Usage & Budget Controls
**Goal**: Admins have full visibility into team spending and can set hard/soft budget limits that automatically enforce themselves
**Depends on**: Phase 2
**Requirements**: TRACK-01, TRACK-02, TRACK-03, TRACK-04, TRACK-05, BUDG-01, BUDG-02, BUDG-03, BUDG-04, BUDG-05
**Success Criteria** (what must be TRUE):
  1. Every API request logs token counts, cost, model used, and timestamp
  2. Dashboard shows per-member and per-team cost breakdowns with daily/monthly trend charts
  3. Dashboard displays model pricing and context window information
  4. Admin can set hard spend limits (requests rejected when exceeded) and soft limits (alerts but allowed) per member and per team
  5. Budgets reset on a configurable monthly cycle and members receive notifications when approaching their limit
**Plans**: 3 plans

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Dashboard & Team Management
**Goal**: The full admin experience is complete -- org owners can invite members, manage roles, and access all management pages; users can log in via Google/GitHub OAuth
**Depends on**: Phase 3
**Requirements**: AUTH-03, AUTH-04, ORG-02, ORG-03, ORG-04, AKEY-03, AKEY-05, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. User can log in via Google OAuth or GitHub OAuth
  2. Org owner can invite members via email, assign roles (Owner/Admin/Member), and admins can remove members
  3. Admin can revoke any member's API keys and set per-key rate limits (RPM/TPM)
  4. Admin dashboard shows org-wide usage overview, and dedicated management pages exist for members, provider keys, API keys, and budgets
**Plans**: 3 plans

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Advanced Gateway & Launch
**Goal**: The gateway is production-hardened with smart routing, fallbacks, and caching; the product is packaged for self-hosting and has a landing page
**Depends on**: Phase 4
**Requirements**: GW-06, GW-07, GW-08, GW-09, GW-10, SHIP-01, SHIP-02, SHIP-03, SHIP-04
**Success Criteria** (what must be TRUE):
  1. Gateway auto-retries on provider errors (429/500/503) and falls back to alternative providers when primary is down
  2. Smart routing selects cheaper models for simple queries and expensive models for complex ones
  3. Semantic caching returns cached responses for similar queries and load balancing distributes across multiple keys for the same provider
  4. A company can deploy LLMTokenHub via docker-compose with a configuration guide and have it working end-to-end
  5. A landing page explains the product value proposition and integration docs cover Cursor, Continue.dev, and Claude Code setup
**Plans**: 3 plans

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Core Gateway | 0/3 | Not started | - |
| 3. Usage & Budget Controls | 0/2 | Not started | - |
| 4. Dashboard & Team Management | 0/3 | Not started | - |
| 5. Advanced Gateway & Launch | 0/3 | Not started | - |
