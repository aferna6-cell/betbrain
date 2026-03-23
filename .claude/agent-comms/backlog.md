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

## Features — Tier 2: Retention

- [x] **Streak tracking + badges** — streaks.ts + picks-tracker.tsx
- [x] **Pick comparison mode** — game-compare.tsx
- [x] **Steam move detection** — steam-moves.ts, /api/odds/steam, Signals page Steam tab. 14 tests
- [x] **Consensus vs. contrarian indicator** — consensus.ts, EV Scanner Consensus tab. 10 tests
- [x] **Export picks to CSV** — picks-tracker.tsx exportPicksToCSV
- [x] **Correlation warnings on parlays** — parlay-correlation.ts + parlay-builder.tsx
- [x] **Game day countdown** — game-countdown.tsx + game-card.tsx
- [x] **ROI by day of week** — pick-stats.ts calcDayOfWeekBreakdown + picks-tracker DayOfWeekDisplay
- [x] **Unit size recommendations** — unit-sizing.ts + bankroll page
- [x] **Share analysis to Twitter/X** — game-detail.tsx shareAnalysisToX
- [x] **Seasonal performance reset** — seasonal-reset.ts, season-reset.tsx, picks-tracker filter. 10 tests
- [x] **Daily highlights summary** — daily-summary.tsx on dashboard with EV/consensus/signals at a glance
- [x] **Cache prop analyses** — prop_analysis_cache table + 6hr TTL in prop-analyzer.ts
- [x] **Preferred bookmaker setting** — preferences.ts + game-detail.tsx OddsTable highlighting
- [x] **Odds screen per-book colors** — book-colors.ts, colored dots + row tinting in odds tables
- [x] **Betting journal** — journal.ts, betting-journal.tsx, /dashboard/journal. Mood, bankroll, notes, tags, CSV export. 15 tests
- [x] **Notification center** — notifications.ts, notification-center.tsx, bell icon in nav. Filter by type, mark read. 16 tests
- [x] **Regression alerts** — regression-alerts.ts + regression-alerts.tsx. ROI drops, losing streaks, cold sports, unit drain. 12 tests
- [x] **Game notes** — game-notes.ts, game-notes.tsx. Pre/post-game notes tab on game detail. 8 tests
- [x] **Book-specific ROI** — book-roi.ts, book-roi-tracker.tsx on bankroll page. 10 tests
- [x] **Parlay hit rate tracking** — parlay-stats.ts. Separate parlay vs straight stats. 10 tests
- [x] **Weekly recap** — weekly-recap.ts, weekly-recap.tsx on digest page. Best/worst picks, sport breakdown, streaks. 10 tests
- [x] **Performance by time of day** — time-analysis.ts, time-analysis.tsx on analytics page. 8 tests
- [x] **Bankroll goals** — bankroll-goals.ts, bankroll-goals.tsx on bankroll page. Templates, progress bars, projections. 11 tests
- [ ] **Multi-game comparison table** — Select 2-5 games with all metrics side by side
- [ ] **Alternate lines display** — Needs API fetch changes for alternate spread/total markets
- [ ] **Live score integration** — Show live scores for tracked picks
- [ ] **Prop market breakdown in pick stats** — Needs prop_market column on user_picks

## Phase 2 — Post-Launch
- [ ] **Resend email integration** — Wire up daily digest + alert email notifications
- [ ] **Additional sports data sources** — NFL/MLB/NHL stats beyond balldontlie (NBA-only)
- [ ] **Supabase type generation** — Auto-generate types from supabase gen types
- [ ] **Mobile app** — React Native or PWA improvements

## Tests — Coverage Gaps
- [x] **Bankroll management tests** — bankroll.test.ts (78 lines)
- [x] **Auto-resolve tests** — auto-resolve.test.ts (460 lines, 55 tests)
- [x] **EV scanner tests** — ev-scanner.test.ts (413 lines, 146 tests)
- [x] **Alert trigger tests** — alerts.test.ts (170 lines)
- [x] **Steam move tests** — steam-moves.test.ts (14 tests)
- [x] **Consensus tests** — consensus.test.ts (10 tests)
- [x] **Seasonal reset tests** — seasonal-reset.test.ts (10 tests)
- [ ] **API route auth tests** — Verify all protected routes return 401 without auth

## Backlog — Future Ideas
- [ ] **Custom signal builder** — User-defined signal criteria (CLV > 3% AND confidence > 70)
- [ ] **Odds API v2 markets** — Fetch player props, alternate lines, game props
- [ ] **Analysis history timeline** — Past AI analyses with outcome comparison
- [ ] **Odds API budget optimizer** — Smart scheduling for popular vs low-interest sports
- [ ] **Multi-device sync** — Sync localStorage preferences to Supabase profile
- [ ] **AI model comparison** — Show how different Claude models analyze the same game
- [ ] **Confidence calibration** — Track how often 70% confidence picks actually hit ~70%
- [ ] **Fade the public tool** — Show contrarian picks that go against public consensus
- [ ] **Line shopping alerts** — Notify when a specific book has significantly better odds
- [ ] **Injury news feed** — Aggregate injury updates from multiple sources
- [ ] **Weather impact analysis** — For outdoor sports (NFL, MLB), factor in weather
- [ ] **Referee/umpire tendencies** — Track how officials affect over/unders
- [ ] **Situational spots** — Detect back-to-back, travel, rest advantage
- [ ] **Closing line value dashboard** — Visualize CLV trends over time with charts
- [ ] **Bet grading system** — Rate bet quality separate from outcome (good process, bad result)
- [ ] **Smart bankroll allocation** — Auto-suggest how to split bankroll across sports
- [ ] **Parlay optimizer** — Find the highest EV combination of legs
- [ ] **Risk-adjusted ROI** — Weight ROI by stake size and variance
- [ ] **Correlation matrix** — Show which sports/bet types your results correlate with
- [ ] **Monte Carlo simulator** — Project likely bankroll outcomes over N bets
- [ ] **Dark/light mode improvements** — Per-page theming, OLED dark mode
