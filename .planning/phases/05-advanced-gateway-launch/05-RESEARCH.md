# Phase 5: Advanced Gateway & Launch - Research

**Researched:** 2026-03-16
**Domain:** Gateway resilience (retry/fallback/routing/caching/LB), Docker packaging, landing page
**Confidence:** HIGH

## Summary

Phase 5 production-hardens the existing gateway proxy (`src/lib/server/gateway/proxy.ts`) with retry logic, provider fallbacks, smart routing, Redis-based caching, and round-robin load balancing. It also packages the app for self-hosting via Docker Compose and adds a landing page with integration docs.

The gateway work is architecturally contained: all changes wrap or extend the existing `proxyToLiteLLM` function and its key-selection logic. The current code uses a simple "first matching key" strategy that will be replaced with round-robin + fallback chains. Redis caching is an opt-in layer gated by `REDIS_URL`. The Dockerfile, docker-compose, and landing page are net-new additions with no dependencies on existing code beyond the standard SvelteKit adapter-node build.

**Primary recommendation:** Structure implementation as: (1) schema migrations + Redis client, (2) retry/fallback/load-balancing in proxy.ts, (3) smart routing + caching, (4) settings/key UI extensions, (5) Dockerfile + docker-compose + landing page + docs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Auto-retry on provider errors: 429, 500, 503 with exponential backoff (3 attempts max)
- After retries exhausted on primary key, fall back to next active provider key supporting same model
- If all keys exhausted, return last error to client
- Retry logic wraps the existing fetch to LiteLLM in proxy.ts
- Token count heuristic: short input (<500 tokens) routes to cheap tier, long input routes to expensive tier
- 2 tiers: cheap (GPT-4o-mini, Haiku, Flash) and expensive (GPT-4o, Sonnet, Pro)
- Smart routing opt-in per API key via `smartRouting` boolean on `app_api_keys`
- Admin configures tier model mappings via `smartRoutingCheapModel` and `smartRoutingExpensiveModel` on `app_organizations`
- Semantic caching via exact match on normalized prompt: hash of (model + messages after whitespace trim)
- Redis required for caching; no Redis = no caching, no errors
- Default TTL: 1 hour, admin-configurable via `cacheTtlSeconds` on `app_organizations` (default 3600)
- Cache key format: `cache:{orgId}:{sha256(model+messages)}`
- Only cache successful non-streaming responses
- Redis added to docker-compose.yml as optional service
- Round-robin across multiple active keys for same provider+model
- In-memory counter per org+provider for rotation index
- `X-Cache: HIT` header on cached responses
- Docker-compose with 3 services: llmtokenhub (SvelteKit app), postgres, redis
- LiteLLM runs embedded within SvelteKit process (not separate container)
- `.env.example` with all variables documented
- Multi-stage Dockerfile for SvelteKit app
- Self-host config guide at `docs/self-host.md`
- Landing page at `/` (root path, no auth required); authenticated users redirect to org dashboard
- Single-page with: hero + value prop, features grid, cost comparison, self-host CTA, footer
- Integration docs for Cursor, Continue.dev, Claude Code with step-by-step guides

### Claude's Discretion
- Exact retry backoff timing and jitter
- Redis client library choice (ioredis vs redis)
- Token counting approach for smart routing heuristic (approximate vs tiktoken)
- Landing page copy and exact section order
- Dockerfile base image and optimization
- Whether integration docs are static markdown or a SvelteKit page

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GW-06 | API auto-retries on provider 429/500/503 errors | Retry wrapper with exponential backoff + jitter around fetch in proxy.ts |
| GW-07 | API falls back to alternative provider when primary is down | Replace "first matching key" with ordered key list + fallback chain |
| GW-08 | Smart routing selects cheap model for simple tasks, expensive for complex | Token estimation heuristic (chars/4), smartRouting flag on API key, tier config on org |
| GW-09 | Semantic caching returns cached responses for similar queries (Redis) | ioredis client, SHA-256 hash of model+messages, TTL from org settings |
| GW-10 | Load balances across multiple API keys for same provider | Round-robin counter (in-memory Map, same pattern as rate-limit.ts) |
| SHIP-01 | Docker-compose package for self-hosted deployment | 3-service compose (app, postgres, redis), multi-stage Dockerfile |
| SHIP-02 | Landing page explaining the product and value proposition | SvelteKit route at `/` with auth redirect, zinc/blue palette |
| SHIP-03 | Integration docs for Cursor, Continue.dev, and Claude Code setup | Numbered step-by-step guides with config snippets |
| SHIP-04 | Self-host configuration guide | `docs/self-host.md` covering env vars, compose up, verification |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ioredis | ^5.4 | Redis client for caching | Best stability, built-in reconnection, pipelining; project needs simple GET/SET/SETEX not Redis Stack features |
| Node.js crypto (built-in) | N/A | SHA-256 hashing for cache keys | Already used throughout project (auth.ts, api-keys); zero dependency |
| @sveltejs/adapter-node | ^5.2.12 | Already installed | Docker builds use `node build` output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new dependencies needed) | - | Token estimation uses character-based heuristic | chars/4 approximation is sufficient for cheap/expensive tier routing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ioredis | node-redis (redis) | node-redis is official Redis client but ioredis has better auto-reconnection and is more battle-tested for simple caching; project needs GET/SET only |
| chars/4 heuristic | tiktoken/tokenx | tiktoken adds ~2MB WASM dependency; tokenx is 2kB at 96% accuracy but overkill when we only need a rough <500 vs >=500 threshold |

