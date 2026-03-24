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

## 2026-03-24 (Session 7): getBestMoneyline returns number, not object
The `getBestMoneyline()` function in `src/lib/odds.ts` returns `number | null`, not an object with an `odds` property. When using it in components, access the value directly (e.g., `formatOdds(bestHomeML)`) rather than as a property. Always check the return type of utility functions before using them in new components.

## 2026-03-24 (Session 7): Process vs outcome in bet grading
The bet grading system deliberately separates process quality from outcome. A losing bet with good process (thesis, line shopped, followed system) gets a high grade. This aligns with long-term betting theory: good process beats good results over time. The "outcome alignment" metric identifies lucky wins (bad process, good result) vs unlucky losses (good process, bad result).

## 2026-03-24 (Session 7): Weighted daily burn rate for API usage
For API usage forecasting, a weighted recent average (more recent days weigh more) provides better predictions than a simple average. This captures trends like "I used more this weekend because football was on." The formula: weight each day by its position (most recent = highest), divide by sum of weights.

## 2026-03-24 (Session 8): PickForAutoGrade interface must match component usage
When creating a pure-function library type and a separate component that uses it, the component may access fields not in the interface (like `pick_team`). Always check what fields the component will display and include them in the interface, even if the pure function doesn't need them.

## 2026-03-24 (Session 8): Fade classification without public betting data
Without actual public betting percentage data, classifying picks as "fades" requires a heuristic based on odds. Underdogs (+100 and above) are classified as fades with fade strength scaling with odds. This is a rough proxy — real public betting data from APIs like Action Network would be more accurate. Always document methodology limitations.

## 2026-03-24 (Session 8): CSV import needs flexible column mapping
Users export picks from different platforms with different column names. Supporting 2-3 aliases per column (e.g., "odds", "price", "line_price") dramatically improves import success rate. Date format normalization (ISO, US slash, US dash) is equally important.

## 2026-03-24 (Session 8): Chase bet detection heuristics
Chase bets can be detected by looking at: (1) the previous pick was a loss, (2) the new pick was placed within 2 hours, (3) the unit size is elevated (>1.2x previous). All three conditions together have high precision but low recall — some chase bets won't be caught. This is acceptable for an auto-grading heuristic.

## 2026-03-24 (Session 8): Pearson correlation needs sufficient sample size
Pearson correlation with fewer than 10 data points is unreliable. The confidence-CLV scatter analysis correctly classifies any result with < 10 points as "insufficient" regardless of the computed correlation value. This prevents users from drawing conclusions from small samples.

## 2026-03-24 (Session 9): Reducer comparator inversion bug
When finding the minimum in a reduce() call, the comparator `(worst, d) => (d.roi < worst.roi ? worst : d)` is WRONG — it keeps the accumulator when `d` is smaller, effectively finding the maximum. The correct form is `(worst, d) => (d.roi < worst.roi ? d : worst)`. This is a common off-by-one-logic error. Always mentally trace: "when d is smaller, I want to keep d as the new worst."

## 2026-03-24 (Session 9): TypeScript strict null checks in chained property access
Even after a truthiness check like `if (group[i].pick_team && ...)`, TypeScript strict mode may still flag `group[i].pick_team.toLowerCase()` as "possibly null" because the narrow only applies within the same expression. Extract to a local variable first: `const team = group[i].pick_team; if (team) team.toLowerCase()`.

## 2026-03-24 (Session 9): Union-find for clustering correlated picks
Union-find (disjoint set) is the right algorithm for grouping correlated picks into clusters. O(n*alpha(n)) per operation, easy to implement. Path compression in find() keeps it fast. The key insight: iterate edges, union the connected nodes, then group by root to get clusters.

## 2026-03-24 (Session 9): Smart alerts need deduplication by type
When running periodic alert checks, the same condition (e.g., "5-game losing streak") will trigger every time. Deduplication by alert type prevents flooding. Keep only the most recent alert per type, and let users dismiss individually. Save dismissed state to localStorage to persist across page loads.

## 2026-03-24 (Session 10): Spread arb detection requires same-line matching
When detecting spread arbitrage, only compare books posting the same spread number (e.g. -3.5). Different spread numbers represent different markets and cannot form a true arbitrage pair. Group by absolute line value before comparing.

## 2026-03-24 (Session 10): Game script thresholds vary dramatically by sport
NBA blowout is 10+ points, NHL blowout is 2.5+ goals, MLB is 3+ runs. Using sport-specific threshold records avoids one-size-fits-all logic. OT base rates also differ hugely (NBA ~6%, NHL ~23%).

## 2026-03-24 (Session 10): Parlay optimizer combination explosion
C(N,K) grows fast — 8 candidates with K=4 gives 70 combos, but 15 candidates gives 1365. Always cap max combinations (default 500 per leg count) to prevent memory issues. Filter impossible combos early (opposing sides) to reduce output set.
