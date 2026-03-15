# Testing Patterns

**Analysis Date:** 2026-03-15

This document covers testing frameworks, patterns, and best practices across three projects: **LibreChat** (Node.js/Jest), **litellm** (Python/pytest), and **open-webui** (TypeScript/Jest + Python/pytest).

---

## LibreChat (Jest + TypeScript)

### Test Framework

**Runner:**
- Framework: **Jest**
- Version: Latest (managed by root workspace)
- Configuration: Per-workspace `jest.config.mjs` or `jest.config.js`
- Command: `cd <workspace> && npx jest <pattern>`

**Assertion Library:**
- Jest built-in assertions (`expect()`)
- Type-safe matchers via TypeScript

**Run Commands:**

```bash
# From workspace (packages/api, packages/data-provider, packages/data-schemas, etc.)
cd packages/data-schemas && npx jest                    # Run all tests
cd packages/api && npx jest --watch                     # Watch mode
cd packages/data-provider && npx jest --coverage        # Coverage report

# Root-level (if configured for monorepo)
npm run test                                             # Run all workspaces
npm run test:watch                                       # Watch mode
```

### Test File Organization

**Location:**
- Co-located with source code
- `packages/data-schemas/src/methods/*.spec.ts` — alongside `.ts` source files
- Pattern: `fileName.spec.ts` or `fileName.test.ts`

**Naming:**
- `*.spec.ts` preferred for unit tests
- `*.test.ts` also acceptable
- Pattern: `describe('Module Name', () => { ... })`

**Structure:**

```
packages/data-schemas/
├── src/
│   ├── methods/
│   │   ├── user.ts
│   │   ├── user.spec.ts        // Unit tests for user methods
│   │   ├── file.ts
│   │   ├── file.spec.ts
│   │   ├── userGroup.methods.spec.ts
```

### Test Structure

**Suite Organization:**

```typescript
import mongoose from 'mongoose';
import { createUserMethods } from './user';
import { signPayload } from '~/crypto';
import type { IUser } from '~/types';

jest.mock('~/crypto', () => ({
  signPayload: jest.fn(),
}));

describe('User Methods', () => {
  const mockSignPayload = signPayload as jest.MockedFunction<typeof signPayload>;
  let userMethods: ReturnType<typeof createUserMethods>;

  beforeEach(() => {
    jest.clearAllMocks();
    userMethods = createUserMethods(mongoose);
  });

  describe('generateToken', () => {
    const mockUser = {
      _id: 'user123',
      username: 'testuser',
      provider: 'local',
      email: 'test@example.com',
      name: 'Test User',
      avatar: '',
      role: 'user',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as IUser;

    afterEach(() => {
      delete process.env.JWT_SECRET;
    });

    it('should default to 15 minutes when expiresIn is not provided', async () => {
      process.env.JWT_SECRET = 'test-secret';
      mockSignPayload.mockResolvedValue('mocked-token');

      await userMethods.generateToken(mockUser);

      expect(mockSignPayload).toHaveBeenCalledWith({
        payload: {
          id: mockUser._id,
          username: mockUser.username,
          provider: mockUser.provider,
          email: mockUser.email,
        },
        secret: 'test-secret',
        // ...
      });
    });
  });
});
```

**Patterns:**
- `describe()` blocks for feature grouping
- `it()` for individual test cases
- `beforeEach()` for setup (clear mocks, initialize state)
- `afterEach()` for cleanup (delete env vars, clear state)
- Flat test names: no nested `describe()` if avoidable

### Mocking

**Framework:** Jest built-in `jest.mock()` and `jest.spyOn()`

**Patterns:**

```typescript
// Mock a module
jest.mock('~/crypto', () => ({
  signPayload: jest.fn(),
}));

// Mock with type safety
const mockSignPayload = signPayload as jest.MockedFunction<typeof signPayload>;
mockSignPayload.mockResolvedValue('token');

// Spy on real function
const spy = jest.spyOn(userMethods, 'generateToken');
expect(spy).toHaveBeenCalledWith(mockUser);

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

**What to Mock:**
- External crypto functions (`signPayload`)
- HTTP clients (API calls)
- File system operations (if not using temp files)
- Rate-limited services

**What NOT to Mock:**
- Business logic (calculate discount, validate schema)
- Database queries (use in-memory MongoDB)
- Domain models and methods
- React Query hooks (test real behavior with real API patterns)

### Fixtures and Factories

**Test Data Pattern:**

```typescript
const mockUser = {
  _id: 'user123',
  username: 'testuser',
  provider: 'local',
  email: 'test@example.com',
  // ...
} as IUser;

