# Requirements: LLMTokenHub

**Defined:** 2026-03-16
**Core Value:** Any company can sign up, plug in their LLM API keys, and immediately give their entire team controlled, budget-tracked access to AI models.

## v1.1 Requirements

Requirements for production hardening release. Each maps to roadmap phases.

### Testing

- [ ] **TEST-01**: Unit tests cover all gateway modules (auth, budget, rate-limit, usage, proxy flow)
- [ ] **TEST-02**: Unit tests cover auth flows (signup, login, session, OAuth, password reset)
- [ ] **TEST-03**: Unit tests cover member management (invite, accept, remove, role change)
- [ ] **TEST-04**: Integration tests verify DB queries (Drizzle ORM with test database)
- [ ] **TEST-05**: E2E tests cover critical user flows (signup → org → API key → gateway request)
- [ ] **TEST-06**: E2E tests cover budget enforcement flow (set limit → exceed → rejection)
- [ ] **TEST-07**: Load testing validates gateway throughput under concurrent requests
- [ ] **TEST-08**: Coverage threshold enforced (80%+ for server modules)

### Security

- [ ] **SEC-01**: OAuth account linking requires password confirmation or email challenge before linking
- [ ] **SEC-02**: Gateway CORS restricted to configurable allowlist (not wildcard)
- [ ] **SEC-03**: Session cookies set `Secure` flag when deployed behind HTTPS
- [ ] **SEC-04**: Request body size limit enforced on `/v1/*` endpoints
- [ ] **SEC-05**: Invitation tokens separated from record IDs (use `randomBytes(32)`)
- [ ] **SEC-06**: `.env.example` placeholders are empty with generation instructions (no default secrets)

### Performance

- [ ] **PERF-01**: Gateway auth result cached in Redis with short TTL (reduce per-request DB queries)
- [ ] **PERF-02**: Budget spend uses rolling snapshot instead of full log scan
- [ ] **PERF-03**: Email transporter is a lazy singleton (not recreated per send)
- [ ] **PERF-04**: Cache key normalization fixed (no false collisions on whitespace differences)
- [ ] **PERF-05**: Budget notification queries batched (fix N+1 in `resolveMemberBudgets`)

### Tech Debt

- [ ] **DEBT-01**: Remove dead exports (`validateApiKeyFromHash`, `decryptProviderKeyById`, `checkLiteLLMHealth`)
- [ ] **DEBT-02**: Extract shared `getBudgetResetDate` to `budget/utils.ts`
- [x] **DEBT-03**: Invitation acceptance wrapped in DB transaction
- [ ] **DEBT-04**: Env var names standardized (`APP_URL` vs `BASE_URL`), `CRON_SECRET` added to `.env.example`
- [ ] **DEBT-05**: `models` field migrated from JSON text to proper `jsonb` column
- [x] **DEBT-06**: Session cleanup cron (prune expired sessions)
- [x] **DEBT-07**: DB connection pool explicitly configured (pool size, timeouts)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enterprise Auth

- **EAUTH-01**: SSO/SAML integration for enterprise identity providers
- **EAUTH-02**: SCIM 2.0 user provisioning

### Advanced Observability

- **OBS-01**: Full request/response logging with prompt content
- **OBS-02**: Audit log of all admin actions (immutable)
- **OBS-03**: Webhook/alert system for budget alerts and outage notifications

### Advanced Features

- **ADV-01**: API playground for testing models in-browser
- **ADV-02**: Prompt/response guardrails (content filtering, PII detection)
- **ADV-03**: Cost optimization recommendations (suggest cheaper models)
- **ADV-04**: Provider health dashboard (real-time upstream status)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-instance rate limiting (Redis) | Single instance for now; revisit when horizontal scaling needed |
| Usage log partitioning/archival | Table size acceptable for v1.1 scale; address in v2 |
| Built-in chat UI | API + dashboard only, users bring their own tools |
| Reselling API access | BYO keys only, no markup/billing |
| Mobile app | Web dashboard only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | Phase 7 | Pending |
| DEBT-02 | Phase 7 | Pending |
| DEBT-03 | Phase 7 | Complete |
| DEBT-04 | Phase 7 | Pending |
| DEBT-05 | Phase 7 | Pending |
| DEBT-06 | Phase 7 | Complete |
| DEBT-07 | Phase 7 | Complete |
| SEC-01 | Phase 8 | Pending |
| SEC-02 | Phase 8 | Pending |
| SEC-03 | Phase 8 | Pending |
| SEC-04 | Phase 8 | Pending |
| SEC-05 | Phase 8 | Pending |
| SEC-06 | Phase 8 | Pending |
| PERF-01 | Phase 9 | Pending |
| PERF-02 | Phase 9 | Pending |
| PERF-03 | Phase 9 | Pending |
| PERF-04 | Phase 9 | Pending |
| PERF-05 | Phase 9 | Pending |
| TEST-01 | Phase 10 | Pending |
| TEST-02 | Phase 10 | Pending |
| TEST-03 | Phase 10 | Pending |
| TEST-04 | Phase 11 | Pending |
| TEST-05 | Phase 11 | Pending |
| TEST-06 | Phase 11 | Pending |
| TEST-07 | Phase 11 | Pending |
| TEST-08 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
