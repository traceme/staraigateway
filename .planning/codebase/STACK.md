# Technology Stack

**Analysis Date:** 2026-03-15

## Project Overview

This monorepo contains three independent open-source projects:
1. **LibreChat** - Node.js/React AI chat application
2. **litellm** - Python/FastAPI unified LLM interface and proxy
3. **open-webui** - SvelteKit/Python FastAPI web UI for LLMs

---

## LibreChat (Node.js/React)

### Languages

**Primary:**
- TypeScript (v5.5.4+) - All new code in `/packages/api/`
- JavaScript (legacy) - Existing code in `/api/` (minimize changes)

**Secondary:**
- React/JSX - UI components in `/client/`

### Runtime

**Environment:**
- Node.js: v20.19.0+ or ^22.12.0 or >= 23.0.0
- Package Manager: npm v11.10.0

**Development:**
- Optional: Bun (alternative runtime with config/update.js, api/server/index.js support)

### Frameworks & Core

**Backend:**
- Express.js - Web server in `api/server/index.js` (legacy)
- TypeScript/Node.js - New backend in `packages/api/`
- Hono (v4.12.4) - Modern alternative for routing

**Frontend:**
- React (latest) - UI framework in `client/src/`
- Vite - Build tool and dev server (port 3090)
- React Query (@tanstack/react-query) - Data fetching and caching
- Tailwind CSS - Styling with typography and container queries

**Monorepo Management:**
- Turborepo (v2.8.12) - Build orchestration and caching
- npm workspaces - Workspace structure

### Key Dependencies

**Backend (packages/api, api):**
- `@librechat/agents` (major dependency from external source) - Agent framework
- `@anthropic-ai/sdk` (v0.73.0) - Anthropic API
- `mongodb` - Primary database client
- `mongoose` - ODM for MongoDB schema validation
- `axios` (v1.12.1) - HTTP client
- `socket.io` - Real-time communication for chat streaming
- `langchain` + `@langchain/community` - LLM abstractions
- `dotenv` - Environment variable loading
- `crypto` (native) - Encryption for sensitive data

**Frontend (client, packages/client):**
- `react-dom` - React rendering
- `react-router-dom` - Routing
- `react-virtualized` - Large list virtualization
- `axios` - HTTP client
- `file-saver` - File download utilities
- `dompurify` - HTML sanitization
- `highlight.js` - Code syntax highlighting
- `marked` - Markdown parsing
- `mermaid` - Diagram rendering
- `katex` - Math equation rendering
- `prismjs` + `prosemirror-*` - Rich text editing

**Shared (packages/data-provider, packages/data-schemas):**
- `pydantic` - Type validation (bridges Python/JS through shared schemas)
- `typescript` - Type definitions for TS projects

**Development:**
- Jest (v30.2.0) - Testing framework
- Playwright (v1.56.1) - E2E testing with accessibility testing (@axe-core/playwright)
- ESLint (v9.39.1) - Linting with plugins for React, JSX a11y, import sorting
- Prettier (v3.5.0) - Code formatting
- TypeScript ESLint (v8.24.0) - TS-specific linting
- Husky (v9.1.7) - Git hooks
- Nodemon - File watching for development

### Configuration Files

**Build/Dev:**
- `tsconfig.json` - TypeScript configuration
- `eslintrc` - ESLint rules
- `.prettierrc` - Code formatter config
- `playwright.config.*.ts` - E2E test configurations
- `e2e/` - E2E test files and storage state

**Database:**
- MongoDB connection string from environment

**Monorepo:**
- `turbo.json` - Turborepo task definitions
- `package.json` workspaces - `/api`, `/client`, `/packages/*`

---

## litellm (Python/FastAPI)

### Languages

**Primary:**
- Python 3.9 - 3.13 support
- YAML - Configuration files

**Secondary:**
- TypeScript/Next.js - UI dashboard in `ui/litellm-dashboard/`

### Runtime

**Environment:**
- Python 3.9+ (supported versions: 3.9, 3.10, 3.11, 3.12, 3.13)
- Package Manager: Poetry (v1.82.1)
- Lockfile: poetry.lock (present)

