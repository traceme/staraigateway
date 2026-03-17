# External Integrations

**Analysis Date:** 2026-03-17

## APIs & External Services

**LLM Providers (proxied via gateway):**
All provider API keys are stored AES-256-GCM encrypted in `app_provider_keys` table. The proxy layer in `src/lib/server/gateway/proxy.ts` decrypts them at request time and forwards to each provider.

- **OpenAI** (`openai`) - GPT-4o, GPT-4o-mini, o1, o3
  - Base URL: `https://api.openai.com`
  - Auth header: `Authorization: Bearer <key>`
  - Models endpoint: `GET /v1/models`

- **Anthropic** (`anthropic`) - Claude Opus, Sonnet, Haiku
  - Base URL: `https://api.anthropic.com`
  - Auth header: `x-api-key: <key>` (distinct from all others)
  - Models endpoint: `GET /v1/models`

- **Google AI** (`google`) - Gemini 2.5 Pro, Flash, Ultra
  - Base URL: `https://generativelanguage.googleapis.com`
  - Auth header: `Authorization: Bearer <key>`
  - Models endpoint: `GET /v1beta/models`

- **Azure OpenAI** (`azure`) - GPT-4o, GPT-4 Turbo
  - Base URL: `https://YOUR_RESOURCE.openai.azure.com` (per-org custom)
  - Auth header: `api-key: <key>`
  - Models endpoint: `GET /openai/models?api-version=2024-02-01`

- **Mistral AI** (`mistral`) - Mistral Large, Medium, Small
  - Base URL: `https://api.mistral.ai`
  - Auth header: `Authorization: Bearer <key>`

- **Cohere** (`cohere`) - Command R+, Embed, Rerank
  - Base URL: `https://api.cohere.ai`
  - Auth header: `Authorization: Bearer <key>`

- **DeepSeek** (`deepseek`) - DeepSeek-V3, DeepSeek-R1
  - Base URL: `https://api.deepseek.com`
  - Auth header: `Authorization: Bearer <key>`
  - Models endpoint: `GET /models`

- **Qwen / Alibaba** (`qwen`) - Qwen-Max, Plus, Turbo
  - Base URL: `https://dashscope.aliyuncs.com/compatible-mode`
  - Auth header: `Authorization: Bearer <key>`

- **GLM / Zhipu AI** (`glm`) - GLM-4, GLM-4-Flash
  - Base URL: `https://open.bigmodel.cn`
  - Auth header: `Authorization: Bearer <key>`
  - Models endpoint: `GET /api/paas/v4/models`

- **Doubao / ByteDance** (`doubao`) - Doubao-Pro, Doubao-Lite
  - Base URL: `https://ark.cn-beijing.volces.com`
  - Auth header: `Authorization: Bearer <key>`

- **Custom / OpenAI-compatible** (`custom`) - Any OpenAI-compatible endpoint
  - Base URL: per-org configurable (`base_url` column on `app_provider_keys`)
  - Auth header: `Authorization: Bearer <key>`

Provider definitions live in `src/lib/server/providers.ts`.

**LiteLLM Proxy (internal service):**
- SDK/Client: Raw `fetch()` calls in `src/lib/server/gateway/proxy.ts` and `src/lib/server/litellm.ts`
- URL: `LITELLM_API_URL` env var (default: `http://localhost:4000`)
- Auth: `Authorization: Bearer ${LITELLM_MASTER_KEY}`
- Endpoints used:
  - `POST /v1/chat/completions` - Chat inference
  - `POST /v1/embeddings` - Embeddings
  - `GET /v1/models` - Model list
  - `POST /organization/new` - Create LiteLLM org on user org creation
- The SvelteKit app routes all `/v1/*` requests through LiteLLM after applying auth, budget, rate limit, caching, and smart routing middleware

## Data Storage

**Databases:**
- PostgreSQL 16 (primary data store)
  - Connection: `DATABASE_URL` env var
  - Client: `postgres` npm package + `drizzle-orm`
  - Pool config: `DB_POOL_MAX` (default 20), `DB_IDLE_TIMEOUT` (default 30s), `DB_CONNECT_TIMEOUT` (default 10s)
  - Connection singleton in `src/lib/server/db/index.ts`
  - Schema: 11 application tables, all prefixed `app_` to coexist with LiteLLM's Prisma-managed tables on the same database
  - Tables: `app_users`, `app_sessions`, `app_organizations`, `app_org_members`, `app_email_verifications`, `app_password_resets`, `app_provider_keys`, `app_api_keys`, `app_usage_logs`, `app_oauth_accounts`, `app_org_invitations`, `app_budgets`
  - Migrations output to `drizzle/` directory

**File Storage:**
- None - no file upload or object storage integration

**Caching:**
- Redis 7 (optional)
  - Connection: `REDIS_URL` env var (absent = caching disabled, app still works)
  - Client: `ioredis` 5.x, lazy singleton in `src/lib/server/redis.ts`
  - Use case 1: Response cache for non-streaming LLM calls. Key format: `cache:{orgId}:{sha256(model+messages)}`, TTL configured per-org in `app_organizations.cache_ttl_seconds` (default 3600s)
  - Use case 2: API key auth cache-aside. Key format: `auth:{keyHash}`, TTL: 60s. Avoids DB lookup on every gateway request.

