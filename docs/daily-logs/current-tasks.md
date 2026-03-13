# Current Tasks — 2026-03-12 Evening

## Completed Today

- [x] Scaffolded the BetBrain repo, agent prompts, backlog, and knowledge base
- [x] Built the auth flow, protected dashboard routes, and profile page
- [x] Added the sports data layer for The Odds API + balldontlie with cache-first wrappers
- [x] Hardened the agent workflow with an evening health snapshot, env helpers, shared route error handling, and a schema fix for shared API usage tracking
- [x] Added committed daily-review automation (`npm run health-check`, `npm run evening:auto`, `.claude/commands/evening.md`)

## Carry Forward

- [ ] Dashboard home page with real game cards, top bookmakers, league filters, and API usage indicator
- [ ] Game detail page with odds comparison, recent form, and matchup context
- [ ] AI game analysis route and cache layer with structured output + disclaimer
- [ ] Establish a real automated test baseline for auth and sports wrappers

## New Tasks Discovered During Evening Review

- [ ] Apply `supabase/migrations/002_fix_api_usage_system_tracking.sql` to every Supabase environment
- [ ] Add `NEXT_PUBLIC_SITE_URL` to every environment so auth emails generate correct callback links
- [ ] Decide when to remove the deprecated `THE_ODDS_API_KEY` fallback after all environments are normalized
- [ ] Add CI or another unsandboxed build path if future agent runs need reliable automated build verification

## Setup / Integration Tasks

- [ ] Point Task Scheduler (or cron/CI equivalent) at `scripts/daily/evening-auto.sh`
- [ ] Ensure Supabase migration execution is part of the deployment/update checklist

## Tomorrow’s Top 3 Priorities

1. Build the dashboard home page on top of the sports wrappers that landed today
2. Add the first real tests around auth flow and sports data caching/usage tracking
3. Start the AI analysis route with structured output and mandatory disclaimer enforcement
