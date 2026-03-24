# Progress Tracker
_What was built each session._

## Session 2026-03-23

### Bug Fixes
- Google Fonts fetch fails in sandbox: switched to local `geist` npm package
- All 4 AI modules had invalid model `claude-sonnet-4-5-20250514`, updated to `claude-sonnet-4-6`

### Features Built
1. **Streak tracking + badges** (`src/lib/streaks.ts`) — Current/longest win/loss streaks, best week, 11 badge types (Hot Hand, 5-Game Heater, On Fire, Getting Started, Consistent, Centurion, In the Green, Sharp, CLV King, Perfect Week). 25 tests.
2. **CSV export** — One-click export of all picks to CSV from picks tracker page.
3. **Preferred bookmaker** (`src/lib/preferences.ts`) — Click bookmaker name in odds table to highlight as preferred. Blue accent row persists via localStorage. 8 tests.
4. **ROI by day of week** — `calcDayOfWeekBreakdown()` in pick-stats.ts, visual display with best/worst day. 5 tests.
5. **Game countdown timer** (`src/components/game-countdown.tsx`) — Live Xh Ym countdown on game cards for games <24h away. Orange <30min, pulsing red for LIVE.
6. **Parlay correlation detection** (`src/lib/parlay-correlation.ts`) — Same-game, same-team, opposing sides, related props. Correlation score (0-100). Wired into parlay builder UI. 17 tests.
7. **Unit size recommendations** (`src/lib/unit-sizing.ts`) — Kelly-based sizing at 4 confidence tiers with 5% bankroll cap. Flat staking alternative. 17 tests.
8. **Game comparison page** (`/dashboard/compare`) — Select 2-5 games, side-by-side table of best moneyline/spread/totals across bookmakers.

### Tests Added
- 91 new tests (1385 to 1476 total)
- New test files: streaks.test.ts (25), preferences.test.ts (8), parlay-correlation.test.ts (17), unit-sizing.test.ts (17)
- Expanded: ev-scanner.test.ts (+11), bankroll.test.ts (+6), pick-stats.test.ts (+5)

### Commits: 9 (fix font, streaks+badges+csv, preferred bookmaker, day-of-week+ev-tests, countdown+bankroll-tests, parlay-correlation+model-fix, unit-sizing+model-fix, compare-page, parlay-ui-wiring)

## Session 2026-03-23
- **Steam move detection** — `src/lib/steam-moves.ts` pure-function detector for rapid line movement across bookmakers. API route at `/api/odds/steam`. Client component `steam-moves.tsx` with loading/empty/error states. 14 tests. Wired into Signals page as new "Steam Moves" tab.
- **Consensus vs. contrarian indicator** — `src/lib/consensus.ts` estimates public vs sharp sides from bookmaker odds disagreement, outlier analysis. 10 tests. `consensus-indicator.tsx` with divergence highlighting. Wired into EV Scanner page as new "Consensus" tab.
- **Seasonal performance reset** — `src/lib/seasonal-reset.ts` with localStorage storage, sport-specific presets (NBA/NFL/MLB/NHL start dates), custom date picker. `season-reset.tsx` UI control. 10 tests. Wired into picks tracker — streaks, badges, type breakdown, day-of-week all respect season filter.
- **Share analysis to Twitter/X** — `shareAnalysisToX()` in game-detail.tsx. Formats matchup, summary, value assessment into a tweet. Opens Twitter intent URL.
- **Daily highlights summary** — `daily-summary.tsx` server component on dashboard. Shows top +EV bet, sharp/public divergence count, active signals. Links to full pages. Runs on cached data only.
- **Backlog update** — Checked off 15+ items that were already implemented but unchecked. Added 15 new future ideas.
- **Total tests: 1510** (up from 1476)

## Session 2026-03-23 (Session 3)

