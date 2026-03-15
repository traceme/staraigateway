# External Integrations

**Analysis Date:** 2026-03-15

---

## LibreChat

### APIs & External Services

**LLM Providers:**
- OpenAI - GPT models
  - SDK: `openai` npm package
  - Auth: `OPENAI_API_KEY` environment variable
  - Implementation: `api/server/routes/` and `packages/api/` provider handlers

- Anthropic (Claude) - Claude models
  - SDK: `@anthropic-ai/sdk` (v0.73.0, pinned with overrides)
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Implementation: Provider-specific handlers in backend

- Google (Gemini, PaLM) - Vertex AI/Gemini models
  - SDK: Multiple Google Cloud SDKs
  - Auth: Google Cloud credentials

- Azure OpenAI - OpenAI-compatible endpoint
  - SDK: `openai` with custom endpoints
  - Auth: `AZURE_OPENAI_API_KEY`

**Model Context Protocol (MCP):**
- Server integration for LLM function calling
- MCP client in `packages/api/` (TypeScript)
- Supports HTTP, SSE, and stdio transports

**File Storage & Upload:**
- Local filesystem - Default storage in `api/data/` and `data/`
- No cloud storage integration detected in core
- Upload handling via multipart form data

### Data Storage

**Primary Database:**
- MongoDB
  - Connection: `MONGODB_URI` environment variable
  - Client: Mongoose (ODM for schema validation)
  - Purpose: User accounts, conversations, messages, settings
  - Location: `packages/data-schemas/` contains MongoDB schema definitions

**Session Management:**
- In-memory + Redis (optional)
- Socket.IO state management for active connections
- Authentication tokens via JWT in headers

**Caching:**
- Redis (optional) - For session/data caching
- In-memory cache - Default fallback

### Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `api/server/routes/auth/` and `packages/api/auth/`
  - Token generation and validation
  - Social login adapters available (OAuth2)

**Third-party OAuth:**
- Google OAuth2 - User signup/login
- GitHub OAuth2 - User signup/login
- Discord OAuth - User signup/login
- Microsoft Azure AD - Enterprise SSO

**Token Storage:**
- JWT access tokens stored in secure cookies (HttpOnly, Secure flags)
- Frontend stores tokens in session storage (not localStorage)

### Monitoring & Observability

**Error Tracking:**
- Sentry (optional integration)
- Custom error logging to MongoDB

**Logs:**
- Console logging during development
- Structured logs to MongoDB in production
- Socket.IO connection logging for debugging

### Webhooks & Callbacks

**Incoming:**
- No webhook endpoints detected

**Outgoing:**
- None detected in core integration

---

## litellm

### APIs & External Services

**LLM Provider SDKs:**
- **OpenAI** - GPT models
  - SDK: `openai` (>= 2.8.0)
  - Auth: `OPENAI_API_KEY` env var, stored in Prisma DB (proxy)
  - Implementation: `litellm/llms/openai/chat/transformation.py`
  - HTTP Handler: `litellm/llms/custom_httpx/llm_http_handler.py`

- **Anthropic** - Claude models
  - SDK: Built-in via httpx client
  - Auth: `ANTHROPIC_API_KEY` env var or DB-stored key
  - Implementation: `litellm/llms/anthropic/` transformation layer

- **Google** - Vertex AI, Gemini
  - SDK: `google-cloud-aiplatform` (>= 1.38.0, optional)
  - Auth: Google Cloud credentials, OAuth2
  - Implementation: Vertex AI endpoint handlers

- **Azure OpenAI** - OpenAI-compatible
  - SDK: `openai` with custom base URL
  - Auth: Azure API key + deployment name
  - Implementation: Custom endpoint routing in proxy

- **Cohere, Hugging Face, Replicate, Together AI** - 100+ provider support
  - SDK: Provider-specific or httpx-based
  - Auth: Per-provider API keys
  - Implementation: `litellm/llms/{provider}/` with transform classes

