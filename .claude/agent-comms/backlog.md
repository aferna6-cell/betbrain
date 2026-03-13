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
- [ ] **Landing page** — Hero + features + pricing + CTA. Dark theme. Modern. Conversion-focused.
- [ ] **Stripe integration** — Free (3 analyses/day) + Pro ($29/mo: unlimited, all leagues, alerts). Checkout, webhook, subscription management.

## Features — Growth

- [ ] **Line movement chart** — Show odds movement over time per game. Recharts line chart. AI flags sharp moves.
- [ ] **Smart Signals** — Games where stats + odds + trends all align. Highlighted badge on dashboard. Separate Smart Signals page.
- [ ] **Pick tracker** — Log picks: team, odds, units. Track record/ROI over time. Personal dashboard widget.
- [ ] **Custom alerts** — "Notify me when [line moves past X]". Email notifications via Resend.
- [ ] **League dashboards** — Dedicated /nba, /nfl, /mlb, /nhl pages with league-specific stats and standings.
- [ ] **Injury impact analysis** — AI assesses how key injuries change win probability vs. current line.
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
- [ ] Landing page copy — hero, features, pricing, FAQ
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
