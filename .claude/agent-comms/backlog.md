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
- [x] **Custom alerts** — In-app line movement alerts with threshold triggers. Email via Resend deferred. _(Cycle 13)_
- [x] **League dashboards** — /dashboard/league/[sport] pages with filtered games and odds. _(Cycle 9)_
- [x] **Injury impact analysis** — AI assesses how key injuries change win probability vs. current line. _(Cycle 12)_
- [x] **H2H history page** — Last 10 meetings, ATS record, O/U trends. Tab on game detail. _(Cycle 14)_
- [x] **Daily email digest** — Morning digest page + API route + preview component. Email sending deferred to Resend. _(Cycle 15)_

## Features — Premium

- [x] **Prop bet analyzer** — AI-powered player prop analysis with projected ranges, edge estimates, and key factors. _(Cycle 16)_
- [x] **Parlay builder** — Multi-leg parlay form, AI assesses combined probability, EV, correlation. _(Cycle 17)_
- [x] **Historical backtesting** — "If I followed Smart Signals last NBA season, what's my ROI?" _(Cycle 22)_
- [x] **Public leaderboard** — Opt-in leaderboard of pick tracker records. Social proof. _(Cycle 23)_
- [x] **API access tier** — $49/mo: access BetBrain analysis via REST API for power users. _(Cycle 24)_

## Bugs
- [ ] (none yet)

## Improvements
- [x] **Mobile navigation** — Hamburger menu for dashboard nav on small screens _(Cycle 29)_
- [x] **Error boundaries** — React error boundary components for graceful failures _(Cycle 29)_
- [x] **Backtesting tests** — Unit tests for deterministic simulation engine _(Cycle 29)_
- [x] **404 page** — Custom not-found page matching dark theme _(Cycle 29)_
- [x] **Keyboard shortcuts** — Cmd+K search palette with keyboard nav _(Cycle 30)_
- [x] **Search** — Global search across games, teams, and analysis _(Cycle 30)_
- [x] **Landing page footer links** — Add links to How It Works, Blog, Disclaimer in footer _(Cycle 31)_
- [x] **Signals + digest tests** — Unit tests for Smart Signals detection + digest generation _(Cycle 31)_
- [x] **Leaderboard + onboarding tests** — Unit tests for leaderboard + email content generators _(Cycle 31)_
- [x] **Env helper tests** — Unit tests for env.ts getters and fallback logic _(Cycle 31)_
- [x] **Saved analyses feature** — Bookmark AI analyses for later review _(Cycle 32)_
- [x] **Dark/light theme toggle** — User preference for theme _(Cycle 32)_
- [x] **Game watchlist** — Star/favorite games for quick access from dashboard _(Cycle 33)_
- [x] **Dashboard stats summary** — Cards showing total picks, win rate, ROI at top of dashboard _(Cycle 33)_
- [x] **Accessibility audit** — ARIA labels, focus management, screen reader support _(Cycle 34)_
- [x] **Watchlist tests** — Unit tests for localStorage watchlist helpers _(Cycle 34)_
- [x] **Toast notifications** — Non-blocking feedback for saves, deletes, errors _(Cycle 35)_
- [x] **Odds conversion utility** — American/decimal/fractional converter + 75 tests _(Cycle 35)_
- [x] **Profile stats card** — Show user's pick record and achievements on profile page _(Cycle 35)_
- [x] **Performance monitoring** — Web Vitals tracking component _(Cycle 33)_
- [x] **Lint cleanup** — Fix all lint errors/warnings, remove unused imports _(Cycle 37)_
- [x] **Type safety** — Replace `as any` with typed SupabaseClient helper _(Cycle 37)_
- [x] **Hardcoded secrets fix** — Eliminate false positives in test files _(Cycle 37)_
- [x] **Parlay analyzer tests** — Unit tests for odds math, validation, interface shapes _(Cycle 38)_
- [x] **Prop analyzer tests** — Unit tests for implied probability, interface shapes _(Cycle 38)_

## Tests
- [x] Odds API wrapper — config constants, type compliance, data shape validation _(Cycle 14)_
- [x] Stats API wrapper — type compliance, isSupportedSport, constants, StatsResult shape _(Cycle 18)_
- [x] AI analysis — structured output validation, disclaimer present, limit error _(Cycle 14)_
- [x] Auth flow — signup, login, protected routes, logout _(Cycle 19)_
- [x] Stripe — free tier limits, pro access, webhook signature _(Cycle 20)_
- [x] Rate limiting — cache serves stale data when limit hit _(Cycle 21)_

## Content
- [x] Landing page copy — hero, features, pricing, FAQ _(Cycle 6 — built into landing page)_
- [x] "How BetBrain Works" explainer page _(Cycle 22)_
- [x] Legal disclaimer page _(Cycle 22)_
- [x] Onboarding email sequence (welcome, tutorial, pro nudge) _(Cycle 25)_
- [x] SEO blog posts: "AI Sports Betting Analytics 2026", "How to Find Value in Betting Lines" _(Cycle 26)_

