-- User-defined line movement alerts.
-- A rule defines: "alert me when [team] [market] goes [above/below] [threshold]."

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  external_game_id text not null,
  sport text not null,
  team text not null,
  side text not null check (side in ('home', 'away')),
  market text not null default 'moneyline' check (market in ('moneyline')),
  condition text not null check (condition in ('above', 'below')),
  threshold numeric not null,
  triggered boolean not null default false,
  triggered_at timestamptz,
  triggered_value numeric,
  created_at timestamptz not null default now()
);

-- User sees their own alerts
alter table alerts enable row level security;

create policy "Users can manage own alerts"
  on alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for checking alerts against odds updates
create index if not exists idx_alerts_active
  on alerts (external_game_id, triggered) where triggered = false;

-- Index for user lookups
create index if not exists idx_alerts_user
  on alerts (user_id, created_at desc);