### Features Built
1. **Betting journal** (`src/lib/journal.ts`, `src/components/betting-journal.tsx`, `/dashboard/journal`) — Daily mood/bankroll/notes tracking. CRUD, stats panel (streak, mood distribution, avg bankroll, top tags), CSV export, tag system with suggestions. 15 tests.
2. **Notification center** (`src/lib/notifications.ts`, `src/components/notification-center.tsx`, `/dashboard/notifications`) — In-app activity feed. Bell icon in nav with unread count. Filter by type (picks, alerts, signals, +EV, warnings). Deduplication. Notification generators for all event types. 16 tests.
3. **Per-book color coding** (`src/lib/book-colors.ts`) — Brand colors for 20+ sportsbooks (DraftKings, FanDuel, BetMGM, etc.). Colored dots + row tinting in all 3 odds tables (moneyline, spread, totals). 5 tests.
4. **Regression alerts** (`src/lib/regression-alerts.ts`, `src/components/regression-alerts.tsx`) — Detect ROI drops, losing streaks (5+), cold sports (<35% win rate), unit drain. Configurable thresholds with localStorage persistence. Wired into picks tracker page. Pushes to notification center. 12 tests.
5. **Game notes** (`src/lib/game-notes.ts`, `src/components/game-notes.tsx`) — Pre-game thoughts + post-game reflections per game. New "Notes" tab on game detail page. Tags support. 8 tests.
6. **Book-specific ROI** (`src/lib/book-roi.ts`, `src/components/book-roi-tracker.tsx`) — Assign bookmaker to picks, track record/profit/ROI per book. Sortable table with brand colors. CSV export. Wired into bankroll page. 10 tests.
7. **Parlay hit rate tracking** (`src/lib/parlay-stats.ts`) — Separate parlay vs straight bet statistics. CRUD for parlay groups. Hit rate, avg legs, profit calculation. 10 tests.
8. **Weekly recap** (`src/lib/weekly-recap.ts`, `src/components/weekly-recap.tsx`) — Auto-generated weekly performance summary. Best/worst picks, sport breakdown, streak detection, volume/profit vs last week. Wired into digest page. 10 tests.
9. **Performance by time of day** (`src/lib/time-analysis.ts`, `src/components/time-analysis.tsx`) — 5 time periods with ROI per period. Visual bars. Best/worst time identification. Wired into analytics page. 8 tests.
10. **Bankroll goals** (`src/lib/bankroll-goals.ts`, `src/components/bankroll-goals.tsx`) — Daily/weekly/monthly/season profit targets. Progress bars, projections, quick templates. Wired into bankroll page. 11 tests.

### Tests Added
- 105 new tests (1510 to 1615 total)
- New test files: journal (15), notifications (16), regression-alerts (12), book-colors (5), game-notes (8), book-roi (10), parlay-stats (10), weekly-recap (10), time-analysis (8), bankroll-goals (11)

### New Routes
- `/dashboard/journal` — Betting journal
- `/dashboard/notifications` — Full notification feed

### Commits: 6

## Session 2026-03-23 (Session 4)

### Features Built
1. **Confidence calibration** (`src/lib/confidence-calibration.ts`, `src/components/confidence-calibration.tsx`) — Tracks how well stated confidence levels match actual win rates. Buckets picks into 6 confidence ranges, calculates calibration score (0-100), diagnoses over/under-confidence. localStorage persistence for confidence ratings. Wired into analytics page. 12 tests.
2. **Monte Carlo simulator** (`src/lib/monte-carlo.ts`, `src/components/monte-carlo.tsx`) — Projects bankroll outcomes over N future bets. Seeded PRNG for reproducibility. Calculates median, percentiles (5/25/75/95), ruin probability, profit probability, expected ROI. SVG trajectory chart with percentile bands. Auto-derives config from pick history. Wired into tools page. 16 tests.
3. **Fade the public tool** (`src/lib/fade-public.ts`, `src/components/fade-public.tsx`) — Identifies contrarian plays against estimated public side. Scores fade strength (0-100) based on 5 factors: heavy favorite bias, sharp divergence, book disagreement, underdog value, consensus confidence. Best fade odds per bookmaker. Sport filter. Wired into EV scanner as "Fade Public" tab. 12 tests.
4. **Situational spots detector** (`src/lib/situational-spots.ts`, `src/components/situational-spots.tsx`) — Detects schedule-based edges: back-to-back (NBA/NHL), rest advantage (3+ day diff), 3-in-4 nights, long road trips (4+ consecutive away), home stands, schedule loss spots. Impact rating (1-5). Type filter. Wired into EV scanner as "Situations" tab. 11 tests.

