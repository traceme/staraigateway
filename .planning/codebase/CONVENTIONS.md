# Coding Conventions

**Analysis Date:** 2026-03-15

This document covers coding conventions across three projects in the monorepo: **LibreChat** (Node.js/React/TypeScript), **litellm** (Python), and **open-webui** (SvelteKit/Python).

---

## LibreChat (Node.js/TypeScript/React)

### Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `SidePanel.tsx`, `UserProfile.tsx`)
- Test files: `.test.ts`, `.test.tsx`, or `.spec.ts` suffix alongside source
- Config files: camelCase or PascalCase (e.g., `jest.config.mjs`, `tsconfig.json`)

**Functions/Variables:**
- camelCase for all functions, variables, hooks (e.g., `generateToken`, `useLocalize`, `fetchMessages`)
- Private functions: prefix with `_` or use closure scope
- Custom hooks: `use` prefix (e.g., `useLocalize`, `useQuery`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)

**Types/Interfaces:**
- PascalCase for types and interfaces (e.g., `IUser`, `UserResponse`, `MessageConfig`)
- Prefix with `I` for interfaces when used across modules
- Extend common types from `packages/data-provider` rather than duplicating

**Localization Keys:**
- Semantic prefixes: `com_ui_`, `com_assistants_`, `com_nav_`, etc.
- Only update English keys in `client/src/locales/en/translation.json`
- Format: `com_context_action` (e.g., `com_ui_button_save`, `com_assistants_new`)

### Code Style

**Formatting:**
- Tool: **Prettier** via ESLint plugin
- Print width: 100 characters
- Tab width: 2 spaces (spaces, not tabs)
- Trailing commas: `"all"`
- Single quotes for strings (except JSX props use double quotes)
- Arrow function parentheses: always required
- Config: `.prettierrc` in root

**Linting:**
- Tool: **ESLint** with flat config (`eslint.config.mjs`)
- Extends: `eslint:recommended`, React, React Hooks, TypeScript, Jest, Prettier, JSX a11y plugins
- Tailwind CSS plugin: `prettier-plugin-tailwindcss` for class ordering
- Key rules:
  - `prettier/prettier`: error
  - `react/react-in-jsx-scope`: off (React 17+)
  - `import/no-cycle`: error (prevent circular dependencies)
  - `no-console`: off
  - `no-unused-vars`: warn with `argsIgnorePattern: '^_'`
  - `@typescript-eslint/no-explicit-any`: off
  - `react-hooks/rules-of-hooks`: error
  - `react-hooks/exhaustive-deps`: warn
  - i18n: `i18next/no-literal-string` error in JSX text only

### Import Organization

**Order (3 groups):**

1. **Package imports** — sorted by line length (shortest first)
   - Always: `react` first
   - Other package imports alphabetically

2. **Type imports** — `import type { ... }` statements sorted longest to shortest
   - Package types first, then local types
   - Line length resets between sub-groups

3. **Local/project imports** — sorted longest to shortest
   - Relative paths (e.g., `../utils`, `./components`)
   - Alias paths (e.g., `@src/`, `~/`)

**Examples:**

```typescript
// Package imports (shortest to longest line)
import react from 'react';
import { useCallback, useRef } from 'react';
import type { FC } from 'react';
import { useQuery } from '@tanstack/react-query';

// Type imports (standalone, longest to shortest)
import type { UserResponse, MessageListConfig } from '@src/types';
import type { Props } from './components/Card';

// Local imports (longest to shortest)
import { fetchUserMessages, validatePayload } from '@src/services/messageService';
import { useLocalize } from '@src/hooks';
import { logger } from '@src/utils';
import Card from './Card';
```

**Rules:**
- Multi-line imports: count total character length across all lines
- Consolidate value imports from same module
- Always use standalone `import type { ... }` — never inline `type` in value imports
- No dynamic imports unless absolutely necessary

### Error Handling

**Pattern:**
- Async functions use `try/catch`
- Error objects logged with full context (message, stack, code)
- API errors: map to standardized error types
- User-facing errors: use localized strings via `useLocalize()`

**Example:**

```typescript
async function fetchData(id: string) {
  try {
    const response = await request.get(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch user', { userId: id, error });
    throw new Error(`User fetch failed: ${error.message}`);
  }
}
```

### Logging

**Framework:** console (wrapped via `logger` utility)

**Pattern:**
- `logger.info()` for informational messages
- `logger.warn()` for warnings
- `logger.error()` for errors with stack trace
- Include context object: `logger.error('message', { userId, action, error })`

### Comments

**Rule:** Write self-documenting code; avoid inline comments narrating what code does.

**JSDoc usage:**
- Single-line for simple public APIs: `/** Fetches user by ID */`
- Multi-line for complex/non-obvious logic
- No comments for obvious code
- Avoid standalone `//` comments

