-- BetBrain Initial Schema
-- Migration 001: Core tables for MVP
-- Date: 2026-03-12

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- User profile linked to Supabase Auth. Stores subscription tier.
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  analyses_today integer not null default 0,
  analyses_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function public.update_updated_at();

-- ============================================================
-- 2. GAME_CACHE
-- Cached game data from sports APIs (balldontlie, etc.)
-- ============================================================
create table game_cache (
  id uuid primary key default uuid_generate_v4(),
  external_game_id text not null,
  sport text not null check (sport in ('nba', 'nfl', 'mlb', 'nhl')),
  home_team text not null,
  away_team text not null,
  game_date timestamptz not null,
  data jsonb not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(external_game_id, sport)
);

alter table game_cache enable row level security;

-- Game cache is readable by all authenticated users
create policy "Authenticated users can read game cache"
  on game_cache for select using (auth.role() = 'authenticated');

-- Only service role can write (API routes use service role)
create policy "Service role can manage game cache"
  on game_cache for all using (auth.role() = 'service_role');

create index idx_game_cache_sport_date on game_cache(sport, game_date);
create index idx_game_cache_expires on game_cache(expires_at);
create index idx_game_cache_external_id on game_cache(external_game_id);

create trigger game_cache_updated_at
  before update on game_cache
  for each row execute function public.update_updated_at();

-- ============================================================
-- 3. ODDS_CACHE
-- Cached odds from The Odds API. One row per game+bookmaker+market.
-- ============================================================
create table odds_cache (
  id uuid primary key default uuid_generate_v4(),
  external_game_id text not null,
  sport text not null check (sport in ('nba', 'nfl', 'mlb', 'nhl')),
  bookmaker text not null,
  market text not null default 'h2h',
  home_odds numeric,
  away_odds numeric,
  draw_odds numeric,
  spread_home numeric,
  spread_away numeric,
  total_over numeric,
  total_under numeric,
  total_line numeric,
  spread_line numeric,
  data jsonb not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(external_game_id, bookmaker, market)
);

alter table odds_cache enable row level security;

create policy "Authenticated users can read odds cache"
  on odds_cache for select using (auth.role() = 'authenticated');

create policy "Service role can manage odds cache"
  on odds_cache for all using (auth.role() = 'service_role');

create index idx_odds_cache_game on odds_cache(external_game_id);
create index idx_odds_cache_sport on odds_cache(sport);
create index idx_odds_cache_expires on odds_cache(expires_at);

create trigger odds_cache_updated_at
  before update on odds_cache
  for each row execute function public.update_updated_at();

-- ============================================================
-- 4. AI_INSIGHTS
-- Cached AI analysis per game. One analysis per game.
-- ============================================================
create table ai_insights (
  id uuid primary key default uuid_generate_v4(),
  external_game_id text not null,
  sport text not null check (sport in ('nba', 'nfl', 'mlb', 'nhl')),
  summary text not null,
  key_factors jsonb not null default '[]',
  value_assessment jsonb not null default '{}',
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  confidence numeric not null check (confidence >= 0 and confidence <= 100),
  raw_analysis jsonb not null default '{}',
  model text not null default 'claude-sonnet-4-6',
  disclaimer text not null default 'For informational purposes only. Not financial advice.',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(external_game_id, sport)
);

alter table ai_insights enable row level security;

create policy "Authenticated users can read ai insights"
  on ai_insights for select using (auth.role() = 'authenticated');

create policy "Service role can manage ai insights"
  on ai_insights for all using (auth.role() = 'service_role');

create index idx_ai_insights_game on ai_insights(external_game_id);
create index idx_ai_insights_sport on ai_insights(sport);
create index idx_ai_insights_expires on ai_insights(expires_at);

create trigger ai_insights_updated_at
  before update on ai_insights
  for each row execute function public.update_updated_at();

-- ============================================================
-- 5. SAVED_ANALYSES
-- User bookmarks for AI insights.
-- ============================================================
create table saved_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  insight_id uuid not null references ai_insights(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, insight_id)
);

alter table saved_analyses enable row level security;

create policy "Users can read own saved analyses"
  on saved_analyses for select using (auth.uid() = user_id);

create policy "Users can insert own saved analyses"
  on saved_analyses for insert with check (auth.uid() = user_id);

create policy "Users can delete own saved analyses"
  on saved_analyses for delete using (auth.uid() = user_id);

create index idx_saved_analyses_user on saved_analyses(user_id);

-- ============================================================
-- 6. USER_PICKS
-- Personal pick tracking. Record keeping only — no real money.
-- ============================================================
create table user_picks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  external_game_id text not null,
  sport text not null check (sport in ('nba', 'nfl', 'mlb', 'nhl')),
  pick_type text not null check (pick_type in ('moneyline', 'spread', 'over', 'under', 'prop')),
  pick_team text,
  pick_line numeric,
  odds numeric not null,
  units numeric not null default 1 check (units > 0),
  outcome text check (outcome in ('win', 'loss', 'push', 'pending')),
  profit numeric,
  notes text,
  game_date timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_picks enable row level security;

create policy "Users can read own picks"
  on user_picks for select using (auth.uid() = user_id);

create policy "Users can insert own picks"
  on user_picks for insert with check (auth.uid() = user_id);

create policy "Users can update own picks"
  on user_picks for update using (auth.uid() = user_id);

create policy "Users can delete own picks"
  on user_picks for delete using (auth.uid() = user_id);

create index idx_user_picks_user on user_picks(user_id);
create index idx_user_picks_sport on user_picks(sport);
create index idx_user_picks_game_date on user_picks(game_date);
create index idx_user_picks_outcome on user_picks(user_id, outcome);

create trigger user_picks_updated_at
  before update on user_picks
  for each row execute function public.update_updated_at();

-- ============================================================
-- 7. API_USAGE
-- Track API calls per user per month for rate limiting.
-- ============================================================
create table api_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  api_name text not null check (api_name in ('odds', 'balldontlie', 'claude')),
  call_count integer not null default 0,
  month text not null, -- format: '2026-03'
  updated_at timestamptz not null default now(),
  unique(user_id, api_name, month)
);

alter table api_usage enable row level security;

create policy "Users can read own api usage"
  on api_usage for select using (auth.uid() = user_id);

create policy "Service role can manage api usage"
  on api_usage for all using (auth.role() = 'service_role');

create index idx_api_usage_user_month on api_usage(user_id, month);

create trigger api_usage_updated_at
  before update on api_usage
  for each row execute function public.update_updated_at();

-- ============================================================
-- HELPER: Increment API usage (called from API routes)
-- ============================================================
create or replace function public.increment_api_usage(
  p_user_id uuid,
  p_api_name text,
  p_month text
)
returns void as $$
begin
  insert into api_usage (user_id, api_name, call_count, month)
  values (p_user_id, p_api_name, 1, p_month)
  on conflict (user_id, api_name, month)
  do update set
    call_count = api_usage.call_count + 1,
    updated_at = now();
end;
$$ language plpgsql security definer;

-- ============================================================
-- HELPER: Reset daily analysis count (called from cron or API)
-- ============================================================
create or replace function public.reset_daily_analyses(p_user_id uuid)
returns void as $$
begin
  update profiles
  set analyses_today = 0, analyses_reset_at = now()
  where id = p_user_id
    and analyses_reset_at < now() - interval '24 hours';
end;
$$ language plpgsql security definer;
