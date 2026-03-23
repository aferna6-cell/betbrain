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
