# External Integrations

**Analysis Date:** 2026-03-16

## APIs & External Services

**LiteLLM Proxy (core LLM gateway):**
- LiteLLM - Upstream API gateway that handles actual LLM provider routing
  - SDK/Client: Raw `fetch` calls in `src/lib/server/litellm.ts` and `src/lib/server/gateway/proxy.ts`
  - Auth: `LITELLM_MASTER_KEY` env var, sent as `Authorization: Bearer` header
  - Endpoints used: `POST /organization/new`, `GET /health`, `POST /v1/chat/completions`, `POST /v1/embeddings`, `GET /v1/models`
  - Default URL: `http://localhost:4000` (Docker: `http://litellm:4000`)
  - Integration is optional — app gracefully degrades if LiteLLM is unavailable

**LLM Provider APIs (via LiteLLM proxy):**
- The app stores and manages provider API keys for these services; actual calls pass through LiteLLM
- Supported providers defined in `src/lib/server/providers.ts`:
  - OpenAI (`https://api.openai.com`) — GPT-4o, GPT-4o-mini, o1, o3
  - Anthropic (`https://api.anthropic.com`) — Claude Opus, Sonnet, Haiku
  - Google AI (`https://generativelanguage.googleapis.com`) — Gemini 2.5 Pro, Flash
  - Azure OpenAI (`https://YOUR_RESOURCE.openai.azure.com`) — GPT-4o via Azure
  - Mistral AI (`https://api.mistral.ai`) — Mistral Large, Medium, Small
  - Cohere (`https://api.cohere.ai`) — Command R+, Embed, Rerank
  - DeepSeek (`https://api.deepseek.com`) — DeepSeek-V3, DeepSeek-R1
  - Qwen/Alibaba (`https://dashscope.aliyuncs.com/compatible-mode`) — Qwen-Max, Plus, Turbo
  - GLM/Zhipu AI (`https://open.bigmodel.cn`) — GLM-4, GLM-4-Flash
  - Doubao/ByteDance (`https://ark.cn-beijing.volces.com`) — Doubao-Pro, Lite
  - Custom OpenAI-compatible endpoints (user-configured base URL)
- Provider keys are stored AES-256-GCM encrypted in the database (`src/lib/server/crypto.ts`)
- Discovery: app hits each provider's `/v1/models` (or equivalent) endpoint to enumerate available models (`src/routes/org/[slug]/provider-keys/validate/+server.ts`)

**OAuth Providers:**
- Google OAuth 2.0 — "Sign in with Google"
  - SDK/Client: `arctic` library (`Google` class)
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` env vars
  - Callback: `BASE_URL/auth/oauth/google/callback`
  - Implementation: `src/lib/server/auth/oauth.ts`, routes in `src/routes/auth/oauth/google/`
  - Optional: disabled if env vars not set

- GitHub OAuth — "Sign in with GitHub"
  - SDK/Client: `arctic` library (`GitHub` class)
  - Auth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` env vars
  - Callback: `BASE_URL/auth/oauth/github/callback`
  - Implementation: `src/lib/server/auth/oauth.ts`, routes in `src/routes/auth/oauth/github/`
  - Optional: disabled if env vars not set

## Data Storage

**Databases:**
- PostgreSQL 16
  - Connection: `DATABASE_URL` env var (format: `postgresql://user:pass@host:port/db`)
  - Client: `postgres` npm package (low-level driver), wrapped by Drizzle ORM
  - Schema file: `src/lib/server/db/schema.ts`
  - All app tables use `app_` prefix to coexist with LiteLLM's Prisma-managed tables in the same database
  - Tables: `app_users`, `app_sessions`, `app_organizations`, `app_org_members`, `app_email_verifications`, `app_password_resets`, `app_provider_keys`, `app_api_keys`, `app_usage_logs`, `app_oauth_accounts`, `app_org_invitations`, `app_budgets`
  - Migrations: `drizzle-kit` generates SQL to `drizzle/` directory

**File Storage:**
- None — no file uploads or object storage

**Caching:**
- Redis 7 (optional)
  - Connection: `REDIS_URL` env var (format: `redis://host:port`)
  - Client: `ioredis` npm package, lazy singleton in `src/lib/server/redis.ts`
  - Usage: Response caching for non-streaming LLM completions in `src/lib/server/gateway/cache.ts`
  - Cache key format: `cache:{orgId}:{sha256(model+messages)}`
  - TTL: configurable per-organization via `cacheTtlSeconds` (default 3600 seconds)
  - Silently disabled if `REDIS_URL` not set; app functions without it

## Authentication & Identity

**Auth Provider:**
- Custom (no third-party auth service like Auth0/Supabase)
  - Password auth: Argon2id hashing via `@node-rs/argon2` (`src/lib/server/auth/password.ts`)
  - Sessions: SHA-256 hashed tokens stored in `app_sessions` table, 30-day sliding window
  - Session cookie: `auth_session` (httpOnly, secure, sameSite=lax)
  - Token format: 32 random bytes, base32-encoded (unhashed in cookie, SHA-256 hash in DB)
  - Implementation: `src/lib/server/auth/session.ts`
  - Middleware: `src/hooks.server.ts` — validates session on every non-`/v1/` request

**API Key Auth (gateway routes):**
- Bearer token authentication for `/v1/chat/completions`, `/v1/embeddings`, `/v1/models`
- Keys stored as SHA-256 hashes in `app_api_keys` table; first 12 chars kept as display prefix
- Implementation: `src/lib/server/gateway/auth.ts`

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry or similar service integrated

**Logs:**
- `console.warn` / `console.error` to stdout; no structured logging library
- Usage events written to `app_usage_logs` table for in-app analytics dashboard

## CI/CD & Deployment

**Hosting:**
- Docker — multi-stage `Dockerfile` builds to `node:22-alpine` image, exposes port 3000
- `docker-compose.yml` — full stack (app + litellm + postgres + redis) for local/self-hosted deployment

**CI Pipeline:**
- None detected — no GitHub Actions, CircleCI, or similar config files in project root

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — PostgreSQL connection string
- `ENCRYPTION_KEY` — 64 hex chars (32 bytes) for AES-256-GCM encryption of provider keys

**Optional env vars:**
- `REDIS_URL` — Redis connection; caching disabled if absent
- `LITELLM_API_URL` — LiteLLM proxy URL; defaults to `http://localhost:4000`
- `LITELLM_MASTER_KEY` — LiteLLM admin key for organization management
- `BASE_URL` — Public app URL for OAuth callbacks and email links; defaults to `http://localhost:3000`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Email sending; emails disabled if not configured
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth; disabled if absent
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — GitHub OAuth; disabled if absent
- `CRON_SECRET` — Bearer token for securing the `/api/cron/digest` endpoint

**Secrets location:**
- `.env` file (gitignored); `.env.example` documents all variables

## Webhooks & Callbacks

**Incoming:**
- OAuth callbacks:
  - `GET /auth/oauth/google/callback` — Google OAuth return URL
  - `GET /auth/oauth/github/callback` — GitHub OAuth return URL
- Cron trigger:
  - `GET /api/cron/digest` — Admin budget digest email sender; secured with `CRON_SECRET` Bearer token; intended to be called by an external scheduler (e.g., cron job, Vercel Cron, cloud scheduler)

**Outgoing:**
- SMTP email via `nodemailer` for: email verification, password reset, team invitations, budget warnings, admin digests
- LiteLLM REST API calls for org management and LLM proxying
- LLM provider REST APIs (OpenAI-compatible) via LiteLLM for model discovery on key validation

---

*Integration audit: 2026-03-16*