**Installation:**
```bash
npm install ioredis
npm install -D @types/ioredis  # Not needed; ioredis ships its own types
```

Correction: ioredis ships TypeScript types natively. Just:
```bash
npm install ioredis
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/server/gateway/
  proxy.ts              # Extended: retry wrapper, key selection with round-robin + fallback
  auth.ts               # Extended: add smartRouting flag to GatewayAuth
  rate-limit.ts         # Existing (unchanged)
  usage.ts              # Existing (minor: skip usage logging on cache hits or log separately)
  budget.ts             # Existing (unchanged; cache check goes BEFORE budget check)
  cache.ts              # NEW: Redis client, cache get/set, hash generation
  routing.ts            # NEW: Smart routing logic (token estimation, tier selection)
  load-balancer.ts      # NEW: Round-robin key selection with fallback chain
src/lib/server/redis.ts # NEW: Redis client singleton (lazy init, like db proxy pattern)
src/routes/
  +page.svelte          # REPLACE: Landing page (currently placeholder)
  +page.server.ts       # NEW: Auth check for redirect
  docs/integrations/
    +page.svelte        # NEW: Integration docs page
docker-compose.yml      # NEW: At project root
Dockerfile              # NEW: At project root
.dockerignore           # NEW: At project root
.env.example            # NEW: At project root
docs/
  self-host.md          # NEW: Self-hosting guide
```

### Pattern 1: Retry with Exponential Backoff + Jitter
**What:** Wrap the fetch to LiteLLM with retry logic for transient errors
**When to use:** Every provider request goes through this wrapper
**Example:**
```typescript
// src/lib/server/gateway/proxy.ts (retry wrapper)
const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, init);
    if (!RETRYABLE_STATUSES.has(response.status) || attempt === retries) {
      return response;
    }
    // Exponential backoff with jitter: 500ms, 1000ms, 2000ms (+ up to 25% random)
    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
    const jitter = delay * 0.25 * Math.random();
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
  }
  // Unreachable, but TypeScript needs it
  throw new Error('Retry exhausted');
}
```

### Pattern 2: Round-Robin Key Selection with Fallback
**What:** Replace "first matching key" with rotating selection + fallback chain
**When to use:** All provider key selection in proxy.ts
**Example:**
```typescript
// src/lib/server/gateway/load-balancer.ts
// In-memory Map: `${orgId}:${provider}` -> rotation index
const rotationCounters = new Map<string, number>();

function selectKeyRoundRobin(
  keys: ProviderKeyRecord[],
  orgId: string,
  provider: string
): ProviderKeyRecord[] {
  const counterKey = `${orgId}:${provider}`;
  const current = rotationCounters.get(counterKey) ?? 0;
  rotationCounters.set(counterKey, current + 1);

  // Rotate: start from current index, wrap around
  const startIdx = current % keys.length;
  const ordered = [
    ...keys.slice(startIdx),
    ...keys.slice(0, startIdx)
  ];
  return ordered; // Caller tries each in order with retry
}
```

### Pattern 3: Redis Cache Layer (Conditional)
**What:** Check Redis cache before forwarding to provider; store results after success
**When to use:** Non-streaming requests only, when REDIS_URL is configured
**Example:**
```typescript
// src/lib/server/gateway/cache.ts
import { createHash } from 'crypto';
import { getRedis } from '$lib/server/redis';

export function generateCacheKey(orgId: string, model: string, messages: unknown[]): string {
  const normalized = JSON.stringify(messages).replace(/\s+/g, ' ').trim();
  const hash = createHash('sha256').update(`${model}:${normalized}`).digest('hex');
  return `cache:${orgId}:${hash}`;
}

export async function getCachedResponse(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get(key);
}

export async function setCachedResponse(key: string, body: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setex(key, ttlSeconds, body);
}
```

