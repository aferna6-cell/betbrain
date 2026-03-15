-- ============================================================
-- BetBrain — All Migrations (001-007)
-- Run this in Supabase SQL Editor to apply all migrations at once.
-- Safe to run multiple times — uses IF NOT EXISTS where possible.
-- ============================================================

-- NOTE: Copy the contents of each migration file in order.
-- This file just documents the order. Use the individual files.

-- 1. supabase/migrations/001_initial_schema.sql
-- 2. supabase/migrations/002_fix_api_usage_system_tracking.sql
-- 3. supabase/migrations/003_odds_history.sql
-- 4. supabase/migrations/004_alerts.sql
-- 5. supabase/migrations/005_add_closing_odds_to_picks.sql
-- 6. supabase/migrations/006_expand_alert_markets.sql
-- 7. supabase/migrations/007_odds_history_retention.sql

-- To apply all at once, concatenate them:
-- cat supabase/migrations/*.sql | pbcopy
-- Then paste into Supabase SQL Editor.
