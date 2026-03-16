-- Migration: 0003_usage_budgets
-- Adds usage logging and budget tables for Phase 3

CREATE TABLE IF NOT EXISTS app_usage_logs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES app_organizations(id),
    user_id TEXT NOT NULL REFERENCES app_users(id),
    api_key_id TEXT NOT NULL REFERENCES app_api_keys(id),
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost NUMERIC(12, 6) NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'success',
    is_streaming BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_usage_logs_org_created_idx ON app_usage_logs (org_id, created_at);
CREATE INDEX IF NOT EXISTS app_usage_logs_user_created_idx ON app_usage_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS app_usage_logs_org_model_idx ON app_usage_logs (org_id, model);

CREATE TABLE IF NOT EXISTS app_budgets (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES app_organizations(id),
    user_id TEXT REFERENCES app_users(id),
    role TEXT,
    hard_limit_cents INTEGER,
    soft_limit_cents INTEGER,
    reset_day INTEGER NOT NULL DEFAULT 1,
    is_org_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_budgets_org_user_unique ON app_budgets (org_id, user_id);
CREATE INDEX IF NOT EXISTS app_budgets_org_default_idx ON app_budgets (org_id, is_org_default);
CREATE UNIQUE INDEX IF NOT EXISTS app_budgets_org_role_unique ON app_budgets (org_id, role);
