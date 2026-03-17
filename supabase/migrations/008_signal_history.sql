-- Signal history: persist Smart Signals for outcome tracking and hit rate analysis
CREATE TABLE IF NOT EXISTS signal_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_game_id TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('nba', 'nfl', 'mlb', 'nhl')),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  game_date TIMESTAMPTZ NOT NULL,
  strength TEXT NOT NULL CHECK (strength IN ('strong', 'moderate')),
  signal_count INTEGER NOT NULL DEFAULT 0,
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  value_side TEXT CHECK (value_side IN ('home', 'away')),
  ai_confidence NUMERIC,
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'push', 'pending')),
  resolved_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (external_game_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_signal_history_sport ON signal_history (sport);
CREATE INDEX IF NOT EXISTS idx_signal_history_outcome ON signal_history (outcome);
CREATE INDEX IF NOT EXISTS idx_signal_history_detected_at ON signal_history (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_history_strength ON signal_history (strength);

-- RLS: service role can insert/update, authenticated users can read
ALTER TABLE signal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage signal_history"
  ON signal_history FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read signal_history"
  ON signal_history FOR SELECT
  USING (auth.role() = 'authenticated');
