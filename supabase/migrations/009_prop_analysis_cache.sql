-- Prop analysis cache: store AI prop analysis results so re-viewing
-- the same prop does not consume the user's daily analysis limit.
CREATE TABLE IF NOT EXISTS prop_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('nba', 'nfl', 'mlb', 'nhl')),
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  prop_market TEXT NOT NULL,
  line NUMERIC NOT NULL,
  over_odds INTEGER NOT NULL,
  under_odds INTEGER NOT NULL,
  result JSONB NOT NULL DEFAULT '{}',
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250514',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One cached result per user + prop combination (same matchup + market + line)
  UNIQUE (user_id, player_name, sport, team, opponent, prop_market, line)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_prop_cache_user ON prop_analysis_cache (user_id);
CREATE INDEX IF NOT EXISTS idx_prop_cache_expires ON prop_analysis_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_prop_cache_lookup ON prop_analysis_cache (
  user_id, player_name, sport, prop_market, line
);

-- RLS
ALTER TABLE prop_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Users can read their own cached prop analyses
CREATE POLICY "Users can read own prop cache"
  ON prop_analysis_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all rows (API routes use service role)
CREATE POLICY "Service role can manage prop cache"
  ON prop_analysis_cache FOR ALL
  USING (auth.role() = 'service_role');
