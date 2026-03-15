# Codebase Structure

**Analysis Date:** 2026-03-15

## Directory Layout

```
llmtokenhub/
├── LibreChat/                    # Node.js monorepo (Chat + Agents)
│   ├── api/                      # Express backend (legacy JS layer)
│   │   ├── server/               # HTTP server setup
│   │   │   ├── index.js          # Express app entry point (port 3080)
│   │   │   ├── routes/           # HTTP endpoint handlers
│   │   │   ├── middleware/       # Auth, CORS, logging, rate limiting
│   │   │   ├── services/         # Thin wrappers around packages/api
│   │   │   ├── controllers/      # Route handlers
│   │   │   └── utils/            # Utilities
│   │   ├── config/               # Configuration files
│   │   ├── db/                   # Database utilities (Mongoose)
│   │   ├── models/               # Data models
│   │   ├── cache/                # Caching logic
│   │   └── test/                 # Jest tests
│   │
│   ├── packages/                 # Workspace packages (monorepo)
│   │   ├── api/                  # NEW TypeScript backend code
│   │   │   ├── src/
│   │   │   │   ├── services/     # Business logic classes
│   │   │   │   ├── types/        # TypeScript interfaces
│   │   │   │   ├── utils/        # Helper functions
│   │   │   │   └── index.ts      # Export public API
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── data-schemas/         # Shared database schemas
│   │   │   ├── src/
│   │   │   │   ├── models/       # Mongoose schemas
│   │   │   │   └── types.ts      # Zod/TypeScript types
│   │   │   └── package.json
│   │   │
│   │   ├── data-provider/        # Shared API client + types
│   │   │   ├── src/
│   │   │   │   ├── api-endpoints.ts      # API URLs
│   │   │   │   ├── data-service.ts       # HTTP client methods
│   │   │   │   ├── types/                # Shared types
│   │   │   │   │   ├── queries.ts        # Query types
│   │   │   │   │   └── ...
│   │   │   │   └── keys.ts              # React Query key factory
│   │   │   └── package.json
│   │   │
│   │   └── client/               # Frontend utilities
│   │       ├── src/
│   │       │   ├── components/   # Reusable components
│   │       │   ├── hooks/        # Reusable hooks
│   │       │   └── utils/        # Utilities
│   │       └── package.json
│   │
│   ├── client/                   # React frontend SPA
│   │   ├── public/               # Static assets
│   │   ├── src/
│   │   │   ├── pages/            # Route pages
│   │   │   ├── components/       # Semantic component groups
│   │   │   ├── data-provider/    # React Query integration
│   │   │   │   ├── [Feature]/
│   │   │   │   │   ├── queries.ts        # React Query hooks
│   │   │   │   │   └── index.ts         # Export
│   │   │   │   └── index.ts              # Aggregate exports
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── locales/          # i18n translations (en/ja/zh/etc)
│   │   │   │   └── en/
│   │   │   │       └── translation.json # English keys (source of truth)
│   │   │   ├── styles/           # Global CSS
│   │   │   └── main.tsx          # React entry point
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts        # Vite build config
│   │
│   ├── e2e/                      # Playwright end-to-end tests
│   │   ├── specs/                # Test suites
│   │   ├── setup/                # Test fixtures
│   │   ├── auth.json             # Saved auth state
│   │   └── playwright.config.ts
│   │
│   ├── config/                   # Root configuration scripts
│   │   ├── update.js             # Dependency updates
│   │   ├── create-user.js        # User management scripts
│   │   └── ...
│   │
│   ├── redis-config/             # Redis configuration
│   ├── utils/                    # Root utilities
│   ├── package.json              # Root workspace definition
│   ├── tsconfig.json             # TypeScript config
│   └── turbo.json                # Turborepo build config
│
├── litellm/                      # Python LLM gateway + proxy
│   ├── litellm/                  # Main package
│   │   ├── main.py               # Public API: completion(), embedding()
│   │   ├── router.py             # Load balancing + fallback
│   │   ├── types/                # Pydantic models
│   │   │   └── router.py         # Router type definitions
│   │   │
│   │   ├── llms/                 # Provider implementations
│   │   │   ├── openai/           # OpenAI provider
│   │   │   │   ├── chat/
│   │   │   │   │   └── transformation.py # Request/response mapping
│   │   │   │   ├── embedding/
│   │   │   │   └── __init__.py
│   │   │   ├── anthropic/        # Claude provider
│   │   │   ├── google/           # Vertex AI / Gemini
│   │   │   ├── vertex_ai/
│   │   │   ├── cohere/
│   │   │   ├── custom_httpx/
│   │   │   │   └── llm_http_handler.py  # Unified HTTP client
│   │   │   └── base_llm.py       # Base provider class
│   │   │
│   │   ├── proxy/                # API Gateway (FastAPI)
│   │   │   ├── proxy_server.py           # Main FastAPI app (510KB)
│   │   │   ├── route_llm_request.py      # Request routing logic
│   │   │   ├── common_utils/             # Shared proxy utilities
│   │   │   ├── common_request_processing.py # Request validation
│   │   │   │
│   │   │   ├── auth/                    # Authentication
│   │   │   │   ├── auth.py              # API key validation
│   │   │   │   ├── service_auth.py      # JWT/OAuth2
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── db/                      # Database layer
│   │   │   │   ├── db_prisma.py         # Prisma client wrapper
│   │   │   │   ├── db_spend_update_writer.py # Batch spend tracking
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── management_endpoints/    # Admin APIs
│   │   │   │   ├── keys.py              # API key management
│   │   │   │   ├── teams.py
│   │   │   │   ├── models.py
│   │   │   │   ├── spend.py
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── pass_through_endpoints/  # Provider forwarding
│   │   │   │   ├── openai_endpoints.py
│   │   │   │   ├── anthropic_endpoints.py
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── hooks/                   # Request interceptors
│   │   │   │   ├── max_budget_limiter.py
│   │   │   │   ├── parallel_request_limiter_v3.py
│   │   │   │   ├── cache_control_check.py
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── guardrails/              # Safety filtering
│   │   │   ├── middleware/              # FastAPI middleware
│   │   │   ├── schema.prisma            # Database schema
│   │   │   ├── utils.py                 # 217KB utilities file
│   │   │   │
│   │   │   ├── _experimental/out/       # Pre-built Next.js UI
│   │   │   └── example_config_yaml/     # Config templates
│   │   │
│   │   ├── integrations/               # Third-party integrations
│   │   │   ├── logging_callback.py      # Custom logger base class
│   │   │   ├── langfuse.py
│   │   │   ├── helicone.py
│   │   │   └── ...
│   │   │
│   │   ├── caching/                    # Cache backends
│   │   │   ├── caching.py              # Cache interface
│   │   │   ├── redis_cache.py
│   │   │   └── ...
│   │   │
│   │   ├── router_utils/               # Router helpers
│   │   ├── litellm_core_utils/         # Core utilities
│   │   └── cost_calculator.py          # Pricing logic
│   │
│   ├── ui/                       # Next.js dashboard
│   │   └── litellm-dashboard/
│   │       ├── src/
│   │       │   ├── app/          # Next.js routes
│   │       │   ├── components/   # React components
│   │       │   ├── hooks/        # Custom hooks
│   │       │   ├── utils/        # Helpers
│   │       │   └── pages/        # Legacy page routes
│   │       ├── public/
│   │       │   └── assets/
│   │       │       └── logos/    # Provider logos
│   │       └── package.json
│   │
│   ├── tests/                    # Comprehensive test suite
│   │   ├── test_litellm/         # Unit tests
│   │   ├── llm_translation/      # Provider translation tests
│   │   ├── proxy_unit_tests/     # Proxy unit tests
│   │   ├── proxy_e2e_tests/      # End-to-end tests
│   │   └── ...
│   │
│   ├── deploy/                   # Deployment configs
│   │   ├── kubernetes/
│   │   ├── charts/               # Helm charts
│   │   └── azure_resource_manager/
│   │
│   ├── pyproject.toml            # Poetry dependencies
│   ├── poetry.lock
│   └── Makefile                  # Development commands
│
├── open-webui/                   # SvelteKit frontend + FastAPI backend
│   ├── src/                      # SvelteKit frontend
│   │   ├── routes/               # File-based routing
│   │   │   ├── (app)/            # Authenticated app routes
│   │   │   ├── auth/             # Login/signup routes
│   │   │   ├── s/                # Shared/public routes
│   │   │   ├── watch/            # Monitoring routes
│   │   │   ├── +layout.svelte    # Root layout (27KB)
│   │   │   ├── +layout.js        # Data loading logic
│   │   │   └── +error.svelte     # Error page
│   │   │
│   │   └── lib/                  # Reusable components + stores
│   │       ├── components/       # Svelte components
│   │       ├── stores/           # Svelte stores
│   │       ├── hooks/            # Custom hooks
│   │       ├── utils/            # Utilities
│   │       ├── i18n/             # i18next localization
│   │       └── services/         # API clients
│   │
│   ├── backend/                  # FastAPI backend (Python)
│   │   ├── open_webui/           # Main package
│   │   │   ├── app.py            # FastAPI application
│   │   │   ├── main.py           # Entry point
│   │   │   │
│   │   │   ├── routes/           # FastAPI route handlers
│   │   │   │   ├── llms.py       # LLM endpoints
│   │   │   │   ├── chat.py       # Chat endpoints
│   │   │   │   ├── files.py      # File upload endpoints
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── models/           # Pydantic models
│   │   │   ├── services/         # Business logic
│   │   │   │   ├── llm_service.py    # LLM interaction
│   │   │   │   ├── rag_service.py    # Retrieval-augmented generation
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── db/               # Database layer
│   │   │   ├── middleware/       # Auth, CORS, logging
│   │   │   ├── utils/            # Helpers
│   │   │   └── config.py         # Configuration
│   │   │
│   │   └── data/                 # SQLite data files (generated)
│   │
│   ├── cypress/                  # E2E tests
│   │   ├── e2e/                  # Test specs
│   │   ├── support/              # Test helpers
│   │   └── data/                 # Test fixtures
│   │
│   ├── test/                     # Unit tests
│   │   └── test_files/           # Test data
│   │
│   ├── static/                   # Static assets
│   │   ├── audio/
│   │   ├── pyodide/              # Python runtime
│   │   ├── sql.js/
│   │   ├── themes/
│   │   └── assets/
│   │
│   ├── scripts/                  # Build scripts
│   │   └── prepare-pyodide.js    # Fetch Pyodide
│   │
│   ├── package.json              # Frontend dependencies
│   ├── vite.config.ts            # Vite config
│   ├── svelte.config.js          # SvelteKit config
│   ├── tailwind.config.js        # Tailwind CSS config
│   └── tsconfig.json
│
└── .planning/codebase/          # Codebase documentation
    ├── ARCHITECTURE.md
    ├── STRUCTURE.md (this file)
    └── ...
```

