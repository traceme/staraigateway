# Phase 4: Dashboard & Team Management - Research

**Researched:** 2026-03-16
**Domain:** OAuth integration, member management, rate limiting, admin dashboard
**Confidence:** HIGH

## Summary

Phase 4 adds Google/GitHub OAuth login, member invitation with role management, admin-only key revocation with per-key rate limits, and dedicated admin management pages. The project already uses custom session management (Lucia patterns) with Oslo crypto, Drizzle ORM with PostgreSQL, SvelteKit form actions, and Nodemailer for email -- all of which extend naturally into this phase.

The OAuth integration uses Arctic (v3.7.0), a lightweight OAuth 2.0 client library that pairs with the existing session system. Arctic handles authorization URL creation, state/PKCE management, and token exchange for 68+ providers including Google and GitHub. The rate limiting uses an in-memory sliding window counter, enforced in the gateway proxy before request forwarding, returning OpenAI-compatible `x-ratelimit-*` headers.

**Primary recommendation:** Use Arctic for OAuth (already decided in roadmap), add two new DB tables (`app_oauth_accounts`, `app_org_invitations`), add rate limit columns to `app_api_keys` and `app_organizations`, implement sliding window rate limiter as a standalone module in `src/lib/server/gateway/rate-limit.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- OAuth via Google and GitHub alongside existing email/password
- Account linking by email (OAuth email matches existing account = auto-link)
- OAuth users without existing accounts get auto-created (skip email verification)
- New `app_oauth_accounts` table linked to `app_users`
- Session management unchanged -- OAuth is alternative auth path into same session system
- Member invitation via email with unique invite tokens (7-day expiry)
- New `app_org_invitations` table with specified columns
- 4 management pages under `/org/[slug]/`: Members, Provider Keys (exists), API Keys (extend), Budgets (exists)
- Admin dashboard extended with org-wide usage KPIs
- Per-key RPM/TPM rate limits (optional, inherit org defaults if unset)
- In-memory sliding window counter for rate limit enforcement
- HTTP 429 with OpenAI-compatible response + Retry-After + X-RateLimit-* headers
- Rate limit columns on `app_api_keys` and org-wide defaults on `app_organizations`

### Claude's Discretion
- OAuth library choice (Arctic recommended -- aligning with roadmap decision)
- Exact in-memory rate limiter data structure (sliding window vs fixed window)
- Members page sorting and filtering UX
- Admin dashboard KPI card selection and layout
- Invite email template design
- Rate limit header calculation precision

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-03 | User can log in via Google OAuth | Arctic Google provider + OAuth callback routes + account linking |
| AUTH-04 | User can log in via GitHub OAuth | Arctic GitHub provider + OAuth callback routes + account linking |
| ORG-02 | Org owner can invite members via email | Invitation table + Nodemailer invite template + accept flow |
| ORG-03 | Org owner can assign roles (Owner, Admin, Member) | Role assignment on invite + Members page role change action |
| ORG-04 | Admin can remove members from organization | Members page remove action + cascade key deactivation |
| AKEY-03 | Admin can revoke any member's API keys | Extended API keys page showing all org keys + admin revoke action |
| AKEY-05 | Admin can set per-key rate limits (RPM/TPM) | Rate limit columns + form fields + gateway enforcement |
| DASH-01 | Admin dashboard shows org-wide usage and cost overview | Dashboard KPI cards from usage logs aggregation |
| DASH-02 | Member management page (invite, roles, remove) | New `/org/[slug]/members/` route |
| DASH-03 | Provider key management page (add, validate, remove) | Already exists from Phase 2 -- verify admin-only access |
| DASH-04 | API key management page (create, revoke, view usage) | Extend existing page with admin view of all org keys |
| DASH-05 | Budget configuration page | Already exists from Phase 3 -- no changes needed |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| arctic | 3.7.0 | OAuth 2.0 client for Google/GitHub | Lightweight, Fetch-based, pairs with Lucia patterns, 68+ providers |
| drizzle-orm | 0.38.x | Database schema + queries | Already in project, extends with new tables |
| @sveltejs/kit | 2.16.x | Routes, form actions, hooks | Already in project |
| nodemailer | 6.9.x | Invitation emails | Already in project |
| zod | 3.24.x | Form validation | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @oslojs/crypto | 1.0.x | Token hashing (invite tokens) | Already in project, use for invite token generation |
| @oslojs/encoding | 1.1.x | Base32 encoding | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Arctic | Auth.js/@auth/sveltekit | Auth.js takes over session management -- conflicts with existing custom system |
| Arctic | Custom OAuth fetch | More code, error-prone PKCE/state handling, no benefit |
| In-memory rate limiter | Redis-based | Overkill for single-instance deployment; add in Phase 5 if needed |

**Installation:**
```bash
npm install arctic
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/server/
│   ├── auth/
│   │   ├── oauth.ts              # Arctic provider instances (Google, GitHub)
│   │   ├── session.ts            # Existing (unchanged)
│   │   ├── email.ts              # Extend with sendInvitationEmail()
│   │   └── emails/
│   │       └── invitation.ts     # New invite email template
│   ├── gateway/
│   │   ├── rate-limit.ts         # NEW: Sliding window rate limiter
│   │   ├── proxy.ts              # Extend with rate limit check
│   │   ├── auth.ts               # Extend to load rate limit data
│   │   └── budget.ts             # Existing (unchanged)
│   ├── db/
│   │   └── schema.ts             # Extend with new tables + columns
│   └── members.ts                # NEW: Member management business logic
├── routes/
│   ├── auth/
│   │   ├── login/
│   │   │   └── +page.svelte      # Extend with OAuth buttons
│   │   ├── oauth/
│   │   │   ├── google/
│   │   │   │   ├── +server.ts          # Redirect to Google
│   │   │   │   └── callback/+server.ts # Google callback
│   │   │   └── github/
│   │   │       ├── +server.ts          # Redirect to GitHub
│   │   │       └── callback/+server.ts # GitHub callback
│   │   └── invite/
│   │       └── [token]/+page.server.ts # Accept invitation
│   └── org/[slug]/
│       ├── members/
│       │   ├── +page.server.ts         # Members CRUD
│       │   └── +page.svelte            # Members table UI
│       ├── api-keys/
│       │   ├── +page.server.ts         # Extend with admin view + rate limits
│       │   └── +page.svelte            # Extend with admin columns
│       └── dashboard/
│           ├── +page.server.ts         # Extend with KPI data
│           └── +page.svelte            # Extend with KPI cards
└── lib/components/
    ├── layout/
    │   └── Sidebar.svelte              # Activate Members link
    └── members/
        ├── MembersTable.svelte         # Member list with actions
        └── InviteForm.svelte           # Invite modal/form
