# Phase 14: Audit Logs - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Org owners and admins have full visibility into who did what within their organization. This covers: audit event recording for all significant org actions, a paginated audit log viewer page, and filtering by action type and date range. Regular members cannot access audit logs.

</domain>

<decisions>
## Implementation Decisions

### Event Recording
- New `app_audit_logs` table: id (text UUID), org_id (text FK), actor_id (text FK), action_type (text), target_type (text), target_id (text nullable), metadata (jsonb nullable), created_at (timestamp)
- Action types to record: member_invited, member_removed, role_changed, api_key_created, api_key_revoked, provider_key_added, provider_key_removed, budget_changed, settings_updated
- Fire-and-forget pattern (same as budget notifications) — audit logging should never block the main action
- Helper function: `recordAuditEvent(orgId, actorId, actionType, targetType, targetId, metadata)` in `src/lib/server/audit.ts`
- Insert audit calls into existing server actions (members, api-keys, provider-keys, settings, budget endpoints)

### Audit Log Viewer Page
- New route: `/org/[slug]/audit-log` with sidebar nav entry (admin/owner only)
- Reverse chronological order, paginated (25 entries per page)
- Table columns: Timestamp, Actor (name), Action, Target, Details
- Action displayed as human-readable label (not raw enum) — translated via $t() keys
- Cursor-based pagination (use created_at + id for stable cursors) — not offset-based
- Empty state: "No audit log entries yet" with $t() translation

### Filtering
- Filter by action type: dropdown multi-select with all 9 action types
- Filter by date range: start date + end date pickers
- Filters applied server-side via query parameters
- Clear filters button to reset

### Access Control
- Only org owner and admin roles can access `/org/[slug]/audit-log`
- Regular members get redirected (same pattern as existing admin-only pages)
- Audit log API endpoint also checks role server-side

### i18n
- All audit log UI text translated (en.json + zh.json) — follows Phase 12/13 patterns
- Action type labels translated: "Member Invited" / "成员已邀请", etc.

### Claude's Discretion
- Exact table styling and responsive design
- Pagination component design (simple prev/next vs numbered pages)
- Filter component layout
- How to format metadata in Details column
- Index strategy for the audit_logs table
- Whether to add audit log link to admin KPI cards

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — AUDIT-01, AUDIT-02, AUDIT-03 define acceptance criteria
- `.planning/ROADMAP.md` — Phase 14 success criteria (4 items)

### Existing Code Patterns
- `src/lib/server/db/schema.ts` — Table definitions (follow existing patterns for new table)
- `src/routes/org/[slug]/members/+page.server.ts` — Example of admin-only page with role check
- `src/lib/server/budget/notifications.ts` — Fire-and-forget pattern to follow
- `src/routes/org/[slug]/+layout.svelte` — Sidebar navigation (add audit log link)
- `src/lib/i18n/en.json` / `src/lib/i18n/zh.json` — Translation files to extend

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MembersTable.svelte` — Table component pattern to follow for audit log table
- `TimeRangePicker.svelte` — Date range picker component (reusable for audit filtering)
- Sidebar.svelte — Navigation component (add audit log entry)
- Fire-and-forget pattern from `notifications.ts` — use same pattern for async audit writes

### Established Patterns
- Drizzle ORM for schema/migrations
- SvelteKit form actions + load functions for server data
- $t() for all user-facing strings
- Cursor-based approach would be new (existing tables use offset or load-all)
- Admin role check in +page.server.ts load functions

### Integration Points
- Server actions in: members, api-keys, provider-keys, settings, budget — all need audit event calls
- Sidebar navigation — add audit log link (admin/owner only)
- org layout — role-based visibility

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User delegated all implementation decisions to Claude's judgment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-audit-logs*
*Context gathered: 2026-03-18*
