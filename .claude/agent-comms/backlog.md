# BetBrain Work Backlog

## Features — MVP

- [x] **Supabase schema + migration SQL** _(Cycle 1)_
- [x] **Supabase client setup** _(Cycle 1)_
- [x] **Auth flow** _(Cycle 2)_
- [x] **The Odds API wrapper** _(Cycle 3)_
- [x] **balldontlie API wrapper** _(Cycle 3)_
- [x] **Dashboard home page** _(Cycle 4)_
- [x] **Game detail page** _(Cycle 5)_
- [x] **AI game analysis** _(Cycle 4)_
- [x] **Odds comparison table** _(Cycle 5)_
- [x] **Landing page** _(Cycle 6)_
- [x] **Stripe integration** — Legacy: bypassed for personal tool _(Cycle 7)_

## Features — Growth

- [x] **Line movement chart** _(Cycle 11)_
- [x] **Smart Signals** _(Cycle 10)_
- [x] **Pick tracker** _(Cycle 8)_
- [x] **Custom alerts** _(Cycle 13)_
- [x] **League dashboards** _(Cycle 9)_
- [x] **Injury impact analysis** _(Cycle 12)_
- [x] **H2H history page** _(Cycle 14)_
- [x] **Daily email digest** _(Cycle 15)_

## Bugs
- [ ] (none yet)

## Remaining Features
- [ ] **Alternate lines display** — Needs API fetch changes for alternate spread/total markets
- [ ] **Live score integration** — Show live scores for tracked picks
- [ ] **Prop market breakdown in pick stats** — Needs prop_market column on user_picks

## Remaining Ideas
- [ ] **Book-specific line shopping** — Show which book consistently has best lines per market type
- [ ] **Bet replay viewer** — Step through historical odds movement for a game you bet on
- [ ] **Bankroll allocation rebalancer** — Alert when sport allocation drifts from target
- [ ] **Automated closing odds backfill** — For picks with missing closing_odds, estimate from historical data
- [ ] **Odds movement replay** — Animate line movement over time for educational review
- [ ] **Prop market trends** — Track which prop markets are most +EV historically
- [ ] **Reverse engineer fair odds** — Given a final score, what were the "true" odds?
- [ ] **Player prop value scanner** — When Odds API props are available, scan for +EV props
- [ ] **Unit sizing history chart** — Track how your unit sizing changes over time
- [ ] **Daily P/L notification** — Evening summary notification with day's P/L
- [ ] **Parlay leg correlation heatmap** — Visual matrix of correlated parlay legs
- [ ] **Bankroll allocation drift chart** — Visual history of sport allocation vs target
- [ ] **Game environment factors** — Track weather, altitude, travel distance impact on outcomes
- [ ] **Prop odds aggregator** — Aggregate player prop odds across books for comparison
- [ ] **Confidence decay tracker** — How confidence in a pick changes as game time approaches

## Completed — Session 12 (2026-03-25)
- [x] **Closing line auto-capture cron** (10 tests)
- [x] **Custom signal builder** (48 tests)
- [x] **EV decay tracker** (18 tests)
- [x] **Reverse line movement alerts** (10 tests)
- [x] **Bet portfolio risk gauge** (22 tests)

## Completed — Session 13 (2026-03-25)
- [x] **Morning brief** — Daily summary with top plays, caution alerts, checklist (25 tests)
- [x] **B2B fatigue model** — 5-factor NBA/NHL fatigue scoring with ATS impact (17 tests)
- [x] **Line velocity alerts** — Configurable threshold rules with cooldown (24 tests)
- [x] **Portfolio risk probability weighting** — Factor 8: underdog exposure (5 tests)
- [x] **EV decay sport aggregation** — aggregateBySort() (4 tests)
- [x] **API cost per insight tracker** — Cost-effectiveness metrics (18 tests)

## Completed — Session 14 (2026-03-25)
- [x] **Odds API request optimizer** — Smart refresh by game proximity (37 tests)
- [x] **Smart pick journal integration** — Auto-fill journal from picks (35 tests)
- [x] **Bet slip builder** — Multi-pick slip with EV + correlation warnings (30 tests)
- [x] **Closing line prediction model** — Weighted regression on movement trajectory (24 tests)
- [x] **Cross-sport sharp correlation** — Detect simultaneous sharp action (17 tests)
- [x] **Bet slip panel UI** — Game detail Bet Slip tab
- [x] **Cross-sport sharp panel UI** — Signals Cross-Sport tab
- [x] **Closing line predictor panel UI** — Prediction card component

