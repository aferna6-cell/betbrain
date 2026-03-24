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
