-- Expand alerts to support spread and total markets (was moneyline-only).

-- Drop the old constraint and add a new one with all three markets.
alter table alerts drop constraint if exists alerts_market_check;
alter table alerts add constraint alerts_market_check
  check (market in ('moneyline', 'spreads', 'totals'));

-- For spread/total alerts, the threshold may represent a point value
-- (e.g. "alert when spread goes below -5.5") rather than an odds value.
-- No schema change needed — the threshold column is already numeric.
comment on column alerts.threshold is
  'For moneyline: an American odds value (e.g. -110). For spreads/totals: a point line value (e.g. -5.5 or 220.5).';