**Server:**
- Uvicorn (>= 0.32.1, < 1.0.0) - ASGI server
- Uvloop (optional, ^0.21.0, not Windows) - Performance enhancement
- Gunicorn (^23.0.0, optional) - Production WSGI server
- Hypercorn (^0.15.0, optional) - Alternative ASGI server

### Frameworks & Core

**Main Library (`litellm/`):**
- FastAPI (>= 0.120.1) - Web framework for proxy server
- Pydantic (^2.5.0) - Data validation and serialization
- httpx (>= 0.23.0) - HTTP client library (supports SOCKS, HTTP/2, Zstd, Brotli)
- aiohttp (>= 3.10) - Async HTTP client

**Provider Communication:**
- OpenAI SDK (>= 2.8.0) - OpenAI API
- `litellm/llms/custom_httpx/llm_http_handler.py` - Central HTTP orchestration
- Provider-specific transform layers in `litellm/llms/{provider}/chat/transformation.py`

**Router System:**
- Custom Router in `litellm/router.py` + `litellm/router_utils/` - Load balancing, fallback logic

**Async/Concurrency:**
- asyncio (native) - Async runtime
- APScheduler (^3.10.4) - Job scheduling
- RQ (Redis Queue, optional) - Background job queue

**Caching:**
- diskcache (^5.6.1, optional) - Local disk cache
- Redis (optional) - Distributed caching via `redisvl` (^0.4.1)
- Built-in memory cache

**Database:**
- Prisma (^0.11.0) - ORM for PostgreSQL/SQLite in proxy
- psycopg2-binary (>= 2.9.11) - PostgreSQL adapter
- SQLite (native) - Lightweight alternative DB
- alembic (^1.18.4) - Database migrations

**Authentication & Security:**
- PyJWT (^2.10.1) - JWT token handling
- cryptography (*) - Encryption/decryption
- PyNaCl (^1.5.0) - Encrypted credentials
- bcrypt (^5.0.0) - Password hashing
- argon2-cffi (^25.1.0) - Alternative password hashing
- Authlib (^1.6.9) - OAuth2 authentication
- python-jose (^3.5.0) - JWT alternative
- fastapi-sso (^0.16.0, optional) - Single Sign-On

**Configuration:**
- PyYAML (^6.0.1, optional) - YAML parsing for proxy config
- python-dotenv (>= 0.2.0) - Environment variable loading
- click (*) - CLI argument parsing

**Tokenization & LLM Utilities:**
- tiktoken (>= 0.7.0) - Token counting for OpenAI models
- tokenizers (*) - Hugging Face tokenizers
- transformers (5.3.0) - Model loading and inference
- sentence-transformers (5.2.3) - Embedding models

**Monitoring & Observability:**
- OpenTelemetry API/SDK/OTLP exporter (^1.28.0+ or ^1.40.0) - Distributed tracing
- Langfuse (^2.45.0, dev) - LLM observability
- Prometheus client (0.20.0, dev) - Metrics collection
- Pyroscope (^0.8, optional, not Windows) - Continuous profiling

**Cloud & Storage:**
- boto3 (^1.40.76, optional) - AWS SDK
- azure-identity (^1.15.0, optional) - Azure authentication
- azure-keyvault-secrets (^4.8.0, optional) - Azure Key Vault
- azure-storage-blob (^12.25.1, optional) - Azure Blob Storage
- google-cloud-aiplatform (>= 1.38.0, optional) - Vertex AI
- google-cloud-kms (^2.21.3, optional) - Google Cloud KMS
- google-cloud-iam (^2.19.1, optional) - Google Cloud IAM

**Webhooks & Communication:**
- websockets (^15.0.1, optional) - WebSocket support
- socket.io - Real-time communication

**Development & Testing:**
- pytest (^7.4.3) - Test framework
- pytest-asyncio (^0.21.1) - Async test support
- pytest-mock (^3.12.0) - Mocking utilities
- pytest-postgresql (^6.0.0) - PostgreSQL test fixtures
- pytest-xdist (^3.5.0) - Parallel test execution
- requests-mock (^1.12.1) - HTTP mocking
- responses (^0.25.7) - HTTP mocking library
- respx (^0.22.0) - HTTPX mocking
- Black (^23.12.0) - Code formatter
- Ruff (^0.2.1) - Linter
- MyPy (^1.0) - Type checker
- flake8 (^6.1.0) - Alternative linter

