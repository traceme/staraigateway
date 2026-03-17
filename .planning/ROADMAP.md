# Roadmap: LLMTokenHub

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-16) — [Archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Production Hardening** — Phases 7-11 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-16</summary>

- [x] Phase 1: Foundation (3/3 plans) — Auth system, org creation, database schema — completed 2026-03-15
- [x] Phase 2: Core Gateway (3/3 plans) — BYO provider keys, member API keys, OpenAI-compatible proxy — completed 2026-03-15
- [x] Phase 3: Usage & Budget Controls (3/3 plans) — Request logging, cost dashboards, spend limits — completed 2026-03-16
- [x] Phase 4: Dashboard & Team Management (3/3 plans) — Admin dashboard, member invitations, roles, OAuth — completed 2026-03-16
- [x] Phase 5: Advanced Gateway & Launch (4/4 plans) — Smart routing, fallbacks, caching, self-host, landing page — completed 2026-03-16
- [x] Phase 6: Gap Closure (1/1 plan) — Notification triggers, cron digest, LiteLLM in docker-compose — completed 2026-03-16

</details>

### v1.1 Production Hardening

**Milestone Goal:** Make LLMTokenHub production-ready with comprehensive test coverage, security audit, performance optimization, and tech debt cleanup before real users arrive.

- [x] **Phase 7: Tech Debt Cleanup** - Remove dead code, fix DRY violations, harden DB operations and configuration
- [x] **Phase 8: Security Hardening** - Fix auth vulnerabilities, restrict CORS, enforce request limits, secure tokens and secrets (completed 2026-03-17)
- [x] **Phase 9: Performance Optimization** - Cache gateway auth, optimize budget queries, fix cache collisions, batch notifications (completed 2026-03-17)
- [x] **Phase 10: Unit Test Coverage** - Unit tests for gateway, auth, and member management modules (completed 2026-03-17)
- [ ] **Phase 11: Integration, E2E, and Load Testing** - DB integration tests, critical flow E2E, load testing, coverage enforcement

## Phase Details

### Phase 7: Tech Debt Cleanup
**Goal**: Codebase is clean, consistent, and free of known debt before hardening work begins
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05, DEBT-06, DEBT-07
**Success Criteria** (what must be TRUE):
  1. No dead exports remain in gateway modules — importing removed functions causes a compile error
  2. `getBudgetResetDate` is defined in exactly one place and all consumers import from that single source
  3. Invitation acceptance either fully completes (member added AND invitation marked accepted) or fully rolls back on failure
  4. `.env.example` lists every required env var with consistent naming (`APP_URL` not `BASE_URL`), and `CRON_SECRET` is documented with generation instructions
  5. `models` field is stored as `jsonb` in PostgreSQL and no manual `JSON.parse` calls exist for that field in application code
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md — Remove dead exports, extract shared getBudgetResetDate, standardize .env.example
- [x] 07-02-PLAN.md — Transaction-wrap invitation acceptance, session cleanup cron, DB pool config
- [x] 07-03-PLAN.md — Migrate models field from text to jsonb, remove JSON.parse calls

### Phase 8: Security Hardening
**Goal**: All known security vulnerabilities are fixed and the gateway is safe for production traffic
**Depends on**: Phase 7
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. Linking a Google/GitHub OAuth account to an existing email/password account requires the user to confirm ownership (password or email challenge) before the link takes effect
  2. Gateway `/v1/*` endpoints reject CORS requests from origins not in the configured allowlist
  3. Session cookies include the `Secure` flag when the application detects it is running behind HTTPS
  4. Requests to `/v1/*` endpoints with bodies exceeding the configured size limit are rejected with a 413 before the body is parsed
  5. Invitation tokens are cryptographically random 256-bit values separate from the database record ID, and `.env.example` contains no default secret values
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — CORS allowlist, secure cookies, body size limit, invitation token upgrade, .env.example
- [ ] 08-02-PLAN.md — OAuth account linking verification with password confirmation page

### Phase 9: Performance Optimization
**Goal**: Gateway hot path is optimized with caching and efficient queries, reducing per-request DB overhead
**Depends on**: Phase 8
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05
**Success Criteria** (what must be TRUE):
  1. Repeated API requests with the same key hit Redis for auth instead of the database (second request issues zero auth-related DB queries)
  2. Budget spend calculation uses a rolling snapshot — not a full scan of all usage logs since the reset date
  3. Sending multiple emails in sequence reuses a single SMTP transport connection (no new `createTransport` call per send)
  4. Two requests whose message content differs only in internal whitespace produce different cache keys and return independent responses
  5. Budget notification for an org with N members executes a bounded number of queries (not N individual selects)
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md — Redis auth cache, budget rolling snapshot, cache key normalization fix
- [ ] 09-02-PLAN.md — SMTP transport lazy singleton, budget notification query batching

### Phase 10: Unit Test Coverage
**Goal**: All server-side business logic modules have unit tests covering normal, edge-case, and error behavior
**Depends on**: Phase 9
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Gateway modules (auth, budget, rate-limit, usage, proxy flow) each have a co-located `.test.ts` file with tests covering happy path, error cases, and boundary values
  2. Auth flows (signup, login, session validation, OAuth linking, password reset) have unit tests verifying correct behavior and security constraints (e.g., duplicate email rejected, expired token rejected)
  3. Member management (invite, accept, remove, role change) has unit tests covering success paths and edge cases (duplicate invite, expired token, removing the last owner)
**Plans**: 3 plans

Plans:
- [x] 10-01-PLAN.md — Unit tests for gateway rate-limit and usage modules (pure/near-pure functions)
- [x] 10-02-PLAN.md — Unit tests for gateway auth, budget, and api-keys modules (DB-heavy mocking)
- [x] 10-03-PLAN.md — Unit tests for auth flows (session, password, validation, email) and member management

### Phase 11: Integration, E2E, and Load Testing
**Goal**: The full application is verified end-to-end with automated tests and enforced coverage thresholds
**Depends on**: Phase 10
**Requirements**: TEST-04, TEST-05, TEST-06, TEST-07, TEST-08
**Success Criteria** (what must be TRUE):
  1. Integration tests run against a real test PostgreSQL database and verify Drizzle ORM queries return correct results for key operations (insert, update, select, join)
  2. An E2E test completes the full user journey: signup, create org, add provider key, generate API key, make a gateway request, and receive a valid response
  3. An E2E test verifies budget enforcement end-to-end: set a budget limit, exhaust it with requests, and confirm the gateway rejects the next request
  4. Load test demonstrates the gateway handles concurrent requests at target throughput without errors or p95 latency degradation beyond an acceptable threshold
  5. `npm run test` enforces 80%+ code coverage on server modules and fails if coverage drops below the threshold
**Plans**: 3 plans

Plans:
- [ ] 11-01-PLAN.md — Integration test infrastructure (Docker Compose test DB, vitest coverage thresholds) and Drizzle ORM DB integration tests
- [ ] 11-02-PLAN.md — E2E tests for user journey (signup-to-gateway) and budget enforcement (limit-to-rejection)
- [ ] 11-03-PLAN.md — Load test script with autocannon (100 connections, 1000 requests, p95 < 200ms threshold)

## Progress

**Execution Order:** 7 → 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-15 |
| 2. Core Gateway | v1.0 | 3/3 | Complete | 2026-03-15 |
| 3. Usage & Budget Controls | v1.0 | 3/3 | Complete | 2026-03-16 |
| 4. Dashboard & Team Management | v1.0 | 3/3 | Complete | 2026-03-16 |
| 5. Advanced Gateway & Launch | v1.0 | 4/4 | Complete | 2026-03-16 |
| 6. Gap Closure | v1.0 | 1/1 | Complete | 2026-03-16 |
| 7. Tech Debt Cleanup | v1.1 | Complete    | 2026-03-16 | 2026-03-17 |
| 8. Security Hardening | 1/2 | Complete    | 2026-03-17 | - |
| 9. Performance Optimization | 2/2 | Complete   | 2026-03-17 | - |
| 10. Unit Test Coverage | v1.1 | Complete    | 2026-03-17 | 2026-03-17 |
| 11. Integration, E2E, and Load Testing | v1.1 | 0/3 | Not started | - |
