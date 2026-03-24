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
- [ ] **Book-specific line shopping** — Show which book consistently has best lines per market type
- [ ] **Bet replay viewer** — Step through historical odds movement for a game you bet on
- [ ] **Bankroll allocation rebalancer** — Alert when sport allocation drifts from target
- [x] **Sharp book identifier** — Track which books are consistently early movers
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
- [ ] **Head-to-head model comparison** — Compare AI analysis accuracy vs pure statistical models
- [ ] **Odds API cost per insight** — Track cost-effectiveness of API calls
- [ ] **Bet portfolio risk gauge** — Real-time portfolio-level risk exposure visualization
- [ ] **AI prompt A/B testing** — Compare different analysis prompts for accuracy
- [ ] **Game environment factors** — Track weather, altitude, travel distance impact on outcomes
- [ ] **Prop odds aggregator** — Aggregate player prop odds across books for comparison
- [ ] **Confidence decay tracker** — How confidence in a pick changes as game time approaches

## New Ideas (Session 9 — 2026-03-24)
- [ ] **Bankroll correlation tracker** — Track how bankroll changes correlate with specific factors
- [ ] **Bet slip screenshot parser** — OCR-based pick import from sportsbook screenshots
- [ ] **Real-time odds alerts** — Push notification when tracked game odds hit target
- [x] **Position sizing backtest** — Simulate historical performance with different unit strategies
- [ ] **Multi-leg hedge optimizer** — Optimal hedge across multiple open bets
- [ ] **Closing line prediction model** — Predict where the closing line will be
- [ ] **Sport-specific dashboards** — Custom widgets per sport (rushing yards for NFL, etc.)
- [ ] **Bankroll insurance calculator** — Calculate the cost of hedging entire bankroll drawdown
- [ ] **Performance by venue** — Track ROI by stadium/arena for home/away analysis
- [ ] **Consensus pick aggregator** — Aggregate expert picks and track their accuracy
- [ ] **Bet settlement speed tracker** — Which books grade/settle bets fastest
- [ ] **Line value expiry estimator** — How long does a +EV line stay available
- [ ] **Weekly email digest** — Auto-generated weekly performance email
- [ ] **Odds API request optimizer** — Batch requests to minimize API calls per insight

## New Ideas (Session 10 — 2026-03-24)
- [x] **Bet sizing confidence matrix** — Grid of confidence vs edge size showing optimal unit count
- [ ] **Sharp money flow tracker** — Track which direction sharp bettors are moving across all games
- [x] **Vig comparison by book** — Which books consistently offer lowest vig per sport
- [ ] **Game-day weather overlay** — Show weather conditions for outdoor sports (NFL, MLB)
- [x] **Momentum detector** — Track which teams are on winning/losing streaks with odds impact
- [ ] **Value decay timeline** — Show how +EV opportunities erode as game time approaches
- [ ] **Bankroll allocation optimizer** — AI-suggested allocation across sports based on historical edge
- [ ] **Pick journal auto-tagging** — Auto-detect and tag pick types (fade, steam chase, system play)
- [x] **Spread vs ML value calculator** — When is spread better than moneyline for same side
- [ ] **Back-to-back fatigue model** — Quantify fatigue impact on NBA/NHL back-to-back games
- [ ] **Referee/umpire impact tracker** — Track over/under tendencies by game official
- [ ] **Parlay correlation matrix** — Visual heatmap of which leg types correlate
- [x] **Consensus line tracker** — Track where the consensus line opened vs current
- [x] **Implied team totals** — Derive expected points per team from total + spread
- [ ] **Cash-out timing optimizer** — When to cash out based on live game state and EV

## Completed — Session 9 (2026-03-24)
- [x] **Multi-book account tracker** — Track balance across multiple sportsbooks _(Session 9)_
- [x] **Historical CLV distribution** — Histogram of CLV values to understand edge distribution _(Session 9)_
- [x] **Expected value attribution** — Which factor (CLV, timing, sizing) contributes most to your edge _(Session 9)_
- [x] **Kelly bankroll simulator** — Compare bankroll trajectories with different Kelly fractions _(Session 9)_
- [x] **Seasonal trend detector** — Identify recurring performance patterns by month/week _(Session 9)_
- [x] **Bankroll drawdown heatmap** — Calendar view showing drawdown depth by day _(Session 9)_
- [x] **Smart bankroll alerts** — Alert when daily loss exceeds X% of bankroll _(Session 9)_
- [x] **Pick dependency graph** — Visualize which picks are correlated _(Session 9)_

## Completed — Session 10 (2026-03-24)
- [x] **Multi-market arbitrage scanner** — Detect arbs across moneyline, spread, and totals with stake calculator _(Session 10)_
- [x] **Game script predictor** — Predict blowout/close/OT probability from odds data _(Session 10)_
- [x] **Multi-sport same-day summary** — Daily slate with cross-sport analysis and ranked top games _(Session 10)_
- [x] **Quick re-analyze button** — Force-refresh AI analysis bypassing cache _(Session 10)_
- [x] **Parlay optimizer** — Find best parlay combinations with EV, correlation, and payout scoring _(Session 10)_
- [x] **Win probability curves** — No-vig consensus win probabilities with per-book breakdown _(Session 10)_
- [x] **Odds arbitrage scanner** — Extended to all markets (was moneyline-only) _(Session 10)_

