# Customer Simulation: Data-Driven Bettor

Date: 2026-03-22

## Persona
35-year-old quantitative sports bettor. Tracks every pick in a spreadsheet. Cares about CLV more than W/L record. Wants to see sample sizes, confidence intervals, and calibration curves. Won't trust "AI says 75% confidence" without knowing the methodology.

## Journey

1. **Dashboard** — Games shown with odds, implied probability. Data freshness indicator ("fetched X min ago"). → Good data transparency.
2. **+EV Scanner** — Shows fair odds calculation, book vs fair probability, EV %. Math is transparent. → Excellent for this persona.
3. **Smart Signals + Hit Rate** — Stats show hit rate by strength and sport. But W-L-P count is small text, no "N=XX" prominently. → Needs sample size visibility.
4. **Pick tracker** — CLV, ROI, per-sport breakdown, profit/loss. → Excellent data depth.
5. **Analytics** — Activity counts (analyses, signals, picks) but not tied to outcomes. "18 signals detected" without inline hit rate. → Needs outcome attribution.
6. **AI Analysis** — "Confidence: 75%" but no explanation of what drives this number. No calibration data. → Red flag for data-driven bettor.
7. **Backtesting** — Looks real (teams, dates, odds, results) but uses seeded random data, not real historical outcomes. → Misleading. Biggest concern.
8. **Bankroll** — Shows drawdown, Kelly example (hardcoded 55% at -110). No variance/Sharpe metrics. → Good but incomplete.
9. **CLV on profile** — Average CLV, weighted CLV, +CLV rate. Per-pick tracking. → Excellent.

## Gaps Found

### Critical (trust-breaking)
1. **Backtesting uses simulated data** — Seeded RNG generates fake games/outcomes. Strategy win rates are hardcoded (56.5%, 53%, 51.5%). A data-driven bettor would discover this and lose trust. Known limitation — requires real historical data sources.
2. **AI confidence has no empirical basis** — Claude outputs a 0-100 number based on prompt, not historical calibration. There's no way to verify if "75% confidence" actually means 75% accuracy.

### Important (data completeness)
3. **Signal hit rates need sample size** — "52% hit rate" could be from 5 or 500 games. No N displayed prominently. No statistical significance warning.
4. **No P&L attribution** — Can't see which strategy (EV picks vs signals vs manual) contributed to overall ROI.
5. **No variance metrics in bankroll** — Missing standard deviation of returns, Sharpe ratio, actual Kelly calculation from personal data.

### Nice-to-have
6. **No calibration curves** — Would show if AI's confidence buckets (60-70%, 70-80%, etc.) actually match win rates.
7. **EV scanner has no historical validation** — Consensus fair odds methodology is sound but unproven in production.
8. **Analytics not tied to outcomes** — "42 analyses generated" but no win rate of analyzed games where value was found.

## Strengths
- **EV scanner math is transparent** — Fair odds formula visible, multi-book consensus approach
- **CLV tracking is excellent** — Per-pick CLV, weighted average, +CLV rate
- **Signal detection criteria are documented** — Odds variance, AI confidence, value assessment thresholds
- **Pick tracker is comprehensive** — Per-sport breakdown, ROI, profit tracking
- **Data freshness indicators** — Shows staleness of cached odds

## Verdict
**Would this bettor pay for Pro?** Yes for EV scanner, CLV tracking, and pick tracker. But they would NOT trust the backtesting feature and would be skeptical of AI confidence numbers. They'd use BetBrain alongside their spreadsheet, not instead of it. The product is 80% there for this persona — the remaining 20% is calibration and validation data that requires historical outcomes.

**Key improvement**: Add "N=XX" sample size to all hit rate displays. It's a 5-minute fix that dramatically improves data credibility.