### Tests Added
- 51 new tests (1615 to 1666 total)
- New test files: confidence-calibration (12), monte-carlo (16), fade-public (12), situational-spots (11)

### Pages Updated
- `/dashboard/analytics` — Added Confidence Calibration section
- `/dashboard/tools` — Added Monte Carlo Simulator section
- `/dashboard/ev` — Added "Fade Public" and "Situations" tabs

### Commits: 4 (pushed via GitHub MCP)

## Session 2026-03-24

### Bug Fixes
- Google Fonts fetch fails in sandbox: confirmed geist local package fix was already on remote

### De-SaaS Changes
- Bypassed Stripe tier gating in `checkAnalysisLimit()` — all analyses now unlimited
- Replaced billing page with simple "Personal" usage page
- Removed Billing from nav, replaced with Tools link
- Dashboard shows "Personal" plan instead of Free/Pro
- Profile page shows unlimited analyses
- Landing page: replaced Free/Pro pricing grid with single "Personal" plan
- FAQ: removed subscription/pricing questions, updated Smart Signals description

### Features Built
1. **ParlayStatsDisplay** (`src/components/parlay-stats-display.tsx`) — Straight vs parlay breakdown: W/L/profit/ROI for each. Only renders when user has parlay groups. Wired into picks tracker.
2. **UnitSizingCard** (`src/components/unit-sizing-card.tsx`) — Kelly criterion-based unit sizing shown on game detail page after AI analysis. 4 confidence tiers with bankroll cap. Reads bankroll config from localStorage.
3. **TodaysAction** (`src/components/todays-action.tsx`) — Dashboard widget showing today's pending picks with countdowns, resolved results, units at risk, running P/L. Auto-hides if no picks today.

### Tests Added
- 26 new tests (1666 to 1692 total)
- New test files: unit-sizing-integration.test.ts (15), clv-trend.test.ts (11)

4. **CLV Trend Chart** (`src/components/clv-trend-chart.tsx`, `src/components/clv-trend-section.tsx`) — Recharts line chart showing per-pick CLV and running average over time. Shows when user has 3+ picks with closing odds. Wired into analytics page.

### Commits: 8

## Session 2026-03-24 (Session 2)

### Features Built
1. **Copy analysis to clipboard** — One-click copy of AI analysis with key factors, value assessment. Visual "Copied!" feedback. On game detail page.
2. **Bankroll sparkline** (`src/components/bankroll-sparkline.tsx`) — SVG sparkline showing running P/L curve on dashboard. Zero baseline, gradient fill, endpoint dot.
3. **Home/away splits** (`src/lib/bankroll-history.ts`, `src/components/home-away-splits.tsx`) — Win rate, ROI, profit for home vs away picks. On analytics page.
4. **Quick game filters** — Dashboard pill buttons: +EV, Signals, My Picks. Colored per type (green/blue/purple). Fetches user picks client-side for "My Picks" filter.
5. **Model accuracy tracking** (`src/lib/model-accuracy.ts`, `src/components/model-accuracy.tsx`) — Brier score, confidence bucket breakdown, risk-level accuracy, recent prediction heatmap. On analytics page.
6. **Pick templates** (`src/lib/pick-templates.ts`, `src/components/pick-templates.tsx`) — Save/load common pick configs. Usage tracking, frequency-based sorting. Suggest templates from history patterns.
7. **Odds velocity detection** (`src/lib/odds-velocity.ts`, `src/components/odds-velocity.tsx`) — Detect rapid coordinated line movement across 2+ books. Severity: moderate/sharp/extreme. "Line Velocity" tab on Signals page.
8. **Smart bankroll allocation** (`src/lib/bankroll-allocation.ts`, `src/components/bankroll-allocation.tsx`) — Kelly-inspired sport weighting. Visual allocation bar with per-sport ROI/confidence. Min 5% / max 50% caps. On bankroll page.
9. **Notification preferences** (`src/lib/notification-preferences.ts`, `src/components/notification-preferences.tsx`) — Per-type toggles, mute-all, quiet hours (wraps midnight), desktop notification permission. "Preferences" tab on notifications page.
10. **Season summary generator** (`src/lib/season-summary.ts`, `src/components/season-summary.tsx`) — Letter grade (A+ to F), record/ROI/profit, best/worst sport/month, streaks, bet type breakdown. Copy to clipboard. On analytics page.
11. **Correlation matrix** (`src/lib/correlation-matrix.ts`, `src/components/correlation-matrix.tsx`) — Pearson correlation between sport/bet-type daily win rates. NxN heatmap, toggle sport vs bet type. On analytics page.