**Example:**

```typescript
/**
 * Generates a JWT token for the given user.
 * @param user - User document with _id, email, provider
 * @param expiresIn - Token expiration in ms (default: 15 min)
 * @returns Encoded JWT token
 */
function generateToken(user: IUser, expiresIn = '15m'): string {
  // implementation
}
```

### Function Design

**Size:** Keep functions under 20 lines when possible; break complex logic into helpers

**Parameters:**
- Maximum 3 parameters; use object destructuring for more
- Use TypeScript types for all parameters

**Return values:**
- Always explicit return type
- Return early (flat code structure, minimal nesting)
- Avoid `null`; use `undefined` or throw errors

**Example:**

```typescript
interface FetchOptions {
  userId: string;
  limit?: number;
  offset?: number;
}

function fetchMessages({ userId, limit = 50, offset = 0 }: FetchOptions): Promise<Message[]> {
  if (!userId) throw new Error('userId required');

  return request.get('/messages', { params: { userId, limit, offset } });
}
```

### Module Design

**Exports:**
- Named exports for utilities and helpers
- Default export for components (optional, prefer named)
- Barrel files (`index.ts`) export public APIs only

**Example (`services/index.ts`):**

```typescript
export { fetchMessages } from './messageService';
export { validateUser } from './userService';
export type { UserResponse, MessagePayload } from './types';
```

### Data Structures

**Iteration philosophy:**
- Minimize looping: consolidate sequential O(n) operations into single pass
- Never iterate over message arrays, state arrays twice if work can combine
- Prefer `Map`/`Set` for lookups instead of `Array.find()`
- Choose data structures that reduce iteration needs

**Example:**

```typescript
// Bad: two passes
const userIds = messages.map(m => m.userId);
const uniqueIds = [...new Set(userIds)];

// Good: single pass with Set
const userIds = new Set<string>();
messages.forEach(m => userIds.add(m.userId));
```

### Type Safety

**Rules:**
- **Never use `any`**. Use explicit types for all parameters and return values.
- Avoid `unknown`, `Record<string, unknown>` — signals missing type definition
- Avoid `as unknown as T` type assertions
- Don't duplicate types — check `packages/data-provider` before defining new types
- Use union types, generics, interfaces appropriately
- All TypeScript and ESLint warnings must be resolved

**Example:**

```typescript
// Bad
function process(data: any): void {}

// Good
interface DataPayload {
  id: string;
  content: string;
}

function process(data: DataPayload): void {}
```

---

## litellm (Python)

### Naming Patterns

**Files:**
- Modules: `snake_case` (e.g., `llm_http_handler.py`, `cost_calculator.py`)
- Classes: PascalCase (e.g., `BaseConfig`, `LiteLLMRouter`)
- Test files: `test_*.py` (e.g., `test_caching.py`, `test_openai_embedding.py`)

**Functions/Variables:**
- snake_case for all functions and variables (e.g., `get_model_info`, `fetch_completion`)
- Private functions: prefix with `_` (e.g., `_validate_response`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)

**Classes:**
- PascalCase (e.g., `Config`, `CustomLogger`, `InternalUsageCache`)
- Provider configs inherit from `BaseConfig`
- Name provider implementations explicitly (e.g., `AnthropicConfig`, `OpenAIConfig`)

**Type hints:**
- Always use type hints for function parameters and return values
- Use `Optional[T]`, `Union[T, U]` from `typing`
- Pydantic v2 models for API schemas (e.g., `BaseModel` subclasses in `litellm/types/`)

### Code Style

**Formatting:**
- Tool: **Black**
- Line length: 120 characters
- Config: defaults (4 spaces per indent level)
- Command: `make format` or `poetry run black .`

**Linting:**
- Tool: **Ruff**
- Extends ESLint rules for Python
- Excludes: `litellm/types/*`, `litellm/__init__.py`, tests
- Command: `make lint-ruff`
- Key ignores: `F405` (undefined from star import), `E402` (import not at top), `E501` (line too long — handled by Black)

**Type checking:**
- Tool: **MyPy**
- Required for all public APIs
- Command: `make lint-mypy`
- Strict: no `Any`, enforce type annotations

### Imports

**Rules:**
- **All imports at module level** — no imports inside functions/methods except to avoid circular imports (rare)
- Grouped: stdlib, third-party, local (with blank lines between groups)
- Sorted alphabetically within groups

**Example:**

```python
import json
import os
from typing import Dict, List, Optional

import httpx
from pydantic import BaseModel

from litellm.main import completion
from litellm.router import LiteLLMRouter
```

### Error Handling

**Pattern:**
- Custom exceptions for domain-specific errors
- Provider-specific exceptions mapped to OpenAI-compatible errors
- Fallback logic in Router system

