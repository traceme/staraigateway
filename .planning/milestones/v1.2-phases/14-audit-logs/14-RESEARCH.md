# Phase 14: Audit Logs - Research

**Researched:** 2026-03-18
**Domain:** Audit event recording, paginated log viewer, cursor-based pagination (SvelteKit + Drizzle ORM + PostgreSQL)
**Confidence:** HIGH

## Summary

Phase 14 adds audit logging for all significant org actions and a paginated viewer page for org admins/owners. The implementation is straightforward because all the patterns already exist in the codebase: Drizzle ORM table definitions, admin-only page guards, fire-and-forget async patterns, translated UI with `$t()`, and dark-themed table components.

The core work is: (1) define `app_audit_logs` table in schema.ts, (2) create a `recordAuditEvent()` helper using the fire-and-forget pattern from `notifications.ts`, (3) instrument 6 existing server action files with audit calls, (4) build a new `/org/[slug]/audit-log` route with cursor-based pagination and filtering, (5) add sidebar navigation entry.

**Primary recommendation:** Follow existing codebase patterns exactly. The `app_audit_logs` table mirrors the existing schema style. The fire-and-forget `recordAuditEvent()` function should catch all errors silently (same as email sending). Cursor-based pagination uses `(created_at, id)` compound cursor for stable ordering.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New `app_audit_logs` table: id (text UUID), org_id (text FK), actor_id (text FK), action_type (text), target_type (text), target_id (text nullable), metadata (jsonb nullable), created_at (timestamp)
- Action types to record: member_invited, member_removed, role_changed, api_key_created, api_key_revoked, provider_key_added, provider_key_removed, budget_changed, settings_updated
- Fire-and-forget pattern (same as budget notifications) -- audit logging should never block the main action
- Helper function: `recordAuditEvent(orgId, actorId, actionType, targetType, targetId, metadata)` in `src/lib/server/audit.ts`
- Insert audit calls into existing server actions (members, api-keys, provider-keys, settings, budget endpoints)
- New route: `/org/[slug]/audit-log` with sidebar nav entry (admin/owner only)
- Reverse chronological order, paginated (25 entries per page)
- Table columns: Timestamp, Actor (name), Action, Target, Details
- Action displayed as human-readable label (not raw enum) -- translated via $t() keys
- Cursor-based pagination (use created_at + id for stable cursors) -- not offset-based
- Empty state: "No audit log entries yet" with $t() translation
- Filter by action type: dropdown multi-select with all 9 action types
- Filter by date range: start date + end date pickers
- Filters applied server-side via query parameters
- Clear filters button to reset
- Only org owner and admin roles can access `/org/[slug]/audit-log`
- Regular members get redirected (same pattern as existing admin-only pages)
- Audit log API endpoint also checks role server-side
- All audit log UI text translated (en.json + zh.json) -- follows Phase 12/13 patterns
- Action type labels translated: "Member Invited" / "成员已邀请", etc.

### Claude's Discretion
- Exact table styling and responsive design
- Pagination component design (simple prev/next vs numbered pages)
- Filter component layout
- How to format metadata in Details column
- Index strategy for the audit_logs table
- Whether to add audit log link to admin KPI cards

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIT-01 | System records audit events for significant org actions (member invited/removed, role changed, API key created/revoked, provider key added/removed, budget changed, settings updated) | Schema table definition, `recordAuditEvent()` helper, integration points in 6 server action files identified |
| AUDIT-02 | Org owner/admin can view paginated audit log with timestamp, actor, action, and target | New route with cursor-based pagination, admin role guard, actor name JOIN pattern |
| AUDIT-03 | Audit log supports filtering by action type and date range | Server-side query parameter filtering, multi-select dropdown + date pickers |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | (existing) | Schema definition, queries, migrations | Already used for all app_ tables |
| SvelteKit | (existing) | Routes, load functions, form actions | Project framework |
| svelte-i18n | (existing) | UI translations via $t() | Already configured for en/zh |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | ^0.30.0 | Schema push/migration generation | `npm run db:push` to apply schema changes |

No new dependencies needed. Everything required is already in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/server/
│   ├── audit.ts                          # recordAuditEvent() helper
│   └── db/schema.ts                      # Add appAuditLogs table
├── lib/components/audit/
│   ├── AuditLogTable.svelte              # Table component
│   ├── AuditLogFilters.svelte            # Filter controls
│   └── AuditLogPagination.svelte         # Prev/Next cursor nav
├── lib/i18n/
│   ├── en.json                           # Add audit.* keys
│   └── zh.json                           # Add audit.* keys
└── routes/org/[slug]/audit-log/
    ├── +page.server.ts                   # Load function with cursor pagination + filters
    └── +page.svelte                      # Page layout