**Provider Pattern:**
- Each provider in `litellm/llms/{provider}/` directory
- `Config` class inherits `BaseConfig` with:
  - `transform_request()` - Normalize input to provider format
  - `transform_response()` - Normalize output to OpenAI format
- Central orchestration: `litellm/llms/custom_httpx/llm_http_handler.py`

**Model Context Protocol (MCP):**
- MCP server support in `litellm/integrations/`
- Tools and resource integration
- OAuth2 support for MCP credentials

### Data Storage

**Proxy Database:**
- **PostgreSQL** (production) or **SQLite** (development)
  - ORM: Prisma (^0.11.0)
  - Client: `prisma` Python client
  - Schema: `litellm/proxy/schema.prisma`
  - Migrations: `litellm/proxy/migrations/`
  - Purpose: API keys, models, teams, spend tracking, budgets

- **Key Tables:**
  - `litellm_keytable` - API key management with spend limits
  - `litellm_usertable` - User accounts
  - `litellm_teamtable` - Team/org grouping
  - `litellm_tooltable` - Function/tool definitions
  - `litellm_spendlogs` - Request cost tracking
  - `litellm_spendlogs_extended` - Detailed spend analytics
  - `litellm_mcpusercredentials` - MCP OAuth and BYOK credentials

**Caching Layers:**
- Redis (optional) - Distributed cache for key/user lookups via `redisvl`
- In-memory cache - Default (InternalUsageCache)
- Disk cache - `diskcache` (optional) for local deployments
- Model routing cache - Router caches in `litellm/router.py`

**Configuration:**
- YAML config files in `litellm/proxy/example_config_yaml/`
- Environment variables override config
- Database-backed model registry (dynamic model add/remove)

### Authentication & Identity

**Auth Provider:**
- Custom API key system with per-key rate limits and budgets
  - Key generation and validation in `litellm/proxy/auth/`
  - Key cache in `InternalUsageCache` (in-memory + Redis)

**Third-party Auth:**
- OAuth2/OpenID Connect via Authlib (^1.6.9)
  - Azure AD, Google, GitHub providers
  - SSO integration in `litellm/proxy/auth/oauth.py`
  - fastapi-sso (^0.16.0) for provider-specific flows

**MCP OAuth:**
- OAuth2 credential flow for MCP servers
  - Credentials stored in `litellm_mcpusercredentials` table
  - `"type"` field distinguishes OAuth2 vs. BYOK credentials
  - Auto-refresh for expired tokens

**Token Format:**
- Custom prefix format (e.g., `sk-1234...`) for API keys
- JWT tokens for SSO/OAuth flows
- Bearer token authentication in proxy requests

### Cloud Integration

**AWS:**
- boto3 (^1.40.76, optional) - S3 access
- IAM role support for proxy authentication

**Azure:**
- azure-identity (^1.15.0) - Azure authentication
- azure-keyvault-secrets (^4.8.0) - Secure credential storage
- azure-storage-blob (^12.25.1) - Blob storage
- azure-ai-documentintelligence - Document processing

**Google Cloud:**
- google-cloud-aiplatform (>= 1.38.0) - Vertex AI
- google-cloud-kms (^2.21.3) - Key management
- google-cloud-iam (^2.19.1) - IAM controls

### Monitoring & Observability

**Distributed Tracing:**
- OpenTelemetry (API/SDK/OTLP exporter, v1.28.0+)
  - Auto-instrumentation for FastAPI, SQLAlchemy, Redis, requests, httpx
  - OTLP exporter for external tracing backends

**LLM Observability:**
- Langfuse (^2.45.0) - LLM request tracking and evals
  - Integration via callback in `litellm/integrations/langfuse.py`

**Metrics:**
- Prometheus client (0.20.0) - Metrics collection
  - Proxy exposes `/metrics` endpoint for Prometheus scraping

**Profiling:**
- Pyroscope (^0.8, optional, not Windows) - Continuous profiling
  - Used for performance analysis in production

**Logging:**
- Structured logging via Python logging module
- Loguru (^0.7.3, open-webui) - Alternative structured logging

### Webhooks & Callbacks

