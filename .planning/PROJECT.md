# LLMTokenHub

## What This Is

A multi-tenant SaaS platform (like OpenRouter.ai) where companies create accounts, submit their own LLM provider API keys, and their team members generate personal API keys to access LLMs through a unified gateway. Built on LiteLLM as the proxy/routing layer, with a SvelteKit management dashboard. Also available as a self-hosted package for companies with data sovereignty requirements.

## Core Value

Any company can sign up, plug in their LLM API keys, and immediately give their entire team controlled, budget-tracked access to AI models — without per-seat subscriptions and without exposing real API keys to end users.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-tenant organization system (company signup, member invites, roles)
- [ ] BYO API key management (companies submit OpenAI, Anthropic, Google, China model keys)
- [ ] Per-member API key generation (members create personal keys to access LLMs)
- [ ] LiteLLM-based proxy routing (per-org serverless-style lightweight proxy)
- [ ] Usage & cost tracking dashboard (per-member token usage, cost by model, daily/monthly trends)
- [ ] Budget controls (per-member/per-team monthly spend limits with alerts)
- [ ] Member management (invite, assign admin/member roles, revoke access)
- [ ] API key management UI (create/revoke keys, view usage, set per-key rate limits)
- [ ] Auth system (email/password + OAuth via Google/GitHub)
- [ ] OpenAI-compatible API endpoint (works with Cursor, Continue.dev, Claude Code)
- [ ] Smart model routing (cheap models for simple tasks, expensive for complex)
- [ ] Fallback chains (auto-switch provider when one is down)
- [ ] Self-host package (docker-compose for companies to deploy themselves)
- [ ] Landing/marketing page

### Out of Scope

- Built-in chat UI — v1 is API + dashboard only, users bring their own tools (Cursor, etc.)
- Reselling API access — BYO keys only, no markup/billing on usage
- Mobile app — web dashboard only
- Real-time collaboration features
- Custom model fine-tuning or hosting

## Context

This project lives in a repo that already contains Open WebUI, LiteLLM, and LibreChat as subfolders for reference. The PRD (`prd.md`) describes the cost optimization strategy that drives this product — 80% of users' usage is below subscription break-even, making API pooling 40-60% cheaper than per-seat subscriptions.

The existing codebase provides reference implementations:
- **LiteLLM** (`litellm/`): The proxy engine we'll build on — Virtual Keys, cost tracking, 100+ provider support
- **Open WebUI** (`open-webui/`): Reference for SvelteKit patterns, user management, RAG
- **LibreChat** (`LibreChat/`): Reference for multi-provider API handling, TypeScript patterns

Key architectural insight: Per-org isolation via lightweight/serverless proxy instances rather than persistent LiteLLM processes per tenant. This keeps infra costs low while maintaining strong isolation.

Target market: 20-100 person teams, especially in China where domestic model support (DeepSeek, Qwen, GLM, Doubao) is a differentiator vs OpenRouter.

## Constraints

- **Tech Stack**: SvelteKit frontend, LiteLLM as proxy core, PostgreSQL for data
- **Deployment**: Single Cloud VM for SaaS, docker-compose for self-host
- **Provider Support**: Must support all 100+ LiteLLM providers including China models
- **API Compatibility**: Must be OpenAI-compatible (`/v1/chat/completions`) for IDE plugin integration
- **Auth**: Email/password + Google/GitHub OAuth

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BYO keys only (no reselling) | Simpler business model, no billing complexity, focus on platform value | — Pending |
| Build on LiteLLM | 100+ providers already supported, Virtual Keys, cost tracking built-in | — Pending |
| Per-org serverless proxy | Low infra cost, strong isolation, scales with demand | — Pending |
| SvelteKit for dashboard | Fast, lightweight, consistent with Open WebUI reference code | — Pending |
| Self-hostable from v1 | Key differentiator — companies with data sovereignty needs can run it themselves | — Pending |

---
*Last updated: 2026-03-15 after initialization*
