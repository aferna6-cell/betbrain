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
