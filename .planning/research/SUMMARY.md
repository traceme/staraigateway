# Research Summary: LLMTokenHub

**Domain:** Multi-tenant LLM API Gateway SaaS
**Researched:** 2026-03-15
**Overall confidence:** MEDIUM

## Executive Summary

LLMTokenHub is a multi-tenant API gateway SaaS where companies bring their own LLM provider API keys and give team members controlled, budget-tracked access. The technical stack is well-constrained by project requirements (SvelteKit, LiteLLM, PostgreSQL) and validated by analyzing three reference codebases in the repo.

The most important architectural finding: LiteLLM already has a complete multi-tenant data model with Organizations, Teams, Users, API Keys (VerificationTokens), Budgets, SpendLogs, and Credentials tables. The SvelteKit dashboard should NOT duplicate this model — it should use LiteLLM's management API for writes and read LiteLLM tables directly via Drizzle ORM for dashboard analytics. SvelteKit only needs its own tables for auth sessions, OAuth accounts, and invitation flows.

The key technology decision is using Drizzle ORM (not Prisma JS) for the SvelteKit side, because LiteLLM already owns the PostgreSQL schema via Prisma-Python. Two Prisma instances (JS + Python) fighting over the same database would create migration conflicts. Drizzle can coexist peacefully: it introspects LiteLLM tables read-only and manages its own `app_*` prefixed tables.

For authentication, custom session management (following Lucia patterns, ~200 lines of code) plus Arctic for OAuth is the right choice. Auth.js has schema conflicts, Clerk/Auth0 break the self-host story, and Better Auth is too new. The auth system must map users to LiteLLM's Organization/Team/User model, which requires full control over the auth-to-proxy user binding.

## Key Findings

**Stack:** SvelteKit 5 + Drizzle ORM + Arctic auth + LiteLLM v1.82 proxy + PostgreSQL 16 + Redis 7. All validated against reference codebases.
**Architecture:** Hybrid integration — LiteLLM management API for writes, direct DB reads for analytics. Shared PostgreSQL, separate table ownership.
**Critical pitfall:** Dual migration systems (Drizzle + Prisma-Python) on shared database requires strict table ownership discipline. Direct writes to LiteLLM tables from SvelteKit will bypass its cache and cause silent data inconsistency.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation** - Auth, org creation, database schema, LiteLLM integration
   - Addresses: Authentication, organization model, LiteLLM management API wrapper
   - Avoids: Building features before the multi-tenant foundation works

2. **Core Gateway** - BYO key management, member API key generation, OpenAI-compatible endpoint
   - Addresses: The core product loop — company adds keys, members generate personal keys, keys work with tools
   - Avoids: Dashboard polish before the API actually works

3. **Dashboard & Analytics** - Usage tracking, spend visualization, budget controls
   - Addresses: Admin visibility into team usage and cost
   - Avoids: Complex analytics before basic usage tracking works

4. **Team Management & Polish** - Member invitations, roles, OAuth (Google/GitHub), model routing config
   - Addresses: Multi-user workflows, self-service onboarding
   - Avoids: Team features before the core single-admin flow is solid

5. **Self-Host & Launch** - Docker Compose package, landing page, documentation
   - Addresses: Self-host differentiator, go-to-market
   - Avoids: Packaging complexity before the product is stable

**Phase ordering rationale:**
- Auth + org model must come first — everything depends on multi-tenancy
- Core gateway is the product — must work before anything else matters
- Dashboard provides the admin experience that makes the product usable by non-technical people
- Team features expand from single-admin to multi-user
- Self-host package requires a stable, well-tested product

**Research flags for phases:**
- Phase 1: Drizzle + Prisma-Python coexistence needs careful schema design
- Phase 2: LiteLLM management API coverage for key generation, credential storage needs API-level validation
- Phase 3: SpendLog query performance at scale needs materialized views from the start
- Phase 5: Docker Compose networking and config management patterns need research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Versions verified against local repos. Drizzle/Arctic versions from training data need npm verification. |
| Features | MEDIUM | Based on training data knowledge of competitors. Web search unavailable for latest feature comparisons. |
| Architecture | MEDIUM-HIGH | LiteLLM's multi-tenant model thoroughly analyzed from schema.prisma and CLAUDE.md. Hybrid integration pattern is sound. |
| Pitfalls | MEDIUM | Dual migration and cache bypass pitfalls are well-grounded in LiteLLM's documented architecture. |

## Gaps to Address

- Drizzle ORM and Arctic exact latest versions should be verified against npm registry before implementation starts
- LiteLLM management API endpoint coverage — need to validate all required endpoints exist (org create, credential store, key generate with org scope)
- China model providers (DeepSeek, Qwen, GLM, Doubao) — LiteLLM claims support but exact configuration patterns need validation
- SpendLog table structure needs detailed analysis for dashboard query design (only first 80 lines of schema reviewed)
- Redis configuration for LiteLLM distributed rate limiting — exact config format needs documentation review
