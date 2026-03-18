# Phase 15: Model Catalog - Research

**Researched:** 2026-03-18
**Domain:** Model discovery from provider APIs, catalog UI, SvelteKit + Drizzle + Svelte 5
**Confidence:** HIGH

## Summary

Phase 15 converts the current hardcoded model catalog into a dynamic, auto-discovered catalog. The existing codebase already has most building blocks in place: `validateProviderKey()` fetches models from provider APIs, `getAvailableModels()` aggregates from the `models` jsonb column, and `ModelPricingTable.svelte` renders a sortable table. The main work is (1) wiring model discovery into provider key create/update flows as fire-and-forget, (2) switching the catalog page from `MODEL_PRICING`-only to dynamic discovery enriched with pricing data, and (3) handling unknown models gracefully with "N/A" pricing.

The scope is well-contained because all patterns (fire-and-forget side effects, `$derived()` reactivity, `errorKey` i18n, audit logging) are already established in the codebase from prior phases. No new libraries or schema changes are needed -- the `models` jsonb column already exists on `appProviderKeys`.

**Primary recommendation:** Extract model discovery into a standalone `discoverModels()` function that reuses `validateProviderKey()` logic, wire it fire-and-forget into create/update actions, and rebuild the catalog page to aggregate discovered models enriched with `MODEL_PRICING` data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Discover models by calling provider APIs directly -- reuse and extend `validateProviderKey()` in `src/lib/server/provider-keys.ts`
- No LiteLLM dependency for discovery -- keeps catalog independent of LiteLLM proxy
- Store discovered model IDs in existing `appProviderKeys.models` jsonb column
- Fetch models on provider key create and update actions
- Fire-and-forget pattern -- key creation succeeds even if model discovery fails
- Model discovery failure is non-blocking: key is created, models column stays empty/null
- No background cron or periodic refresh -- models discovered at key CRUD time only
- Models disappear immediately when provider key is deleted (no grace period)
- Catalog page reads from DB (aggregated models columns) -- no live API calls on page load
- Pricing uses hardcoded `MODEL_PRICING` map; unknown models show "N/A" pricing

### Claude's Discretion
- Whether to run model discovery as a separate async function or inline in createProviderKey/updateProviderKey
- How to handle the validate endpoint's existing model fetch (avoid double-fetching if validate is called before create)
- Exact catalog page layout improvements (grouping, filters) -- current table with search is a reasonable starting point

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MODEL-01 | System auto-discovers available models from org's configured provider keys | `validateProviderKey()` already fetches models; wire into create/update with fire-and-forget DB write to `models` jsonb column |
| MODEL-02 | Org members can browse catalog page showing available models with provider, pricing, and capabilities | Existing `ModelPricingTable.svelte` + `+page.svelte` need refactor: switch from `MODEL_PRICING`-only to dynamic discovery enriched with pricing; unknown models get "N/A" |
| MODEL-03 | Model catalog updates when provider keys are added or removed | Fire-and-forget discovery on create/update; deletion naturally removes models via `getAvailableModels()` filtering on active keys |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | 2.x | Full-stack framework | Already used throughout project |
| Drizzle ORM | latest | Database queries | Already used; `appProviderKeys` table with `models` jsonb column |
| Svelte 5 | 5.x | UI reactivity | `$state`, `$derived`, `$props` already used in all components |
| svelte-i18n | latest | Internationalization | Already integrated in Phase 12 |
| Zod | latest | Form validation | Already used in all server actions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS v4 | 4.x | Styling | All UI components use zinc dark theme |

### Alternatives Considered
None -- all decisions are locked. No new dependencies needed.

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Changes Structure
```
src/
  lib/
    server/
      provider-keys.ts     # Add discoverModels() function + wire into create/update
      gateway/
        models.ts          # getAvailableModels() already works, no changes needed
        usage.ts           # MODEL_PRICING stays as-is (read-only reference)
    components/
      models/
        ModelPricingTable.svelte  # Update to handle N/A pricing for unknown models
  routes/
    org/[slug]/
      models/
        +page.server.ts    # Refactor: aggregate from DB, enrich with MODEL_PRICING
        +page.svelte       # Minor updates if Model type changes
      provider-keys/
        +page.server.ts    # Wire fire-and-forget discoverModels() into create/update
  lib/i18n/
    en.json               # Add new keys (context_window column label, N/A pricing text)
    zh.json               # Chinese translations
```

