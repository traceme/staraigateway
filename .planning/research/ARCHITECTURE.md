# Architecture Patterns

**Domain:** Multi-tenant LLM API Gateway SaaS (BYO keys)
**Researched:** 2026-03-15

## Recommended Architecture

LLMTokenHub is a multi-tenant API gateway where each organization brings their own LLM provider keys and their team members get individually-tracked virtual keys routed through a shared platform. The architecture has three tiers: a SvelteKit management plane, a central control plane (API + DB), and per-org LiteLLM proxy instances as the data plane.

```
                        Internet
                           |
                    +--------------+
                    |   Nginx/LB   |  <-- TLS termination, rate limiting
                    +------+-------+
                           |
              +------------+------------+
              |                         |
     +--------+--------+    +----------+---------+
     |  SvelteKit App  |    |  Control Plane API |
     |  (Dashboard UI) |    |  (SvelteKit SSR /  |
     |  Port 3000      |    |   API routes)      |
     +--------+--------+    +----------+---------+
              |                         |
              +------------+------------+
                           |
                    +------+-------+
                    |  PostgreSQL  |  <-- Orgs, users, keys, credentials,
                    |              |      spend logs, proxy configs
                    +------+-------+
                           |
              +------------+------------+
              |            |            |
         +----+----+  +---+----+  +----+----+
         | LiteLLM |  | LiteLLM|  | LiteLLM |  <-- Per-org proxy instances
         | Org A   |  | Org B  |  | Org C   |      (on-demand, lightweight)
         +----+----+  +---+----+  +----+----+
              |            |            |
         +----+----+  +---+----+  +----+----+
         | OpenAI  |  | Claude |  | DeepSeek|  <-- Provider APIs
         | Claude  |  | Gemini |  | Qwen    |      (org's own keys)
         +---------+  +--------+  +---------+
```

### Why This Structure

The key architectural decision -- per-org lightweight proxy instances rather than a single shared LiteLLM process -- drives the entire system shape. Here is why it matters:

1. **Credential isolation**: Org A's API keys never exist in the same process memory as Org B's. A vulnerability or crash in one org's proxy cannot leak another org's credentials.

2. **Blast radius containment**: If a member of Org A triggers provider rate limits or causes errors, only Org A's proxy is affected. Org B continues operating normally.

3. **Independent configuration**: Each org can have different model routing rules, fallback chains, and rate limits without YAML config conflicts in a shared instance.

4. **Horizontal scaling**: Hot orgs (high usage) can get more resources; dormant orgs can be scaled to zero. This is impossible with a single shared proxy.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Nginx/Load Balancer** | TLS, static assets, route traffic to dashboard vs proxy endpoints | SvelteKit App, Control API, Proxy Router |
| **SvelteKit Dashboard** | Org signup, member management, API key CRUD, usage dashboards, BYO key management | Control Plane API (internal) |
| **Control Plane API** | Auth (JWT), org/user CRUD, credential storage, proxy lifecycle management, spend aggregation | PostgreSQL, Redis, Proxy Instances |
| **PostgreSQL** | Persistent storage: orgs, users, credentials (encrypted), virtual keys, spend logs, proxy configs | Control Plane API only |
| **Redis** | Session cache, rate limit counters, proxy config cache, pub/sub for proxy lifecycle events | Control Plane API, Proxy Instances |
| **Proxy Router** | Route incoming API requests (`/v1/chat/completions`) to correct org's proxy instance | Nginx (inbound), LiteLLM Instances (outbound) |
| **LiteLLM Proxy Instance** | Per-org: validate virtual keys, enforce budgets, route to providers, track token usage | Provider APIs (outbound), PostgreSQL (spend writes), Redis (rate limits) |

### Data Flow

#### Flow 1: Org Setup (one-time)

```
Admin signs up
  -> SvelteKit -> Control API -> PostgreSQL (create org, admin user)
  -> Admin submits OpenAI/Anthropic API keys
  -> Control API encrypts keys -> PostgreSQL (credential store)
  -> Control API generates LiteLLM config YAML for this org
  -> Control API spawns LiteLLM instance with org config
```

