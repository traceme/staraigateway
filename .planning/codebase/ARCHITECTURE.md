# Architecture

**Analysis Date:** 2026-03-15

## Overall Pattern

This is a **three-tier distributed LLM application stack** with request-response flow:

```
Open WebUI (Frontend + Backend) → LiteLLM Proxy (API Gateway) → LLM Providers
```

Each component is independently deployed but tightly integrated via HTTP/REST APIs.

---

## LibreChat Architecture

**Pattern:** Monorepo with Workspace Separation (API Backend + React Frontend)

### Workspaces

#### `/api` — Express Legacy Layer
- **Purpose:** HTTP entry point and middleware orchestration
- **Language:** JavaScript
- **Key Files:**
  - `api/server/index.js` — Express server initialization
  - `api/server/middleware/` — Request preprocessing (auth, logging, rate limiting)
  - `api/server/routes/` — HTTP route handlers (thin wrappers)
  - `api/server/services/` — Business logic (minimal; delegate to `/packages/api`)
  - `api/server/controllers/` — Route controllers (keep lightweight)

- **Responsibilities:**
  - Serve HTTP requests from frontend
  - Delegate to TypeScript packages for actual logic
  - Manage middleware chains (auth, CORS, body parsing)
  - Error handling and response formatting

#### `/packages/api` — TypeScript Backend Core
- **Purpose:** Primary business logic, type-safe implementation
- **Language:** TypeScript
- **Depends on:** `packages/data-schemas`, `packages/data-provider`
- **Key Abstractions:**
  - Service classes for domain logic
  - Repository pattern for data access
  - Type-safe request/response handling

#### `/packages/data-schemas` — Database Models
- **Purpose:** Shared schema definitions (Mongoose models, Zod types)
- **Consumed by:** Backend (`packages/api`) and Frontend (`client`)
- **Contains:**
  - MongoDB schema definitions
  - Type definitions used across projects
  - Validation schemas

#### `/packages/data-provider` — Shared API Contract
- **Purpose:** Unified API client and type definitions
- **Consumed by:** Frontend (`client`), Backend (`packages/api`)
- **Contains:**
  - `src/api-endpoints.ts` — API endpoint URLs
  - `src/data-service.ts` — HTTP client methods
  - `src/types/` — Shared type definitions
  - `src/keys.ts` — React Query key management

#### `/client` — React Frontend
- **Purpose:** User-facing web interface
- **Language:** TypeScript/React
- **Depends on:** `packages/data-provider`, `packages/client`
- **Structure:**
  - `src/pages/` — Page components
  - `src/components/` — Reusable UI components
  - `src/hooks/` — Custom React hooks
  - `src/data-provider/` — Feature-specific React Query integration
- **State Management:** React Query for server state, React hooks for local state

### Data Flow

1. **User Action** → Frontend (React component)
2. **API Request** → `packages/data-provider/data-service.ts` (HTTP client)
3. **HTTP Request** → `/api/server/routes/` (Express route handler)
4. **Processing** → `/packages/api/` (TypeScript business logic)
5. **Database** → MongoDB (via `packages/data-schemas`)
6. **Response** → Frontend (React Query cache update)

### Cross-Cutting Concerns

- **Logging:** Middleware in `api/server/middleware/`
- **Authentication:** JWT tokens, stored in headers
- **Validation:** Zod schemas in `packages/data-schemas`, validated at route entry
- **Error Handling:** Standardized error response format from `packages/api`

---

## LiteLLM Architecture

**Pattern:** Provider-Agnostic API Gateway with Plugin-Based Provider System

### Core Layers

#### `litellm/main.py` — Public API Entry Point
- **Purpose:** Unified interface for all LLM providers
- **Functions:**
  - `completion()` / `acompletion()` — Chat completions
  - `embedding()` — Text embeddings
  - `image_generation()` — Image generation
- **Responsibilities:**
  - Route requests to provider implementations
  - Apply caching and logging hooks
  - Handle streaming and async responses

#### `litellm/router.py` — Load Balancing & Fallback
- **Purpose:** Manage multiple model deployments, fallback chains
- **Contains:**
  - `Router` class with `acompletion()` method
  - Load balancing strategies (round-robin, least-cost)
  - Fallback logic (retry on provider failure)
- **Depends on:** `litellm/router_utils/`

#### `litellm/llms/` — Provider Implementations
- **Structure:** One subdirectory per provider (e.g., `openai/`, `anthropic/`, `vertex_ai/`)
- **Pattern:** Each provider has:
  - `chat/transformation.py` — Request/response translation
  - `Config` class inheriting `BaseConfig` with `transform_request()` and `transform_response()`
  - Async wrapper functions
- **Example:** `litellm/llms/openai/chat/transformation.py` converts OpenAI requests to provider-specific format
- **Central HTTP Handler:** `litellm/llms/custom_httpx/llm_http_handler.py` — Single HTTPX client for all provider requests

#### `litellm/integrations/` — Observability & Callbacks
- **Purpose:** Third-party integrations (logging, monitoring, caching)
- **Pattern:** Async callbacks off main thread
- **Contains:**
  - `logging_callback.py` — Custom logger framework
  - Provider-specific integrations (Langfuse, Helicone, etc.)
  - Structured logging and error tracking

#### `litellm/proxy/` — API Gateway Server
- **Purpose:** FastAPI application wrapping SDK with auth, rate limiting, cost tracking
- **Key Files:**
  - `proxy_server.py` (510KB) — Main FastAPI server
  - `auth/` — API key validation, JWT, OAuth2
  - `db/` — Prisma ORM for PostgreSQL/SQLite
  - `management_endpoints/` — Admin APIs (keys, teams, models, spend)
  - `pass_through_endpoints/` + provider-specific endpoints — Provider forwarding
  - `hooks/` — Budget limits, rate limiting, cache control
  - `guardrails/` — Safety filtering
  - `utils.py` (217KB) — Utilities (cost calculation, request processing)