---

## Directory Purposes

### LibreChat

**`/api`** — Express backend (legacy JavaScript)
- HTTP server and middleware orchestration
- Request routing to TypeScript packages
- Authentication, logging, rate limiting
- Keep minimal; delegate to `/packages/api`

**`/packages/api`** — TypeScript backend core (primary new development)
- Service classes with business logic
- Type-safe implementations
- Repository pattern for data access
- Where new backend features go

**`/packages/data-schemas`** — Shared database models
- Mongoose schemas for MongoDB
- Zod validation schemas
- Types used by both backend and frontend

**`/packages/data-provider`** — Shared API contract
- HTTP client methods (`data-service.ts`)
- API endpoint URL definitions
- React Query key factory
- Type definitions for API responses
- Used by both `/client` (frontend) and `/packages/api` (backend)

**`/packages/client`** — Shared frontend utilities
- Reusable React components
- Custom hooks
- UI utilities
- Imported by `/client`

**`/client`** — React frontend SPA (user-facing)
- Page components (routes)
- Feature components grouped semantically
- React Query integration (`data-provider/`)
- Localization in `locales/en/translation.json`

### LiteLLM

**`/litellm/main.py`** — Core library entry point
- `completion()`, `acompletion()`, `embedding()` functions
- Routes to provider implementations
- Central request/response handling

