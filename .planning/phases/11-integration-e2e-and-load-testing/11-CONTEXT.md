# Phase 11: Integration, E2E, and Load Testing - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify the full application end-to-end with automated tests and enforced coverage thresholds. Integration tests against real PostgreSQL, E2E tests for critical user journeys, load tests for gateway throughput, and 80%+ coverage enforcement. No new features — only test infrastructure and test files.

</domain>

<decisions>
## Implementation Decisions

### DB integration tests (TEST-04)
- Use Docker Compose to spin up a test PostgreSQL instance (`docker compose -f docker-compose.test.yml up -d`)
- Create a lightweight `docker-compose.test.yml` with just PostgreSQL (no Redis, no app server)
- Tests connect via `DATABASE_URL` env var pointing to the test database
- Run Drizzle migrations before test suite (`drizzle-kit push` or migrate programmatically)
- Each test file gets a fresh transaction that rolls back after — no cross-test contamination
- Test key Drizzle operations: insert, update, select, join across core tables (users, orgs, api_keys, usage_log, budgets)
- Integration test files go in `src/lib/server/__integration__/` directory (separate from unit tests)
- Vitest config gets a separate project or workspace for integration tests with longer timeout

### E2E test approach (TEST-05, TEST-06)
- E2E tests run against a real SvelteKit server started in test mode
- Use `node build` + start the server programmatically, or use SvelteKit's preview mode
- HTTP requests via native `fetch` — no browser automation needed (API-level E2E, not UI E2E)
- Test database seeded with known state before each E2E suite
- Real PostgreSQL (same Docker Compose as integration tests), mock external LLM providers via intercepted fetch
- TEST-05 journey: signup → create org → add provider key → generate API key → gateway request → valid response
- TEST-06 journey: create org with budget → make requests until budget exhausted → verify rejection
- E2E test files go in `src/__e2e__/` directory
- Mock the upstream LLM provider response (don't make real API calls) — intercept at the `fetch` level in proxy

### Load test tooling & targets (TEST-07)
- Use `autocannon` (Node.js, zero external deps, scriptable) for load testing
- Load test script in `scripts/load-test.ts` — not part of vitest suite
- Target: gateway `/v1/chat/completions` endpoint with a valid API key
- Mock upstream provider to return instant responses (test gateway overhead, not provider latency)
- Throughput target: 100 concurrent connections, 1000 requests total
- p95 latency threshold: < 200ms for gateway processing (excluding upstream)
- Error rate threshold: 0% non-mocked errors
- Run via `npx tsx scripts/load-test.ts` — outputs pass/fail with metrics summary
- Not integrated into `npm run test` (load tests are opt-in, not CI-blocking)

### Coverage threshold (TEST-08)
- Configure in `vitest.config.ts` using `coverage.thresholds`
- 80% threshold on lines and functions for `src/lib/server/**` modules
- `npm run test` includes `--coverage` flag and fails if below threshold
- Exclude test files, mocks, and type-only files from coverage calculation
- Existing 14 unit test files + new integration tests contribute to coverage

### Claude's Discretion
- Exact Docker Compose test configuration
- Transaction rollback implementation details
- E2E server startup mechanism (preview vs build)
- Specific tables and operations to test in integration tests
- Load test script structure and output format
- Which files to exclude from coverage calculation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Test requirements
- `.planning/REQUIREMENTS.md` — TEST-04, TEST-05, TEST-06, TEST-07, TEST-08 requirement definitions

### Existing test patterns
- `src/lib/server/gateway/cache.test.ts` — Reference: vi.mock pattern, describe/it structure
- `src/lib/server/gateway/proxy.test.ts` — Reference: complex module with fetch mocks
- `src/lib/server/__mocks__/env.ts` — Existing env mock for `$env/dynamic/private`
- `.planning/codebase/TESTING.md` — Full testing patterns documentation

### Test infrastructure
- `vitest.config.ts` — Current test config (needs coverage threshold additions)
- `docker-compose.yml` — Existing Docker Compose (reference for test variant)
- `.env.example` — DATABASE_URL format for PostgreSQL connection

### Source modules under test
- `src/lib/server/db/schema.ts` — Drizzle schema (tables for integration tests)
- `src/lib/server/db/index.ts` — DB connection setup
- `src/routes/v1/chat/completions/+server.ts` — Gateway endpoint (E2E target)
- `src/routes/v1/embeddings/+server.ts` — Embeddings endpoint (E2E target)
- `src/routes/api/auth/` — Auth endpoints (E2E signup/login)

### Prior phase context
- `.planning/phases/10-unit-test-coverage/10-CONTEXT.md` — Phase 10 mocking strategy and test data approach

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vitest.config.ts`: Already configured with `$lib` and `$env` aliases — extend for integration/coverage
- `@vitest/coverage-v8`: Already installed as devDependency — just needs threshold config
- `docker-compose.yml`: Existing PostgreSQL service — derive test variant from it
- 14 existing unit test files: Establish patterns for describe/it/mock structure
- `src/lib/server/__mocks__/env.ts`: Env mock — reusable in integration tests too

### Established Patterns
- `vi.mock()` at top of file for module mocking (unit tests)
- `globalThis.fetch` patching for HTTP mock (proxy.test.ts) — reusable for E2E provider mocking
- Co-located test files: `module.test.ts` next to `module.ts`
- `beforeEach(() => vi.clearAllMocks())` for mock reset

### Integration Points
- Integration tests connect directly to Drizzle DB (same `db` export as app)
- E2E tests hit SvelteKit server routes via HTTP fetch
- Load tests hit the running server's `/v1/chat/completions` endpoint
- Coverage config integrates into existing `vitest.config.ts`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user deferred all decisions to Claude's discretion. Standard testing approaches apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-integration-e2e-and-load-testing*
*Context gathered: 2026-03-17*
