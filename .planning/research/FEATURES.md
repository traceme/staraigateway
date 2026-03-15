# Feature Landscape

**Domain:** Multi-tenant LLM API Gateway SaaS (OpenRouter-like)
**Researched:** 2026-03-15
**Overall confidence:** MEDIUM (based on training data knowledge of OpenRouter, Portkey, Helicone, Unify, Keywords AI, LiteLLM hosted -- web verification was unavailable)

**Reference products analyzed:** OpenRouter.ai, Portkey.ai, Helicone.ai, Unify.ai, Keywords AI, LiteLLM hosted

---

## Table Stakes

Features users expect. Missing any of these and users will leave for a competitor.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **OpenAI-compatible API endpoint** (`/v1/chat/completions`, `/v1/embeddings`) | Every tool (Cursor, Continue.dev, Claude Code, LangChain) speaks this protocol. Non-negotiable. | Med | Must handle streaming (SSE), function calling, tool use, vision/multimodal inputs. Partial compatibility kills adoption. |
| **Multi-provider model catalog** | Users come specifically to access many models through one endpoint. OpenRouter has 200+ models. | Med | Need at minimum: OpenAI (GPT-4o, o1/o3), Anthropic (Claude 4/Sonnet), Google (Gemini 2.5), Meta (Llama), Mistral, DeepSeek. For China market: Qwen, GLM, Doubao, Yi. |
| **API key management** (create, revoke, view usage per key) | Users need programmatic access. Every competitor provides this. | Low | Standard CRUD. Must support multiple keys per user/org. |
| **Usage and cost tracking** (per-request logging, per-key/user/org aggregation) | Users cannot manage spend without visibility. OpenRouter, Portkey, Helicone all have this. | Med | Must show: token counts (input/output), cost in USD, model used, timestamp. Daily/monthly aggregation. |
| **Budget controls** (spend limits per key/user/team/org) | Companies will not adopt without spend guardrails. Hard requirement for enterprise. | Med | Hard limits (reject requests when exceeded) and soft limits (alert but allow). Monthly reset cycles. |
| **Organization/team management** | Multi-tenant is the whole product. Orgs with members, roles (admin/member), invites. | Med | Admin can see all usage, manage members, manage API keys for the org. |
| **Authentication** (email/password + OAuth) | Standard SaaS expectation. | Low | Google and GitHub OAuth minimum. SSO/SAML is a differentiator, not table stakes for SMB. |
| **Streaming support** (Server-Sent Events) | Chat applications require streaming for UX. Without it, responses feel broken. | Med | Must work correctly with all providers. Edge cases around error handling mid-stream are tricky. |
| **Request/response logging** | Debugging is impossible without logs. Helicone built their entire product around this. | Med | Store prompt, completion, latency, status code, error messages. Privacy: must allow opt-out or redaction. |
| **Rate limiting** | Protect upstream provider keys from abuse. Prevent single user from exhausting shared quota. | Med | Per-key, per-user, per-org limits. Configurable RPM/TPM. Return standard 429 with retry-after headers. |
| **Fallback/retry logic** | Provider outages are frequent (Anthropic, OpenAI both have multi-hour outages regularly). Users expect resilience. | Med | Auto-retry on 429/500/503. Fallback to alternative provider for same capability tier. |
| **Dashboard UI** | Users need a web interface to manage keys, view usage, configure settings. API-only is not enough for team admins. | High | SvelteKit dashboard per project constraints. Needs charts, tables, key management, member management. |
| **Model information** (pricing, context window, capabilities) | Users need to know what they're paying and what each model can do. OpenRouter's model page is a key feature. | Low | Expose pricing per 1M tokens (input/output), max context, supported features (vision, tools, etc.). |
| **BYO API keys** (org submits their own provider keys) | Core value prop per PROJECT.md. Without this, you're just another reseller. | Low | Secure storage (encrypted at rest), per-provider key management, validation on submit. |

---

## Differentiators

