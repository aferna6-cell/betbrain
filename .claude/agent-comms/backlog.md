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
- [x] **Closing line auto-capture cron** — Background job to run matchClosingLines before game starts _(Session 12)_
- [x] **Custom signal builder** — User-defined signal criteria with AND/OR logic _(Session 12)_
- [ ] **Book-specific line shopping** — Show which book consistently has best lines per market type
- [ ] **Bet replay viewer** — Step through historical odds movement for a game you bet on
- [ ] **Bankroll allocation rebalancer** — Alert when sport allocation drifts from target
- [x] **Sharp book identifier** — Track which books are consistently early movers
- [ ] **Automated closing odds backfill** — For picks with missing closing_odds, estimate from historical data
- [ ] **Odds movement replay** — Animate line movement over time for educational review
- [x] **EV decay tracker** — Track how EV of a spotted opportunity decays over time _(Session 12)_
- [ ] **Prop market trends** — Track which prop markets are most +EV historically
- [ ] **Reverse engineer fair odds** — Given a final score, what were the "true" odds?
- [ ] **Cross-sport correlation alerts** — Alert when multiple sports show correlated sharp action
- [ ] **Player prop value scanner** — When Odds API props are available, scan for +EV props
- [ ] **Pre-game checklist enforcer** — Require thesis + line shop before allowing pick log
- [ ] **Unit sizing history chart** — Track how your unit sizing changes over time
- [ ] **Daily P/L notification** — Evening summary notification with day's P/L
- [ ] **Parlay leg correlation heatmap** — Visual matrix of correlated parlay legs
- [ ] **Line movement alert thresholds** — Customizable thresholds for different sports
- [ ] **Bankroll allocation drift chart** — Visual history of sport allocation vs target
- [ ] **Odds API cost per insight** — Track cost-effectiveness of API calls
- [x] **Bet portfolio risk gauge** — Real-time portfolio-level risk exposure visualization _(Session 12)_
- [ ] **Game environment factors** — Track weather, altitude, travel distance impact on outcomes
- [ ] **Prop odds aggregator** — Aggregate player prop odds across books for comparison
- [ ] **Confidence decay tracker** — How confidence in a pick changes as game time approaches

## Completed — Session 12 (2026-03-25)
- [x] **Closing line auto-capture cron** — Every-15-min cron job captures consensus odds for pending picks before game time (10 tests) _(Session 12)_
- [x] **Custom signal builder** — User-defined composite signal criteria with 12 condition types, AND/OR logic, presets (48 tests) _(Session 12)_
- [x] **EV decay tracker** — Track how +EV opportunities erode over time with half-life and correction speed (18 tests) _(Session 12)_
- [x] **Reverse line movement alerts** — Detect games where line moves against public action (10 tests) _(Session 12)_
- [x] **Bet portfolio risk gauge** — Portfolio-level risk exposure with sport/type breakdown, correlation groups (22 tests) _(Session 12)_

## New Ideas (Session 12 — 2026-03-25)
- [ ] [P1] [feat]: Game-day morning brief — AI-generated daily summary of top plays with context | Files: src/lib/morning-brief.ts, src/app/api/brief/route.ts | Done when: /dashboard shows morning brief card
- [ ] [P1] [feat]: Odds API request optimizer — Batch sport fetches intelligently to minimize calls | Files: src/lib/sports/odds.ts | Done when: fewer API calls with same freshness
- [ ] [P2] [feat]: Line movement velocity alerts — Alert when line moves X points in Y minutes | Files: src/lib/line-velocity-alerts.ts | Done when: velocity-based alerts fire
- [ ] [P2] [feat]: Closing line prediction model — Predict where the line will close | Files: src/lib/closing-line-predictor.ts | Done when: predictions within 3 pts for 60%+ of games
- [ ] [P2] [feat]: Back-to-back fatigue model — Quantify NBA/NHL B2B fatigue impact | Files: src/lib/fatigue-model.ts | Done when: fatigue score shown on B2B games
- [ ] [P2] [feat]: Multi-leg hedge optimizer — Calculate optimal hedge stakes | Files: src/lib/hedge-optimizer.ts | Done when: hedge calculator on picks page
- [ ] [P2] [feat]: Cross-sport sharp correlation — Detect multi-sport sharp clusters | Files: src/lib/cross-sport-sharp.ts | Done when: cross-sport signals shown
- [ ] [P3] [test]: Custom signal builder with real game data — Realistic game scenarios | Files: src/lib/__tests__/custom-signals.test.ts | Done when: 10+ scenario tests pass
- [ ] [P3] [test]: RLM alerts with historical odds data — Backtest accuracy | Files: src/lib/__tests__/rlm-alerts.test.ts | Done when: 8+ historical scenario tests
- [ ] [P3] [test]: Portfolio risk boundary conditions — Edge cases | Files: src/lib/__tests__/portfolio-risk.test.ts | Done when: 5+ boundary tests pass
- [ ] [P3] [test]: EV decay edge cases — Zero books, single snapshot | Files: src/lib/__tests__/ev-decay.test.ts | Done when: 5+ edge case tests pass
- [ ] [P3] [test]: Closing line cron timing window — Verify timing logic | Files: src/app/api/cron/__tests__/closing-lines.test.ts | Done when: timing window tests added
- [ ] [P3] [fix]: Portfolio risk should weight by odds probability | Files: src/lib/portfolio-risk.ts | Done when: risk score adjusts for probability
- [ ] [P3] [fix]: EV decay should aggregate by sport | Files: src/lib/ev-decay.ts | Done when: sport-level summaries available
- [ ] [P3] [fix]: Custom signals auto-refresh on odds update | Files: src/components/custom-signal-builder.tsx | Done when: signals refresh automatically
- [ ] [P2] [feat]: Pick journal auto-tagging — Auto-detect pick types | Files: src/lib/pick-tagging.ts | Done when: tags auto-applied on pick creation
- [ ] [P3] [feat]: Performance by day of week — ROI by Monday-Sunday | Files: src/lib/day-of-week-performance.ts | Done when: chart shown
- [ ] [P3] [feat]: Odds API cost per insight tracker | Files: src/lib/api-cost-tracker.ts | Done when: cost/insight metric shown
- [ ] [P4] [chore]: Remove unused Stripe imports | Files: various | Done when: no Stripe imports outside webhook route