**Incoming:**
- Webhook ingestion for provider events (not fully implemented)

**Outgoing:**
- Callback system for async LLM responses
  - Implemented in `litellm/integrations/callbacks/` (async off main thread)
  - Custom logger implementations can subscribe to request/response events

---

## open-webui

### APIs & External Services

**LLM Provider SDKs:**
- **OpenAI** - GPT models
  - SDK: `openai` (from requirements.txt)
  - Auth: `OPENAI_API_KEY` env var
  - Backend: `backend/routes/openai_routes.py`

- **Anthropic** - Claude models
  - SDK: `anthropic` (from requirements.txt)
  - Auth: `ANTHROPIC_API_KEY` env var
  - Backend: Direct API calls via httpx

- **Google** - Gemini, Vertex AI
  - SDK: `google-genai` (^1.66.0)
  - Auth: `GOOGLE_API_KEY` env var
  - Backend: Native Gemini API integration

- **100+ Other Providers** - Via LangChain integration
  - SDK: `langchain` (^1.2.10), `langchain-community` (^0.4.1)
  - Auth: Per-provider configuration
  - Purpose: Universal LLM abstraction

**Web Scraping & Document Processing:**
- Firecrawl (^4.18.0) - Web scraping
  - Auth: `FIRECRAWL_API_KEY` env var
  - Purpose: URL content extraction for RAG

**Speech & Audio:**
- faster-whisper (^1.2.1) - Speech-to-text
  - Model: Downloaded and cached locally
  - Purpose: Audio transcription

**Document Intelligence:**
- azure-ai-documentintelligence (^1.0.2) - Intelligent document parsing
  - Auth: Azure subscription key
  - Purpose: Extract text from complex documents

**File Storage:**
- Local filesystem - Default storage in `backend/data/`
- Azure Blob Storage (optional) - Cloud storage via `azure-storage-blob`
- Google Cloud Storage (optional) - Via `google-cloud-storage` (^3.9.0)
- S3 (optional) - AWS storage via `boto3`

### Data Storage

**Supported Databases:**
- **MongoDB** - Primary for document storage
  - Client: `pymongo`
  - Purpose: Conversations, messages, documents, settings

- **PostgreSQL** - Alternative relational DB
  - Adapter: `psycopg2-binary` (^2.9.11)
  - ORM: SQLAlchemy (^2.0.48)
  - Purpose: Users, sessions, embeddings metadata

- **SQLite** - Lightweight development/edge deployment
  - Purpose: Single-file database
  - Location: `data/` directory

- **MySQL / MariaDB** - Legacy support
  - Adapters: `PyMySQL` (^1.1.2), `mariadb` (^1.1.14)

**Vector Databases (RAG):**
- **ChromaDB** (^1.5.2) - Embedded vector store
  - Purpose: Semantic search on documents
  - Default option

- **Weaviate** (^4.20.3) - Self-hosted vector DB
  - Auth: API key configuration

- **Qdrant** (^1.17.0) - Vector search engine
  - Auth: URL + optional API key

- **Pinecone** (^6.0.2) - Cloud vector DB
  - Auth: API key + index name

- **Milvus** (^2.6.9) - Open-source vector DB
  - Purpose: Scalable embeddings

- **OpenSearch** (^3.1.0) - Elasticsearch alternative
  - Purpose: Full-text + vector search

**Embedding Models:**
- sentence-transformers (^5.2.3) - Local embedding generation
  - Models: Downloaded and cached locally
  - Purpose: Document embeddings for RAG

**Session Management:**
- Redis (optional) - Session storage via `starsessions[redis]`
- In-memory - Default fallback
- Auth: Redis connection string

### Authentication & Identity

**Auth Provider:**
- Custom user system with JWT tokens
  - Token generation: `PyJWT[crypto]` (^2.11.0)
  - Password hashing: `bcrypt` (^5.0.0) or `argon2-cffi`
  - Implementation: `backend/routes/auth_routes.py`

**Enterprise SSO:**
- LDAP/Active Directory
  - Library: `ldap3` (^2.9.1)
  - Purpose: Enterprise user sync