```

### Pattern 1: Fire-and-Forget Audit Recording
**What:** Non-blocking audit event insertion that never throws to the caller.
**When to use:** Every time an auditable action succeeds.
**Example:**
```typescript
// src/lib/server/audit.ts
// Follows the pattern from src/lib/server/budget/notifications.ts
export async function recordAuditEvent(
  orgId: string,
  actorId: string,
  actionType: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown> | null
): Promise<void> {
  try {
    await db.insert(appAuditLogs).values({
      id: crypto.randomUUID(),
      orgId,
      actorId,
      actionType,
      targetType,
      targetId,
      metadata,
      createdAt: new Date()
    });
  } catch {
    // Graceful failure -- never block the main action
    console.error(`Failed to record audit event: ${actionType}`);
  }
}
```

### Pattern 2: Cursor-Based Pagination
**What:** Use `(created_at, id)` as a compound cursor for stable, performant pagination.
**When to use:** Audit log listing (new to this codebase -- existing tables use offset or load-all).
**Example:**
```typescript
// In +page.server.ts load function
const cursor = url.searchParams.get('cursor'); // format: "timestamp|id"
const limit = 25;

let query = db
  .select({ /* columns */ })
  .from(appAuditLogs)
  .innerJoin(appUsers, eq(appAuditLogs.actorId, appUsers.id))
  .where(eq(appAuditLogs.orgId, currentOrg.id))
  .orderBy(desc(appAuditLogs.createdAt), desc(appAuditLogs.id))
  .limit(limit + 1); // fetch one extra to detect "has next page"

if (cursor) {
  const [ts, id] = cursor.split('|');
  // WHERE (created_at, id) < (cursor_ts, cursor_id)
  query = query.where(
    or(
      lt(appAuditLogs.createdAt, new Date(ts)),
      and(eq(appAuditLogs.createdAt, new Date(ts)), lt(appAuditLogs.id, id))
    )
  );
}

const rows = await query;
const hasMore = rows.length > limit;
const entries = rows.slice(0, limit);
const nextCursor = hasMore
  ? `${entries[limit-1].createdAt.toISOString()}|${entries[limit-1].id}`
  : null;
