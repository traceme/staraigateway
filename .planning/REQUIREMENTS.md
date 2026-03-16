# Requirements: LLMTokenHub

**Defined:** 2026-03-15
**Core Value:** Any company can sign up, plug in their LLM API keys, and immediately give their entire team controlled, budget-tracked access to AI models.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can create account with email and password
- [x] **AUTH-02**: User can log in and stay logged in across sessions
- [ ] **AUTH-03**: User can log in via Google OAuth
- [ ] **AUTH-04**: User can log in via GitHub OAuth
- [x] **AUTH-05**: User can reset password via email link

### Organization

- [x] **ORG-01**: User can create an organization
- [ ] **ORG-02**: Org owner can invite members via email
- [ ] **ORG-03**: Org owner can assign roles (Owner, Admin, Member)
- [ ] **ORG-04**: Admin can remove members from organization
- [x] **ORG-05**: Member can view their organization's dashboard

### Provider Keys (BYO)

- [x] **PKEY-01**: Admin can submit provider API keys (OpenAI, Anthropic, Google, etc.)
- [x] **PKEY-02**: Provider keys are encrypted at rest (AES-256-GCM)
- [x] **PKEY-03**: Admin can validate submitted keys against provider API
- [x] **PKEY-04**: Admin can add/remove/update provider keys
- [x] **PKEY-05**: Admin can submit China model provider keys (DeepSeek, Qwen, GLM, Doubao)

### API Keys (Member)

- [x] **AKEY-01**: Member can create personal API keys for their org
- [x] **AKEY-02**: Member can revoke their own API keys
- [ ] **AKEY-03**: Admin can revoke any member's API keys
- [x] **AKEY-04**: Each API key is scoped to one organization
- [ ] **AKEY-05**: Admin can set per-key rate limits (RPM/TPM)

### API Gateway

- [x] **GW-01**: API key authenticates requests to `/v1/chat/completions`
- [x] **GW-02**: API supports streaming responses via Server-Sent Events
- [x] **GW-03**: API passes through function calling / tool use parameters
- [x] **GW-04**: API supports `/v1/embeddings` endpoint
- [x] **GW-05**: API supports `/v1/models` endpoint listing available models
- [ ] **GW-06**: API auto-retries on provider 429/500/503 errors
- [ ] **GW-07**: API falls back to alternative provider when primary is down
- [ ] **GW-08**: Smart routing selects cheap model for simple tasks, expensive for complex
- [ ] **GW-09**: Semantic caching returns cached responses for similar queries (Redis)
- [ ] **GW-10**: Load balances across multiple API keys for same provider

### Usage & Cost Tracking

- [x] **TRACK-01**: Every request logs tokens (input/output), cost, model, and timestamp
- [x] **TRACK-02**: Dashboard shows per-member cost breakdown
- [x] **TRACK-03**: Dashboard shows per-team cost breakdown
- [x] **TRACK-04**: Dashboard shows daily and monthly usage trends with charts
- [x] **TRACK-05**: Dashboard displays model pricing and context window info

### Budget Controls

- [x] **BUDG-01**: Admin can set hard spend limit per member (reject when exceeded)
- [x] **BUDG-02**: Admin can set soft spend limit per member (alert but allow)
- [ ] **BUDG-03**: Admin can set per-team monthly budget
- [x] **BUDG-04**: Budgets reset on configurable monthly cycle
- [ ] **BUDG-05**: Members receive notification when approaching budget limit

### Dashboard

- [ ] **DASH-01**: Admin dashboard shows org-wide usage and cost overview
- [ ] **DASH-02**: Member management page (invite, roles, remove)
- [ ] **DASH-03**: Provider key management page (add, validate, remove)
- [ ] **DASH-04**: API key management page (create, revoke, view usage)
- [ ] **DASH-05**: Budget configuration page

### Self-Host & Launch

- [ ] **SHIP-01**: Docker-compose package for self-hosted deployment
- [ ] **SHIP-02**: Landing page explaining the product and value proposition
- [ ] **SHIP-03**: Integration docs for Cursor, Continue.dev, and Claude Code setup
- [ ] **SHIP-04**: Self-host configuration guide

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
| Built-in chat UI | v1 is API + dashboard only; users bring their own tools (Cursor, etc.) |
| API credit reselling / markup billing | BYO keys only; reselling adds payment processing complexity |
| Model fine-tuning / hosting | Requires GPU infrastructure, completely different product |
| Mobile app | Web dashboard only; ensure responsive design instead |
| Real-time collaboration | Shared prompts/chat — different product category |
| Custom model marketplace | Moderation burden, legal complexity |
| Prompt management / library | Feature creep into LangSmith/PromptLayer space |
| Complex RBAC (5+ roles) | Three roles sufficient: Owner, Admin, Member |
| Multi-region deployment | Single region SaaS for v1; self-host users choose their own region |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 4 | Pending |
| AUTH-04 | Phase 4 | Pending |
| AUTH-05 | Phase 1 | Complete |
| ORG-01 | Phase 1 | Complete |
| ORG-02 | Phase 4 | Pending |
| ORG-03 | Phase 4 | Pending |
| ORG-04 | Phase 4 | Pending |
| ORG-05 | Phase 1 | Complete |
| PKEY-01 | Phase 2 | Complete |
| PKEY-02 | Phase 2 | Complete |
| PKEY-03 | Phase 2 | Complete |
| PKEY-04 | Phase 2 | Complete |
| PKEY-05 | Phase 2 | Complete |
| AKEY-01 | Phase 2 | Complete |
| AKEY-02 | Phase 2 | Complete |
| AKEY-03 | Phase 4 | Pending |
| AKEY-04 | Phase 2 | Complete |
| AKEY-05 | Phase 4 | Pending |
| GW-01 | Phase 2 | Complete |
| GW-02 | Phase 2 | Complete |
| GW-03 | Phase 2 | Complete |
| GW-04 | Phase 2 | Complete |
| GW-05 | Phase 2 | Complete |
| GW-06 | Phase 5 | Pending |
| GW-07 | Phase 5 | Pending |
| GW-08 | Phase 5 | Pending |
| GW-09 | Phase 5 | Pending |
| GW-10 | Phase 5 | Pending |
| TRACK-01 | Phase 3 | Complete |
| TRACK-02 | Phase 3 | Complete |
| TRACK-03 | Phase 3 | Complete |
| TRACK-04 | Phase 3 | Complete |
| TRACK-05 | Phase 3 | Complete |
| BUDG-01 | Phase 3 | Complete |
| BUDG-02 | Phase 3 | Complete |
| BUDG-03 | Phase 3 | Pending |
| BUDG-04 | Phase 3 | Complete |
| BUDG-05 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| SHIP-01 | Phase 5 | Pending |
| SHIP-02 | Phase 5 | Pending |
| SHIP-03 | Phase 5 | Pending |
| SHIP-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*