## Completed — Session 11 (2026-03-24)
- [x] **Implied team totals** — Derive expected points per team from total + spread (24 tests) _(Session 11)_
- [x] **Spread vs ML value calculator** — When is spread better than moneyline for same side (16 tests) _(Session 11)_
- [x] **Sharp book identifier** — Score bookmakers by independence and best-line rate (11 tests) _(Session 11)_
- [x] **Position sizing backtest** — Replay pick history with different staking strategies (24 tests) _(Session 11)_
- [x] **Vig comparison by book** — Per-bookmaker vig analysis across all markets (16 tests) _(Session 11)_
- [x] **Bet sizing confidence matrix** — Interactive edge x confidence grid for unit sizing (14 tests) _(Session 11)_
- [x] **Momentum detector** — Team streak tracking with hot/cold classification (22 tests) _(Session 11)_
- [x] **Consensus line tracker** — Market consensus with bookmaker deviation detection (14 tests) _(Session 11)_

## New Ideas (Session 11 — 2026-03-24)
- [ ] [P1] [feat]: Closing line auto-capture cron — Scheduled job to snapshot consensus odds 5 min before game time | Files: src/lib/closing-line-capture.ts, vercel.json | Done when: cron job runs and populates closing_odds for open picks
- [ ] [P1] [feat]: Custom signal builder — User-defined composite signal criteria with AND/OR logic | Files: src/lib/custom-signals.ts, src/components/custom-signal-builder.tsx | Done when: user can create, save, and evaluate custom signal rules
- [ ] [P2] [feat]: Odds movement replay — Animated timeline playback of line movement for any game | Files: src/lib/odds-replay.ts, src/components/odds-replay.tsx | Done when: SVG animation shows line progression
- [ ] [P2] [feat]: Live score ticker — Real-time score updates for tracked games on dashboard | Files: src/lib/live-scores.ts, src/components/live-ticker.tsx | Done when: ticker shows current scores
- [ ] [P2] [feat]: EV decay tracker — Track how +EV opportunity value erodes over time | Files: src/lib/ev-decay.ts, src/components/ev-decay.tsx | Done when: chart shows EV decay curve
- [ ] [P2] [feat]: Reverse line movement alerts — Notification when RLM detected on tracked game | Files: src/lib/rlm-alerts.ts | Done when: notification fires on RLM
- [ ] [P2] [feat]: Cross-sport sharp action correlation — Alert on multi-sport sharp clusters | Files: src/lib/cross-sport-sharp.ts | Done when: cross-sport sharp patterns detected
- [ ] [P3] [test]: Implied team totals edge cases — Zero spread, extreme totals, single book | Files: src/lib/__tests__/implied-team-totals.test.ts | Done when: 5+ edge case tests pass
- [ ] [P3] [test]: Sharp book identifier stress test — Large game sets, identical lines | Files: src/lib/__tests__/sharp-book-identifier.test.ts | Done when: 5+ stress tests pass
- [ ] [P3] [test]: Position sizing backtest boundaries — Zero bankroll, 100% loss, extreme Kelly | Files: src/lib/__tests__/position-sizing-backtest.test.ts | Done when: 5+ boundary tests pass
- [ ] [P3] [test]: Vig comparison 3-way market — Soccer/MMA with draw odds | Files: src/lib/__tests__/vig-comparison.test.ts | Done when: 3-way vig calculation tested
- [ ] [P3] [test]: Momentum detector full season — 82-game NBA schedule scenario | Files: src/lib/__tests__/momentum-detector.test.ts | Done when: realistic season tested
- [ ] [P3] [fix]: Consensus line tracker sport-specific thresholds — NBA vs NHL deviation thresholds | Files: src/lib/consensus-line-tracker.ts | Done when: sport-specific thresholds used
- [ ] [P3] [fix]: Spread vs ML pickem edge case — Handle 0 spread gracefully | Files: src/lib/spread-vs-ml.ts | Done when: pick'em games work correctly
- [ ] [P2] [feat]: Game environment factors — Weather, altitude for NFL/MLB | Files: src/lib/game-environment.ts | Done when: weather on game detail for outdoor sports
- [ ] [P3] [feat]: Bankroll allocation drift chart — Actual vs target allocation over time | Files: src/lib/allocation-drift.ts | Done when: SVG chart shows drift
- [ ] [P3] [feat]: Unit sizing history chart — Track unit sizes over time | Files: src/lib/sizing-history.ts | Done when: line chart with trend
- [ ] [P2] [feat]: Bet portfolio risk gauge — Portfolio-level risk exposure visualization | Files: src/lib/portfolio-risk.ts | Done when: pie chart shows exposure
- [ ] [P4] [chore]: CLAUDE.md test count update — Keep test count current | Files: CLAUDE.md | Done when: test count matches actual
- [ ] [P3] [feat]: Value decay timeline — Historical analysis of +EV correction speed | Files: src/lib/value-decay.ts | Done when: avg correction time per sport computed
