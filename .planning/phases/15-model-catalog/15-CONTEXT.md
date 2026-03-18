# Phase 15: Model Catalog - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Org members can see exactly which models are available to them with pricing and capabilities. Models are auto-discovered from the org's configured provider keys via direct provider API calls. Adding or removing a provider key keeps the catalog current. This phase does NOT include model aliases, allowlists, or per-org routing rules (those are deferred as MODEL-04/05/06).

</domain>

<decisions>
## Implementation Decisions

### Discovery mechanism
- Discover models by calling provider APIs directly — reuse and extend the existing `validateProviderKey()` in `src/lib/server/provider-keys.ts` which already calls each provider's `/models` endpoint
- No LiteLLM dependency for discovery — keeps the catalog independent of whether LiteLLM proxy is running
- Store discovered model IDs in the existing `appProviderKeys.models` jsonb column (already in schema)

### Discovery timing
- Fetch models on provider key create and update actions
- Fire-and-forget pattern (consistent with audit logging in Phase 14) — key creation succeeds even if model discovery fails
- Model discovery failure is non-blocking: key is created, models column stays empty/null, catalog simply won't show models for that key until next update
- No background cron or periodic refresh — models are discovered at key CRUD time only

### Key deletion behavior
- Models disappear immediately when a provider key is deleted — no grace period
- The existing `getAvailableModels()` in `gateway/models.ts` already aggregates from active provider keys only, so deletion naturally removes models from the catalog

### Catalog data source
- Catalog page reads from DB (aggregated `appProviderKeys.models` columns) — no live API calls on page load
- Pricing data continues to use the hardcoded `MODEL_PRICING` map in `gateway/usage.ts` for known models
- Unknown models (not in MODEL_PRICING) should still appear in the catalog with "N/A" pricing

### Claude's Discretion
- Whether to run model discovery as a separate async function or inline in createProviderKey/updateProviderKey
- How to handle the validate endpoint's existing model fetch (avoid double-fetching if validate is called before create)
- Exact catalog page layout improvements (grouping, filters) — current table with search is a reasonable starting point

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Model discovery
- `src/lib/server/provider-keys.ts` — Contains `validateProviderKey()` which already fetches models from provider APIs; `createProviderKey()` and `updateProviderKey()` need model discovery wiring
- `src/lib/server/providers.ts` — `PROVIDERS` registry with `modelsEndpoint` per provider and `getProvider()` lookup

### Existing catalog code
- `src/lib/server/gateway/models.ts` — `getAvailableModels()` aggregates models from active provider keys' jsonb column
- `src/routes/org/[slug]/models/+page.server.ts` — Current catalog page server: reads from hardcoded `MODEL_PRICING`, needs to switch to dynamic discovery
- `src/routes/org/[slug]/models/+page.svelte` — Current catalog page UI with search
- `src/lib/components/models/ModelPricingTable.svelte` — Existing sortable table component

### Pricing
- `src/lib/server/gateway/usage.ts` — `MODEL_PRICING` hardcoded map (14 models), `calculateCost()` function

### Provider key CRUD (where discovery hooks in)
- `src/routes/org/[slug]/provider-keys/+page.server.ts` — Provider key create/update/delete actions with audit logging

### Schema
- `src/lib/server/db/schema.ts` — `appProviderKeys` table with `models` jsonb column

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `validateProviderKey()`: Already fetches models from provider APIs, handles auth header differences (Bearer, x-api-key, api-key), parses both OpenAI-style `{data: [{id}]}` and Google-style `{models: [{name}]}` responses
- `ModelPricingTable.svelte`: Sortable table with i18n support, takes typed `Model[]` prop
- `getAvailableModels()`: Aggregates models from provider keys, returns OpenAI-compatible format
- `PROVIDERS` registry: Has `modelsEndpoint` and `baseUrl` per provider

### Established Patterns
- Fire-and-forget for side effects: `recordAuditEvent()` returns void, no await — model discovery should follow the same pattern
- `errorKey` pattern for i18n server errors (Phase 12)
- `$derived()` for reactive computed values in Svelte 5 components
- Dark theme with zinc color palette, rounded borders, Tailwind CSS v4

### Integration Points
- Provider key create/update actions in `+page.server.ts` — where model discovery hooks in
- Sidebar navigation (already has "Models" entry)
- `MODEL_PRICING` in `usage.ts` — catalog should fall back to this for pricing enrichment

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-model-catalog*
*Context gathered: 2026-03-18*