### Data Flow

1. **Client Request** → `proxy_server.py` (FastAPI endpoint)
2. **Authentication** → `auth/` (validate API key, JWT)
3. **Rate Limiting** → `hooks/parallel_request_limiter_v3.py`
4. **Cost Check** → `hooks/max_budget_limiter.py`
5. **Provider Routing** → `route_llm_request.py` (select model/provider)
6. **Request Transformation** → `litellm/llms/{provider}/chat/transformation.py`
7. **HTTP Call** → `litellm/llms/custom_httpx/llm_http_handler.py`
8. **Response Translation** → Provider-specific `transform_response()`
9. **Logging/Callbacks** → `integrations/` (async, off-thread)
10. **Database Write** → `db/db_spend_update_writer.py` (batch spend updates)
11. **Response** → Client

### Configuration

- **YAML Config:** `proxy/example_config_yaml/` — Define models, keys, spending limits
- **Environment Variables:** API keys, database URL, auth secrets
- **Prisma Schema:** `proxy/schema.prisma` — Database structure for keys, teams, spend logs

---

## Open WebUI Architecture

**Pattern:** SvelteKit Frontend + FastAPI Backend with Unified LLM Interface

### Frontend Layer (`src/`)

**Framework:** SvelteKit (server-side rendering + client-side hydration)

- **Routes:** `src/routes/` — SvelteKit file-based routing
  - `(app)/` — Authenticated application routes
  - `auth/` — Login/signup
  - `s/` — Shared/public routes
  - `watch/` — Monitoring/debugging
- **Components:** `src/lib/` — Reusable Svelte components
- **Stores:** Svelte stores for reactive state management
- **HTTP Client:** `fetch()` with custom headers (auth, versioning)
- **Build Tool:** Vite (dev server, build bundling)
- **UI Framework:** Tailwind CSS + custom Svelte components

### Backend Layer (`backend/`)

**Framework:** FastAPI (Python)

- **Entry Point:** `backend/open_webui/app.py`
- **Structure:**
  - `routes/` — FastAPI route handlers
  - `models/` — Pydantic data models
  - `services/` — Business logic (LLM interactions, file processing, etc.)
  - `db/` — Database access (SQLite by default)
  - `middleware/` — Auth, CORS, logging
  - `utils/` — Helpers (RAG, file parsing, prompt engineering)

### Data Flow

1. **User Action** → Frontend (Svelte component)
2. **HTTP Request** → `backend/open_webui/routes/` (FastAPI endpoint)
3. **Processing** → `backend/open_webui/services/` (business logic)
4. **LLM Call** → LiteLLM Proxy (HTTP request to `http://litellm-proxy:4000`)
5. **LiteLLM Response** → Transformed and cached locally
6. **Database** → SQLite (conversation history, user settings)
7. **Response** → Frontend (JSON + streaming for long operations)

### Key Abstractions

- **LLM Interface:** Unified client that calls LiteLLM proxy endpoints
- **RAG System:** Vector embeddings + retrieval for document-based context
- **File Processing:** Parse PDF, DOCX, etc. into extractable text
- **Streaming:** Server-sent events (SSE) for progressive response delivery

---

## Integration Points

### 1. Open WebUI → LiteLLM Proxy

**Location:** `backend/open_webui/services/llm_service.py` (conceptual)

- **Protocol:** HTTP REST
- **Endpoints:**
  - `/v1/chat/completions` — Chat completions
  - `/v1/embeddings` — Text embeddings
  - `/v1/images/generations` — Image generation
- **Authentication:** API key in header (`Authorization: Bearer <key>`)
- **Response Format:** OpenAI-compatible JSON

### 2. LiteLLM Proxy → LLM Providers

**Location:** `litellm/proxy/route_llm_request.py`

- **Protocol:** Provider-specific HTTP (OpenAI, Anthropic, Google, etc.)
- **Transformation:** Each provider has custom `transform_request()` / `transform_response()`
- **Streaming:** Supported via HTTP streaming
- **Error Handling:** Fallback to alternate provider on failure

### 3. LibreChat → LiteLLM Proxy (Optional)

**Location:** `api/server/services/` (if enabled)

- **Protocol:** Same as Open WebUI (HTTP REST)
- **Use Case:** Alternative to direct provider connections; centralized cost tracking
- **Configuration:** Proxy URL in environment variables

---

## Entry Points

### LibreChat

- **Backend:** `api/server/index.js` — Starts Express on port 3080
- **Frontend:** `client/` — Built as static assets, served by backend
- **Development:** `npm run backend:dev` (watch mode)

### LiteLLM

- **Main Server:** `litellm/proxy/proxy_server.py` — FastAPI on port 4000
- **Startup:** `poetry run litellm --config <config.yaml> --port 4000`
- **Database:** Auto-migrates Prisma schema on startup

### Open WebUI

- **Frontend:** `src/routes/+layout.svelte` → `src/lib/` components
- **Backend:** `backend/open_webui/app.py` — FastAPI on port 8000
- **Development:** `npm run dev` (Vite dev server) + `python backend/main.py`

---

## Error Handling

**LibreChat:**
- Middleware catches errors in `api/server/middleware/`
- Standard JSON response: `{ error: "message", code: "ERROR_CODE" }`

**LiteLLM:**
- Provider-specific exceptions mapped to OpenAI-compatible errors
- Fallback routing on failure
- Comprehensive logging via `integrations/`

**Open WebUI:**
- FastAPI exception handlers convert errors to user-facing messages
- Streaming errors sent as special JSON frames
- Retry logic for transient failures

