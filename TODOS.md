# TODOS

## P1 — Should Do

### [TODO-5] Initialize git repo
- **What:** `git init` at root, create `.gitignore` (exclude `.env`, `*.key`, node_modules, __pycache__), initial commit with PRD + CLAUDE.md + TODOS.md.
- **Why:** No version control means no history, no collaboration, no backup for configuration work.
- **Effort:** S
- **Depends on:** None

## Completed

### [TODO-1] Production docker-compose.yml + .env.example ✅
- Written directly into PRD Section 四 with PostgreSQL, Redis, LiteLLM, Open WebUI, named volumes, health checks, depends_on, restart policies, pinned image tags, and .env.example.

### [TODO-2] LiteLLM config.yaml with routing + fallbacks ✅
- Written directly into PRD Section 四 as `litellm-config.yaml` with multi-provider models, fallback chains, Redis caching, and routing strategy explanation.

### [TODO-3] Verification & Troubleshooting section ✅
- Written directly into PRD Section 六 with curl verification commands, troubleshooting table, and upgrade flow.

### [TODO-4] Fix PRD structural + content gaps ✅
- Restored missing Sections 一 and 二
- Fixed cost math: table and body now both show $1,185/mo, added "vs 全员订阅" column
- Added user-system tradeoffs table (single-key vs per-user Virtual Key)
- Committed to Open WebUI as primary, LibreChat as blockquote alternative
- Added security best practices section
- Aligned port numbers (Open WebUI internal :8080, exposed :3000)
- Added architecture explanation with data flow description
