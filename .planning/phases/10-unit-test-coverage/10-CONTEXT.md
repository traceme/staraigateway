# Phase 10: Unit Test Coverage - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Add unit tests covering all server-side business logic: gateway modules (auth, budget, rate-limit, usage, proxy flow), auth flows (signup, login, session, OAuth, password reset), and member management (invite, accept, remove, role change). No new features — only test files co-located with source modules.

</domain>

<decisions>
## Implementation Decisions

### Test scope & depth (TEST-01, TEST-02, TEST-03)
- Cover happy path, error cases, and boundary values for every module
- Gateway modules (TEST-01): auth.ts, budget.ts, rate-limit.ts, usage.ts, proxy flow — each gets a co-located `.test.ts`
- Auth flows (TEST-02): signup, login, session validation, OAuth linking, password reset — verify correct behavior and security constraints (duplicate email rejected, expired token rejected)
- Member management (TEST-03): invite, accept, remove, role change — success paths and edge cases (duplicate invite, expired token, removing last owner)
- Existing tests (cache.test.ts, load-balancer.test.ts, routing.test.ts, proxy.test.ts) count toward coverage — don't rewrite, extend if gaps exist

### Mocking strategy
- Use `vi.mock()` for all external dependencies (DB, Redis, SMTP, crypto)
- Mock DB at the drizzle level — mock `db.select()`, `db.insert()`, `db.update()`, `db.delete()` chains
- Mock Redis via existing pattern: `vi.mock('$lib/server/redis')` with `getRedis` returning a mock object
- Mock `$env/dynamic/private` via existing `src/lib/server/__mocks__/env.ts` — set env vars per test as needed
- Mock `nodemailer` for email tests — verify `sendMail` called with correct args, don't actually send
- Mock `@node-rs/argon2` for password tests — fast hash/verify stubs
- No dependency injection refactoring — use vi.mock to intercept imports as the codebase already does

### Test data approach
- Inline test data per test — no shared fixture files
- Create small helper factories where repetitive (e.g., `makeGatewayAuth()`, `makeMember()`) — co-locate in each test file, not shared across files
- Keep test data minimal — only fields the test actually checks

### Coverage enforcement
- No coverage threshold enforcement in this phase (that's Phase 11 — TEST-08)
- Focus on writing comprehensive tests, not hitting a number
- All new test files follow co-located pattern: `module.test.ts` next to `module.ts`

### Claude's Discretion
- Exact test helper factory shapes
- Order of test file creation within plans
- Whether to split by module domain (gateway vs auth vs members) or by test complexity
- Specific edge cases to prioritize beyond what requirements specify

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Test requirements
- `.planning/REQUIREMENTS.md` — TEST-01, TEST-02, TEST-03 requirement definitions

### Existing test patterns
- `src/lib/server/gateway/cache.test.ts` — Reference test: vi.mock pattern, describe/it structure, assertion style
- `src/lib/server/gateway/load-balancer.test.ts` — Reference test: pure function testing
- `src/lib/server/gateway/routing.test.ts` — Reference test: routing logic
- `src/lib/server/gateway/proxy.test.ts` — Reference test: complex module with mocks
- `src/lib/server/__mocks__/env.ts` — Existing env mock for `$env/dynamic/private`

### Test infrastructure
- `vitest.config.ts` — Test config: `$lib` alias, env mock alias, include pattern
- `.planning/codebase/CONVENTIONS.md` — Naming conventions, error handling patterns

### Source modules to test
- `src/lib/server/gateway/auth.ts` — Gateway API key auth (TEST-01)
- `src/lib/server/gateway/budget.ts` — Budget check with cascade (TEST-01)
- `src/lib/server/gateway/rate-limit.ts` — In-memory sliding window (TEST-01)
- `src/lib/server/gateway/usage.ts` — Usage logging + snapshot update (TEST-01)
- `src/lib/server/auth/session.ts` — Session create/validate/invalidate (TEST-02)
- `src/lib/server/auth/password.ts` — Password hash/verify (TEST-02)
- `src/lib/server/auth/validation.ts` — Input validation schemas (TEST-02)
- `src/lib/server/auth/email.ts` — Email sending (TEST-02)
- `src/lib/server/members.ts` — Member CRUD + invitations (TEST-03)
- `src/lib/server/api-keys.ts` — API key CRUD (TEST-01)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vitest.config.ts`: Already configured with `$lib` and `$env` aliases — no setup needed
- `src/lib/server/__mocks__/env.ts`: Env mock — extend per-test by assigning to `env` object
- 4 existing gateway test files: Demonstrate the project's established test patterns

### Established Patterns
- `vi.mock()` at top of file for module mocking
- `vi.mocked()` to type mock functions
- `describe`/`it` blocks with descriptive names
- `beforeEach` for mock reset (`vi.clearAllMocks()` or `mockGetRedis.mockReturnValue(null)`)
- No `afterAll` cleanup needed — vitest handles isolation
- Co-located test files: `module.test.ts` next to `module.ts`

### Integration Points
- All tests run via `npx vitest run` — no separate test runner
- Path aliases resolve correctly in vitest via `vitest.config.ts`
- `$env/dynamic/private` mock intercepts all env access in tests

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user deferred all decisions to Claude's discretion. Standard unit testing approaches apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-unit-test-coverage*
*Context gathered: 2026-03-17*
