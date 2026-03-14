# Schema Change Log — BetBrain

_Every database schema change. Check before writing queries._

---

## Migration 001: Initial Schema (2026-03-12)

**File:** `supabase/migrations/001_initial_schema.sql`

### Tables Created

| Table | Columns | RLS | Indexes |
|-------|---------|-----|---------|
| `profiles` | id (uuid PK → auth.users), email, display_name, subscription_tier (free/pro), stripe_customer_id, stripe_subscription_id, analyses_today, analyses_reset_at, created_at, updated_at | Users read/update own | — |
| `game_cache` | id (uuid PK), external_game_id, sport, home_team, away_team, game_date, data (jsonb), expires_at, created_at, updated_at | Auth read, service write | sport+date, expires_at, external_game_id |
| `odds_cache` | id (uuid PK), external_game_id, sport, bookmaker, market, home_odds, away_odds, draw_odds, spread_home, spread_away, total_over, total_under, total_line, spread_line, data (jsonb), expires_at, created_at, updated_at | Auth read, service write | external_game_id, sport, expires_at |
| `ai_insights` | id (uuid PK), external_game_id, sport, summary, key_factors (jsonb), value_assessment (jsonb), risk_level (low/medium/high), confidence (0-100), raw_analysis (jsonb), model, disclaimer, expires_at, created_at, updated_at | Auth read, service write | external_game_id, sport, expires_at |
| `saved_analyses` | id (uuid PK), user_id → profiles, insight_id → ai_insights, notes, created_at | Users own rows | user_id |
| `user_picks` | id (uuid PK), user_id → profiles, external_game_id, sport, pick_type (moneyline/spread/over/under/prop), pick_team, pick_line, odds, units, outcome (win/loss/push/pending), profit, notes, game_date, resolved_at, created_at, updated_at | Users own rows | user_id, sport, game_date, user_id+outcome |
| `api_usage` | id (uuid PK), user_id → profiles, api_name (odds/balldontlie/claude), call_count, month (text '2026-03'), updated_at | Users read own, service write | user_id+month |

### Unique Constraints

- `game_cache(external_game_id, sport)`
- `odds_cache(external_game_id, bookmaker, market)`
- `ai_insights(external_game_id, sport)`
- `saved_analyses(user_id, insight_id)`
- `user_picks` — no unique (user can have multiple picks per game)
- `api_usage(user_id, api_name, month)`

### Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger: auto-creates profile row on auth.users insert |
| `update_updated_at()` | Trigger: auto-updates updated_at on row update |
| `increment_api_usage(user_id, api_name, month)` | Upserts API call count for rate limiting |
| `reset_daily_analyses(user_id)` | Resets analyses_today if 24h have passed |

### Enums (via CHECK constraints)

- `sport`: nba, nfl, mlb, nhl
- `subscription_tier`: free, pro
- `risk_level`: low, medium, high
- `pick_type`: moneyline, spread, over, under, prop
- `outcome`: win, loss, push, pending
- `api_name`: odds, balldontlie, claude

### Why It Matters

- Establishes the auth/profile model, cached data tables, and AI insight storage that every MVP feature depends on.
- Makes shared cached sports data readable to authenticated users while reserving writes for service-role API routes.
- Encodes the mandatory AI disclaimer at the schema layer so analysis records cannot omit it accidentally.

### Risks / Follow-Up

- The original `api_usage` uniqueness model did not correctly support shared system counters with `user_id = null`; this is corrected in Migration 002.
- `src/lib/supabase/types.ts` is hand-maintained, so future schema changes need a matching type update in the same workstream.

---

## Migration 002: Fix API Usage System Tracking (2026-03-12)

**File:** `supabase/migrations/002_fix_api_usage_system_tracking.sql`

### Summary

- Removes duplicate system-scoped `api_usage` rows where `user_id is null`
- Replaces the old single unique constraint with two partial unique indexes:
  - `(user_id, api_name, month)` when `user_id is not null`
  - `(api_name, month)` when `user_id is null`
- Updates `increment_api_usage()` to upsert user-scoped and system-scoped counters correctly

### Why It Matters

- The Odds API and balldontlie keys are shared across all users, so rate limiting depends on one durable system counter per API per month.
- Without this migration, shared usage tracking can silently drift or fail, which undermines cache-only safeguards and dashboard quota reporting.

### Risks / Rollback Concerns

- Rolling this back would reintroduce duplicate/null system counters unless the sports wrappers are also reverted away from `user_id = null`.
- If production data already contains multiple null-keyed rows per API/month, deduplication order matters; this migration keeps one surviving row per duplicate set before adding the new indexes.

---

## Migration 003: Odds History (2026-03-13)

**File:** `supabase/migrations/003_odds_history.sql`

### Summary

- Creates `odds_history` table for line movement chart data
- Columns mirror `odds_cache` odds fields (home_odds, away_odds, draw_odds, spread_*, total_*) plus `fetched_at` timestamp
- No unique constraint — allows multiple snapshots per game/bookmaker/market
- Indexes: `(external_game_id, fetched_at desc)` for game lookups, `(fetched_at)` for cleanup
- RLS enabled, service-role only (no direct user access)

### Why It Matters

- `odds_cache` uses upsert (latest only), so line movement requires a separate append-only table
- Each odds fetch now inserts into both `odds_cache` (latest) and `odds_history` (append)
- Enables the Line Movement chart on game detail pages

### TypeScript Types

- Added `odds_history` table type to `src/lib/supabase/types.ts`

---

## Migration 004: Alerts (2026-03-13)

**File:** `supabase/migrations/004_alerts.sql`

### Summary

- Creates `alerts` table for user-defined line movement alert rules
- Each alert specifies: game, team, side, market (moneyline only), condition (above/below), threshold
- Alerts are marked triggered when any bookmaker's odds cross the threshold
- RLS enabled: users manage their own alerts only

### Columns

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK → profiles | on delete cascade |
| external_game_id | text | The Odds API game ID |
| sport | text | nba, nfl, mlb, nhl |
| team | text | Team name |
| side | text | 'home' or 'away' |
| market | text | default 'moneyline', check ('moneyline') |
| condition | text | 'above' or 'below' |
| threshold | numeric | Target odds value |
| triggered | boolean | default false |
| triggered_at | timestamptz | null until triggered |
| triggered_value | numeric | null until triggered |
| created_at | timestamptz | default now() |

### Indexes

- `idx_alerts_active` — `(external_game_id, triggered) WHERE triggered = false` for checking alerts
- `idx_alerts_user` — `(user_id, created_at desc)` for user dashboard

### TypeScript Types

- Added `alerts` table type to `src/lib/supabase/types.ts`
