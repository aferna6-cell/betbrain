# BetBrain Work Backlog

## Features — MVP

- [x] **Supabase schema + migration SQL** — Tables: profiles, game_cache, odds_cache, ai_insights, saved_analyses, user_picks, api_usage. Write the SQL. Document in schema-log.md. _(Cycle 1)_
- [x] **Supabase client setup** — Create src/lib/supabase/client.ts with browser + server clients. Type-safe queries. _(Cycle 1)_
- [x] **Auth flow** — Supabase Auth: signup, login, logout, password reset. Protected routes via middleware. Profile page. _(Cycle 2)_
- [x] **The Odds API wrapper** — src/lib/sports/odds.ts. Fetch upcoming games + odds for NBA, NFL, MLB, NHL. Cache in odds_cache. Handle rate limits. _(Cycle 3)_
- [x] **balldontlie API wrapper** — src/lib/sports/stats.ts. Fetch team stats, player stats, game results. Cache in game_cache. _(Cycle 3)_
- [x] **Dashboard home page** — Today's games across leagues. Game cards: teams, time, top-3 book odds, AI confidence badge. Filterable by league. _(Cycle 4)_
- [x] **Game detail page** — /dashboard/games/[gameId]. Odds comparison table (moneyline, spread, totals), AI analysis tab. Best odds highlighted green. _(Cycle 5)_
- [x] **AI game analysis** — API route that sends matchup data to Claude, returns structured analysis. Cache per game. _(Cycle 4)_
- [x] **Odds comparison table** — Side-by-side bookmaker odds for each game. Highlight best line (green). Built into game detail page. _(Cycle 5)_
- [x] **Landing page** — Hero, features grid, how it works, responsible gambling disclaimer. Dark theme. _(Cycle 6)_
- [x] **Stripe integration** — Legacy: bypassed for personal tool. All features unlimited. _(Cycle 7)_

## Features — Growth

- [x] **Line movement chart** — odds_history table + chart tab. _(Cycle 11)_
- [x] **Smart Signals** — Games where stats + odds + trends all align. _(Cycle 10)_
- [x] **Pick tracker** — Log picks with sport, type, odds, units. _(Cycle 8)_
- [x] **Custom alerts** — In-app line movement alerts. _(Cycle 13)_
- [x] **League dashboards** — /dashboard/league/[sport]. _(Cycle 9)_
- [x] **Injury impact analysis** — AI assesses injury impacts. _(Cycle 12)_
- [x] **H2H history page** — Last 10 meetings, ATS, O/U. _(Cycle 14)_
- [x] **Daily email digest** — Morning digest page + API. _(Cycle 15)_

## Features — Premium

- [x] **Prop bet analyzer** — AI-powered player prop analysis. _(Cycle 16)_
- [x] **Parlay builder** — Multi-leg parlay with AI EV analysis. _(Cycle 17)_
- [x] **Historical backtesting** — Smart Signals ROI simulation. _(Cycle 22)_
- [x] **Public leaderboard** — Opt-in pick tracker records. _(Cycle 23)_
- [x] **API access** — REST API for power users. _(Cycle 24)_

## Bugs
- [ ] (none yet)

## Remaining Features
- [ ] **Alternate lines display** — Needs API fetch changes for alternate spread/total markets
- [ ] **Live score integration** — Show live scores for tracked picks
- [ ] **Prop market breakdown in pick stats** — Needs prop_market column on user_picks

## Phase 2
- [ ] **Resend email integration** — Wire up daily digest + alert emails
- [ ] **Additional sports data sources** — NFL/MLB/NHL stats beyond balldontlie
- [ ] **Supabase type generation** — Auto-generate types from supabase gen types
- [ ] **Mobile app** — React Native or PWA improvements

## Tests — Coverage Gaps
- [ ] **API route auth tests** — Verify all protected routes return 401 without auth

## Remaining Ideas
- [ ] **Closing line auto-capture cron** — Background job to run matchClosingLines before game starts
- [ ] **Custom signal builder** — User-defined signal criteria (CLV > 3% AND confidence > 70)
- [ ] **Multi-sport same-day summary** — Cross-sport analysis for days with games in multiple leagues
- [ ] **Quick re-analyze button** — Re-run AI analysis with one click from picks tracker
- [ ] **Performance by time-to-game** — Track ROI based on how far before game start the bet was placed
- [ ] **Book-specific line shopping** — Show which book consistently has best lines per market type
- [ ] **Pick import from CSV** — Upload historical picks for analysis
- [ ] **Bet replay viewer** — Step through historical odds movement for a game you bet on
- [ ] **Bankroll allocation rebalancer** — Alert when sport allocation drifts from target
- [ ] **Sharp book identifier** — Track which books are consistently early movers
- [ ] **Game script predictor** — AI-powered prediction of game flow (blowout, close, OT)
- [ ] **Pick dependency graph** — Visualize which picks are correlated (same game, same sport)
- [ ] **Automated closing odds backfill** — For picks with missing closing_odds, estimate from historical data
- [ ] **ROI by day-of-week heatmap** — Visual calendar showing best/worst days
- [ ] **Odds movement replay** — Animate line movement over time for educational review
- [ ] **EV decay tracker** — Track how EV of a spotted opportunity decays over time
- [ ] **Prop market trends** — Track which prop markets are most +EV historically
- [ ] **Reverse engineer fair odds** — Given a final score, what were the "true" odds?
- [ ] **Alert templates** — Save common alert configurations for quick setup
- [ ] **Cross-sport correlation alerts** — Alert when multiple sports show correlated sharp action
- [ ] **In-app changelog with feature tours** — Interactive walkthroughs of new features
- [ ] **Player prop value scanner** — When Odds API props are available, scan for +EV props
- [ ] **Prop analysis history** — Past prop analyses with outcomes

## New Ideas (Session 7 — 2026-03-24)
- [ ] **Process grade history** — Track bet grading scores over time, show trend on analytics
- [ ] **Pre-game checklist enforcer** — Require thesis + line shop before allowing pick log
- [ ] **Bankroll milestone alerts** — Notify when bankroll crosses key thresholds (2x, etc.)
- [ ] **Odds screen comparator** — Side-by-side visual diff of odds at two points in time
- [ ] **Pick confidence vs CLV scatter** — Scatter plot of confidence rating vs actual CLV
- [ ] **Auto-grade from pick data** — Infer grading criteria from pick metadata (timing, CLV)
- [ ] **Streak probability calculator** — What are the odds of your current streak continuing?
- [ ] **Unit sizing history chart** — Track how your unit sizing changes over time
- [ ] **Daily P/L notification** — Evening summary notification with day's P/L
- [ ] **Parlay leg correlation heatmap** — Visual matrix of correlated parlay legs
- [ ] **Fade tracker** — Track performance of contrarian plays vs public side
- [ ] **Line movement alert thresholds** — Customizable thresholds for different sports
- [ ] **Bankroll allocation drift chart** — Visual history of sport allocation vs target
- [ ] **Pick quality vs outcome matrix** — 2x2 grid of process (good/bad) vs outcome (win/loss)
- [ ] **Weekly process grade report** — Average bet grading score per week with trends