## Authentication & Identity

**Auth Strategy:** Custom session-based auth — no third-party auth provider

**Password Auth:**
- Implementation: `src/lib/server/auth/password.ts`
- Hashing: argon2id via `@node-rs/argon2` (memoryCost=19456, timeCost=2, outputLen=32)

**Session Management:**
- Implementation: `src/lib/server/auth/session.ts`
- Sessions stored in `app_sessions` table
- Token: 32 random bytes, base32-encoded; stored in cookie
- Storage: SHA-256 hash of token stored in DB (cookie holds unhashed token)
- Duration: 30 days with 15-day sliding window renewal
- Cookie: `auth_session`, httpOnly, sameSite=lax, secure in HTTPS context
- Session validation runs in `src/hooks.server.ts` on every non-`/v1/*` request

**OAuth Providers (optional):**
- Library: `arctic` 3.x
- Config: `src/lib/server/auth/oauth.ts`
- Google OAuth 2.0
  - Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Callback: `{APP_URL}/auth/oauth/google/callback`
  - Routes: `src/routes/auth/oauth/google/+server.ts`, `src/routes/auth/oauth/google/callback/+server.ts`
- GitHub OAuth
  - Env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Callback: `{APP_URL}/auth/oauth/github/callback`
  - Routes: `src/routes/auth/oauth/github/+server.ts`, `src/routes/auth/oauth/github/callback/+server.ts`
- OAuth accounts stored in `app_oauth_accounts` table; users can link multiple OAuth providers

**API Key Auth (for gateway endpoints):**
- Keys prefixed `sk-th-`, SHA-256 hashed for DB storage
- Validated in `src/lib/server/gateway/auth.ts` on all `/v1/*` requests
- Auth result cached in Redis for 60s to reduce DB load

**Encryption:**
- Provider API keys encrypted at rest using AES-256-GCM
- Implementation: `src/lib/server/crypto.ts`
- Key: `ENCRYPTION_KEY` env var (must be 64 hex chars = 32 bytes)
- Format stored: `{iv_hex}:{ciphertext_hex}:{authTag_hex}`

## Monitoring & Observability

**Error Tracking:**
- None detected - no Sentry or similar SDK

**Logs:**
- `console.warn` / `console.error` for non-critical failures (LiteLLM unavailable, SMTP missing, etc.)
- Usage logs written to `app_usage_logs` table on every gateway request (fire-and-forget, non-blocking)

## CI/CD & Deployment

**Hosting:**
- Docker Compose (`docker-compose.yml`) - recommended self-hosted deployment
- Services: `app` (port 3000), `litellm` (port 4000), `postgres`, `redis`
- `litellm` uses image `ghcr.io/berriai/litellm:main-latest`

**CI Pipeline:**
- Not detected - no `.github/workflows/` directory

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `ENCRYPTION_KEY` - 64 hex chars, AES-256-GCM key for provider key encryption
- `CRON_SECRET` - Bearer token for `/api/cron/*` endpoint auth

**Optional env vars:**
- `REDIS_URL` - Redis connection; disabling silently turns off caching
- `LITELLM_API_URL` - LiteLLM proxy URL (default: `http://localhost:4000`)
- `LITELLM_MASTER_KEY` - LiteLLM admin key
- `APP_URL` - Public URL (used in OAuth callbacks and email links; default: `http://localhost:3000`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Transactional email
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `CORS_ALLOWED_ORIGINS` - Comma-separated allowed origins for `/v1/*` (default: `APP_URL`)
- `MAX_REQUEST_BODY_BYTES` - Max gateway request body size (default: 10485760 = 10MB)
- `DB_POOL_MAX`, `DB_IDLE_TIMEOUT`, `DB_CONNECT_TIMEOUT` - DB pool tuning

**Secrets location:**
- `.env` file at project root (not committed; `.env.example` is the template)

## Webhooks & Callbacks

**Incoming (cron endpoints):**
- `GET /api/cron/cleanup` - Deletes expired sessions; authenticated via `Authorization: Bearer {CRON_SECRET}`
- `GET /api/cron/digest` - Sends admin budget digest emails for all orgs; authenticated via `Authorization: Bearer {CRON_SECRET}`
- These are designed to be called by an external scheduler (e.g., cron job, Vercel Cron, Render Cron)

**Outgoing:**
- None - no outgoing webhooks

## Email (Transactional)

- Transport: SMTP via `nodemailer`; configured with `SMTP_*` env vars
- Implementation: `src/lib/server/auth/email.ts`
- Email types sent (templates in `src/lib/server/auth/emails/`):
  - `verification.ts` - Email address verification on signup
  - `password-reset.ts` - Password reset link
  - `invitation.ts` - Org member invitation
  - `budget-warning.ts` - Budget soft limit notification to member
  - `admin-digest.ts` - Daily spend digest to org admins
- Gracefully degrades: SMTP not configured = emails not sent (except auth flows throw on missing transport)

---

*Integration audit: 2026-03-17*