#### Flow 2: Member Gets API Key

```
Admin invites member (email)
  -> Control API creates user record, sends invite
  -> Member signs up, gets dashboard access
  -> Member clicks "Create API Key"
  -> Control API -> LiteLLM key/generate -> returns virtual key (sk-...)
  -> Member configures Cursor/Claude Code with virtual key + proxy URL
```

#### Flow 3: LLM Request (hot path -- most critical)

```
IDE sends POST /v1/chat/completions with sk-member-key-xxx
  -> Nginx -> Proxy Router (extracts org_id from key prefix or lookup)
  -> Org's LiteLLM instance:
     1. Validate virtual key (check against DB/cache)
     2. Check budget (has member exceeded monthly limit?)
     3. Check rate limits (RPM/TPM within bounds?)
     4. Select model + provider (routing rules)
     5. Inject org's real API key for selected provider
     6. Forward request to provider API
     7. Stream response back to client
     8. Async: log tokens, calculate cost, update spend
  -> Response streams back through Nginx to IDE
```

#### Flow 4: Usage Dashboard

```
Member opens dashboard
  -> SvelteKit -> Control API
  -> Aggregate from SpendLogs table (per-member, per-model, per-day)
  -> Return charts: daily spend, model breakdown, token counts
```

## Multi-Tenancy Isolation: Three Viable Patterns

### Pattern 1: Process-per-Org (Recommended for v1)

**What:** Each org gets a dedicated LiteLLM process, started on-demand, killed after idle timeout.

**How it works:**
- Control plane maintains a process pool
- When a request arrives for an org, check if process is running
- If not, spawn `litellm --config /configs/org-{id}.yaml --port {dynamic}`
- Nginx upstream map routes org traffic to correct port
- After N minutes of no traffic, gracefully terminate process

**Why this for v1:**
- Simplest to implement -- LiteLLM already works as a standalone process
- Strongest isolation (separate process = separate memory, separate crash domain)
- On a single VM with 20 orgs, each LiteLLM instance uses ~50-100MB RAM idle, so 2-4GB total is manageable
- For the target scale (20-100 person teams, maybe 10-50 orgs initially), this is more than sufficient

```typescript
// Conceptual proxy router
interface OrgProxy {
  orgId: string;
  port: number;
  process: ChildProcess;
  lastActivity: Date;
  configPath: string;
}

// Route request to org's proxy
async function routeToOrg(orgId: string, req: Request): Promise<Response> {
  let proxy = activeProxies.get(orgId);
  if (!proxy || !proxy.process.connected) {
    proxy = await spawnOrgProxy(orgId);  // Start LiteLLM process
  }
  proxy.lastActivity = new Date();
  return fetch(`http://localhost:${proxy.port}${req.path}`, { ... });
}
```

**Scaling limits:** ~50-100 orgs per VM before memory pressure becomes an issue. Beyond that, move to Pattern 2 or 3.

### Pattern 2: Container-per-Org (Recommended for growth)

**What:** Each org gets a Docker container running LiteLLM, orchestrated by Docker Compose or Kubernetes.

**When to use:** When you exceed ~50 orgs or need stronger isolation guarantees.

**Advantages over Pattern 1:**
- Resource limits (CPU, memory) per org via cgroup constraints
- Easier horizontal scaling across multiple VMs
- Container health checks and auto-restart
- Network namespace isolation

**Implementation sketch:**
```yaml
# docker-compose template per org
services:
  proxy-org-{id}:
    image: ghcr.io/berriai/litellm:main-latest
    environment:
      - DATABASE_URL=postgresql://...
      - LITELLM_MASTER_KEY=${ORG_MASTER_KEY}
    volumes:
      - ./configs/org-{id}.yaml:/config.yaml
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
```

### Pattern 3: Shared Process with Logical Isolation (Not Recommended)

**What:** Single LiteLLM instance serving all orgs, using organization_id field to partition data.

**Why not:** LiteLLM's organization model does exist (see `LiteLLM_OrganizationTable` in the schema), but it was designed for internal team structure within a single enterprise, not for SaaS multi-tenancy. Specific problems:

- All org credentials in same process memory
- A single org's traffic spike degrades all orgs
- Config changes require restarting the shared instance (affects everyone)
- A LiteLLM bug/crash takes down all orgs simultaneously
- Rate limits from one org's provider key could block the shared process's connection pool

This pattern is only appropriate if you are building an internal tool for a single company with multiple departments.

## Credential Management Architecture

The most sensitive part of the system. Org admins submit real API keys (OpenAI, Anthropic, etc.) that must be stored securely and injected into proxy instances.

### Encryption Strategy

```
Org admin submits API key via dashboard
  -> HTTPS (in transit)
  -> Control Plane API receives plaintext key
  -> Encrypt with AES-256-GCM using per-org encryption key
  -> Per-org key derived from master key + org_id (HKDF)
  -> Store encrypted blob in PostgreSQL (LiteLLM_CredentialsTable equivalent)
  -> When spawning org's proxy: decrypt keys, inject as env vars
  -> Proxy process receives keys in memory only (not on disk)