```

### Pattern 1: OAuth Flow (Arctic + Existing Session System)
**What:** OAuth routes that create sessions using the existing `createSession()` function
**When to use:** All OAuth login/signup flows
**Example:**
```typescript
// src/lib/server/auth/oauth.ts
import { Google, GitHub, generateState, generateCodeVerifier } from 'arctic';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { env } from '$env/dynamic/private';

const appUrl = env.APP_URL || 'http://localhost:5173';

export const google = new Google(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${appUrl}/auth/oauth/google/callback`
);

export const github = new GitHub(
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  `${appUrl}/auth/oauth/github/callback`
);

export { generateState, generateCodeVerifier };
```

```typescript
// src/routes/auth/oauth/google/+server.ts
import { google, generateState, generateCodeVerifier } from '$lib/server/auth/oauth';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent): Promise<Response> {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email']);

  event.cookies.set('google_oauth_state', state, {
    path: '/', httpOnly: true, maxAge: 60 * 10, sameSite: 'lax'
  });
  event.cookies.set('google_code_verifier', codeVerifier, {
    path: '/', httpOnly: true, maxAge: 60 * 10, sameSite: 'lax'
  });

  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}
```

```typescript
// src/routes/auth/oauth/google/callback/+server.ts (simplified)
// 1. Validate state cookie matches query param
// 2. Exchange code for tokens: google.validateAuthorizationCode(code, codeVerifier)
// 3. Decode ID token to get { sub, email, name }
// 4. Look up app_oauth_accounts by (provider='google', providerUserId=sub)
// 5. If found: createSession(existingUser.id), redirect
// 6. If not found: check if email matches app_users.email
//    - If match: link account (insert app_oauth_accounts), createSession
//    - If no match: create user (emailVerified=true), insert app_oauth_accounts, createSession
```

### Pattern 2: In-Memory Sliding Window Rate Limiter
**What:** Per-key rate limiting with sliding window counters stored in a Map
**When to use:** Gateway request processing, before proxying to LiteLLM
**Example:**
```typescript
// src/lib/server/gateway/rate-limit.ts
interface WindowEntry {
  timestamps: number[];  // Sorted array of request timestamps within window
  tokenCounts: number[]; // Parallel array of token counts per request
}

const windows = new Map<string, WindowEntry>();
const WINDOW_MS = 60_000; // 1 minute

export interface RateLimitResult {
  allowed: boolean;
  rpmLimit: number | null;
  rpmRemaining: number;
  tpmLimit: number | null;
  tpmRemaining: number;
  resetMs: number; // ms until oldest entry expires
}

export function checkRateLimit(
  keyId: string,
  rpmLimit: number | null,
  tpmLimit: number | null
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  let entry = windows.get(keyId);

  if (!entry) {
    entry = { timestamps: [], tokenCounts: [] };
    windows.set(keyId, entry);
  }

  // Evict expired entries
  while (entry.timestamps.length > 0 && entry.timestamps[0] < cutoff) {
    entry.timestamps.shift();
    entry.tokenCounts.shift();
  }

  const currentRpm = entry.timestamps.length;
  const currentTpm = entry.tokenCounts.reduce((a, b) => a + b, 0);
  const resetMs = entry.timestamps.length > 0 ? entry.timestamps[0] + WINDOW_MS - now : 0;

  const rpmAllowed = rpmLimit === null || currentRpm < rpmLimit;
  const tpmAllowed = tpmLimit === null || currentTpm < tpmLimit;

  return {
    allowed: rpmAllowed && tpmAllowed,
    rpmLimit,
    rpmRemaining: rpmLimit !== null ? Math.max(0, rpmLimit - currentRpm) : -1,
    tpmLimit,
    tpmRemaining: tpmLimit !== null ? Math.max(0, tpmLimit - currentTpm) : -1,
    resetMs
  };
}

export function recordRequest(keyId: string, tokenCount: number): void {
  let entry = windows.get(keyId);
  if (!entry) {
    entry = { timestamps: [], tokenCounts: [] };
    windows.set(keyId, entry);
  }
  entry.timestamps.push(Date.now());
  entry.tokenCounts.push(tokenCount);
}

// Periodic cleanup of stale entries (call from a setInterval)
export function cleanup(): void {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, entry] of windows) {
    while (entry.timestamps.length > 0 && entry.timestamps[0] < cutoff) {
      entry.timestamps.shift();
      entry.tokenCounts.shift();
    }
    if (entry.timestamps.length === 0) windows.delete(key);
  }
}
```

### Pattern 3: Admin Role Guard
**What:** Server-side role check for admin-only actions
**When to use:** Any form action or load function that requires admin/owner role
**Example:**
```typescript
// Reusable pattern for admin-only actions in +page.server.ts
async function requireAdmin(locals: App.Locals, orgId: string): Promise<void> {
  if (!locals.user) error(401, 'Not authenticated');
  const [membership] = await db
    .select({ role: appOrgMembers.role })
    .from(appOrgMembers)
    .where(and(eq(appOrgMembers.orgId, orgId), eq(appOrgMembers.userId, locals.user.id)))
    .limit(1);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    error(403, 'Admin access required');
  }
}
```

### Anti-Patterns to Avoid
- **OAuth state in server memory:** Store state/codeVerifier in httpOnly cookies, NOT in-memory maps. Cookies are per-user and survive server restarts.
- **Checking rate limits after proxying:** Rate limits MUST be checked BEFORE forwarding to LiteLLM, not after.
- **Trusting OAuth email without verification:** Google and GitHub verify emails, but still check that the OAuth scope includes email access before trusting it.
- **Blocking on rate limit cleanup:** Run cleanup in a setInterval, never in the hot path.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth authorization URLs | Custom URL builder with state/PKCE | Arctic `createAuthorizationURL()` | PKCE, nonce, scope handling is error-prone |
| OAuth token exchange | Custom fetch to token endpoint | Arctic `validateAuthorizationCode()` | Token response parsing, error handling varies by provider |
| State parameter generation | `Math.random()` or `crypto.randomUUID()` | Arctic `generateState()` | Cryptographically secure, correct format |
| PKCE code verifier | Custom implementation | Arctic `generateCodeVerifier()` | Must be specific length/charset per RFC 7636 |
| Email HTML templates | Raw string concatenation | Follow existing pattern in `emails/verification.ts` | Consistent branding, tested format |

**Key insight:** Arctic handles all the provider-specific OAuth quirks (Google uses PKCE, GitHub does not; Google returns ID tokens, GitHub requires separate API call for user info). Hand-rolling these differences is where bugs hide.

## Common Pitfalls

### Pitfall 1: OAuth Account Linking Race Condition
**What goes wrong:** Two simultaneous OAuth logins with the same email could both try to create a user, causing a unique constraint violation on `app_users.email`.
**Why it happens:** Check-then-insert pattern without proper handling.
**How to avoid:** Use `ON CONFLICT DO NOTHING` or catch the unique violation and retry the lookup. The `app_oauth_accounts` table also needs a unique constraint on `(provider, provider_user_id)`.
**Warning signs:** Intermittent 500 errors during OAuth signup.

### Pitfall 2: Forgetting to Clean Up Rate Limit Memory
**What goes wrong:** The in-memory rate limit Map grows unbounded for keys that are used once and never again.
**Why it happens:** No eviction of stale entries.
**How to avoid:** Run `cleanup()` on a 60-second setInterval. Also clean up when API keys are revoked.
**Warning signs:** Slow memory growth in long-running SvelteKit process.

### Pitfall 3: Google OAuth Requires PKCE, GitHub Does Not
**What goes wrong:** Using the same OAuth flow pattern for both providers.
**Why it happens:** Assuming all OAuth providers work identically.
**How to avoid:** Arctic handles this internally -- Google's `createAuthorizationURL` takes a `codeVerifier` parameter while GitHub's does not. Follow Arctic's API per provider.
**Warning signs:** OAuth callback errors from Google about invalid code_verifier.

### Pitfall 4: passwordHash Column is NOT NULL
**What goes wrong:** Creating an OAuth-only user fails because `app_users.passwordHash` is `text('password_hash').notNull()`.
**Why it happens:** Schema was designed before OAuth was added.
**How to avoid:** Make `passwordHash` nullable in the schema migration, OR generate a random unusable password hash for OAuth-only users. The nullable approach is cleaner -- the user can set a password later.
**Warning signs:** Insert failure when creating OAuth users.

### Pitfall 5: Rate Limit Headers Must Be on ALL Responses
**What goes wrong:** Only sending `x-ratelimit-*` headers on 429 responses.
**Why it happens:** Natural assumption that rate limit info is only relevant when limits are hit.
**How to avoid:** OpenAI sends rate limit headers on every response. IDE tools use remaining counts for proactive throttling.
**Warning signs:** IDE plugins (Cursor, Continue.dev) don't back off before hitting limits.

### Pitfall 6: Member Removal Must Cascade to API Keys
**What goes wrong:** Removed member's API keys still work in the gateway.
**Why it happens:** Only removing from `app_org_members` but not deactivating their keys.
**How to avoid:** When removing a member, also set `isActive = false` on all their API keys for that org.
**Warning signs:** Former members can still use the API.

## Code Examples

### OAuth Callback (Google) - Complete Pattern
```typescript
// src/routes/auth/oauth/google/callback/+server.ts
import { google } from '$lib/server/auth/oauth';
import { createSession, SESSION_COOKIE_NAME } from '$lib/server/auth/session';
import { db } from '$lib/server/db';
import { appUsers, appOauthAccounts } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { decodeIdToken } from 'arctic';
import type { RequestEvent } from './$types';

export async function GET(event: RequestEvent): Promise<Response> {
  const code = event.url.searchParams.get('code');
  const state = event.url.searchParams.get('state');
  const storedState = event.cookies.get('google_oauth_state');
  const codeVerifier = event.cookies.get('google_code_verifier');

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return new Response('Invalid OAuth callback', { status: 400 });
  }

  const tokens = await google.validateAuthorizationCode(code, codeVerifier);
  const claims = decodeIdToken(tokens.idToken()) as { sub: string; email: string; name: string };

  // Check for existing OAuth link
  const [existing] = await db.select()
    .from(appOauthAccounts)
    .where(and(
      eq(appOauthAccounts.provider, 'google'),
      eq(appOauthAccounts.providerUserId, claims.sub)
    ))
    .limit(1);

  let userId: string;

  if (existing) {
    userId = existing.userId;
  } else {
    // Check if email matches existing user (account linking)
    const [existingUser] = await db.select()
      .from(appUsers)
      .where(eq(appUsers.email, claims.email))
      .limit(1);

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user (OAuth-verified, no email verification needed)
      userId = crypto.randomUUID();
      await db.insert(appUsers).values({
        id: userId,
        email: claims.email,
        name: claims.name,
        passwordHash: null, // OAuth-only user
        emailVerified: true
      });
    }

    // Link OAuth account
    await db.insert(appOauthAccounts).values({
      id: crypto.randomUUID(),
      userId,
      provider: 'google',
      providerUserId: claims.sub
    });
  }

  const { token } = await createSession(userId);
  event.cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/', httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60
  });

  // Clean up OAuth cookies
  event.cookies.delete('google_oauth_state', { path: '/' });
  event.cookies.delete('google_code_verifier', { path: '/' });

  return new Response(null, { status: 302, headers: { Location: '/' } });
}
```

### Database Schema Additions
```typescript
// New tables to add to schema.ts

export const appOauthAccounts = pgTable(
  'app_oauth_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => appUsers.id),
    provider: text('provider').notNull(), // 'google' | 'github'
    providerUserId: text('provider_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique('app_oauth_provider_user_unique').on(table.provider, table.providerUserId),
    index('app_oauth_accounts_user_idx').on(table.userId)
  ]
);

export const appOrgInvitations = pgTable(
  'app_org_invitations',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull().references(() => appOrganizations.id),
    email: text('email').notNull(),
    role: text('role').notNull(), // 'admin' | 'member'
    token: text('token').notNull().unique(),
    invitedBy: text('invited_by').notNull().references(() => appUsers.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('app_org_invitations_token_idx').on(table.token),
    index('app_org_invitations_org_email_idx').on(table.orgId, table.email)
  ]
);

// Add to appApiKeys: rpmLimit and tpmLimit columns
// rpmLimit: integer('rpm_limit')  -- nullable, null = use org default
// tpmLimit: integer('tpm_limit')  -- nullable, null = use org default

// Add to appOrganizations: defaultRpmLimit and defaultTpmLimit columns
// defaultRpmLimit: integer('default_rpm_limit')  -- nullable
// defaultTpmLimit: integer('default_tpm_limit')  -- nullable
```

### OpenAI-Compatible Rate Limit Response
```typescript
// Rate limit 429 response format
function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSeconds = Math.ceil(result.resetMs / 1000);
  return new Response(
    JSON.stringify({
      error: {
        message: 'Rate limit exceeded',
        type: 'rate_limit_exceeded',
        code: 'rate_limit_exceeded'
      }
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        'x-ratelimit-limit-requests': String(result.rpmLimit ?? -1),
        'x-ratelimit-remaining-requests': String(result.rpmRemaining),
        'x-ratelimit-reset-requests': `${retryAfterSeconds}s`,
        'x-ratelimit-limit-tokens': String(result.tpmLimit ?? -1),
        'x-ratelimit-remaining-tokens': String(result.tpmRemaining),
        'x-ratelimit-reset-tokens': `${retryAfterSeconds}s`
      }
    }
  );
}

// Add these headers to ALL proxy responses (not just 429):
function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const headers = new Headers(response.headers);
  if (result.rpmLimit !== null) {
    headers.set('x-ratelimit-limit-requests', String(result.rpmLimit));
    headers.set('x-ratelimit-remaining-requests', String(result.rpmRemaining));
    headers.set('x-ratelimit-reset-requests', `${Math.ceil(result.resetMs / 1000)}s`);
  }
  if (result.tpmLimit !== null) {
    headers.set('x-ratelimit-limit-tokens', String(result.tpmLimit));
    headers.set('x-ratelimit-remaining-tokens', String(result.tpmRemaining));
    headers.set('x-ratelimit-reset-tokens', `${Math.ceil(result.resetMs / 1000)}s`);
  }
  return new Response(response.body, { status: response.status, headers });
}
```

### Members Page Load (Admin View)
```typescript
// src/routes/org/[slug]/members/+page.server.ts
export const load: PageServerLoad = async ({ parent }) => {
  const { currentOrg, membership, user } = await parent();

  // All members can view the members list
  const members = await db
    .select({
      id: appOrgMembers.id,
      userId: appUsers.id,
      name: appUsers.name,
      email: appUsers.email,
      role: appOrgMembers.role,
      joinedAt: appOrgMembers.createdAt
    })
    .from(appOrgMembers)
    .innerJoin(appUsers, eq(appOrgMembers.userId, appUsers.id))
    .where(eq(appOrgMembers.orgId, currentOrg.id))
    .orderBy(appOrgMembers.createdAt);

  // Get pending invitations (admin/owner only)
  let pendingInvitations: Array<{...}> = [];
  if (['owner', 'admin'].includes(membership.role)) {
    pendingInvitations = await db
      .select()
      .from(appOrgInvitations)
      .where(and(
        eq(appOrgInvitations.orgId, currentOrg.id),
        isNull(appOrgInvitations.acceptedAt),
        gte(appOrgInvitations.expiresAt, new Date())
      ));
  }

  return { members, pendingInvitations, isAdmin: ['owner', 'admin'].includes(membership.role) };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Passport.js for OAuth | Arctic (lightweight, Fetch-based) | 2024 | No Express dependency, works in any runtime |
| Lucia Auth library | Lucia patterns (DIY with Oslo) | Lucia v3 sunset 2024 | Project already uses this approach correctly |
| Fixed window rate limiting | Sliding window | Industry standard | More fair, prevents burst-at-boundary attacks |
| Auth.js for SvelteKit | Arctic + custom sessions | 2024-2025 | Full control over session management |

**Deprecated/outdated:**
- Lucia Auth v2/v3 npm package: Sunset in 2024, author recommends the pattern approach (which this project already uses)
- Passport.js: Tied to Express, unnecessary for SvelteKit

## Open Questions

1. **passwordHash nullable migration**
   - What we know: `app_users.passwordHash` is currently `NOT NULL`; OAuth users don't have passwords
   - What's unclear: Whether Drizzle migration will handle this cleanly on existing data
   - Recommendation: ALTER COLUMN to nullable. Existing users all have hashes, so no data issues. Add schema change in first task.

2. **TPM rate limit enforcement timing**
   - What we know: RPM is checked before request (simple counter). TPM requires knowing token count AFTER the request completes.
   - What's unclear: Whether to enforce TPM pre-request (estimate) or post-request (actual)
   - Recommendation: Check RPM before request, record actual token usage after response for TPM tracking. TPM limit is checked against accumulated usage in the sliding window -- the check happens before the request using historical data.

3. **OAuth environment variables in dev**
   - What we know: Google/GitHub OAuth requires registered apps with client ID/secret
   - What's unclear: How to handle dev environments without OAuth configured
   - Recommendation: Guard OAuth button rendering with `env.GOOGLE_CLIENT_ID` check. If not set, don't show OAuth options. Same pattern as existing SMTP graceful degradation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in main SvelteKit app |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-03 | Google OAuth login creates session | integration | `npx vitest run src/lib/server/auth/oauth.test.ts -t google` | No -- Wave 0 |
| AUTH-04 | GitHub OAuth login creates session | integration | `npx vitest run src/lib/server/auth/oauth.test.ts -t github` | No -- Wave 0 |
| ORG-02 | Invite creates token + sends email | unit | `npx vitest run src/lib/server/members.test.ts -t invite` | No -- Wave 0 |
| ORG-03 | Role assignment on invite | unit | `npx vitest run src/lib/server/members.test.ts -t role` | No -- Wave 0 |
| ORG-04 | Remove member deactivates keys | unit | `npx vitest run src/lib/server/members.test.ts -t remove` | No -- Wave 0 |
| AKEY-03 | Admin can revoke any key | unit | `npx vitest run src/lib/server/api-keys.test.ts -t adminRevoke` | No -- Wave 0 |
| AKEY-05 | Rate limit enforcement returns 429 | unit | `npx vitest run src/lib/server/gateway/rate-limit.test.ts` | No -- Wave 0 |
| DASH-01 | Dashboard KPI aggregation | unit | `npx vitest run src/routes/org/dashboard.test.ts` | No -- Wave 0 |
| DASH-02 | Members page loads members | integration | Manual -- SvelteKit route test | No |
| DASH-03 | Provider keys page has admin access | manual-only | Existing page -- verify role guard | N/A |
| DASH-04 | API keys page shows all org keys for admin | integration | Manual -- SvelteKit route test | No |
| DASH-05 | Budget page exists | manual-only | Already exists from Phase 3 | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest config for SvelteKit (with `@sveltejs/kit/vite` plugin)
- [ ] `src/lib/server/gateway/rate-limit.test.ts` -- rate limiter unit tests (pure logic, no DB)
- [ ] `src/lib/server/members.test.ts` -- member invite/remove logic
- [ ] Framework install: `npm install -D vitest @testing-library/svelte` -- if vitest not already a dev dep

## Sources

### Primary (HIGH confidence)
- Arctic GitHub repo (pilcrowonpaper/arctic) - v3.7.0, provider API, installation
- Lucia Auth tutorials (lucia-auth.com) - Google/GitHub OAuth with SvelteKit code examples
- Project codebase - schema.ts, session.ts, proxy.ts, auth.ts, email.ts, api-keys.ts, hooks.server.ts

### Secondary (MEDIUM confidence)
- OpenAI rate limit documentation - x-ratelimit-* header format and values
- Arctic npm - version confirmation

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Arctic is the established choice for Lucia-pattern projects, already decided in roadmap
- Architecture: HIGH - Extends existing patterns (form actions, Drizzle tables, Nodemailer emails)
- Pitfalls: HIGH - Based on direct code inspection (passwordHash NOT NULL, rate limit timing, cascade on member removal)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable domain, libraries well-established)