### Pattern 4: Lazy Redis Singleton (Same as DB Proxy Pattern)
**What:** Initialize Redis client only when REDIS_URL is set, using the same lazy Proxy pattern as db.ts
**When to use:** Redis is optional; app must work without it
**Example:**
```typescript
// src/lib/server/redis.ts
import { env } from '$env/dynamic/private';
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 2000);
      }
    });
    redis.on('error', () => {}); // Prevent unhandled rejection; caching is best-effort
  }
  return redis;
}
```

### Pattern 5: Token Estimation for Smart Routing
**What:** Approximate token count using characters/4 heuristic
**When to use:** When API key has `smartRouting` enabled
**Example:**
```typescript
// src/lib/server/gateway/routing.ts
export function estimateTokenCount(messages: Array<{ content?: string }>): number {
  let totalChars = 0;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      totalChars += msg.content.length;
    }
  }
  return Math.ceil(totalChars / 4);
}

export function selectModelTier(
  estimatedTokens: number,
  cheapModel: string,
  expensiveModel: string,
  threshold = 500
): string {
  return estimatedTokens < threshold ? cheapModel : expensiveModel;
}
```

### Anti-Patterns to Avoid
- **Retrying on 400/401/403 errors:** These are client errors that will never succeed on retry. Only retry 429, 500, 503.
- **Caching streaming responses:** SSE responses cannot be meaningfully cached and replayed. Only cache non-streaming JSON responses.
- **Blocking on Redis errors:** Redis is best-effort. All Redis operations should be wrapped in try/catch with graceful fallback to "no cache."
- **Mutating the original request body during smart routing:** Create a new body object with the substituted model; never mutate the parsed body in place.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis client with reconnection | Custom TCP reconnection logic | ioredis built-in auto-reconnect | Handles connection drops, cluster failover, exponential backoff natively |
| Token counting | Full BPE tokenizer | chars/4 heuristic | Only need rough threshold (<500 vs >=500); full tokenizer adds ~2MB WASM and latency |
| Docker health checks | Custom HTTP health endpoint | SvelteKit's built-in routes | Use `curl http://localhost:3000/` as healthcheck; no custom endpoint needed |
| Cache serialization format | Custom binary format | JSON string in Redis | Responses are already JSON; just store the response body string directly |

## Common Pitfalls

### Pitfall 1: Redis Connection Blocking App Startup
**What goes wrong:** App hangs on startup if Redis is configured but unreachable
**Why it happens:** ioredis default behavior blocks until connected
**How to avoid:** Use `lazyConnect: true` option; connect on first use, not on import
**Warning signs:** App takes >30s to start in environments without Redis

### Pitfall 2: Retry Storm on Rate Limits
**What goes wrong:** Retrying 429s with short backoff creates a thundering herd effect
**Why it happens:** Multiple concurrent requests all retry at the same time
**How to avoid:** Use jitter on backoff delays (add random 0-25% to base delay); respect Retry-After header if present
**Warning signs:** Provider sends increasing 429s; cost spikes from retried requests

### Pitfall 3: Cache Poisoning from Error Responses
**What goes wrong:** An error response gets cached and served to all subsequent requests
**Why it happens:** Caching before checking response status
**How to avoid:** Only cache responses where `litellmResponse.ok === true` (status 200-299)
**Warning signs:** Users report getting error messages for queries that should work

### Pitfall 4: Smart Routing Model Mismatch
**What goes wrong:** Smart routing substitutes a model that the org doesn't have provider keys for
**Why it happens:** Admin configures cheap/expensive model names that don't match any provider key's model list
**How to avoid:** After model substitution, validate that a matching provider key exists; if not, fall back to the originally requested model
**Warning signs:** 404 "No provider configured" errors on requests that previously worked

### Pitfall 5: Round-Robin Counter Overflow
**What goes wrong:** In-memory counter grows unbounded
**Why it happens:** Counter increments on every request, never resets
**How to avoid:** Use modular arithmetic (`counter % keys.length`) at selection time; counter can wrap with no ill effects. Optionally reset counters periodically.
**Warning signs:** Memory slowly growing (negligible in practice for Map<string, number>)

