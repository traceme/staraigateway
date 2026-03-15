# Phase 2: Core Gateway - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Provider API key management (CRUD + encryption + validation), member API key generation and revocation, and OpenAI-compatible gateway endpoints (chat completions with streaming + tool use, embeddings, models). Smart routing, load balancing, retries, fallbacks, and cost tracking are Phase 3/5.

</domain>

<decisions>
## Implementation Decisions

### Provider key management UI
- Provider catalog layout: grid of provider cards, click to open slide-out panel with key form
- Two sections: "Global" (OpenAI, Anthropic, Google, Azure, Mistral, Cohere) and "China" (DeepSeek, Qwen/Alibaba, GLM/Zhipu, Doubao/ByteDance)
- Plus a "Custom / OpenAI-compatible" card for any provider with base URL override
- Multiple keys per provider supported (labeled, e.g., "Production", "Dev team") — enables Phase 5 load balancing
- Validate button calls provider's /models endpoint — validates key AND discovers available models
- Provider-specific form fields + link to provider docs in slide-out panel

### Key encryption & storage
- AES-256-GCM encryption with ENCRYPTION_KEY from environment variable (32-byte hex)
- Each encrypted value stores: IV + ciphertext + auth tag
- Provider keys stored in app_provider_keys Drizzle table (our DB only, NOT synced to LiteLLM DB)
- Runtime pass-through: decrypt key at request time, pass to LiteLLM in the forwarded request
- No key rotation tooling in Phase 2 — manual re-entry if ENCRYPTION_KEY changes

### Member API key experience
- Show-once pattern: full key displayed after creation with copy button + warning, then only masked prefix (sk-th-...abc)
- Key prefix format: `sk-th-` followed by 48 random characters
- Required name/label when creating (e.g., "Cursor", "Claude Code CLI", "CI Pipeline")
- Key management table shows: name, masked prefix, status (Active/Revoked), created date, last used date
- Store only hash of the key in DB (SHA-256) — full key shown once at creation, never retrievable

### Gateway routing architecture
- SvelteKit proxy: members point tools at SvelteKit's /v1/* endpoints
- Flow: validate member key → look up org → decrypt provider key → stream-proxy to LiteLLM with real provider key
- /v1/models returns models discovered during key validation (stored in app_provider_keys.models[])
- Provider selection: first active key that supports the requested model wins (simple, predictable)
- Streaming: pass-through SSE from LiteLLM to client (no interception/transformation in Phase 2)
- LiteLLM is internal-only (not exposed to members), SvelteKit is the single entry point

### Claude's Discretion
- Exact slide-out panel component implementation
- Provider logo/icon sourcing strategy
- Error handling for gateway proxy failures
- Rate limiting approach for member keys (basic)
- How to handle model name mapping between providers

</decisions>

<specifics>
## Specific Ideas

- Provider catalog should feel like Vercel's integration marketplace — clean cards with status badges
- Show-once key display modeled after GitHub/Stripe token creation flow
- API key table like the Linear/Vercel API key management page — minimal, scannable
- "Custom / OpenAI-compatible" card is important for self-hosters with private endpoints

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/server/litellm.ts`: Existing fetch wrapper for LiteLLM management API (createLiteLLMOrganization, checkLiteLLMHealth) — extend with key provisioning and model proxy calls
- `src/lib/server/db/schema.ts`: 6 Drizzle tables with app_ prefix — add app_provider_keys and app_api_keys tables
- `src/lib/server/auth/session.ts`: Session validation — reuse pattern for API key validation in gateway endpoints
- `src/lib/components/layout/Sidebar.svelte`: Sidebar with placeholder nav items — activate "Provider Keys" and "API Keys" links
- `src/lib/components/dashboard/OnboardingChecklist.svelte`: "Add your first LLM provider key" item — link to new provider keys page

### Established Patterns
- Drizzle ORM with postgres.js driver, all tables use app_ prefix
- Custom Tailwind CSS (no component library), modern SaaS aesthetic
- Lazy DB initialization via Proxy for build-time safety
- LiteLLM management API calls return null on failure (graceful degradation)
- Oslo crypto libraries (@oslojs/encoding, @oslojs/crypto) available for crypto operations

### Integration Points
- LiteLLM proxy at `LITELLM_API_URL` (default localhost:4000) — forward authenticated requests here
- LiteLLM master key in `LITELLM_MASTER_KEY` env var — used for management API calls
- Shared PostgreSQL — our app_* tables coexist with LiteLLM's Prisma tables
- SvelteKit hooks.server.ts — session validation middleware, extend for API key auth on /v1/* routes

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-gateway*
*Context gathered: 2026-03-16*
