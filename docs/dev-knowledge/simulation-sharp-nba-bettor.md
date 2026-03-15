# Customer Simulation: Sharp NBA Bettor
Date: 2026-03-15

## Persona
Sharp NBA bettor who tracks CLV (Closing Line Value) and line movement. Bets daily, uses 3-4 sportsbooks, measures edge by comparing bet price to closing line. Values data density, transparency, and long-term profitability metrics over gut feelings.

## Journey
1. **Landing page** — Copy speaks well to sharps ("edges the market hasn't corrected"). Missing: CLV mention, specific bookmaker list, odds freshness guarantee.
2. **Signup** — Frictionless, no credit card wall. Good.
3. **Onboarding** — CRITICAL GAP: No guided first experience. Dumped on dashboard with no tour.
4. **Dashboard** — Multi-sport view is excellent. Missing: time filters, line movement indicators on cards, implied probability, sort by bookmaker disagreement.
5. **Game detail** — Odds comparison tables and line movement chart are strong. Missing: opening/closing line markers on chart, vig calculation, CLV display.
6. **Smart Signals** — Consensus view is useful but opaque. Missing: historical hit rate, edge quantification, signal methodology explanation.
7. **Pick tracker** — Captures basics (odds, units, outcome). CRITICAL GAP: No CLV tracking, no implied probability, no bankroll context.
8. **Alerts** — Moneyline-only, no spread/total alerts, no velocity thresholds, no multi-bookmaker correlation.
9. **Parlay builder** — EV calculation is solid. Missing: auto-fill from live odds, parlay history.
10. **Props analyzer** — Structured output is good. Missing: historical player stats, live line updates.
11. **Backtesting** — Simulated, not empirical. Missing: real historical data, risk-adjusted metrics.
12. **Leaderboard** — Shows what's possible. Missing: date range filters, verification, drill-in to profiles.

## Gaps Found (Priority Order)
1. **No CLV tracking** → Building as Task #7 (Cycle 67)
2. **No bankroll management** → Building as Task #8 (Cycle 68)
3. **No onboarding flow** → Added to Phase 2 backlog
4. **No implied probability display** → Quick win, add to odds tables
5. **Alerts are moneyline-only** → Phase 2: spread + total alerts
6. **No timestamps on cached odds** → Quick fix, show "fetched X min ago"
7. **No signal historical hit rate** → Phase 2: track signal outcomes
8. **Backtesting uses simulation, not real data** → Phase 2: historical data integration
9. **H2H and Injuries tabs are empty shells** → Phase 2: data sources needed
10. **No first-time user onboarding** → Phase 2: guided tour

## Strengths
- Multi-sport dashboard with best-odds highlighting
- Comprehensive bookmaker odds comparison tables
- Line movement chart with per-bookmaker tracking
- Structured AI analysis (summary + factors + value + risk + confidence)
- Smart Signals consensus detection
- Parlay EV calculation with correlation warnings
- Pick tracker with ROI and profit tracking

## Verdict
A sharp would **stay for the odds comparison and line movement tools** but would **not pay $29/mo without CLV tracking and bankroll management.** These are the metrics that define whether a bettor has a real edge. Adding CLV + bankroll transforms BetBrain from "useful odds aggregator" to "essential sharp tool."
