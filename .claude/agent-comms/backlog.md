# BetBrain Work Backlog

## Features — MVP

- [x] **Supabase schema + migration SQL** — Tables: profiles, game_cache, odds_cache, ai_insights, saved_analyses, user_picks, api_usage. Write the SQL. Document in schema-log.md. _(Cycle 1)_
- [x] **Supabase client setup** — Create src/lib/supabase/client.ts with browser + server clients. Type-safe queries. _(Cycle 1)_
- [x] **Auth flow** — Supabase Auth: signup, login, logout, password reset. Protected routes via middleware. Profile page. _(Cycle 2)_
- [x] **The Odds API wrapper** — src/lib/sports/odds.ts. Fetch upcoming games + odds for NBA, NFL, MLB, NHL. Cache in odds_cache. Handle rate limits. _(Cycle 3)_
- [x] **balldontlie API wrapper** — src/lib/sports/stats.ts. Fetch team stats, player stats, game results. Cache in game_cache. _(Cycle 3)_
- [x] **Dashboard home page** — Today's games across leagues. Game cards: teams, time, top-3 book odds, AI confidence badge. Filterable by league. _(Cycle 4)_
- [x] **Game detail page** — /dashboard/games/[gameId]. Odds comparison table (moneyline, spread, totals), AI analysis tab. Best odds highlighted green. _(Cycle 5)_
- [x] **AI game analysis** — API route that sends matchup data to Claude, returns structured analysis. Cache per game. Enforce free tier limits. _(Cycle 4)_
- [x] **Odds comparison table** — Side-by-side bookmaker odds for each game. Highlight best line (green). Built into game detail page. _(Cycle 5)_
- [x] **Landing page** — Hero, features grid, pricing tiers (Free/Pro), how it works, responsible gambling disclaimer. Dark theme. _(Cycle 6)_
- [x] **Stripe integration** — Checkout session, webhook handler, billing page, nav link. Free/Pro tiers wired to Supabase profiles. _(Cycle 7)_

## Features — Growth

- [x] **Line movement chart** — Show odds movement over time per game. Recharts line chart. odds_history table + chart tab. _(Cycle 11)_
- [x] **Smart Signals** — Games where stats + odds + trends all align. Highlighted badge on dashboard. Separate Smart Signals page. _(Cycle 10)_
- [x] **Pick tracker** — Log picks with sport, type, odds, units. History table + stats summary (record, profit, ROI). _(Cycle 8)_
- [ ] **Custom alerts** — "Notify me when [line moves past X]". Email notifications via Resend.
- [x] **League dashboards** — /dashboard/league/[sport] pages with filtered games and odds. _(Cycle 9)_
- [x] **Injury impact analysis** — AI assesses how key injuries change win probability vs. current line. _(Cycle 12)_
- [ ] **H2H history page** — Last 10 meetings, ATS record, O/U trends, venue splits.
- [ ] **Daily email digest** — Morning email: best value plays, significant moves, Smart Signals. Via Resend.

## Features — Premium

- [ ] **Prop bet analyzer** — "Is LeBron O25.5 pts good?" AI considers usage, matchup, minutes, pace.
- [ ] **Parlay builder** — Build parlay, AI assesses combined probability vs payout odds. Flags +EV parlays.
- [ ] **Historical backtesting** — "If I followed Smart Signals last NBA season, what's my ROI?"
- [ ] **Public leaderboard** — Opt-in leaderboard of pick tracker records. Social proof.
- [ ] **API access tier** — $49/mo: access BetBrain analysis via REST API for power users.

## Bugs
- [ ] (none yet)

## Tests
- [ ] Odds API wrapper — mocked responses, cache hit/miss, rate limit handling
- [ ] Stats API wrapper — mocked responses, data normalization
- [ ] AI analysis — structured output validation, disclaimer present
- [ ] Auth flow — signup, login, protected routes, logout
- [ ] Stripe — free tier limits, pro access, webhook signature
- [ ] Rate limiting — cache serves stale data when limit hit

## Content
- [x] Landing page copy — hero, features, pricing, FAQ _(Cycle 6 — built into landing page)_
- [ ] "How BetBrain Works" explainer page
- [ ] Legal disclaimer page
- [ ] Onboarding email sequence (welcome, tutorial, pro nudge)
- [ ] SEO blog posts: "AI Sports Betting Analytics 2026", "How to Find Value in Betting Lines"

## Optimization
- [ ] ISR for game pages (rebuild every 5 min)
- [ ] Loading skeletons on all data components
- [ ] Lazy load charts
- [ ] SEO metadata on all pages
- [ ] OG images for social sharing
- [ ] Edge runtime for API routes where possible