### Pattern 1: Fire-and-Forget Model Discovery
**What:** After creating/updating a provider key, trigger model discovery asynchronously without awaiting the result.
**When to use:** On provider key create and update actions.
**Example:**
```typescript
// In src/lib/server/provider-keys.ts
export function discoverModels(providerKeyId: string, provider: string, apiKey: string, baseUrl?: string): void {
  validateProviderKey(provider, apiKey, baseUrl)
    .then((result) => {
      if (result.valid && result.models.length > 0) {
        db.update(appProviderKeys)
          .set({ models: result.models, updatedAt: new Date() })
          .where(eq(appProviderKeys.id, providerKeyId))
          .then(() => {})
          .catch(() => {});
      }
    })
    .catch(() => {}); // Silently fail -- non-blocking
}
```
**Rationale:** Matches the established `recordAuditEvent()` and `logUsage()` patterns -- returns void, no await, `.then().catch()` chain.

### Pattern 2: Avoid Double-Fetch on Validate-then-Create
**What:** When the UI validates a key (calling validate endpoint) then creates it, the model list is already fetched during validation. Pass models from validation result to create action to avoid a second API call.
**When to use:** When the create form also validates the key.
**Recommendation:** The simplest approach is to accept a small double-fetch (validation is typically fast, <2s). The validate endpoint is called on demand by the user clicking "validate", and create is a separate action. Since discovery is fire-and-forget, the second fetch happens in the background after create succeeds. This is an acceptable tradeoff for code simplicity. Alternatively, the validate action could return models, and the create form could include them as a hidden field -- but this adds form complexity for minimal gain.

### Pattern 3: Dynamic Catalog with Pricing Enrichment
**What:** The catalog page aggregates all models from active provider keys' `models` jsonb columns, then enriches each model with pricing from `MODEL_PRICING` if available.
**When to use:** In the models page server load function.
**Example:**
```typescript
// In +page.server.ts load function
const providerKeys = await db
  .select({ provider: appProviderKeys.provider, models: appProviderKeys.models })
  .from(appProviderKeys)
  .where(and(eq(appProviderKeys.orgId, orgId), eq(appProviderKeys.isActive, true)));

const seen = new Set<string>();
const models = [];
for (const key of providerKeys) {
  if (!key.models) continue;
  for (const modelId of key.models as string[]) {
    if (seen.has(modelId)) continue;
    seen.add(modelId);
    const pricing = MODEL_PRICING[modelId];
    models.push({
      name: modelId,
      provider: getProviderName(key.provider),
      inputPrice: pricing?.input ?? null,
      outputPrice: pricing?.output ?? null,
      contextWindow: MODEL_CONTEXT_WINDOWS[modelId] ?? null,
      hasKey: true  // All models in this list have an active key
    });
  }
}
```
**Key change:** Previously, the page iterated over `MODEL_PRICING` keys and checked which had provider keys. Now it iterates over discovered models and enriches with pricing. This means unknown models (not in `MODEL_PRICING`) appear in the catalog.

### Anti-Patterns to Avoid
- **Live API calls on page load:** Never fetch from provider APIs when rendering the catalog page. Always read from DB.
- **Blocking key creation on discovery:** Never await the model discovery call in the create/update action. Key CRUD must succeed independently.
- **Storing pricing in DB:** Pricing stays in the hardcoded `MODEL_PRICING` map. Don't add pricing columns to the schema.
- **Filtering out unknown models:** Models not in `MODEL_PRICING` should still appear with "N/A" pricing -- users need to see everything their key provides.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model fetching from provider APIs | Custom HTTP client per provider | `validateProviderKey()` | Already handles auth header differences, response format parsing (OpenAI vs Google), timeouts |
| Model aggregation | Custom SQL query with jsonb unnest | `getAvailableModels()` in `gateway/models.ts` | Already handles deduplication and active-key filtering |
| Sortable table | Custom sort/filter logic | `ModelPricingTable.svelte` | Already has column sorting, just needs minor type updates |

**Key insight:** Nearly all the infrastructure exists. This phase is mostly wiring -- connecting existing pieces and updating the catalog page data source.

## Common Pitfalls

### Pitfall 1: Raw API Key in Fire-and-Forget Function
**What goes wrong:** `discoverModels()` needs the raw API key to call provider APIs, but `createProviderKey()` encrypts it. After encryption, you can't decrypt without the decrypt function.
**Why it happens:** The create flow encrypts immediately; the raw key is only available in the action handler.
**How to avoid:** Pass the raw `apiKey` from the action handler to `discoverModels()` before or alongside the create call. The raw key is available in `parsed.data.apiKey` in the action.
**Warning signs:** Discovery always fails with auth errors after key creation.