**UI Dashboard (Next.js in `ui/litellm-dashboard/`):**
- Node.js 18+, npm 6+
- Next.js - React framework
- Vitest - Unit testing
- React Testing Library - Component testing
- Tremor (deprecated) - Chart library (phasing out)

### Configuration Files

**Python:**
- `pyproject.toml` - Poetry project config, dependencies, build system
- `.env` file (not committed) - Environment variables
- `dev_config.yaml` - Development proxy server configuration

**Database:**
- `litellm/proxy/schema.prisma` - Prisma schema for PostgreSQL/SQLite
- `litellm/proxy/migrations/` - Database migration files

**Server:**
- `litellm/proxy/example_config_yaml/` - Example YAML configurations
- `Makefile` - Development commands

**UI:**
- `ui/litellm-dashboard/tsconfig.json` - TypeScript config
- `ui/litellm-dashboard/vitest.config.ts` - Test configuration

---

## open-webui (SvelteKit/Python FastAPI)

### Languages

**Primary:**
- TypeScript (v5.5.4) - Frontend code
- Python 3.10+ - Backend services

**Secondary:**
- Svelte (v5.0.0) - UI framework
- HTML/CSS/SCSS - Markup and styling

### Runtime

**Environment:**
- Node.js >= 18.13.0 and <= 22.x.x
- npm >= 6.0.0
- Python 3.10+ (see requirements.txt)

### Frameworks & Core

**Frontend (SvelteKit):**
- SvelteKit (^2.5.27) - Meta-framework for Svelte
- Svelte (^5.0.0) - Reactive UI framework
- Vite (^5.4.21) - Build tool and dev server
- Tailwind CSS (^4.0.0) - Utility-first CSS
- PostCSS (^8.4.31) - CSS transformation

**Editor & Rich Text:**
- Tiptap (^3.0.7) - Headless WYSIWYG editor
- CodeMirror (^6.0.1) - Code editor
- Prosemirror - Collaborative editing foundation
- Lowlight (^3.3.0) - Syntax highlighting

**Data & Documents:**
- Marked (^9.1.0) - Markdown parsing
- Mermaid (^11.10.1) - Diagram rendering
- KaTeX (^0.16.22) - Math equations
- jsPDF (^4.0.0) - PDF generation
- Mammoth (^1.11.0) - DOCX parsing
- PyPDF (^6.7.5, Python) - PDF manipulation
- XLSX (^0.18.5) - Excel file handling

**Real-time Communication:**
- Socket.IO Client (^4.2.0) - WebSocket client
- python-socketio (^5.16.1, Python) - Socket.IO server

**File & Data Processing (Python backend):**
- FastAPI (^0.135.1) - Web framework
- Uvicorn[standard] (^0.41.0) - ASGI server
- Pydantic (^2.12.5) - Data validation
- SQLAlchemy (^2.0.48) - ORM
- Peewee (^3.19.0) - Lightweight ORM alternative

**Database Clients:**
- pymongo - MongoDB driver
- psycopg2-binary (^2.9.11) - PostgreSQL
- PyMySQL (^1.1.2) - MySQL
- mariadb (^1.1.14) - MariaDB
- oracledb (^3.4.2) - Oracle Database
- pymilvus (^2.6.9) - Milvus vector DB
- qdrant-client (^1.17.0) - Qdrant vector DB
- pinecone (^6.0.2) - Pinecone vector search
- weaviate-client (^4.20.3) - Weaviate vector DB
- opensearch-py (^3.1.0) - OpenSearch
- elasticsearch (^9.3.0) - Elasticsearch
- chromadb (^1.5.2) - Vector embeddings

**Authentication:**
- PyJWT[crypto] (^2.11.0) - JWT tokens
- Authlib (^1.6.9) - OAuth2/OpenID
- bcrypt (^5.0.0) - Password hashing
- argon2-cffi (^25.1.0) - Password hashing
- ldap3 (^2.9.1) - LDAP directory support
- @azure/msal-browser (^4.5.0, frontend) - Azure authentication
- python-jose (^3.5.0) - JWT alternative

