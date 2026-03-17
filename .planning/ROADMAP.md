# Roadmap: StarAIGateway

## Milestones

- v1.0 MVP - Phases 1-6 (shipped 2026-03-16)
- v1.1 Production Hardening - Phases 7-11 (shipped 2026-03-17)
- v1.2 Feature Expansion - Phases 12-15 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

<details>
<summary>v1.0 MVP (Phases 1-6) - SHIPPED 2026-03-16</summary>

See: .planning/milestones/v1.0-ROADMAP.md

</details>

<details>
<summary>v1.1 Production Hardening (Phases 7-11) - SHIPPED 2026-03-17</summary>

See: .planning/milestones/v1.1-ROADMAP.md

</details>

### v1.2 Feature Expansion (In Progress)

**Milestone Goal:** Add internationalization (Chinese/English), org-level audit logs, and a browsable model catalog to make StarAIGateway ready for Chinese enterprise teams.

- [ ] **Phase 12: Dashboard Internationalization** - i18n infrastructure, language switcher, dashboard and error message translation
- [ ] **Phase 13: Public Pages & Email Internationalization** - Landing/auth page translation with browser locale fallback, bilingual email templates
- [ ] **Phase 14: Audit Logs** - Event recording, paginated audit log viewer with filtering for org admins
- [ ] **Phase 15: Model Catalog** - Auto-discover models from LiteLLM, browsable catalog page, reactive updates on key changes

## Phase Details

### Phase 12: Dashboard Internationalization
**Goal**: Authenticated users can use the entire dashboard in Chinese or English based on their preference
**Depends on**: Phase 11 (v1.1 complete)
**Requirements**: I18N-01, I18N-02, I18N-05
**Success Criteria** (what must be TRUE):
  1. User can select Chinese or English in account settings and the preference persists across sessions
  2. All dashboard pages (org settings, members, API keys, usage, budgets) render text in the user's selected language
  3. Form validation errors and API error messages display in the user's selected language
  4. Switching language updates all visible UI text without requiring a page reload or re-login
**Plans**: TBD

Plans:
- [ ] 12-01: TBD
- [ ] 12-02: TBD

### Phase 13: Public Pages & Email Internationalization
**Goal**: Unauthenticated visitors and email recipients experience the product in their preferred language
**Depends on**: Phase 12
**Requirements**: I18N-03, I18N-04
**Success Criteria** (what must be TRUE):
  1. Landing page and auth pages (login, signup, password reset) render in Chinese or English based on browser locale for unauthenticated users
  2. Unauthenticated user can manually switch language on public pages
  3. All email templates (verification, password reset, invitation, budget warning, admin digest) render in the recipient's stored language preference
  4. Emails to users without a stored preference fall back to English
**Plans**: TBD

Plans:
- [ ] 13-01: TBD
- [ ] 13-02: TBD

### Phase 14: Audit Logs
**Goal**: Org owners and admins have full visibility into who did what within their organization
**Depends on**: Phase 11 (v1.1 complete; independent of i18n phases)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03
**Success Criteria** (what must be TRUE):
  1. Every significant org action (member invited/removed, role changed, API key created/revoked, provider key added/removed, budget changed, settings updated) creates an audit log entry with timestamp, actor, action type, and target
  2. Org owner/admin can view a paginated audit log page showing entries in reverse chronological order
  3. Org owner/admin can filter audit log entries by action type and date range
  4. Regular members cannot access the audit log
**Plans**: TBD

Plans:
- [ ] 14-01: TBD
- [ ] 14-02: TBD

### Phase 15: Model Catalog
**Goal**: Org members can see exactly which models are available to them with pricing and capabilities
**Depends on**: Phase 11 (v1.1 complete; independent of i18n and audit phases)
**Requirements**: MODEL-01, MODEL-02, MODEL-03
**Success Criteria** (what must be TRUE):
  1. System automatically discovers available models from the org's configured provider keys via LiteLLM API
  2. Org members can browse a catalog page listing available models with provider name, pricing (input/output per token), and capabilities
  3. Adding or removing a provider key triggers a model catalog refresh so the catalog stays current
**Plans**: TBD

Plans:
- [ ] 15-01: TBD
- [ ] 15-02: TBD

## Progress

**Execution Order:**
Phases 12 and 13 are sequential (13 depends on 12). Phases 14 and 15 are independent and can execute in parallel with i18n phases.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Dashboard Internationalization | v1.2 | 0/? | Not started | - |
| 13. Public Pages & Email Internationalization | v1.2 | 0/? | Not started | - |
| 14. Audit Logs | v1.2 | 0/? | Not started | - |
| 15. Model Catalog | v1.2 | 0/? | Not started | - |