### Pitfall 2: Provider Key ID Not Available Before Insert
**What goes wrong:** `discoverModels()` needs the provider key ID to update the `models` column, but the ID might not be available if called before `createProviderKey()` returns.
**Why it happens:** The ID is generated inside `createProviderKey()`.
**How to avoid:** Either (a) generate the UUID before calling `createProviderKey()` and pass it in, or (b) call `discoverModels()` after `createProviderKey()` returns the created record with its ID.
**Warning signs:** Models get written to wrong row or discovery fails with missing ID.

### Pitfall 3: Google Model Name Format
**What goes wrong:** Google's models endpoint returns `name: "models/gemini-1.5-pro"` (with `models/` prefix), but `MODEL_PRICING` uses `gemini-1.5-pro` (without prefix).
**Why it happens:** `validateProviderKey()` stores the raw name from the API response.
**How to avoid:** Check if `validateProviderKey()` already strips the `models/` prefix. Looking at the code -- it stores `m.name ?? m.id` directly. The Google response has `name: "models/gemini-pro"`. This prefix needs to be stripped during discovery for pricing enrichment to match.
**Warning signs:** Google models appear in catalog but always show "N/A" pricing even though they're in `MODEL_PRICING`.

### Pitfall 4: ModelPricingTable Type Mismatch
**What goes wrong:** `ModelPricingTable.svelte` expects `inputPrice: number` and `outputPrice: number`, but with unknown models these will be `null`.
**Why it happens:** The current Model type doesn't account for null pricing.
**How to avoid:** Update the `Model` type to allow `inputPrice: number | null` and update `formatPrice()` to handle null (display "N/A").
**Warning signs:** TypeScript errors or "NaN" displayed in the table.

### Pitfall 5: hasKey Column Becomes Redundant
**What goes wrong:** Current catalog shows "hasKey" status because it was iterating MODEL_PRICING (some models might not have keys). With dynamic discovery, ALL models in the list have keys by definition.
**Why it happens:** The data source changed from "all known models" to "only discovered models from active keys".
**How to avoid:** Remove or repurpose the `hasKey` column. Since all displayed models have active keys, this column no longer adds value. Could replace with provider name badge or remove entirely.
**Warning signs:** Every row shows green "Active" status, making the column useless.

## Code Examples

### Model Discovery Function (fire-and-forget)
```typescript
// src/lib/server/provider-keys.ts
export function discoverModelsForKey(
  keyId: string,
  provider: string,
  apiKey: string,
  baseUrl?: string
): void {
  validateProviderKey(provider, apiKey, baseUrl)
    .then(async (result) => {
      if (result.valid && result.models.length > 0) {
        // Strip Google's "models/" prefix for consistency
        const cleanModels = result.models.map((m) =>
          m.startsWith('models/') ? m.slice(7) : m
        );
        await db
          .update(appProviderKeys)
          .set({ models: cleanModels, updatedAt: new Date() })
          .where(eq(appProviderKeys.id, keyId));
      }
    })
    .catch(() => {}); // Silent failure -- non-blocking
}
```

### Wiring Into Create Action
```typescript
// In provider-keys/+page.server.ts create action, after createProviderKey() succeeds:
const key = await createProviderKey(org.id, { ... });
discoverModelsForKey(key.id, parsed.data.provider, parsed.data.apiKey, parsed.data.baseUrl);
recordAuditEvent(org.id, locals.user!.id, 'provider_key_added', ...);
return { success: true, key };
```

### Updated Catalog Page Load
```typescript
// src/routes/org/[slug]/models/+page.server.ts
import { MODEL_PRICING } from '$lib/server/gateway/usage';
import { getProvider } from '$lib/server/providers';

export const load: PageServerLoad = async ({ parent }) => {
  const { currentOrg } = await parent();

  const providerKeys = await db
    .select({ provider: appProviderKeys.provider, models: appProviderKeys.models })
    .from(appProviderKeys)
    .where(and(eq(appProviderKeys.orgId, currentOrg.id), eq(appProviderKeys.isActive, true)));

  const seen = new Set<string>();
  const models: CatalogModel[] = [];

  for (const key of providerKeys) {
    if (!key.models) continue;
    for (const modelId of key.models as string[]) {
      if (seen.has(modelId)) continue;
      seen.add(modelId);
      const pricing = MODEL_PRICING[modelId];
      const providerDef = getProvider(key.provider);
      models.push({
        name: modelId,
        provider: providerDef?.name ?? key.provider,
        inputPrice: pricing?.input ?? null,
        outputPrice: pricing?.output ?? null,
        contextWindow: MODEL_CONTEXT_WINDOWS[modelId] ?? null
      });
    }
  }

  return { models };
};
```

