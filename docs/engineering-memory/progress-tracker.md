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