**`/litellm/router.py`** — Load balancing and fallback
- `Router` class for multi-model deployments
- Fallback chains on provider failure

**`/litellm/llms/`** — Provider implementations
- One subdirectory per provider (openai, anthropic, google, etc.)
- Each has `transformation.py` with `Config` class
- `Config.transform_request()` and `Config.transform_response()` methods
- Central HTTP handler at `custom_httpx/llm_http_handler.py`

**`/litellm/proxy/`** — API Gateway (FastAPI)
- `proxy_server.py` — Main application (510KB)
- `auth/` — API key validation, JWT, OAuth2
- `db/` — Prisma ORM wrapper (PostgreSQL/SQLite)
- `management_endpoints/` — Admin APIs (keys, teams, spend)
- `pass_through_endpoints/` — Provider-specific forwarding
- `hooks/` — Budget limits, rate limiting, cache control
- `utils.py` — Cost calculation, spend tracking (217KB)

**`/litellm/integrations/`** — Observability plugins
- Custom logger framework (`logging_callback.py`)
- Third-party integrations (Langfuse, Helicone, etc.)
- Async callbacks off main thread

### Open WebUI

**`/src/routes/`** — SvelteKit file-based routing
- `(app)/` — Authenticated routes
- `auth/` — Public auth routes
- `+layout.svelte` — Root layout (27KB, large)
- `+error.svelte` — Error page