Features that set the product apart. Not expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **China model support** (DeepSeek, Qwen, GLM, Doubao, Yi, Moonshot) | OpenRouter has limited China model coverage. Massive gap for China-based teams. Per PROJECT.md, this is THE differentiator. | Med | LiteLLM already supports many. Need first-class UI treatment, not buried in a list. |
| **Smart model routing** (auto-select cheap vs expensive based on task complexity) | Most competitors make users choose manually. Automatic routing saves 50-80% per PRD. Unify.ai focuses on this. | High | Need quality/cost scoring. Start simple (keyword heuristics) before ML-based routing. Users must be able to override. |
| **Self-host package** (docker-compose one-click deploy) | Data sovereignty is non-negotiable for many Chinese enterprises and regulated industries. OpenRouter/Portkey are SaaS-only. | Med | Must work offline. Clear upgrade path. Config-as-code. Per PROJECT.md, this is a v1 differentiator. |
| **Semantic caching** (Redis-based, return cached responses for similar queries) | Cuts costs on repeated/similar queries. Portkey has this. Most competitors don't. | Med | LiteLLM has this built-in. Need UI to configure TTL, view cache hit rates, clear cache. |
| **Per-org isolated proxy** (serverless-style lightweight proxy per tenant) | Stronger security isolation than shared proxy. Prevents noisy-neighbor issues. | High | Per PROJECT.md architecture decision. Key for enterprise trust. Complex to implement well. |
| **Prompt/response guardrails** (content filtering, PII detection, custom rules) | Enterprise compliance requirement. Portkey has Guardrails. Most others don't. | High | Start with basic keyword blocking. PII detection is a separate phase. Integrate with external services (Lakera, etc.) or build simple. |
| **Cost optimization recommendations** (suggest cheaper models, alert on waste) | Unique value-add. No competitor does this well. The "CFO dashboard" for AI spend. | Med | Analyze usage patterns, suggest model downgrades for tasks that don't need flagship models. |
| **Load balancing across multiple keys for same provider** | Teams with multiple API keys for the same provider (different tiers, different billing). Spread load across them. | Low | LiteLLM supports this natively. Surface it in the UI. |
| **Webhook/alert system** (budget alerts, outage notifications, usage spikes) | Proactive notifications prevent surprise bills. Slack/email/webhook integrations. | Med | Budget threshold alerts are near-table-stakes. Webhook for automation is a differentiator. |
| **API playground** (test models in-browser) | OpenRouter has this. Speeds up evaluation. Low friction onboarding. | Med | Interactive chat interface for testing API calls. Not a full chat UI (that's out of scope per PROJECT.md). |
| **Audit log** (who did what, when, from where) | Enterprise compliance. Required for SOC2/HIPAA environments. | Med | Log all admin actions, key creations, config changes, member additions. Immutable. |
| **Provider health dashboard** (real-time status of upstream providers) | Users want to know which providers are currently healthy before routing decisions. | Low | Ping upstream health endpoints, show green/yellow/red status. |

---

## Anti-Features

Features to explicitly NOT build. These are tempting traps.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Built-in chat UI** | Per PROJECT.md: v1 is API + dashboard only. Users bring their own tools (Cursor, Continue.dev, etc.). Building a chat UI is a massive scope creep that competes with Open WebUI, LibreChat, and every other frontend. | Provide API playground for testing. Point users to Open WebUI for chat. |
| **API credit reselling / markup billing** | Per PROJECT.md: BYO keys only. Reselling adds massive complexity (payment processing, margin management, provider ToS compliance, credit systems, refunds). OpenRouter's model. | Focus on platform value (management, routing, observability) not API arbitrage. |
| **Model fine-tuning / hosting** | Per PROJECT.md: out of scope. Requires GPU infrastructure, completely different product. | Integrate with fine-tuned model endpoints that providers already offer. |
| **Mobile app** | Per PROJECT.md: web dashboard only. Mobile adds native dev complexity for a product used primarily by developers at desks. | Ensure dashboard is mobile-responsive. |
| **Real-time collaboration** | Per PROJECT.md: out of scope. Shared prompt editing, collaborative chat -- features for a different product category. | Keep it simple: users have their own keys, their own usage. |
| **Custom model marketplace** | Letting users publish/sell custom model configurations. Adds moderation burden, legal complexity, quality control problems. | Allow org admins to configure model aliases/routing rules for their team. |
| **Prompt management / prompt library** | Feature creep into the LangSmith/PromptLayer space. Different product entirely. | Keep prompts as pass-through. Users manage prompts in their own tools. |
| **Complex RBAC (5+ roles)** | Over-engineering. LibreChat only has ADMIN/USER and it works fine. Portkey has granular RBAC but most users don't need it. | Three roles maximum: Owner (billing, delete org), Admin (manage members, keys, settings), Member (use API, view own usage). |
| **Multi-region deployment orchestration** | SaaS with multi-region routing adds massive infrastructure complexity. Not needed for v1. | Single region SaaS. Self-host users handle their own region choice. |

---

## Feature Dependencies

```
Authentication ──→ Organization Management ──→ Member Management
                                            ──→ API Key Management
                                            ──→ Budget Controls

API Key Management ──→ Usage/Cost Tracking ──→ Cost Optimization Recommendations
                   ──→ Rate Limiting
                   ──→ Request/Response Logging ──→ Audit Log

Multi-Provider Model Catalog ──→ OpenAI-Compatible API Endpoint ──→ Streaming Support
                             ──→ Fallback/Retry Logic
                             ──→ Smart Model Routing
                             ──→ Load Balancing (multi-key)

BYO API Keys ──→ Provider Key Encryption/Storage ──→ Provider Health Dashboard

Dashboard UI (depends on all of the above for display)

Self-Host Package (depends on all core features being containerized)
```

Key insight: The dependency chain starts from **Auth + Org Management** and **Multi-Provider API Endpoint**. These two tracks can be built in parallel and converge at the Dashboard.

---

## MVP Recommendation

### Must Have for Launch (Phase 1-2)

Prioritize in this order:

1. **OpenAI-compatible API endpoint** with streaming -- this is the product's core. If the API doesn't work flawlessly with Cursor/Continue.dev/Claude Code, nothing else matters.
2. **Auth + Org + Member management** -- multi-tenant is the product identity.
3. **BYO API key management** -- the core value prop. Orgs submit keys, members use them.
4. **API key generation per member** -- members need their own keys to use in tools.
5. **Usage and cost tracking** -- visibility is the #2 reason (after cost savings) that teams adopt this.
6. **Budget controls** -- hard/soft spend limits per member/team.
7. **Dashboard UI** -- management interface for all of the above.
8. **Rate limiting** -- protect provider keys from abuse.
9. **Fallback/retry** -- basic resilience.
10. **China model support** -- if targeting China market from day 1, this is MVP.

### Defer to v2

- **Smart model routing** (complex to get right, start with manual model selection): Phase 3
- **Semantic caching**: Phase 3 (nice-to-have optimization)
- **Guardrails**: Phase 3-4 (enterprise feature)
- **Self-host package**: Phase 2-3 (needs core features stable first, but should be architected for from day 1)
- **Cost optimization recommendations**: Phase 4
- **Audit log**: Phase 3-4
- **API playground**: Phase 2-3
- **Webhook/alert system**: Phase 3

### Why This Order

The first users care about: (1) does the API work with my tools, (2) can I manage my team's access, (3) can I see what we're spending. Everything else is optimization. Ship the core loop first, then layer on intelligence (routing, caching, guardrails).

---

## Competitive Positioning Matrix

| Feature | OpenRouter | Portkey | Helicone | Unify | Keywords AI | LLMTokenHub (target) |
|---------|-----------|---------|----------|-------|-------------|---------------------|
| Multi-provider API | Yes (200+ models) | Yes (via gateway) | No (observability only) | Yes (focus on routing) | Yes | Yes (100+ via LiteLLM) |
| BYO API keys | No (reseller model) | Yes | Yes (proxy mode) | No | Partial | **Yes (core value)** |
| Self-host option | No | No | Yes (open-source) | No | No | **Yes (core differentiator)** |
| China models | Limited | Limited | N/A | Limited | Limited | **First-class support** |
| Smart routing | Basic (model selection) | Yes (conditional routing) | No | **Yes (core product)** | Basic | Yes (via LiteLLM) |
| Observability/logging | Basic | **Yes (deep)** | **Yes (core product)** | Basic | **Yes (deep)** | Basic (v1), expand later |
| Guardrails | No | **Yes** | No | No | No | Later phase |
| Cost tracking | Yes | Yes | **Yes** | Yes | **Yes** | Yes |
| Budget controls | No (pay-as-you-go) | Yes | No | No | Yes | **Yes (core feature)** |
| Team management | Basic | Yes | Yes | Basic | Yes | **Yes (core feature)** |
| Caching | No | Yes | No | No | No | Yes (Redis via LiteLLM) |

**LLMTokenHub's niche:** BYO keys + self-host + China models + team budget controls. This is a combination no competitor offers. OpenRouter is closest in API gateway function but is a reseller model (no BYO keys). Portkey is closest in feature set but is SaaS-only and enterprise-priced.

---

## Sources

- PROJECT.md (project context and constraints)
- prd.md (cost optimization strategy, architecture, deployment patterns)
- Training data knowledge of OpenRouter.ai, Portkey.ai, Helicone.ai, Unify.ai, Keywords AI (MEDIUM confidence -- web verification was unavailable during research)
- LiteLLM feature knowledge from codebase reference and training data (HIGH confidence -- codebase is present in repo)