```

### Pattern 3: Admin-Only Page Guard
**What:** Redirect non-admin users in the load function.
**When to use:** Audit log page access control.
**Example:**
```typescript
// Follows exact pattern from src/routes/org/[slug]/settings/+page.server.ts
export const load: PageServerLoad = async ({ parent, url }) => {
  const { currentOrg, membership } = await parent();
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    redirect(302, `/org/${currentOrg.slug}`);
  }
  // ... load audit entries
};
```

### Pattern 4: Audit Call Insertion in Server Actions
**What:** Add `recordAuditEvent()` call after each successful mutation, without awaiting (fire-and-forget).
**When to use:** After every successful insert/update/delete in the 6 target files.
**Example:**
```typescript
// In members/+page.server.ts invite action (after successful inviteMember call)
await inviteMember(currentOrg.id, email, role, locals.user!.id);
// Fire-and-forget audit
recordAuditEvent(currentOrg.id, locals.user!.id, 'member_invited', 'user', email, { role });
return { success: true };
```
Note: Do NOT await `recordAuditEvent()` -- call it without await so it runs in background. The function already handles its own errors internally.

### Anti-Patterns to Avoid
- **Blocking on audit writes:** Never `await recordAuditEvent()` in the critical path. The function catches errors internally.
- **Offset-based pagination:** User explicitly chose cursor-based. Do not use OFFSET/LIMIT which degrades at high page numbers.
- **Storing actor name in audit table:** Store only `actor_id` (FK), resolve name at query time via JOIN. Names change; IDs don't.
- **Filtering in JavaScript:** All filtering (action type, date range) must happen in SQL WHERE clauses, not after fetching.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID function | `crypto.randomUUID()` | Already the project standard (used in members.ts, provider-keys.ts, etc.) |
| Date formatting | Custom formatter | `toLocaleDateString($locale)` | Already used in MembersTable.svelte |
| Table styling | New design system | Copy MembersTable.svelte patterns | Dark zinc theme, rounded borders, hover states already defined |
| Role check | Custom middleware | `parent()` + role check pattern | Exact pattern exists in settings/+page.server.ts |

## Common Pitfalls

### Pitfall 1: Awaiting Audit Writes Blocking User Actions
**What goes wrong:** If you `await recordAuditEvent()`, a database error or slow write delays the user's action response.
**Why it happens:** Natural instinct to await all async calls.
**How to avoid:** Call `recordAuditEvent()` without `await`. The function catches errors internally. Alternatively use `void recordAuditEvent(...)` to make the intent explicit.
**Warning signs:** User-facing actions becoming slower after audit logging is added.

### Pitfall 2: Cursor Pagination Edge Cases
**What goes wrong:** Entries with identical `created_at` timestamps get skipped or duplicated when paginating.
**Why it happens:** Using only `created_at` as cursor. Multiple audit events can happen in the same millisecond.
**How to avoid:** Use compound cursor `(created_at, id)` for deterministic ordering. The UUID provides tiebreaking.
**Warning signs:** Missing entries when scrolling through pages during high-activity periods.

### Pitfall 3: Missing Actor ID in Server Endpoints
**What goes wrong:** Some endpoints (like budget `+server.ts`) access `locals.user` directly while page server actions use `await parent()`. The actor ID source differs.
**Why it happens:** Inconsistent auth patterns between form actions and API endpoints.
**How to avoid:** In form actions, use `locals.user!.id`. In `+server.ts` endpoints, use `locals.user.id`. Always verify the user exists before recording.
**Warning signs:** Null actor_id in audit entries.

### Pitfall 4: Sidebar Navigation Not Respecting Role
**What goes wrong:** Audit log link shows for all members in sidebar, but page redirects non-admins.
**Why it happens:** Sidebar currently shows all items unconditionally (no role filtering).
**How to avoid:** The Sidebar component currently has no role prop. Either pass membership role to Sidebar and conditionally show the audit link, or accept that clicking redirects non-admins (consistent with current behavior where settings page just redirects).
**Warning signs:** Regular members seeing a nav link that doesn't work for them.

### Pitfall 5: Not Handling Deleted Actors
**What goes wrong:** If a user is removed from an org and later deleted, the actor JOIN returns null.
**Why it happens:** The actor_id FK references appUsers, but users can be removed from orgs.
**How to avoid:** Use LEFT JOIN for actor name resolution and display "Deleted user" when null. Or use INNER JOIN if the design decision is to show only entries with valid actors.
**Warning signs:** Audit entries disappearing from the log after member removal.

## Code Examples

### Schema Definition
```typescript
// Add to src/lib/server/db/schema.ts
// Follows exact pattern of existing tables (app_ prefix, text IDs, FK references)
export const appAuditLogs = pgTable(
  'app_audit_logs',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => appOrganizations.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => appUsers.id),
    actionType: text('action_type').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('app_audit_logs_org_created_idx').on(table.orgId, table.createdAt),
    index('app_audit_logs_org_action_idx').on(table.orgId, table.actionType)
  ]
);
```

### Migration SQL
```sql
-- Migration: 0005_audit_logs
-- Adds app_audit_logs table for AUDIT-01

CREATE TABLE IF NOT EXISTS app_audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES app_organizations(id),
  actor_id TEXT NOT NULL REFERENCES app_users(id),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX app_audit_logs_org_created_idx ON app_audit_logs(org_id, created_at);