**`/src/lib/`** — Reusable code
- `components/` — Svelte components
- `stores/` — Svelte reactive stores
- `utils/` — Helper functions
- `services/` — API clients

**`/backend/open_webui/`** — FastAPI backend
- `app.py` — FastAPI application initialization
- `routes/` — Endpoint handlers
- `models/` — Pydantic data validation
- `services/` — Business logic (LLM calls, RAG, etc.)
- `db/` — Database access layer

**`/backend/open_webui/services/`** — Business logic
- `llm_service.py` (conceptual) — LLM interaction (calls LiteLLM proxy)
- `rag_service.py` — Retrieval-augmented generation
- Other domain services

**`/static/`** — Static assets
- `pyodide/` — Python runtime (fetched at build time)
- `themes/` — Custom themes
- `assets/` — Images, icons, logos

---

## Key File Locations

### LibreChat

**Entry Points:**
- Backend: `api/server/index.js` (Express, port 3080)
- Frontend: `client/src/main.tsx` (React)
- Build system: `turbo.json`, `package.json` (workspace root)

**Configuration:**
- Workspace: `package.json` (root, defines workspaces)
- TypeScript: `tsconfig.json` (root)
- Testing: `e2e/playwright.config.ts` (Playwright), jest config per workspace

**Core Logic:**
- API types: `packages/data-provider/src/types/`
- Data service: `packages/data-provider/src/data-service.ts`
- Backend services: `packages/api/src/services/`
- Frontend pages: `client/src/pages/`

### LiteLLM

**Entry Points:**
- SDK: `litellm/main.py` (completion/embedding/image functions)
- Proxy: `litellm/proxy/proxy_server.py` (FastAPI, port 4000)
- Router: `litellm/router.py` (load balancing)

**Configuration:**
- Dependencies: `pyproject.toml`
- Proxy config: `litellm/proxy/example_config_yaml/` (YAML templates)
- Database schema: `litellm/proxy/schema.prisma`

**Provider Implementations:**
- Provider base: `litellm/llms/base_llm.py`
- Example provider: `litellm/llms/openai/chat/transformation.py`
- HTTP handler: `litellm/llms/custom_httpx/llm_http_handler.py`

### Open WebUI

**Entry Points:**
- Frontend: `src/routes/+layout.svelte` (root layout)
- Backend: `backend/open_webui/app.py` (FastAPI)
- Build: `package.json`, `vite.config.ts`

**Configuration:**
- Frontend: `svelte.config.js`, `tailwind.config.js`
- Backend: `backend/open_webui/config.py`
- Environment: `.env` file (not in repo)

**Integration with LiteLLM:**
- LLM service: `backend/open_webui/services/` (calls LiteLLM proxy)
- Config: Environment variable `LITELLM_PROXY_URL`

---

## Naming Conventions

### Files

**LibreChat:**
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Services: `camelCase.ts` (e.g., `authService.ts`)
- Test files: `*.test.ts` or `*.spec.ts`

**LiteLLM:**
- Modules: `snake_case.py` (e.g., `cost_calculator.py`)
- Classes: `PascalCase` inside files
- Tests: `test_*.py` (e.g., `test_router.py`)

**Open WebUI:**
- Components: `PascalCase.svelte` (e.g., `ChatWindow.svelte`)
- Routes: `+page.svelte`, `+layout.svelte`
- Utilities: `camelCase.ts` (e.g., `formatMessage.ts`)
- Stores: `camelCase.ts` (e.g., `chatStore.ts`)