## New Ideas (Session 14 — 2026-03-25)
- [ ] [P1] [feat]: Live game state tracker — Show live scores and live EV for games in progress | Files: src/lib/live-tracker.ts, src/components/live-tracker.tsx | Done when: live scores shown for today's games
- [ ] [P1] [feat]: Wire optimizer into odds fetcher — Use dynamic TTLs from optimizer in actual getOddsForSport | Files: src/lib/sports/odds.ts | Done when: optimizer TTLs used instead of flat 5min
- [ ] [P1] [feat]: Auto-journal from picks page — Button to generate and save journal entry from today's picks | Files: src/components/journal-auto-generate.tsx | Done when: one-click journal generation works
- [ ] [P2] [feat]: Multi-leg hedge optimizer — Optimal hedge stakes for live multi-leg bets | Files: src/lib/hedge-optimizer.ts | Done when: hedge calculator handles 3+ legs
- [ ] [P2] [feat]: Morning brief AI narrative — Claude-generated natural language brief | Files: src/lib/morning-brief.ts | Done when: AI-written brief paragraph shown
- [ ] [P2] [feat]: Historical fatigue performance — Track W/L/ATS for B2B games in pick history | Files: src/lib/fatigue-model.ts | Done when: historical B2B stats shown
- [ ] [P2] [feat]: Pick journal auto-tagging — Auto-detect pick types from metadata | Files: src/lib/pick-tagging.ts | Done when: tags auto-applied on pick creation
- [ ] [P2] [feat]: Closing line predictor on game detail — Show predicted close on game page | Files: src/components/game-detail.tsx | Done when: prediction displayed in Line Movement tab
- [ ] [P2] [feat]: Bet slip sharing via URL — Generate shareable slip link | Files: src/lib/bet-slip.ts | Done when: unique URL shows slip readonly
- [ ] [P2] [feat]: Odds movement replay animation — Animate line movement over time | Files: src/components/odds-replay.tsx | Done when: playback controls on line movement chart
- [ ] [P2] [feat]: Prop market value scanner — Scan props for +EV across books | Files: src/lib/prop-scanner.ts | Done when: +EV props listed with edge %
- [ ] [P3] [test]: Odds request optimizer with real game schedules — NBA full-day slate | Files: src/lib/__tests__/odds-request-optimizer.test.ts | Done when: 8+ realistic scenario tests
- [ ] [P3] [test]: Bet slip with 10+ legs and edge cases — Empty legs, all same game | Files: src/lib/__tests__/bet-slip.test.ts | Done when: 10+ edge case tests
- [ ] [P3] [test]: Closing line predictor accuracy backtest — Compare predictions to actual closes | Files: src/lib/__tests__/closing-line-predictor.test.ts | Done when: accuracy metrics calculated
- [ ] [P3] [test]: Cross-sport sharp with 4-sport simultaneous movement | Files: src/lib/__tests__/cross-sport-sharp.test.ts | Done when: 5+ multi-sport tests
- [ ] [P3] [test]: Journal auto-fill with empty/null pick data | Files: src/lib/__tests__/journal-auto.test.ts | Done when: 5+ null-safety tests
- [ ] [P3] [test]: Morning brief with multi-sport realistic data — 10+ games across 4 sports | Files: src/lib/__tests__/morning-brief.test.ts | Done when: 5+ scenario tests pass
- [ ] [P3] [test]: Fatigue model with real NBA schedule data — Actual B2B sequences | Files: src/lib/__tests__/fatigue-model.test.ts | Done when: 8+ realistic scenario tests
- [ ] [P3] [test]: Line velocity alerts cascading rules — Multiple rules same movement | Files: src/lib/__tests__/line-velocity-alerts.test.ts | Done when: 5+ cascade tests
- [ ] [P3] [test]: API cost tracker month boundary conditions | Files: src/lib/__tests__/api-cost-tracker.test.ts | Done when: 5+ boundary tests
- [ ] [P3] [fix]: Custom signals auto-refresh on odds update | Files: src/components/custom-signal-builder.tsx | Done when: signals refresh automatically
- [ ] [P3] [fix]: Morning brief cache in localStorage for offline viewing | Files: src/components/morning-brief.tsx | Done when: brief persists across page reloads
- [ ] [P3] [fix]: Fatigue panel should fetch actual schedule from balldontlie API | Files: src/components/game-detail.tsx | Done when: real rest days shown
- [ ] [P4] [chore]: Remove unused Stripe imports | Files: various | Done when: no Stripe imports outside webhook route
- [ ] [P4] [chore]: Update CLAUDE.md with new lib files from Sessions 12-14 | Files: CLAUDE.md | Done when: all new libs listed