```

**Key hierarchy:**
```
Master Encryption Key (env var, never in DB)
  └── Per-Org Key = HKDF(master_key, org_id)
       └── Encrypted API keys in PostgreSQL
```

LiteLLM already has `LiteLLM_CredentialsTable` with a `credential_values Json` field. For our SaaS, we need to add an encryption layer on top since LiteLLM stores credentials in plaintext JSON by default.

### What LiteLLM Already Provides (and What We Must Build)

| Capability | LiteLLM Has It? | Our Work |
|-----------|-----------------|----------|
| Virtual key generation | Yes (`/key/generate`) | Wrap with our auth |
| Per-key budget tracking | Yes (`max_budget`, `spend`) | Expose in dashboard |
| Per-key rate limits | Yes (`rpm_limit`, `tpm_limit`) | Expose in dashboard |
| Organization model | Yes (`LiteLLM_OrganizationTable`) | Map to our tenant model |
| Team model | Yes (`LiteLLM_TeamTable`) | Use for org departments |
| Spend logging | Yes (`LiteLLM_SpendLogs`) | Aggregate for dashboards |
| Credential storage | Yes (`LiteLLM_CredentialsTable`) | Add encryption layer |
| Model routing | Yes (config YAML) | Generate per-org configs |
| Fallback chains | Yes (router config) | Generate per-org configs |
| 100+ provider support | Yes (core library) | Use as-is |
| Multi-tenant auth | Partial (org RBAC exists) | Build SaaS-level tenant isolation |
| Self-serve signup | No | Build in SvelteKit |
| BYO key management UI | No | Build in SvelteKit |
| Usage analytics dashboard | Partial (admin UI exists) | Build tenant-scoped views |

## Proxy Router: The Critical Middleware

The proxy router sits between Nginx and per-org LiteLLM instances. It is the component that makes multi-tenancy work.

### Routing Strategy

Virtual keys need to map to orgs. Two approaches:

**Option A: Key-prefix routing (recommended)**
```
Key format: sk-{org_short_id}-{random}
Example:    sk-acme-7f3a9b2c1d...