**Cloud Auth:**
- Azure Entra ID (Microsoft)
  - SDK: `@azure/msal-browser` (^4.5.0, frontend)
  - Backend: Authlib integration

- Google OAuth2
  - Purpose: User signup/login

**Social Login:**
- OpenID Connect compatible providers
- Authlib (^1.6.9) - OAuth2/OIDC abstraction

### File Upload & Processing

**Document Parsing:**
- **PDF**: PyPDF (^6.7.5)
- **Word (.docx)**: `python-pptx` (^1.0.2), `docx2txt` (^0.9)
- **PowerPoint (.pptx)**: `python-pptx` (^1.0.2)
- **Excel (.xlsx)**: `openpyxl` (^3.1.5), `xlrd` (^2.0.2)
- **Generic Office**: `unstructured` (^0.18.31), `fpdf2` (^2.8.7)
- **HTML/Web**: `beautifulsoup4`, `mammoth` (^1.11.0)
- **Markdown**: `marked` (^9.1.0, frontend), `Markdown` (^3.10.2, backend)
- **YAML**: `yaml` (^2.7.1, frontend)

**Image Processing:**
- Pillow (^12.1.1) - Image manipulation
- opencv-python-headless (^4.13.0.92) - Computer vision
- rapidocr-onnxruntime (^1.4.4) - OCR
- @mediapipe/tasks-vision (^0.10.17) - Vision tasks (frontend)

**Text Processing:**
- NLTK (^3.9.3) - Natural language processing
- ftfy (^6.3.1) - Unicode text fixes
- chardet (^5.2.0) - Character encoding detection

**Code Highlighting:**
- highlight.js (^11.9.0) - Syntax highlighting (frontend)
- shiki (^4.0.1) - Alternative code highlighting (frontend)

### Monitoring & Observability

**Distributed Tracing:**
- OpenTelemetry (v1.40.0)
  - Auto-instrumentation for FastAPI, SQLAlchemy, Redis, requests, httpx
  - OTLP exporter for centralized tracing

**Logging:**
- Loguru (^0.7.3) - Structured logging
  - Purpose: Application and request logging

**System Metrics:**
- psutil - System resource monitoring
- Memory/CPU tracking for health checks

### Real-time Communication

**WebSockets:**
- Socket.IO Client (^4.2.0, frontend) - Real-time updates
- python-socketio (^5.16.1, backend) - Server-side Socket.IO
- Purpose: Live streaming, message updates, presence

### Webhooks & Callbacks

**Incoming:**
- None detected in core

**Outgoing:**
- None detected in core

---

## Cross-Project Integration Points

### Shared Dependencies

| Package | LibreChat | litellm | open-webui |
|---------|-----------|---------|-----------|
| OpenAI SDK | ✓ | ✓ | ✓ |
| Anthropic SDK | ✓ | ✓ | ✓ |
| Google APIs | ✓ | ✓ | ✓ |
| LangChain | ✓ | ✓ | ✓ |
| MongoDB | ✓ | - | ✓ |
| PostgreSQL | - | ✓ | ✓ |
| Redis | optional | optional | optional |
| JWT/Auth | ✓ | ✓ | ✓ |

### Integration Patterns

**API Key Management:**
- LibreChat: Per-user API key storage (env vars or MongoDB)
- litellm: Proxy manages keys in PostgreSQL, distributes via API
- open-webui: Per-user API key storage (env vars or database)

**LLM Routing:**
- LibreChat: Direct provider calls or via litellm proxy
- litellm: Central proxy with load balancing and fallback
- open-webui: Direct provider calls or via external proxy

**Vector Search:**
- LibreChat: N/A (chat-only)
- litellm: No built-in RAG
- open-webui: ChromaDB or external vector DB (full RAG support)

**Authentication:**
- All three support JWT + custom auth
- All three support OAuth2 for SSO
- open-webui supports LDAP
- litellm supports MCP-specific OAuth

---

*Integration audit: 2026-03-15*