**LLM & AI:**
- OpenAI SDK - OpenAI API
- Anthropic SDK - Claude API
- google-genai (^1.66.0) - Google Gemini API
- LangChain (^1.2.10) - LLM framework
- transformers (^5.3.0) - Hugging Face models
- sentence-transformers (^5.2.3) - Embeddings
- faster-whisper (^1.2.1) - Speech-to-text
- ONNX Runtime (^1.24.3) - Model inference
- Faster Whisper (^1.2.1) - Optimized speech recognition

**Document Processing:**
- unstructured (^0.18.31) - Document parsing
- PyPDF (^6.7.5) - PDF processing
- python-pptx (^1.0.2) - PowerPoint handling
- docx2txt (^0.9) - Word document extraction
- fpdf2 (^2.8.7) - PDF generation
- Pillow (^12.1.1) - Image processing
- opencv-python-headless (^4.13.0.92) - Computer vision
- rapidocr-onnxruntime (^1.4.4) - OCR

**Search & RAG:**
- ChromaDB (^1.5.2) - Vector embeddings
- Rank-BM25 (^0.2.2) - BM25 ranking
- Firecrawl (^4.18.0) - Web scraping
- ColBERT (^0.2.22) - Dense passage retrieval

**Utilities:**
- Requests (^2.32.5) - HTTP client
- HTTPX (^0.28.1) - Async HTTP client
- APScheduler (^3.11.2) - Job scheduling
- pycrdt (^0.12.47) - CRDTs for collaboration
- yjs (^13.6.27, frontend) - Conflict-free replicated data types
- Loguru (^0.7.3) - Structured logging
- Validators (^0.35.0) - Data validation
- Markdown (^3.10.2) - Markdown processing
- BeautifulSoup4 - HTML parsing
- RestrictedPython (^8.1) - Sandboxed Python execution

**Deployment & Infrastructure:**
- Docker (~7.1.0, test) - Containerization
- Playwright (^1.58.0) - Browser automation
- Starlette (^0.3.11) - ASGI toolkit
- Starlette-Compress (^1.7.0) - HTTP compression
- Brotli (^1.1.0) - Compression algorithm
- starsessions[redis] (^2.2.1) - Session management

**Frontend Utilities:**
- Yjs (^13.6.27) - Real-time collaboration
- Y-Prosemirror (^1.3.7) - Collaborative editing
- Y-Protocols (^1.0.7) - Protocol utilities
- Dayjs (^1.11.10) - Date/time library
- Fuse.js (^7.0.0) - Fuzzy search
- Sortable.js (^1.15.6) - Drag-and-drop
- DOMPurify (^3.2.6) - HTML sanitization
- Alpine.js (^3.15.0) - Lightweight reactivity
- i18next (^23.10.0) - Internationalization

**Development:**
- Cypress (^13.15.0) - E2E testing
- Vitest (^1.6.1) - Unit testing
- ESLint (^8.56.0) - Linting
- Prettier (^3.3.3) - Code formatting
- TypeScript ESLint - TS linting
- Black (^26.1.0, Python) - Python formatter
- Pylint - Python linter

### Configuration Files

**Frontend:**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `svelte.config.js` - SvelteKit configuration
- `vite.config.ts` - Vite build configuration
- `.env` (not committed) - Environment variables
- `i18next-parser.config.ts` - i18n configuration

**Backend:**
- `backend/requirements.txt` - Python dependencies
- `pyproject.toml` - Python project configuration
- `.env` (not committed) - Environment variables

**Database:**
- SQLite or PostgreSQL or MongoDB configured via environment

---

## Comparison Matrix

| Aspect | LibreChat | litellm | open-webui |
|--------|-----------|---------|-----------|
| **Backend** | Node.js/Express | Python/FastAPI | Python/FastAPI + SvelteKit |
| **Frontend** | React + Vite | Next.js dashboard | Svelte + Vite |
| **Database** | MongoDB | PostgreSQL/SQLite (Prisma) | Multiple (MongoDB, PostgreSQL, SQLite, etc.) |
| **Package Mgr** | npm | Poetry | npm + pip |
| **Testing** | Jest + Playwright | pytest + vitest | Cypress + vitest + pytest |
| **Real-time** | Socket.IO | WebSockets | Socket.IO |
| **Primary Use** | Chat UI | LLM Proxy/Router | Web UI for LLMs |

---

*Stack analysis: 2026-03-15*