### Updated ModelPricingTable for Nullable Pricing
```typescript
// In ModelPricingTable.svelte
type Model = {
  name: string;
  provider: string;
  inputPrice: number | null;
  outputPrice: number | null;
  contextWindow: string | null;
};

function formatPrice(price: number | null): string {
  if (price === null) return 'N/A';
  if (price < 0.1) return `$${price.toFixed(3)}/1M`;
  return `$${price.toFixed(2)}/1M`;
}
```

## State of the Art

| Old Approach (current) | New Approach (this phase) | Impact |
|------------------------|---------------------------|--------|
| Catalog iterates `MODEL_PRICING` keys only (14 hardcoded models) | Catalog aggregates discovered models from provider keys | Shows ALL models available, not just known ones |
| Models column in DB exists but never populated | Models populated via fire-and-forget on key create/update | Dynamic, always reflects actual provider availability |
| `hasKey` column checks if discovered model matches pricing map | All displayed models have keys by definition | Remove or repurpose the column |
| Google model names stored with `models/` prefix | Strip prefix during discovery for pricing match | Consistent naming across providers |

## Open Questions

1. **Update action with new API key**
   - What we know: `updateProviderKey()` can change the API key. When key changes, provider might change too (different account = different models).
   - What's unclear: Should discovery run on every update, or only when apiKey field changes?
   - Recommendation: Run discovery on every update call that includes an `apiKey` field. If only `label` or `isActive` changes, skip discovery. The raw apiKey is only available in the update action when the user provides a new one.

2. **Large model lists from providers**
   - What we know: OpenAI returns 50+ models (including fine-tuned, deprecated). Google returns many variants.
   - What's unclear: Should the catalog show ALL discovered models or filter to "useful" ones?
   - Recommendation: Show all discovered models. Users can search/filter in the UI. Future phases (MODEL-05 allowlists) will handle curation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest.config.ts`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --include 'src/lib/server/provider-keys.test.ts'` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MODEL-01 | `discoverModelsForKey()` calls validate and writes models to DB | unit | `npx vitest run src/lib/server/provider-keys.test.ts -t "discoverModels"` | No - Wave 0 |
| MODEL-01 | Google model name prefix stripping | unit | `npx vitest run src/lib/server/provider-keys.test.ts -t "strip prefix"` | No - Wave 0 |
| MODEL-02 | Catalog page load aggregates models with pricing enrichment | unit | `npx vitest run src/routes/org/\\[slug\\]/models/page-server.test.ts` | No - Wave 0 |
| MODEL-02 | Unknown models show null pricing | unit | Same as above | No - Wave 0 |
| MODEL-03 | Discovery wired into create action | integration | `npx vitest run src/__e2e__/provider-keys-models.test.ts` | No - Wave 0 |
| MODEL-03 | Deleted key removes models from catalog | integration | Same as above | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/server/provider-keys.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/server/provider-keys.test.ts` -- unit tests for `discoverModelsForKey()`, Google prefix stripping
- [ ] Catalog page load test (may be complex due to DB dependency -- consider testing the aggregation logic in isolation)

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all canonical reference files listed in CONTEXT.md
- `src/lib/server/provider-keys.ts` -- `validateProviderKey()` implementation verified
- `src/lib/server/db/schema.ts` -- `models` jsonb column confirmed on `appProviderKeys`
- `src/lib/server/gateway/models.ts` -- `getAvailableModels()` aggregation logic verified
- `src/lib/server/gateway/usage.ts` -- `MODEL_PRICING` map with 14 models confirmed
- `src/routes/org/[slug]/models/+page.server.ts` -- current hardcoded catalog page verified
- `src/routes/org/[slug]/provider-keys/+page.server.ts` -- current CRUD actions with audit logging verified

### Secondary (MEDIUM confidence)
- Google models API response format (`models/` prefix) -- based on code comment in `validateProviderKey()` and general API knowledge

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all code exists and was read directly
- Architecture: HIGH -- patterns match established codebase conventions (fire-and-forget, $derived, etc.)
- Pitfalls: HIGH -- identified from actual code inspection (Google prefix, type mismatches, hasKey redundancy)

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable -- no external dependency changes expected)
