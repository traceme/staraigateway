-- Migration: Convert models column from text to jsonb
-- This handles existing data safely:
-- - Valid JSON strings are cast to jsonb normally
-- - Empty strings ('') are converted to JSON null
-- - NULL values pass through unchanged (PostgreSQL handles this natively)

ALTER TABLE "app_provider_keys" ALTER COLUMN "models" SET DATA TYPE jsonb USING COALESCE(nullif(models, '')::jsonb, 'null'::jsonb);