### Tests Added
- 95 new tests (1692 to 1787 total)
- New test files: bankroll-history (15), model-accuracy (13), pick-templates (7), odds-velocity (14), bankroll-allocation (14), notification-preferences (8), season-summary (11), correlation-matrix (13)

### Commits: 8

## Session 2026-03-24 (Session 5)

### Features Built
1. **Line shopping tool** (`src/lib/line-shopping.ts`, `src/components/line-shopping.tsx`) — Best lines across bookmakers, juice comparison, key line discrepancies, NFL key number crossing. "Line Shop" tab on game detail page. 33 tests.
2. **Bet calculator** (`src/lib/bet-calculator.ts`, `src/components/bet-calculator.tsx`) — Single bet payout, hedge bet calculator, parlay calculator. EV calculation, Kelly sizing, break-even win rate. Added to /dashboard/tools. 38 tests.
3. **Value finder** (`src/lib/value-finder.ts`, `src/components/value-plays.tsx`) — Composite scoring from +EV, key line discrepancy, bookmaker disagreement, low juice. Dashboard widget showing top 5 plays. 15 tests.
4. **Performance insights** (`src/lib/performance-insights.ts`, `src/components/performance-insights.tsx`) — 6-dimension analysis: bet type, sport, odds range, CLV, volume, timing. Actionable recommendations. Category filters. Added to analytics page. 18 tests.
5. **Closing line capture** (`src/lib/closing-line-capture.ts`) — Automatic consensus odds matching, CLV calculation, team name normalization. 24 tests.
6. **Risk assessment** (`src/lib/risk-assessment.ts`) — 5-factor pre-bet risk scoring: bankroll exposure, odds value, tilt/recency, portfolio concentration, unit sizing. 26 tests.

### Tests Added
- 154 new tests (1787 to 1941 total)
- New test files: line-shopping (33), bet-calculator (38), value-finder (15), performance-insights (18), closing-line-capture (24), risk-assessment (26)

### Commits: 7 (font fix resolution, line shopping, bet calculator, value finder, performance insights, closing line capture, risk assessment)

## Session 2026-03-24 (Session 6)

