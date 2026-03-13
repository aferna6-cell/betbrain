-- Odds history table: stores every fetch snapshot for line movement charts.
-- Unlike odds_cache (upsert, latest only), this table keeps all snapshots.

create table if not exists odds_history (
  id uuid primary key default gen_random_uuid(),
  external_game_id text not null,
  sport text not null,
  bookmaker text not null,
  market text not null,
  home_odds numeric,
  away_odds numeric,
  draw_odds numeric,
  spread_home numeric,
  spread_away numeric,
  spread_line numeric,
  total_over numeric,
  total_under numeric,
  total_line numeric,
  fetched_at timestamptz not null default now()
);

-- Index for fast lookups by game + time ordering
create index if not exists idx_odds_history_game_time
  on odds_history (external_game_id, fetched_at desc);

-- Index for cleanup queries (delete old history)
create index if not exists idx_odds_history_fetched_at
  on odds_history (fetched_at);

-- RLS: service role only (no direct user access)
alter table odds_history enable row level security;
