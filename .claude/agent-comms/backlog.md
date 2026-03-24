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

## Features — Tier 2: Retention (all complete)

- [x] Streak tracking + badges, Pick comparison, Steam moves, Consensus indicator
- [x] CSV export, Parlay correlation warnings, Game countdown, ROI by day
- [x] Unit sizing (lib + UI card), Share to X, Seasonal reset, Daily summary
- [x] Prop analysis cache, Preferred bookmaker, Per-book colors
- [x] Betting journal, Notification center, Regression alerts, Game notes
- [x] Book ROI tracker, Parlay stats (lib + UI), Weekly recap, Time analysis
- [x] Bankroll goals, Today's Action widget, Stripe tier bypass

## Remaining Features
- [ ] **Multi-game comparison table** — Select 2-5 games with all metrics side by side
- [ ] **Alternate lines display** — Needs API fetch changes for alternate spread/total markets
- [ ] **Live score integration** — Show live scores for tracked picks
- [ ] **Prop market breakdown in pick stats** — Needs prop_market column on user_picks

## Phase 2
- [ ] **Resend email integration** — Wire up daily digest + alert emails
- [ ] **Additional sports data sources** — NFL/MLB/NHL stats beyond balldontlie
- [ ] **Supabase type generation** — Auto-generate types from supabase gen types
- [ ] **Mobile app** — React Native or PWA improvements

## Tests — Coverage Gaps
- [x] Bankroll, Auto-resolve, EV scanner, Alerts, Steam, Consensus, Seasonal reset, Unit sizing
- [ ] **API route auth tests** — Verify all protected routes return 401 without auth

## Backlog — Future Ideas
- [ ] **Custom signal builder** — User-defined signal criteria (CLV > 3% AND confidence > 70)
- [ ] **Odds API v2 markets** — Fetch player props, alternate lines, game props
- [ ] **Analysis history timeline** — Past AI analyses with outcome comparison
- [ ] **Odds API budget optimizer** — Smart scheduling for popular vs low-interest sports
- [ ] **Multi-device sync** — Sync localStorage preferences to Supabase profile
- [ ] **AI model comparison** — Show how different Claude models analyze the same game
- [x] **Line shopping alerts** — Line Shopping tab on game detail with best lines, juice, discrepancies _(Session 5)_
- [ ] **Injury news feed** — Aggregate injury updates from multiple sources
- [ ] **Weather impact analysis** — For outdoor sports (NFL, MLB), factor in weather
- [ ] **Referee/umpire tendencies** — Track how officials affect over/unders
- [x] **Closing line value dashboard** — Visualize CLV trends over time with charts
- [ ] **Bet grading system** — Rate bet quality separate from outcome (good process, bad result)
- [x] **Smart bankroll allocation** — Auto-suggest how to split bankroll across sports
- [ ] **Parlay optimizer** — Find the highest EV combination of legs
- [x] **Risk-adjusted ROI** — Weight ROI by stake size and variance
- [x] **Correlation matrix** — Show which sports/bet types your results correlate with
- [ ] **Dark/light mode improvements** — Per-page theming, OLED dark mode
- [x] **CLV trend chart** — Recharts line chart showing CLV trends over time on analytics page
- [ ] **Quick analysis from Today's Action** — Button on pick cards to jump to game detail
- [x] **Closing odds auto-capture** — Background job to snapshot odds at game start time
- [ ] **Results feed** — Real-time feed showing today's game results as they finalize
- [x] **Pick templates** — Save common pick configurations for quick logging
- [x] **Home/away splits** — Analytics showing performance on home vs away picks
- [x] **Odds movement velocity alerts** — Alert when a line is moving unusually fast
- [ ] **Daily review prompt** — End-of-day prompt asking to grade/reflect on today's picks
- [x] **Bankroll graph on dashboard** — Mini sparkline of bankroll trend in stats grid
- [ ] **Pick streak indicators in Today's Action** — Show win/loss streak per sport
- [x] **Model accuracy tracking** — AI confidence vs actual outcomes over time
- [ ] **Prop analysis history** — Past prop analyses with outcomes
- [x] **Quick filters on dashboard** — "Only games I have picks on" / "Only with signals"
- [x] **Copy analysis to clipboard** — One-click copy for sharing in group chats
- [ ] **Performance by bookmaker** — Which book gives best CLV? Track and show.
- [x] **Alternate line calculator** — Show what alternate lines pay and their EV
- [ ] **Public betting % estimates** — Use odds movement to estimate public money direction
- [x] **Season summary generator** — Auto-generate end-of-season report
- [x] **Notification preferences** — Choose which event types trigger notifications
- [ ] **Bankroll recovery calculator** — How many bets to recover from this drawdown?

## New Ideas (Session 5 — 2026-03-24)
- [ ] **Pre-bet risk scorecard UI** — Wire risk-assessment.ts into pick form with visual risk meter
- [ ] **Value plays page** — Dedicated /dashboard/value page with all value plays, not just top 5
- [ ] **Performance insights on profile** — Show top 3 insights on profile page as quick summary
- [ ] **Closing line auto-capture cron** — Background job to run matchClosingLines before game starts
- [ ] **Bet grading system** — Rate bet quality separate from outcome (process vs result)
- [ ] **Odds API budget optimizer** — Smart scheduling for popular vs low-interest sports
- [ ] **Line movement heatmap** — Visual heatmap of which games have the most line movement
- [ ] **Bankroll recovery calculator** — "How many bets at your current win rate to recover?"
- [ ] **Custom signal builder** — User-defined signal criteria (CLV > 3% AND confidence > 70)
- [ ] **Multi-sport same-day summary** — Cross-sport analysis for days with games in multiple leagues
- [ ] **Odds staleness indicator on game cards** — Show last update time relative to game start
- [ ] **Quick re-analyze button** — Re-run AI analysis with one click from picks tracker
- [ ] **Performance by time-to-game** — Track ROI based on how far before game start the bet was placed
- [ ] **Book-specific line shopping** — Show which book consistently has best lines per market type
- [ ] **Pick import from CSV** — Upload historical picks for analysis
