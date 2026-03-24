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

## Bugs
- [ ] (none yet)

## Remaining Features
- [ ] **Alternate lines display** — Needs API fetch changes for alternate spread/total markets
- [ ] **Live score integration** — Show live scores for tracked picks
- [ ] **Prop market breakdown in pick stats** — Needs prop_market column on user_picks

## Remaining Ideas
- [ ] **Closing line auto-capture cron** — Background job to run matchClosingLines before game starts
- [ ] **Custom signal builder** — User-defined signal criteria (CLV > 3% AND confidence > 70)
- [ ] **Multi-sport same-day summary** — Cross-sport analysis for days with games in multiple leagues
- [ ] **Quick re-analyze button** — Re-run AI analysis with one click from picks tracker
- [ ] **Book-specific line shopping** — Show which book consistently has best lines per market type
- [ ] **Bet replay viewer** — Step through historical odds movement for a game you bet on
- [ ] **Bankroll allocation rebalancer** — Alert when sport allocation drifts from target
- [ ] **Sharp book identifier** — Track which books are consistently early movers
- [ ] **Game script predictor** — AI-powered prediction of game flow (blowout, close, OT)
- [ ] **Automated closing odds backfill** — For picks with missing closing_odds, estimate from historical data
- [ ] **Odds movement replay** — Animate line movement over time for educational review
- [ ] **EV decay tracker** — Track how EV of a spotted opportunity decays over time
- [ ] **Prop market trends** — Track which prop markets are most +EV historically
- [ ] **Reverse engineer fair odds** — Given a final score, what were the "true" odds?
- [ ] **Cross-sport correlation alerts** — Alert when multiple sports show correlated sharp action
- [ ] **In-app changelog with feature tours** — Interactive walkthroughs of new features
- [ ] **Player prop value scanner** — When Odds API props are available, scan for +EV props
- [ ] **Pre-game checklist enforcer** — Require thesis + line shop before allowing pick log
- [ ] **Unit sizing history chart** — Track how your unit sizing changes over time
- [ ] **Daily P/L notification** — Evening summary notification with day's P/L
- [ ] **Parlay leg correlation heatmap** — Visual matrix of correlated parlay legs
- [ ] **Line movement alert thresholds** — Customizable thresholds for different sports
- [ ] **Bankroll allocation drift chart** — Visual history of sport allocation vs target
- [ ] **Odds arbitrage scanner** — Detect arbitrage opportunities across bookmakers in real-time
- [ ] **Head-to-head model comparison** — Compare AI analysis accuracy vs pure statistical models
- [ ] **Odds API cost per insight** — Track cost-effectiveness of API calls
- [ ] **Win probability curves** — Pre-game to post-game win probability visualization
- [ ] **Bet portfolio risk gauge** — Real-time portfolio-level risk exposure visualization
- [ ] **AI prompt A/B testing** — Compare different analysis prompts for accuracy
- [ ] **Game environment factors** — Track weather, altitude, travel distance impact on outcomes
- [ ] **Prop odds aggregator** — Aggregate player prop odds across books for comparison
- [ ] **Confidence decay tracker** — How confidence in a pick changes as game time approaches

## New Ideas (Session 9 — 2026-03-24)
- [ ] **Bankroll correlation tracker** — Track how bankroll changes correlate with specific factors
- [ ] **Bet slip screenshot parser** — OCR-based pick import from sportsbook screenshots
- [ ] **Real-time odds alerts** — Push notification when tracked game odds hit target
- [ ] **Position sizing backtest** — Simulate historical performance with different unit strategies
- [ ] **Multi-leg hedge optimizer** — Optimal hedge across multiple open bets
- [ ] **Closing line prediction model** — Predict where the closing line will be
- [ ] **Sport-specific dashboards** — Custom widgets per sport (rushing yards for NFL, etc.)
- [ ] **Bankroll insurance calculator** — Calculate the cost of hedging entire bankroll drawdown
- [ ] **Performance by venue** — Track ROI by stadium/arena for home/away analysis
- [ ] **Consensus pick aggregator** — Aggregate expert picks and track their accuracy
- [ ] **Bet settlement speed tracker** — Which books grade/settle bets fastest
- [ ] **Line value expiry estimator** — How long does a +EV line stay available
- [ ] **Parlay optimizer** — Find best parlay combinations from selected picks
- [ ] **Weekly email digest** — Auto-generated weekly performance email
- [ ] **Odds API request optimizer** — Batch requests to minimize API calls per insight

## Completed — Session 9 (2026-03-24)
- [x] **Multi-book account tracker** — Track balance across multiple sportsbooks _(Session 9)_
- [x] **Historical CLV distribution** — Histogram of CLV values to understand edge distribution _(Session 9)_
- [x] **Expected value attribution** — Which factor (CLV, timing, sizing) contributes most to your edge _(Session 9)_
- [x] **Kelly bankroll simulator** — Compare bankroll trajectories with different Kelly fractions _(Session 9)_
- [x] **Seasonal trend detector** — Identify recurring performance patterns by month/week _(Session 9)_
- [x] **Bankroll drawdown heatmap** — Calendar view showing drawdown depth by day _(Session 9)_
- [x] **Smart bankroll alerts** — Alert when daily loss exceeds X% of bankroll _(Session 9)_
- [x] **Pick dependency graph** — Visualize which picks are correlated _(Session 9)_