Router extracts "acme" from prefix -> looks up org -> routes to org's proxy
```
Advantage: Single lookup, no database hit on hot path (cache prefix->port mapping).

**Option B: Database lookup routing**
```
Key format: sk-{random} (standard LiteLLM format)
Router hashes key -> looks up in VerificationToken table -> gets org_id -> routes
```
Disadvantage: Database hit on every request (mitigated by Redis cache, but adds latency).

**Recommendation:** Use Option A. The 8ms P95 latency that LiteLLM advertises assumes no extra routing hop. Adding a DB lookup would degrade that significantly. Prefix-based routing is O(1) with a simple in-memory map.

### Implementation as SvelteKit API Route

Since the dashboard is SvelteKit, the proxy router can be a SvelteKit server endpoint that reverse-proxies to LiteLLM instances. This avoids adding another service.

```typescript
// src/routes/v1/[...path]/+server.ts
export async function POST({ request, params }) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  const orgId = extractOrgFromKey(apiKey);  // prefix extraction
  const proxyPort = await getOrSpawnProxy(orgId);

  // Reverse proxy with streaming
  const upstream = await fetch(`http://localhost:${proxyPort}/v1/${params.path}`, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
    // @ts-ignore -- duplex needed for streaming
    duplex: 'half',
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}
```

However, for production, this should be extracted to a lightweight Node.js/Bun reverse proxy or handled at the Nginx level for performance. SvelteKit's streaming support is adequate for v1 but is not optimized for high-throughput proxying.

## Database Schema Design

Build on LiteLLM's existing Prisma schema. The platform needs a thin wrapper layer.

### New Tables (Platform Layer)

```prisma
// Platform-level org (wraps LiteLLM_OrganizationTable)
model Platform_Organization {
  id                    String   @id @default(uuid())
  litellm_org_id        String   @unique  // FK to LiteLLM_OrganizationTable
  name                  String
  slug                  String   @unique  // URL-friendly, used in key prefix
  owner_user_id         String
  plan                  String   @default("free")  // free, pro, enterprise
  proxy_port            Int?     // Currently assigned proxy port
  proxy_status          String   @default("stopped")  // running, stopped, starting
  proxy_config          Json     @default("{}")  // Generated LiteLLM YAML as JSON
  created_at            DateTime @default(now())
  updated_at            DateTime @default(now()) @updatedAt

  owner                 Platform_User @relation(fields: [owner_user_id], references: [id])
  members               Platform_OrgMember[]
  credentials           Platform_Credential[]
}

// Platform-level user (wraps LiteLLM_UserTable)
model Platform_User {
  id                    String   @id @default(uuid())
  litellm_user_id       String   @unique  // FK to LiteLLM_UserTable
  email                 String   @unique
  password_hash         String?
  name                  String?
  avatar_url            String?
  oauth_provider        String?  // google, github
  oauth_id              String?
  created_at            DateTime @default(now())
  updated_at            DateTime @default(now()) @updatedAt

  owned_orgs            Platform_Organization[]
  memberships           Platform_OrgMember[]
}

// Org membership with roles
model Platform_OrgMember {
  id                    String   @id @default(uuid())
  org_id                String
  user_id               String
  role                  String   @default("member")  // admin, member
  litellm_key_token     String?  // Hashed virtual key in LiteLLM
  created_at            DateTime @default(now())

  org                   Platform_Organization @relation(fields: [org_id], references: [id])
  user                  Platform_User @relation(fields: [user_id], references: [id])

  @@unique([org_id, user_id])
}