## Optimization
- [x] ISR for game pages (rebuild every 5 min) _(Cycle 25)_
- [x] Loading skeletons on all data components _(Cycle 14)_
- [x] Lazy load charts _(Cycle 26)_
- [x] SEO metadata on all pages _(Cycle 14)_
- [x] OG images for social sharing _(Cycle 27)_
- [x] Edge runtime for API routes where possible _(Cycle 27)_

## Deployment Readiness (Cycle 65)
- [x] Deployment dry-run — metadataBase fix, all 53 routes clean _(Cycle 65)_
- [x] E2E smoke tests — 15 Playwright tests _(Cycle 65)_
- [x] Performance audit — bundle analysis, no issues _(Cycle 65)_
- [x] Rate limit hardening — 6 new cache-first tests (862 total) _(Cycle 65)_
- [x] Architecture decisions — 3 new entries _(Cycle 65)_

## Sharp Bettor Features (Cycles 67-70)
- [x] **Customer simulation — Sharp NBA bettor** — 14-page walkthrough, 10 gaps found _(Cycle 67)_
- [x] **CLV (Closing Line Value) tracker** — Migration 003, lib, API with per-pick + aggregate CLV, PATCH endpoint _(Cycle 68)_
- [x] **Bankroll management dashboard** — Balance tracking, drawdown, Kelly criterion, /dashboard/bankroll _(Cycle 69)_
- [x] **Empty states polish** — Leaderboard, backtesting, parlay, props initial guidance _(Cycle 70)_
- [x] **API docs expansion** — 6 endpoints documented (added picks/CLV + odds history) _(Cycle 70)_

## Quick Wins (Cycles 71-72)
- [x] **Implied probability display** — Show win probability next to moneyline odds _(Cycle 71)_
- [x] **Cached odds timestamps** — Show "fetched X min ago" instead of "may be outdated" _(Cycle 72)_

## Features (Cycles 73-75)
- [x] **Spread + total alerts** — Expand alerts beyond moneyline-only (migration 005) _(Cycle 73)_
- [x] **Guided onboarding flow** — 4-step checklist for first-time users _(Cycle 74)_
- [x] **Tests + docs** — 11 new tests, 4 architecture decisions _(Cycle 75)_

## Optimization (Cycles 76-80)
- [x] **useFetch hook** — Generic fetch hook for standardized data fetching _(Cycle 76)_
- [x] **Server component conversion** — smart-signals + h2h-history (remove unnecessary client JS) _(Cycle 77)_
- [x] **Shared color extraction** — profitColor, winRateColor, MAGNITUDE_COLORS to format.ts _(Cycle 78)_
- [x] **odds_history retention** — 30-day cleanup function (migration 006) _(Cycle 79)_
- [x] **Route handler + alert tests** — 25 new tests covering API helpers + market checking _(Cycle 80)_

## UX Polish (Cycles 81-85)
- [x] **Set Outcome button** — Pending picks now have clickable "Set result" with auto profit calc _(Cycle 81)_
- [x] **Implied probability on game cards** — Show win % next to best moneyline _(Cycle 82)_
- [x] **Nav notification badges** — Triggered alert count + pending picks count _(Cycle 83)_
- [x] **Bookmaker disagreement indicator** — Yellow "odds disagree" flag when books diverge 15+ pts _(Cycle 84)_
- [x] **Landing page rewrite** — Sell CLV, bankroll, ROI instead of generic "AI analytics" _(Cycle 85)_

## Pick Tracker + Digest (Cycles 86-90)
- [x] **Closing odds on pick form** — Optional field at creation time _(Cycle 86)_
- [x] **Pick deletion** — DELETE endpoint + confirm button _(Cycle 87)_
- [x] **CLV on profile page** — Avg CLV, weighted CLV, +CLV rate _(Cycle 88)_
- [x] **Digest weekly stats** — YOUR WEEK section with W-L-P, ROI, CLV rate _(Cycle 89)_
- [x] **Stats envelope tests** — 3 new tests for StatsResult contract _(Cycle 90)_

## Phase 2 — Post-Launch
- [ ] **Resend email integration** — Wire up daily digest + alert email notifications
- [ ] **Additional sports data sources** — NFL/MLB/NHL stats beyond balldontlie (NBA-only)
- [ ] **Supabase type generation** — Auto-generate types from `supabase gen types` instead of hand-written
- [ ] **Signal historical hit rate** — Track and display signal outcome success rate
- [ ] **Analytics dashboard** — User engagement metrics, popular games, analysis usage
- [ ] **Social sharing** — Share picks/analyses with custom OG images
- [ ] **Mobile app** — React Native or PWA improvements for mobile users