// Reuse in multiple tests
it('test 1', () => { /* uses mockUser */ });
it('test 2', () => { /* uses mockUser */ });
```

**Location:**
- Inline in test file if used by single test suite
- Extract to `__fixtures__/` or `test-utils/` if shared across multiple test files

### Jest Configuration

**Key settings (`jest.config.mjs` / `jest.config.js`):**

```javascript
export default {
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!<rootDir>/node_modules/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.dev\\.ts$',
    '\\.helper\\.ts$',
    '/__tests__/helpers/',
  ],
  coverageReporters: ['text', 'cobertura'],    // Console + CI reporting
  testResultsProcessor: 'jest-junit',           // JUnit XML for CI
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { /* presets */ }],
  },
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',          // Path aliases
    '~/(.*)': '<rootDir>/src/$1',
  },
  maxWorkers: '50%',                             // Parallel execution
  restoreMocks: true,                            // Reset mocks after each test
  testTimeout: 15000,                            // 15 second timeout
};
```

### Coverage

**Requirements:** No global threshold enforced (commented out in configs)

**View Coverage:**

```bash
cd packages/data-schemas && npx jest --coverage
```

**Output:** Text report + Cobertura XML (for CI systems)

### Test Types

**Unit Tests:**
- Test individual functions, methods in isolation
- Mock external dependencies (crypto, APIs)
- Location: `packages/data-schemas/src/methods/*.spec.ts`
- Scope: Business logic, validation, transformations

**Integration Tests:**
- Test multiple components working together
- Use real MongoDB in-memory server (not mocked)
- Location: Same directory, but marked with `.integration.spec.ts`
- Scope: Database queries, schema validation, transaction handling

**Component Tests (Frontend):**
- Located in `client/src/__tests__/`
- Use testing library for React components
- Render components, simulate user interactions, check output

---

## litellm (pytest + Python)

### Test Framework

**Runner:**
- Framework: **pytest**
- Version: Latest (managed by `pyproject.toml`)
- Configuration: `pyproject.toml` (root)
- Command: `poetry run pytest tests/ <pattern>`

**Assertion Library:**
- pytest built-in assertions (`assert`)
- Fixtures for setup/teardown

**Run Commands:**

```bash
# All tests
make test                                          # All tests (unit + integration)
make test-unit                                     # Unit tests only (4 parallel workers)
make test-integration                              # Integration tests only

# Specific test file
poetry run pytest tests/test_litellm/test_caching.py -v

# Specific test function
poetry run pytest tests/test_litellm/test_caching.py::test_redis_cache -v

# With output
poetry run pytest tests/ -v -s                     # Verbose + show print statements
```

### Test File Organization

**Location:**
- Separate from source: `tests/test_litellm/`, `tests/llm_translation/`, `tests/proxy_unit_tests/`
- Parallel structure to `litellm/` package

**Naming:**
- `test_*.py` files
- Test functions: `test_<feature>_<scenario>`
- Test classes: `Test<Feature>`

**Structure:**

```
tests/
├── test_litellm/                          # Unit tests for core SDK
│   ├── test_caching.py
│   ├── test_router.py
│   ├── test_completion.py
├── llm_translation/                       # Provider translation tests
│   ├── test_openai.py
│   ├── test_anthropic.py
├── proxy_unit_tests/                      # Proxy server tests
│   ├── test_auth.py
│   ├── test_keys.py
├── load_tests/                            # Performance/load tests
```

### Test Structure

**Suite Organization:**

```python
import pytest
from unittest.mock import Mock, patch
from litellm import completion
from litellm.caching import RedisCache

class TestCaching:
    """Test caching behavior."""

    @pytest.fixture
    def redis_cache(self):
        """Provide a Redis cache instance."""
        cache = RedisCache(host="localhost", port=6379)
        yield cache
        cache.flush()  # Cleanup

    def test_cache_hit_returns_cached_response(self, redis_cache):
        """Verify cache returns stored response on subsequent calls."""
        model = "gpt-4"
        messages = [{"role": "user", "content": "Hello"}]

        # First call: cache miss
        response1 = completion(model=model, messages=messages)

        # Second call: cache hit
        response2 = completion(model=model, messages=messages)

        assert response1.choices[0].message.content == response2.choices[0].message.content

    def test_cache_key_generation(self):
        """Test that different inputs generate different cache keys."""
        model = "gpt-4"
        messages1 = [{"role": "user", "content": "Hello"}]
        messages2 = [{"role": "user", "content": "Goodbye"}]

        # Implementation detail test: verify key differences
        key1 = hash_messages(model, messages1)
        key2 = hash_messages(model, messages2)

        assert key1 != key2
```

**Patterns:**
- Class-based test organization (optional but common)
- Fixtures for setup/teardown (`@pytest.fixture`)
- Type hints on test functions
- Descriptive test names and docstrings

### Mocking

**Framework:** `unittest.mock.Mock`, `unittest.mock.patch`

**Patterns:**

```python
from unittest.mock import Mock, patch, AsyncMock

# Mock a function
with patch('litellm.main.httpx.post') as mock_post:
    mock_post.return_value = Mock(json={"choices": [...]})
    result = completion(model="gpt-4", messages=[...])

# Spy on a function
with patch.object(completion, 'call') as spy:
    completion(model="gpt-4", messages=[...])
    assert spy.call_count == 1

# Mock with side effects
mock_response = Mock()
mock_response.json.side_effect = json.JSONDecodeError("Invalid", "", 0)
```

**What to Mock:**
- External HTTP APIs (use `responses` library or `unittest.mock`)
- Database connections (use in-memory or test fixtures)
- Rate-limited services

**What NOT to Mock:**
- Provider transformations (`Config.transform_request()`, `Config.transform_response()`)
- Router logic (load balancing, fallback)
- Cost calculations
- Caching backends (use real Redis or in-memory)

### Fixtures and Factories

**Test Data Pattern:**

```python
import pytest

@pytest.fixture
def sample_messages():
    """Provide standard test messages."""
    return [
        {"role": "system", "content": "You are helpful."},
        {"role": "user", "content": "Hello"},
    ]

@pytest.fixture
def gpt4_response():
    """Provide a mock GPT-4 response."""
    return {
        "choices": [
            {
                "message": {"content": "Response"},
                "finish_reason": "stop",
            }
        ],
    }

def test_completion_with_fixture(sample_messages, gpt4_response):
    # Uses fixtures
    pass
```

**Location:**
- `conftest.py` at test root level (shared across all tests)
- `conftest.py` in subdirectories (scoped fixtures)

### Pytest Configuration

**Key settings (`pyproject.toml`):**

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --tb=short"
asyncio_mode = "auto"
```

### Coverage

**Requirements:** No global threshold enforced

**View Coverage:**

```bash
make test -- --cov=litellm --cov-report=term-missing
```

### Test Types

**Unit Tests (`tests/test_litellm/`):**
- Test individual functions in isolation
- Mock external dependencies (APIs, databases)
- Scope: Core logic (caching, routing, cost calculation)
- Location: `tests/test_litellm/test_*.py`

**Provider Translation Tests (`tests/llm_translation/`):**
- Test `Config.transform_request()` and `Config.transform_response()` directly
- No real API calls: instantiate `Config` class and test transformations
- Scope: Request/response mapping for each provider
- Location: `tests/llm_translation/test_<provider>.py`

**Integration Tests (`tests/llm_translation/`):**
- Test with real provider APIs (requires API keys)
- Scope: End-to-end completion/embedding flows
- Marked to skip in CI if API keys unavailable

**Proxy Tests (`tests/proxy_unit_tests/`):**
- Test FastAPI endpoints
- Mock database and auth layers
- Scope: Endpoint behavior, request validation

---

## open-webui (Jest + pytest)

### JavaScript/TypeScript Testing

**Runner:**
- Framework: **Jest** (Node.js tests) or **Vitest** (UI/component tests)
- Configuration: Project-specific in `cypress/` or root

**Run Commands:**

```bash
# Component tests
npm run test                   # Run tests
npm run test:watch            # Watch mode

# E2E tests
npm run e2e                    # Run Cypress E2E tests
```

**Patterns:** Same as LibreChat (see above)

### Python Testing (Backend)

**Runner:**
- Framework: **pytest**
- Location: `open-webui/backend/` (if Python backend exists)
- Patterns: Same as litellm (see above)

### Component Testing (SvelteKit)

**Framework:** **Vitest** + **@testing-library/svelte**

**Example:**

```typescript
import { render, screen } from '@testing-library/svelte';
import Header from '$lib/components/Header.svelte';

describe('Header', () => {
  it('should render title', () => {
    render(Header, { props: { title: 'Test' } });
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

**Rules:**
- Query priority: `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`
- Always use `screen.*` (not destructured from `render()`)
- Wrap async operations in `act()`
- Use `queryBy*` for absence checks
- Test names must start with `"should ..."`

---

## Testing Philosophy (All Projects)

### Real Logic Over Mocks

**Principle:** Exercise actual code paths with real dependencies when possible.

**Example (LibreChat with MongoDB):**

```typescript
// Use real MongoDB in-memory server
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connect(mongoServer.getUri());
});

it('should persist user to database', async () => {
  const user = await userMethods.createUser({ email: 'test@example.com' });
  const found = await userMethods.findById(user._id);

  expect(found.email).toBe('test@example.com');
});
```

### Spies Over Mocks

**Principle:** Assert functions are called without replacing underlying logic.

**Example (litellm):**

```python
from unittest.mock import patch

with patch.object(httpx.Client, 'post', wraps=original_post) as spy:
    response = completion(model="gpt-4", messages=[...])

    # Verify call was made with correct args
    assert spy.call_count == 1
    assert spy.call_args[1]['json']['model'] == 'gpt-4'
```

### Avoid Heavy Mocking

**Principle:** Heavy mocking is a code smell. If tests require extensive mocks, the code is probably too coupled.

**Example (litellm provider transformation):**

```python
# Good: test transformation directly without mocking
from litellm.llms.openai.chat.transformation import OpenAIConfig

config = OpenAIConfig()
request = config.transform_request(
    model="gpt-4",
    messages=[...],
    max_tokens=100,
)

# Verify output structure
assert "model" in request
assert request["messages"] == expected_messages
```

---

*Testing analysis: 2026-03-15*
