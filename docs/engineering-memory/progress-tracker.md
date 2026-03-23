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