### Features Built
1. **Pre-bet risk scorecard** (`src/components/risk-scorecard.tsx`) — Visual risk meter with 5-factor breakdown (bankroll exposure, odds value, concentration, tilt, unit sizing). Expandable detail view. Wired into pick form with live scoring.
2. **Value plays page** (`/dashboard/value`, `src/components/value-plays-full.tsx`) — Full page showing all value plays with sport/type/score filters, stats summary (avg score, best score, games analyzed). Links to game detail.
3. **Performance insights on profile** — Top 3 highest-confidence insights from betting history shown on profile page as quick summary cards.
4. **Quick analysis from Today's Action** — "Analyze" link on each pick card to jump directly to game detail page.
5. **Odds staleness indicator** — Stale odds warning on game cards when cached data is past TTL, showing time since last update.
6. **Line movement heatmap** (`src/lib/line-movement-heatmap.ts`, `src/components/line-movement-heatmap.tsx`) — Visual grid of line activity across moneyline/spread/total markets. Intensity scoring (0-100), heat levels (cold/mild/warm/hot/fire). Sport filters, cold toggle. "Heatmap" tab on Signals page.
7. **Bankroll recovery calculator** (`src/lib/bankroll-recovery.ts`, `src/components/bankroll-recovery.tsx`) — Estimate bets to recover from drawdown. Three scenarios (optimistic/expected/pessimistic), recovery probability within N bets, timeline estimates, negative EV warning. Added to bankroll page.
8. **Public money estimator** (`src/lib/public-money.ts`, `src/components/public-money.tsx`) — Estimate public vs sharp sides using favorite bias, bookmaker consensus, outlier detection. Visual percentage bar, confidence scoring, divergence detection. "Public %" tab on EV Scanner.
9. **Pick streak indicators** — Win/loss streak badges in Today's Action widget (e.g., "3W streak", "2L streak").
10. **Daily review system** (`src/lib/daily-review.ts`, `src/components/daily-review.tsx`) — Process grading (A-F), discipline/bankroll/research ratings (1-5), chase tracking, lesson capture. Prompt appears on dashboard after 6 PM. Review history with stats on journal page. Trend detection (improving/declining).
11. **Book performance tracker** (`src/lib/book-performance.ts`, `src/components/book-performance.tsx`) — CLV, win rate, ROI per bookmaker. Best CLV book identification. Color-coded table with brand dots. "Performance by Bookmaker" section on analytics page.

### Tests Added
- 72 new tests (1941 to 2013 total)
- New test files: value-plays-page (10), line-movement-heatmap (11), bankroll-recovery (15), public-money (11), daily-review (12), book-performance (13)

### New Routes
- `/dashboard/value` — Dedicated value plays page

### Commits: 6

## Session 2026-03-24 (Session 7)

### Features Built
1. **Profit calendar** (`src/lib/profit-calendar.ts`, `src/components/profit-calendar.tsx`) — Monthly calendar view colored by daily P/L. 7 heat tiers (big-loss to big-win). Day detail popup, best/worst day summary, daily win/lose streaks. Month navigation. Added to analytics page. 26 tests.
2. **Hedge calculator** (`src/components/hedge-calculator.tsx`) — New "Hedge" tab on game detail page. Quick-fill from current best moneyline lines. Scenario breakdown (if original wins vs hedge wins). Guaranteed profit calculation. Uses existing `calculateHedge` from bet-calculator.ts.
3. **API usage forecast** (`src/lib/api-usage-forecast.ts`, `src/components/api-usage-forecast.tsx`) — Predicts when monthly Odds API budget will exhaust. Daily burn rate with weighted history, projected month-end usage, exhaustion date, sustainable rate. 4 status levels (safe/warning/danger/exhausted). Added to tools page. 18 tests.
4. **Kelly fraction override** (`src/lib/kelly-override.ts`, `src/components/kelly-override.tsx`) — Configurable Kelly criterion multiplier (quarter/half/three-quarter/full/custom). Global setting + per-bet overrides via localStorage. Edge-confidence-adjusted Kelly. Added to bankroll page. 22 tests.
5. **Results feed** (`src/lib/results-feed.ts`, `src/components/results-feed.tsx`) — Daily pick outcomes timeline on dashboard. Date navigation, running P/L, win/loss/push count, pending tracking. Matches picks with game data. Added to dashboard. 17 tests.
6. **Bet sizing optimizer** (`src/lib/bet-sizing-optimizer.ts`, `src/components/bet-sizing-optimizer.tsx`) — 5-factor scoring (win rate, ROI, sample size, bankroll health, Kelly aggression). Adjusts unit size 0.5x-1.5x based on recent 14-day performance. Visual factor breakdown. Added to bankroll page. 15 tests.
7. **Bet grading system** (`src/lib/bet-grading.ts`, `src/components/bet-grading.tsx`) — 6-factor process quality scoring: research/thesis, line shopping, CLV, sizing discipline, system adherence, timing. Letter grades A+ to F. Outcome alignment detection (lucky/unlucky). Interactive checklist UI. Added to tools page. 19 tests.

### Tests Added
- 117 new tests (2013 to 2130 total)
- New test files: profit-calendar (26), api-usage-forecast (18), kelly-override (22), results-feed (17), bet-sizing-optimizer (15), bet-grading (19)