// Encrypted provider credentials
model Platform_Credential {
  id                    String   @id @default(uuid())
  org_id                String
  provider              String   // openai, anthropic, google, deepseek, qwen
  encrypted_key         String   // AES-256-GCM encrypted
  key_hint              String   // Last 4 chars for display: "...a1b2"
  is_active             Boolean  @default(true)
  created_at            DateTime @default(now())
  updated_at            DateTime @default(now()) @updatedAt

  org                   Platform_Organization @relation(fields: [org_id], references: [id])

  @@index([org_id, provider])
}
```

### Why Wrapper Tables Instead of Extending LiteLLM Schema Directly

1. **Upgrade safety**: LiteLLM releases new schema migrations regularly. If we modify their schema, every LiteLLM upgrade requires merge conflict resolution.
2. **Separation of concerns**: Platform concerns (signup, OAuth, billing plan) do not belong in the proxy's data model.
3. **Self-host compatibility**: The wrapper tables are only needed for the SaaS version. Self-hosters use LiteLLM's native schema directly.

## Patterns to Follow

### Pattern 1: Config Generation Over Config Mutation

**What:** Generate fresh LiteLLM config YAML files from platform state rather than mutating a running instance's config.

**When:** Every time org credentials change, models are added/removed, or routing rules change.

**Why:** LiteLLM's config reload is not atomic. Generating a fresh config and restarting the org's proxy (sub-second with process-per-org) is simpler and more reliable.

```python
# Generate LiteLLM config from platform state
def generate_org_config(org_id: str) -> dict:
    org = get_org(org_id)
    credentials = get_org_credentials(org_id)  # Decrypted

    models = []
    for cred in credentials:
        if cred.provider == "openai":
            models.extend([
                {"model_name": "gpt-4o", "litellm_params": {
                    "model": "gpt-4o", "api_key": cred.decrypted_key}},
                {"model_name": "gpt-4o-mini", "litellm_params": {
                    "model": "gpt-4o-mini", "api_key": cred.decrypted_key}},
            ])
        elif cred.provider == "anthropic":
            models.extend([
                {"model_name": "claude-sonnet-4-20250514", "litellm_params": {
                    "model": "claude-sonnet-4-20250514", "api_key": cred.decred_key}},
            ])
        # ... more providers

    return {
        "model_list": models,
        "litellm_settings": {
            "drop_params": True,
            "set_verbose": False,
        },
        "general_settings": {
            "master_key": org.litellm_master_key,
            "database_url": DATABASE_URL,  # Shared DB, org-scoped queries
        },
    }
```

### Pattern 2: Async Spend Tracking

**What:** Write spend logs asynchronously, not in the request hot path.

**Why:** LiteLLM already does this internally via `db_spend_update_writer.py` which batches spend updates. Do not add synchronous DB writes in the proxy router.

**How:** LiteLLM instances write to the shared PostgreSQL `LiteLLM_SpendLogs` table. The dashboard reads from this table with org-scoped queries. No additional logging infrastructure needed.

### Pattern 3: Health Check Cascade

**What:** Multi-layer health checking to detect and recover from failures.

```
Nginx -> /health (SvelteKit app health)
Nginx -> /v1/health (proxy router health)
Control Plane -> per-org LiteLLM /health (individual proxy health)
Control Plane -> provider health (can we reach OpenAI/Anthropic?)
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Shared LiteLLM Instance for Multi-Tenancy

**What:** Running one LiteLLM process and using organization_id to partition tenants.

**Why bad:** See Pattern 3 analysis above. Credential leakage risk, noisy neighbor problems, config conflicts, shared crash domain.

**Instead:** Process-per-org or container-per-org.

### Anti-Pattern 2: Storing Provider Keys in LiteLLM Config Files

**What:** Writing org API keys into YAML files on disk.

**Why bad:** Config files are easily exposed via log dumps, backup copies, or container image layers. Keys persist on disk after org deletion.

**Instead:** Generate configs in memory, pass keys via environment variables or tmpfs-mounted files. Encrypt at rest in PostgreSQL.

### Anti-Pattern 3: Synchronous Proxy Spawning

**What:** Blocking the API request while starting a new LiteLLM instance for an org.

**Why bad:** LiteLLM takes 15-20 seconds to fully start (Prisma migrations, model validation). First request after idle would timeout.

**Instead:** Pre-warm on login. When a user authenticates to the dashboard, start their org's proxy in the background. Also implement a "warming" state that queues requests until the proxy is ready (with 30s timeout).

### Anti-Pattern 4: Per-Org Databases

**What:** Giving each org its own PostgreSQL database for complete isolation.

**Why bad:** Operational nightmare at scale. Connection pool exhaustion, migration management across N databases, backup complexity.

**Instead:** Shared database with org_id scoping. LiteLLM already scopes spend logs by organization_id. Add row-level security (RLS) in PostgreSQL for defense-in-depth if needed.

## Suggested Build Order

Based on component dependencies, the recommended build sequence is:

### Phase 1: Foundation (must be first)

1. **PostgreSQL schema** -- Platform wrapper tables + initial LiteLLM schema
2. **Auth system** -- Email/password + OAuth (Google/GitHub), JWT tokens
3. **SvelteKit app skeleton** -- Routes, layouts, auth middleware

