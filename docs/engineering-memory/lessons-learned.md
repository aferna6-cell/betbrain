# Lessons Learned
_Append-only. Never delete entries._

### 2026-03-23: Google Fonts fail in sandboxed environments
`next/font/google` requires network access at build time. The `geist` npm package provides the same fonts locally. Always prefer local font packages when the build environment may be offline.

### 2026-03-23: Invalid Claude model IDs silently break at runtime
4 AI modules referenced `claude-sonnet-4-5-20250514` which is not a valid model. This would only fail at runtime when Claude API is called. Valid models: `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`. Add model validation to CI.

### 2026-03-23: Same-game parlay detection needs `continue` removed
When detecting multiple correlation types in a single leg pair (same-game + opposing sides + related props), a `continue` after the first match skips remaining checks. Use `if/else if` chains or remove `continue` so all correlation types are detected.

### 2026-03-23: `vi.stubGlobal('window', ...)` needed for localStorage tests
In Vitest without jsdom, `typeof window === 'undefined'` is true. Either use jsdom environment or stub `window` before importing the module under test. The `vitest-environment jsdom` pragma requires jsdom as a dependency.

## 2026-03-23: TypeScript index signature incompatibility
When creating generic filter functions that accept any object with certain fields, avoid `[key: string]: unknown` index signatures. Strict TypeScript interfaces (like `UserPick`) don't satisfy index signature constraints. Instead, use a minimal interface with only the required fields and extend with `<T extends MinimalInterface>`.

## 2026-03-23: Consensus detection without handle data
Without actual public betting percentage data, estimating sharp vs public sides requires proxy signals: bookmaker odds disagreement (std dev of implied probabilities), outlier detection, and favorite bias. Cap confidence at 85% since these are estimates. Users appreciate transparency about methodology limitations.

## 2026-03-23 (Session 3): localStorage sort ordering is non-deterministic
When two items are saved near-simultaneously (same millisecond), sorting by `updatedAt` gives non-deterministic order. Tests should use `toContain` checks instead of position assertions, or introduce deliberate time gaps.

## 2026-03-23 (Session 3): Notification deduplication prevents test flakiness
The notification system deduplicates same-type + same-title within 5 minutes. This prevents flood scenarios but means tests need unique titles or need to clear storage between test runs.

## 2026-03-23 (Session 3): Book color fallbacks prevent runtime errors
Unknown bookmaker keys (from new sportsbooks appearing in Odds API data) get a neutral gray fallback instead of throwing. Always provide fallback styling for dynamic data from external APIs.

## 2026-03-24: Bypassing SaaS code is safer than removing it
Rather than deleting all Stripe/subscription code (which would break 15+ files and their tests), the pragmatic approach is to bypass the tier check functions to always return "unlimited." This preserves code structure and test coverage while making the app function as a personal tool. The Stripe API routes still exist but are unreachable from the UI.

## 2026-03-24: Check for duplicate imports before adding new ones
When adding `getBestMoneyline` to game-detail.tsx, the import already existed on a different line. Turbopack gives a "Duplicate declaration" error. Always grep for the import name in the target file before adding.

## 2026-03-24 (Session 2): TypeScript nullable state in callbacks
When using `useState<T | null>(null)`, callback closures reference the state type which includes `null`. Using `prefs!.field` works but `typeof prefs.field` fails because TS narrows the value but not the type in `typeof`. Solution: extract to a local variable first or add an explicit null check before the callback body.

## 2026-03-24 (Session 2): Pearson correlation test data must match expected behavior
[1,0,1,0,1] vs [0,1,0,1,0] has r=-1.0 (perfectly inversely correlated), not ~0. For truly uncorrelated data, use random-looking sequences that don't follow a pattern.

## 2026-03-24 (Session 5): Deduplication in value scoring
When combining signals from multiple sources (EV scanner, line shopping, disagreement), plays for the same game+side get deduplicated. The deduplication keeps the highest-scored play. Tests should check for "at least one play for this game" rather than specific reason types, since a +EV play may deduplicate away a disagreement play for the same game.

## 2026-03-24 (Session 5): Rebase conflicts with memory files
When rebasing onto a remote that also has engineering memory files, git shows add/add conflicts. Use `git rebase --skip` if the remote version has better content from a prior session. Always commit memory files before pulling.

## 2026-03-24 (Session 5): Spread "best line" sorting
For spread bets, "best" depends on which side you're betting. A higher spread line is better for the side receiving points. Sort by line value first (higher = better), then by implied probability (lower = better price) as tiebreaker.

## 2026-03-24 (Session 6): NormalizedBookmakerOdds property names
The interface uses `spread` and `total` (singular), not `spreads` and `totals`. The sub-interfaces are `NormalizedSpread` with `homeLine`/`awayLine` and `NormalizedTotal` with `line`. Test fixtures must match these exactly. Always check the interface definition before writing test helpers.

## 2026-03-24 (Session 6): Risk scoring calibration
The risk assessment composite score uses weighted factors (30% bankroll, 25% odds value, 15% concentration, 20% tilt, 10% unit sizing). Individual factor scores (0-100) get mapped to five severity levels. When wiring into UI, the assessment is recalculated on every form input change — use useMemo to avoid unnecessary recalculations, and skip assessment when odds is null or invalid.

## 2026-03-24 (Session 6): localStorage data for client components
Multiple features (risk scorecard, bankroll recovery, daily review) read from localStorage. Always: (1) guard with typeof window check, (2) wrap in try-catch since storage can be full or disabled, (3) provide sensible defaults, (4) load in useEffect not during render to avoid SSR mismatch.
