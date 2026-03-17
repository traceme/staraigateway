-- Migration: 0004_budget_snapshot
-- Adds rolling spend snapshot columns to app_budgets for O(1) budget checks (PERF-02)

ALTER TABLE app_budgets ADD COLUMN spend_snapshot_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_budgets ADD COLUMN snapshot_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
