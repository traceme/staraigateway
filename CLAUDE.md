# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StarAIGateway** (企业AI中台) is a reference architecture for enterprise AI tool sharing — enabling 20-100 person teams to share access to Claude, ChatGPT, Gemini and other LLMs at 40-60% lower cost than per-seat subscriptions. It bundles three open-source projects as subfolders:

| Component | Role | Tech Stack |
|---|---|---|
| **Open WebUI** (`open-webui/`) | Web chat frontend — multi-user AI platform with RAG, file handling, voice | SvelteKit frontend, Python/FastAPI backend, SQLite/PostgreSQL |
| **LiteLLM** (`litellm/`) | API gateway — unified proxy for 100+ LLM providers with cost tracking, budgets, routing | Python/FastAPI, Prisma ORM, PostgreSQL |
| **LibreChat** (`LibreChat/`) | Alternative frontend — native multi-provider support, MCP integration, MongoDB-backed | React/TypeScript frontend, Node.js/Express backend, MongoDB |

The guide document (`compass_artifact_*.md`) describes the cost optimization strategy and deployment architecture.

## Architecture

```
Users (Browser / IDE / CLI)
         |
    Nginx (HTTPS + SSO)
         |
  ┌──────┴──────┐
  │  Open WebUI │  ← Web chat UI (port 3000→8080)
  │  or LibreChat│
  └──────┬──────┘
         │ OpenAI-compatible API
  ┌──────┴──────┐
  │   LiteLLM   │  ← API Gateway (port 4000)
  │  (proxy)    │     Virtual Keys, budgets, routing, caching
  └──┬────┬────┬┘
     │    │    │
  OpenAI Claude Gemini   ← Multiple LLM providers
```

Key integration point: Open WebUI connects to LiteLLM via `OPENAI_API_BASE_URL=http://litellm:4000/v1`. IDE plugins (Cursor, Continue.dev, Claude Code CLI) also point at LiteLLM's `/v1/chat/completions` endpoint.

## Development Commands

Each subproject has its own build/test workflow. See their individual CLAUDE.md or README for details.

### LiteLLM (`litellm/`)
```bash
make install-dev              # Install dev deps
make test-unit                # Unit tests (4 parallel workers)
make lint                     # Ruff + MyPy + Black + import checks
poetry run litellm --config dev_config.yaml --port 4000  # Start proxy
cd ui/litellm-dashboard && npm run dev   # Dashboard dev server
```

### LibreChat (`LibreChat/`)
```bash
npm run smart-reinstall       # Install deps + Turborepo build
npm run backend:dev           # Backend with file watching
npm run frontend:dev          # Frontend HMR (port 3090)
npm run build:data-provider   # Rebuild shared types after changes
cd api && npx jest <pattern>  # Run backend tests
```
Requires Node.js v20.19.0+ and MongoDB.

### Open WebUI (`open-webui/`)
```bash
# Docker-based workflow
make install                  # docker compose up -d
make startAndBuild            # Rebuild and start
make update                   # Pull, rebuild, restart
# Local dev
cd backend && pip install -r requirements.txt
npm install && npm run dev    # SvelteKit frontend
```

### Full Stack (Docker Compose)
The recommended deployment uses `docker-compose.yml` combining LiteLLM + chosen frontend. See the guide document for config examples.

## Cross-Project Considerations

- **API compatibility**: LiteLLM exposes OpenAI-compatible endpoints. Both frontends connect to it using the OpenAI SDK format. When modifying LiteLLM's API surface, verify both frontends still work.
- **Virtual Keys**: LiteLLM issues per-user/team keys with budget limits. These are passed to frontends and IDE plugins as `OPENAI_API_KEY`.
- **Model routing**: LiteLLM routes requests to cheaper models (GPT-4o-mini, Haiku) for simple tasks and expensive models for complex ones. Routing config lives in LiteLLM's YAML config.
- **Each subproject has its own CLAUDE.md** with detailed architecture and code style rules — read those before making changes in that subproject.