CREATE INDEX app_audit_logs_org_action_idx ON app_audit_logs(org_id, action_type);
```

### Audit Event Integration Points

The following files need `recordAuditEvent()` calls:

| File | Actions | Audit Events |
|------|---------|-------------|
| `src/routes/org/[slug]/members/+page.server.ts` | invite, changeRole, removeMember | member_invited, role_changed, member_removed |
| `src/routes/org/[slug]/api-keys/+page.server.ts` | create, revoke, adminRevoke | api_key_created, api_key_revoked, api_key_revoked |
| `src/routes/org/[slug]/provider-keys/+page.server.ts` | create, delete | provider_key_added, provider_key_removed |
| `src/routes/org/[slug]/settings/+page.server.ts` | saveDefaults, saveRouting, saveCacheTtl | settings_updated |
| `src/routes/org/[slug]/usage/budget/+server.ts` | POST, DELETE | budget_changed |

### i18n Keys Structure
```json
// en.json additions
{
  "audit": {
    "title": "Audit Log",
    "empty": "No audit log entries yet",
    "columns": {
      "timestamp": "Timestamp",
      "actor": "Actor",
      "action": "Action",
      "target": "Target",
      "details": "Details"
    },
    "actions": {
      "member_invited": "Member Invited",
      "member_removed": "Member Removed",
      "role_changed": "Role Changed",
      "api_key_created": "API Key Created",
      "api_key_revoked": "API Key Revoked",
      "provider_key_added": "Provider Key Added",
      "provider_key_removed": "Provider Key Removed",
      "budget_changed": "Budget Changed",
      "settings_updated": "Settings Updated"
    },
    "filter": {
      "action_type": "Action Type",
      "date_range": "Date Range",
      "start_date": "Start Date",
      "end_date": "End Date",
      "clear": "Clear Filters",
      "all_actions": "All Actions"
    },
    "pagination": {
      "newer": "Newer",
      "older": "Older"
    }
  },
  "nav": {
    "audit_log": "Audit Log"
  }
}
```

### Index Strategy Recommendation
Two indexes cover all query patterns:
1. **`(org_id, created_at)`** -- primary query: list entries for an org in chronological order, date range filtering
2. **`(org_id, action_type)`** -- secondary: action type filtering within an org

The compound `(org_id, created_at)` index also supports cursor-based pagination efficiently since the cursor condition is `WHERE org_id = ? AND created_at < ?`.

### Sidebar Integration
```typescript
// Add to navItems array in Sidebar.svelte (after 'models', before 'settings')
{
  labelKey: 'nav.audit_log',
  href: `/org/${currentOrg.slug}/audit-log`,
  icon: 'clipboard', // new icon needed
  active: true
}
```
Note: The Sidebar currently shows all items regardless of role. The admin-only guard is in the page's load function (redirect pattern). This is consistent with how settings works -- all users see the nav item, non-admins get redirected. Alternatively, pass `membership.role` to Sidebar and conditionally render (Claude's discretion).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Offset pagination (`OFFSET N LIMIT M`) | Cursor-based pagination | Industry standard | No performance degradation at high page numbers; stable results during concurrent writes |
| Storing audit data in application logs | Structured audit table in PostgreSQL | N/A | Queryable, filterable, user-facing audit trail |

## Open Questions

1. **Metadata formatting in Details column**
   - What we know: Metadata is JSONB with varying shapes per action type (e.g., `{ role: "admin" }` for invites, `{ hardLimit: 50 }` for budgets)
   - What's unclear: How to display this in a readable way
   - Recommendation: Format as key-value pairs with human-readable keys. For simple metadata (1-2 fields), show inline. For complex metadata, show a "View details" expandable.

2. **Audit log retention / cleanup**
   - What we know: No retention policy discussed
   - What's unclear: Whether old entries should be pruned
   - Recommendation: Out of scope for this phase. The table will grow slowly (one entry per admin action, not per API request). Can add retention later if needed.

3. **Sidebar role awareness**
   - What we know: Sidebar currently shows all items to all users; admin pages redirect on access
   - What's unclear: Whether to change Sidebar to accept role and hide audit log for members
   - Recommendation: Follow existing pattern (show to all, redirect non-admins) for simplicity. Hiding requires changing Sidebar props, which is a broader refactor.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/server/audit.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-01 | recordAuditEvent inserts correct row | unit | `npx vitest run src/lib/server/audit.test.ts -x` | Wave 0 |
| AUDIT-01 | recordAuditEvent silently catches errors | unit | `npx vitest run src/lib/server/audit.test.ts -x` | Wave 0 |
| AUDIT-02 | Audit log page loads entries with actor names | integration/manual | Manual -- SvelteKit page load | N/A |
| AUDIT-02 | Non-admin redirected from audit page | integration/manual | Manual -- role check in load | N/A |
| AUDIT-03 | Filtering by action type returns correct subset | unit | `npx vitest run src/lib/server/audit.test.ts -x` | Wave 0 |
| AUDIT-03 | Filtering by date range returns correct subset | unit | `npx vitest run src/lib/server/audit.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/server/audit.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/server/audit.test.ts` -- covers AUDIT-01 (record event, error handling)
- [ ] Translation test update in `src/lib/i18n/__tests__/translations.test.ts` -- verify audit.* keys exist in both locales

## Sources

### Primary (HIGH confidence)
- Project codebase -- direct file reads of schema.ts, notifications.ts, members.ts, all +page.server.ts files, Sidebar.svelte, MembersTable.svelte, vitest.config.ts, drizzle.config.ts, en.json
- CONTEXT.md -- locked decisions from user discussion

### Secondary (MEDIUM confidence)
- Drizzle ORM documentation (training data) -- pgTable, index, jsonb, timestamp patterns confirmed by examining existing schema.ts usage

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, no new dependencies
- Architecture: HIGH - all patterns directly observed in codebase (fire-and-forget, admin guards, table components, i18n)
- Pitfalls: HIGH - identified from direct code analysis (cursor edge cases, await patterns, actor FK handling)

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no external dependencies changing)
