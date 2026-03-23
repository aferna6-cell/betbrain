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