### Pitfall 6: Docker Build Fails Due to Dynamic Imports
**What goes wrong:** SvelteKit build succeeds locally but fails in Docker
**Why it happens:** Missing env vars during build time; adapter-node tries to resolve `$env/dynamic/private` at build
**How to avoid:** `$env/dynamic/private` is resolved at runtime, not build time, so it's fine. But `$env/static/private` would fail. Ensure no static env imports in server code. The project already uses `$env/dynamic/private` everywhere.
**Warning signs:** Build errors mentioning undefined environment variables

### Pitfall 7: Cache Key Collisions Across Orgs
**What goes wrong:** One org gets another org's cached response
**Why it happens:** Cache key doesn't include orgId
**How to avoid:** Already addressed in design: cache key format is `cache:{orgId}:{sha256(model+messages)}`
**Warning signs:** Users seeing responses that don't match their model configuration

## Code Examples

### Proxy Flow with All Phase 5 Features
```typescript
// Pseudocode for the enhanced proxyToLiteLLM flow
async function proxyToLiteLLM(request, orgId, path, auth, apiKeyId) {
  // 1. Rate limit check (existing)
  // 2. Parse body, extract model

  // 3. Smart routing (NEW) - before key selection
  let effectiveModel = body.model;
  if (auth?.smartRouting && orgSmartRoutingConfig) {
    const tokens = estimateTokenCount(body.messages);
    effectiveModel = selectModelTier(tokens, cheapModel, expensiveModel);
    body.model = effectiveModel; // substitute in body
  }

  // 4. Cache check (NEW) - before provider call
  if (!body.stream && getRedis()) {
    const cacheKey = generateCacheKey(orgId, effectiveModel, body.messages);
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
      // Note: skip usage logging for cache hits (or log with cost=0)
    }
  }

  // 5. Key selection with round-robin (NEW)
  const matchingKeys = findAllMatchingKeys(providerKeys, effectiveModel);
  const orderedKeys = selectKeyRoundRobin(matchingKeys, orgId, provider);

  // 6. Try each key with retry (NEW)
  let lastError: Response | null = null;
  for (const key of orderedKeys) {
    const decrypted = decrypt(key.encryptedKey);
    const response = await fetchWithRetry(litellmUrl, { headers, body });
    if (response.ok || !RETRYABLE_STATUSES.has(response.status)) {
      // 7. Cache successful non-streaming response (NEW)
      if (response.ok && !body.stream) {
        const responseBody = await response.text();
        setCachedResponse(cacheKey, responseBody, cacheTtlSeconds); // fire-and-forget
        return new Response(responseBody, { status: 200, headers: { 'X-Cache': 'MISS' } });
      }
      return response;
    }
    lastError = response;
  }

  // 8. All keys exhausted: return last error
  return lastError;
}
```

### Schema Additions
```typescript
// Additions to src/lib/server/db/schema.ts

// In appApiKeys table:
smartRouting: boolean('smart_routing').notNull().default(false),

// In appOrganizations table:
smartRoutingCheapModel: text('smart_routing_cheap_model'),   // e.g., 'gpt-4o-mini'
smartRoutingExpensiveModel: text('smart_routing_expensive_model'), // e.g., 'gpt-4o'
cacheTtlSeconds: integer('cache_ttl_seconds').notNull().default(3600),
```

### GatewayAuth Extension
```typescript
// Extended GatewayAuth interface
export interface GatewayAuth {
  userId: string;
  orgId: string;
  apiKeyId: string;
  effectiveRpmLimit: number | null;
  effectiveTpmLimit: number | null;
  smartRouting: boolean;  // NEW
  org: {
    id: string;
    name: string;
    slug: string;
    litellmOrgId: string | null;
    smartRoutingCheapModel: string | null;  // NEW
    smartRoutingExpensiveModel: string | null;  // NEW
    cacheTtlSeconds: number;  // NEW
  };
}
```

