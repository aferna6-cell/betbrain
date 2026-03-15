-- ============================================================
-- Add closing_odds to user_picks for CLV tracking
-- CLV (Closing Line Value) is the #1 predictor of long-term
-- profitability. Tracks the difference between bet price and
-- closing line to measure true edge.
-- ============================================================

alter table user_picks
  add column closing_odds numeric;

comment on column user_picks.closing_odds is
  'The closing line odds at game time. Used to calculate CLV (Closing Line Value). Null until the game starts and closing odds are recorded.';