*Rationale:* Everything depends on auth and data storage. Cannot build any feature without these.

### Phase 2: Org & Credential Management

4. **Org CRUD** -- Create org, invite members, assign roles
5. **BYO key management** -- Submit, encrypt, store, validate provider API keys
6. **Config generation** -- Generate LiteLLM YAML from org state

*Rationale:* Org and credentials must exist before any proxy can be spawned.

### Phase 3: Proxy Lifecycle

7. **Proxy spawner** -- Start/stop LiteLLM processes per org
8. **Proxy router** -- Route `/v1/*` requests to correct org's proxy
9. **Virtual key generation** -- Create per-member keys via LiteLLM API

*Rationale:* This is the core product -- without it, nothing works for end users. Depends on Phase 2 for config and credentials.

### Phase 4: Observability & Controls

10. **Usage dashboard** -- Spend per member, per model, trends
11. **Budget controls** -- Set/enforce per-member monthly limits
12. **Rate limiting** -- Per-key RPM/TPM limits

*Rationale:* The product is usable without these (members can still use LLMs), but not manageable. These are what make admins willing to pay.

### Phase 5: Polish & Self-Host

13. **Smart routing** -- Cheap models for simple tasks
14. **Fallback chains** -- Auto-switch when provider is down
15. **Self-host package** -- Docker-compose with docs
16. **Landing page**

*Rationale:* Differentiators and distribution. Build after core product works.

## Scalability Considerations

| Concern | 10 orgs (launch) | 100 orgs (growth) | 1000 orgs (scale) |
|---------|-------------------|--------------------|--------------------|
| **Proxy isolation** | Process-per-org on single VM | Container-per-org on 2-3 VMs | Kubernetes with auto-scaling |
| **Database** | Single PostgreSQL instance | Read replicas for dashboard queries | Partition SpendLogs by month |
| **Proxy routing** | In-process port map | Redis-backed service registry | K8s service discovery |
| **Credential storage** | Encrypted in PostgreSQL | Same + HSM for master key | Vault or AWS KMS |
| **Idle management** | Kill after 30 min idle | Kill after 10 min, faster cold start | Serverless containers (Cloud Run) |
| **Memory budget** | ~2GB for proxy processes | ~10-25GB across VMs | Autoscaling, no fixed budget |
| **Config generation** | Filesystem YAML files | Redis-cached configs | Config service with versioning |

## Self-Host Architecture Variant

For self-hosted deployments, the architecture simplifies dramatically:

```
docker-compose.yml:
  - svelte-dashboard (SvelteKit app)
  - litellm (single instance, single org)
  - postgresql
  - redis (optional)
```

Self-hosters do not need multi-tenancy. They get a single org, single LiteLLM instance, with the SvelteKit dashboard as the management UI. This is essentially the same as the existing Open WebUI + LiteLLM pattern, but with a purpose-built dashboard instead of a chat UI.

The codebase should use a `MULTI_TENANT=true/false` environment variable to toggle between SaaS and self-host behavior. In single-tenant mode:
- Skip org selection (there is only one)
- Skip proxy spawning (LiteLLM runs as a sibling container)
- Credentials stored in LiteLLM config directly (or encrypted in DB)
- No proxy router needed (direct to LiteLLM)

## Sources

- LiteLLM Prisma schema: `litellm/litellm/proxy/schema.prisma` (direct codebase analysis)
- LiteLLM proxy architecture: `litellm/CLAUDE.md` (official project documentation)
- LiteLLM auth system: `litellm/litellm/proxy/auth/auth_checks_organization.py` (code analysis)
- LiteLLM key management: `litellm/litellm/proxy/management_endpoints/key_management_endpoints.py` (code analysis)
- Project PRD: `prd.md` (cost optimization strategy and existing architecture)
- Confidence: HIGH for LiteLLM internals (direct code analysis), MEDIUM for multi-tenancy patterns (based on training data + architectural reasoning, not verified against production deployments at scale)