### Docker Compose
```yaml
# docker-compose.yml at project root
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/llmtokenhub
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: llmtokenhub
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Dockerfile (Multi-Stage)
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/package.json .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "build"]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| First matching key | Round-robin with fallback chain | Phase 5 | Better load distribution, higher availability |
| No retry | Exponential backoff + jitter | Phase 5 | Resilience against transient provider errors |
| Direct model pass-through | Smart routing with tier selection | Phase 5 | 40-60% cost savings on simple queries |
| No caching | Redis exact-match caching | Phase 5 | Instant responses for repeated queries, reduced API spend |

## Open Questions

1. **Cache hit usage logging**
   - What we know: Cache hits bypass the provider entirely, so no tokens are consumed
   - What's unclear: Should cache hits be logged in usage_logs at all? If yes, with cost=0?
   - Recommendation: Log cache hits with cost=0, inputTokens=0, outputTokens=0, and a `cacheHit` flag or `status='cache_hit'` for visibility in the dashboard

2. **Smart routing fallback when tier model not available**
   - What we know: Admin configures cheap/expensive model names on org settings
   - What's unclear: What if the org has no provider key for the substituted model?
   - Recommendation: If no provider key matches the substituted model, fall back to the originally requested model silently

3. **Budget check on cache hits**
   - What we know: Cache hits are free (no provider cost)
   - What's unclear: Should cache hits bypass budget check entirely?
   - Recommendation: Place cache check BEFORE budget check in the flow; cache hits skip budget check entirely (they're free)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no vitest/jest config in project root) |
| Config file | None - Wave 0 setup required |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GW-06 | Retry on 429/500/503 | unit | `npx vitest run src/lib/server/gateway/proxy.test.ts` | No - Wave 0 |
| GW-07 | Fallback to alternative key | unit | `npx vitest run src/lib/server/gateway/load-balancer.test.ts` | No - Wave 0 |
| GW-08 | Smart routing tier selection | unit | `npx vitest run src/lib/server/gateway/routing.test.ts` | No - Wave 0 |
| GW-09 | Cache get/set/hash | unit | `npx vitest run src/lib/server/gateway/cache.test.ts` | No - Wave 0 |
| GW-10 | Round-robin key selection | unit | `npx vitest run src/lib/server/gateway/load-balancer.test.ts` | No - Wave 0 |
| SHIP-01 | Docker compose up | manual-only | Manual: `docker compose up -d && curl http://localhost:3000` | N/A |
| SHIP-02 | Landing page renders | manual-only | Manual: visit `http://localhost:3000/` unauthenticated | N/A |
| SHIP-03 | Integration docs content | manual-only | Manual: visit docs page, verify content | N/A |
| SHIP-04 | Self-host guide complete | manual-only | Manual: review `docs/self-host.md` | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration for SvelteKit project
- [ ] `src/lib/server/gateway/proxy.test.ts` -- retry/fallback integration tests (mock fetch)
- [ ] `src/lib/server/gateway/load-balancer.test.ts` -- round-robin + fallback chain tests
- [ ] `src/lib/server/gateway/routing.test.ts` -- token estimation + tier selection tests
- [ ] `src/lib/server/gateway/cache.test.ts` -- cache key generation, get/set with mock Redis
- [ ] Install: `npm install -D vitest @vitest/coverage-v8`

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/lib/server/gateway/proxy.ts`, `auth.ts`, `rate-limit.ts`, `usage.ts`, `budget.ts`, `schema.ts` -- full understanding of current gateway architecture
- Codebase inspection: `package.json`, `svelte.config.js` -- adapter-node already configured, current dependencies
- Codebase inspection: `src/routes/v1/chat/completions/+server.ts` -- request flow: auth -> budget -> proxy

### Secondary (MEDIUM confidence)
- [ioredis vs redis comparison](https://mail.chapimaster.com/programming/redis/redis-vs-ioredis-nodejs-comparison) -- ioredis recommended for stability and auto-reconnect
- [Glama Redis benchmark Jan 2026](https://glama.ai/blog/2026-01-26-redis-vs-ioredis-vs-valkey-glide) -- Performance comparable; ioredis better for simple caching patterns
- [SvelteKit Dockerfile guide](https://khromov.se/dockerizing-your-sveltekit-applications-a-practical-guide/) -- Multi-stage build pattern for adapter-node
- [Token estimation heuristics](https://winder.ai/calculating-token-counts-llm-context-windows-practical-guide/) -- chars/4 approximation ~85-95% accurate for English text

### Tertiary (LOW confidence)
- [tokenx library](https://github.com/johannschopplich/tokenx) -- 96% accuracy in 2kB bundle; worth noting but overkill for simple threshold check

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- ioredis is well-established, project patterns are clear from codebase
- Architecture: HIGH -- extending existing proxy.ts with well-defined patterns; all integration points inspected
- Pitfalls: HIGH -- based on concrete codebase analysis (e.g., lazy init pattern, env var handling)
- Docker/Launch: MEDIUM -- standard SvelteKit adapter-node Docker patterns; not project-specific

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable domain, no rapidly changing dependencies)