### Commits: 7

## Session 2026-03-24 (Session 8)

### Features Built
1. **Quality vs outcome matrix** (`src/lib/quality-outcome-matrix.ts`, `src/components/quality-outcome-matrix.tsx`) — 2x2 grid mapping process quality (good/bad) to outcomes (win/loss). Sustainability score, luck factor, discipline score. Interactive quadrant detail view. Wired into analytics page. 17 tests.
2. **Streak probability calculator** (`src/lib/streak-probability.ts`, `src/components/streak-probability.tsx`) — Continuation odds (1/3/5 extensions), expected streak length, unusual streak detection (<5%), occurrence probability table. Visual bars + expandable table. Wired into analytics page. 23 tests.
3. **CSV pick import** (`src/lib/pick-import.ts`, `src/components/pick-import.tsx`) — Flexible column aliases (10+ column name variants), date format normalization (ISO, MM/DD/YYYY, MM-DD-YYYY), quoted field handling, per-row error reporting. Drag-drop + paste UI with preview table. Template download. Wired into tools page. 22 tests.
4. **Auto-grade from pick data** (`src/lib/auto-grade.ts`, `src/components/auto-grade.tsx`) — Infer 7 grading criteria from metadata: thesis (from notes), line shopping (from odds), CLV (from closing_odds), sizing, timing, chase detection (from recent picks), system adherence. Confidence levels (high/medium/low). Expandable per-pick detail. Wired into tools page. 21 tests.
5. **Weekly process grade** (`src/lib/weekly-process-grade.ts`, `src/components/weekly-process-grade.tsx`) — Aggregate auto-grade scores by ISO week. Linear regression trend detection (improving/declining/stable). Best/worst week, chase count, CLV stats per week. Visual bar chart. Wired into analytics page. 14 tests.
6. **Fade tracker** (`src/lib/fade-tracker.ts`, `src/components/fade-tracker.tsx`) — Classify picks as contrarian (underdog) or public-side. Win rate + ROI comparison, fade edge calculation. By-sport breakdown. Public percentage estimation from odds. Wired into analytics page. 17 tests.
7. **Bankroll milestone alerts** (`src/lib/bankroll-milestones.ts`, `src/components/bankroll-milestones.tsx`) — Growth milestones (10%-1000%), drawdown alerts (10%/25%/50%), ATH detection. Milestone progress bars, dismissible alerts, milestone checklist. Reads from journal entries. Wired into bankroll page. 17 tests.
8. **Odds screen comparator** (`src/lib/odds-comparator.ts`, `src/components/odds-comparator.tsx`) — Side-by-side visual diff of odds at two points in time. Per-bookmaker change table (ML, spread, total). Significant movement detection, biggest move highlighting. 20 tests.
9. **Pick confidence vs CLV scatter** (`src/lib/confidence-clv-scatter.ts`, `src/components/confidence-clv-scatter.tsx`) — Scatter plot (SVG) of confidence ratings vs closing line value. Pearson correlation with strength classification. Average CLV by confidence level. Wired into analytics page. 11 tests.
10. **Alert templates** (`src/lib/alert-templates.ts`, `src/components/alert-templates.tsx`) — Save/reuse alert configurations. 5 built-in starters (NBA underdog, NFL key number, etc.). Create custom, usage tracking, sport/category filters, sorted by frequency. 16 tests.

### Tests Added
- 178 new tests (2130 to 2308 total)
- New test files: quality-outcome-matrix (17), streak-probability (23), pick-import (22), auto-grade (21), weekly-process-grade (14), fade-tracker (17), bankroll-milestones (17), odds-comparator (20), confidence-clv-scatter (11), alert-templates (16)

### Pages Updated
- `/dashboard/analytics` — Added quality-outcome matrix, streak probability, weekly process grade, fade tracker, confidence-CLV scatter
- `/dashboard/tools` — Added auto-grade panel, CSV import panel
- `/dashboard/bankroll` — Added bankroll milestones

### Commits: 3 (pushed via git push)