### Directories

**LibreChat:**
- Features: Semantic names (e.g., `Assistants`, `Conversations`)
- Utilities: `utils/`, `helpers/`
- Tests: `__tests__/` or `test/`

**LiteLLM:**
- Providers: Lowercase provider names (e.g., `openai/`, `anthropic/`)
- Endpoints: `*_endpoints/` (e.g., `pass_through_endpoints/`)
- Tests: `test_*/` or `*_test.py`

**Open WebUI:**
- Routes: Semantic names (e.g., `auth`, `chat`, `settings`)
- Features: Grouped by domain (e.g., `components/Chat/`, `stores/chat/`)

---

## Where to Add New Code

### New Feature in LibreChat

1. **API endpoint + backend logic:**
   - Add TypeScript service: `packages/api/src/services/[Feature]Service.ts`
   - Add type definitions: `packages/data-schemas/src/types/[Feature].ts`
   - Add API client: `packages/data-provider/src/api-endpoints.ts` (endpoint URL) and `data-service.ts` (method)
   - Wrap in Express: `api/server/routes/[feature].js` (thin wrapper calling `/packages/api`)

2. **Frontend component:**
   - Component: `client/src/components/[Feature]/[Component].tsx`
   - React Query hook: `client/src/data-provider/[Feature]/queries.ts` (import from `packages/data-provider`)
   - Feature index: `client/src/data-provider/[Feature]/index.ts` (export hook)
   - Root export: Update `client/src/data-provider/index.ts`
   - Page route: `client/src/pages/[route].tsx`

3. **Database schema:**
   - Add Mongoose schema: `packages/data-schemas/src/models/[Model].ts`
   - Export from index: `packages/data-schemas/src/index.ts`

### New LLM Provider in LiteLLM

1. **Provider implementation:**
   - Create directory: `litellm/llms/[provider]/`
   - Add transformation: `litellm/llms/[provider]/chat/transformation.py`
   - Implement `Config` class with `transform_request()` and `transform_response()`
   - Import in `litellm/llms/[provider]/__init__.py`

2. **Register in proxy:**
   - Add provider config in YAML (see `example_config_yaml/`)
   - Add endpoint forwarding if needed: `litellm/proxy/[provider]_endpoints.py`

3. **Add tests:**
   - Unit test: `tests/llm_translation/test_[provider]_chat.py`
   - Provider translation test: instantiate `Config`, call `transform_request()`/`transform_response()`

### New Route in Open WebUI

1. **Backend endpoint:**
   - Add handler: `backend/open_webui/routes/[feature].py` (FastAPI router)
   - Add model: `backend/open_webui/models/[feature].py` (Pydantic)
   - Add service: `backend/open_webui/services/[feature]_service.py` (business logic)

2. **Frontend page:**
   - Create route directory: `src/routes/[route]/`
   - Add page: `src/routes/[route]/+page.svelte`
   - Add data loading: `src/routes/[route]/+page.ts` or `+page.js`
   - Add components: `src/lib/components/[Feature]/` (reusable parts)

3. **State management:**
   - Create store: `src/lib/stores/[feature]Store.ts`
   - Use in page/component

---

## Special Directories

### LibreChat

**`/config/`** — Root configuration scripts (not compiled)
- Generated/runtime configs
- Build scripts
- Database initialization

**`/redis-config/`** — Redis SSL certificates
- Generated at runtime
- Never committed

**`/e2e/`** — Playwright end-to-end tests
- Auto-generated on first run: `auth.json`, `storageState.json`
- Not committed

### LiteLLM

**`/dist/`** — Built distribution (generated)
- Python wheel files
- Not committed

**`/deploy/`** — Deployment configurations
- Kubernetes manifests
- Helm charts
- Cloud provider templates

**`/enterprise/`** — Enterprise-only features
- Optional licensing
- Gated behind environment variables

### Open WebUI

**`/static/`** — Static assets
- `pyodide/` — Fetched at build time (not in repo)
- `themes/` — Custom CSS themes
- Generated at build

**`/.svelte-kit/`** — SvelteKit build artifacts (generated)
- Not committed

**`/backend/data/`** — SQLite database files (generated)
- Generated at runtime
- Not committed

