# Improvement Ideas
_Ideas for later._

### Remove or bypass Stripe code for personal tool
The codebase has 32 files referencing Stripe/subscriptions. Since this is a personal tool, the billing page, checkout flow, and tier gating are dead code. Could either remove entirely or add an env flag to bypass tier checks. Low priority since it doesn't break anything.

### Add Claude model validation to CI
Add a grep/lint step that checks all `MODEL =` constants against a whitelist of valid Claude model IDs. Prevents silent runtime failures from invalid models.

### Wire unit-sizing recommendations into game detail page
The unit-sizing library is built but not yet displayed in the UI. Could show Kelly-based sizing recommendations on game detail page alongside AI analysis.

### Wire parlay correlation into game-based parlay building
The correlation detection supports `gameId` but the current parlay builder uses freeform text. Could pre-populate gameId when building parlays from game detail pages for better correlation detection.

### Add jsdom to dev dependencies
Several client-side utilities need DOM for testing. Installing jsdom would simplify test setup vs. manual global stubbing.

## 2026-03-23
- Steam moves could be enhanced with cross-book agreement detection (when 3+ books move the same direction simultaneously, it's a stronger signal)
- Consensus indicator should incorporate line movement data from odds_history when available (currently only uses current snapshot)
- Season reset could auto-detect the current sport's season based on game dates rather than requiring manual selection
- Daily summary could show "change since yesterday" metrics to create urgency

## 2026-03-23 (Session 3)
- Notification center could integrate with browser Notification API for push-style alerts
- Book ROI tracker should eventually store assignments in Supabase for cross-device sync
- Betting journal could support image attachments (screenshots of bets)
- Weekly recap could auto-generate a shareable Twitter/X image card
- Time analysis could factor in day-of-week combined with time-of-day for more granular patterns
- Bankroll goals could send notifications when approaching or achieving targets
- Game notes could be surfaced in the comparison table for multi-game analysis
- ~~Parlay stats component needs UI~~ — DONE (ParlayStatsDisplay wired into picks tracker)

## 2026-03-24
- The TodaysAction widget only shows picks for the exact current date. Could expand to show "next 24 hours" for evening bettors reviewing morning lines.
- Unit sizing card could persist the recommended confidence level to pre-fill when logging the pick.
- The Stripe code (routes, tests, lib) could be fully removed in a dedicated cleanup pass. Currently bypassed but still in the codebase.
- Consider adding a "Quick Analysis" button directly on the TodaysAction widget cards.
- The billing page still exists at /dashboard/billing — could redirect to /dashboard/tools instead.