**Example:**

```python
try:
    response = await client.post(url, json=payload)
except httpx.TimeoutException as e:
    logger.error(f"Request timeout: {str(e)}")
    raise APIConnectionError(f"Timeout after {timeout}s")
```

### Logging

**Framework:** `litellm/_logging.py`

**Pattern:**
- Use `litellm.logger` for all logging
- Log at appropriate levels: `info()`, `warning()`, `error()`
- Include context: request IDs, model names, provider info
- Use `logger.error()` with exception for full stack traces

### Comments

**Rule:** Write self-documenting code; avoid narration.

**Docstrings:**
- Google-style docstrings for all public functions and classes
- Single-line for simple functions
- Multi-line for complex logic with Args, Returns, Raises

**Example:**

```python
def get_model_info(model: str) -> Dict[str, Any]:
    """
    Retrieve model configuration and pricing info.

    Args:
        model: Model identifier (e.g., 'gpt-4', 'claude-3-opus')

    Returns:
        Dictionary with context_window, max_tokens, cost_per_1k_input, etc.

    Raises:
        ValueError: If model not found in registry
    """
```

### Function Design

**Size:** Keep functions focused; break complex logic into helpers

**Parameters:**
- Use type hints for all
- Default parameters with sensible values
- Use dataclasses or Pydantic for complex configs

**Return values:**
- Explicit return type annotation
- Return early, avoid deep nesting
- Raise exceptions rather than return error codes

**Example:**

```python
def transform_request(
    self,
    model: str,
    messages: List[Dict],
    max_tokens: Optional[int] = None,
) -> Dict[str, Any]:
    """Transform to provider format."""
    if not messages:
        raise ValueError("Messages cannot be empty")

    return {
        "model": self._map_model_name(model),
        "messages": messages,
        "max_tokens": max_tokens or self.default_max_tokens,
    }
```

### Module Design

**Provider structure (`litellm/llms/{provider}/`):**
- `chat/transformation.py` — `Config` class with `transform_request()`, `transform_response()`
- `chat/__init__.py` — exports main functions
- `embedding/`, `rerank/`, etc. — similar structure per capability

**Shared infrastructure:**
- `litellm/main.py` — `completion()`, `acompletion()`, `embedding()` entry points
- `litellm/router.py` — load balancing, fallback
- `litellm/llms/custom_httpx/llm_http_handler.py` — central HTTP orchestrator

---

## open-webui (SvelteKit + Python)

### Naming Patterns (JavaScript/TypeScript)

**Files:**
- Components: PascalCase with `.svelte` extension (e.g., `Header.svelte`, `ModelSelector.svelte`)
- Routes: snake_case or PascalCase (SvelteKit convention)
- Utilities: snake_case (e.g., `auth-utils.ts`, `api-client.ts`)
- Test files: `.test.ts`, `.test.js` suffix

**Functions/Variables:**
- camelCase (e.g., `fetchModels`, `setSelectedModel`)
- Private: prefix with `_` or closure scope
- Constants: SCREAMING_SNAKE_CASE

**Types:**
- PascalCase interfaces/types

### Code Style (JavaScript/TypeScript)

**Formatting:**
- Tool: **Prettier**
- Config: `.prettierrc`
- Print width: 100 characters
- Tabs: true (use tabs, not spaces — different from LibreChat!)
- Trailing commas: none
- Single quotes: true
- Svelte plugin: `prettier-plugin-svelte`

**Linting:**
- Tool: **ESLint** (`.eslintrc.cjs`)
- Extends: `eslint:recommended`, `@typescript-eslint`, Svelte, Cypress, Prettier
- Parser: `@typescript-eslint/parser`
- ECMAScript 2020+

### Naming Patterns (Python)

**Files:**
- `snake_case.py` for modules

**Functions/Variables:**
- `snake_case` for functions and variables
- `PascalCase` for classes

---

## Cross-Project Patterns

### TypeScript/JavaScript Consistency

Both LibreChat and open-webui use ESLint + Prettier but with different Prettier configs:

| Setting | LibreChat | open-webui |
|---------|-----------|-----------|
| Tabs | Spaces (2) | Tabs |
| Trailing commas | all | none |
| Print width | 100 | 100 |
| Single quotes | yes | yes |
| Parser | typescript | typescript + svelte |

### Python Consistency

litellm and open-webui Python backends both use:
- Black for formatting (120 char line length)
- Ruff for linting
- MyPy for type checking
- Pydantic v2 for schemas
- Type hints required for all public APIs

### Shared Type System (LibreChat/open-webui)

Both projects import types from `packages/data-provider` in LibreChat:
- Centralized API types and endpoints
- Shared data schemas
- Query/mutation keys for React Query and SvelteKit data loaders

---

*Convention analysis: 2026-03-15*
