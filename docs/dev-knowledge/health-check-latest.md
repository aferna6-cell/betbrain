# Health Check — 2026-03-15 Manual

| Check | Status | Notes |
|-------|--------|-------|
| Production build | PASS | `npm run build` passed. |
| Lint | FAIL |      |     ^^^^^^^^^^ Avoid calling setState() directly within an effect
  64 |     refresh()
  65 |
  66 |     // Keep in sync if other tabs modify localStorage  react-hooks/set-state-in-effect

/home/aidan/betbrain/src/lib/__tests__/backtesting.test.ts
  93:11  warning  'hc' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/aidan/betbrain/src/lib/__tests__/stripe.test.ts
  15:9  warning  'VALID_TIERS' is assigned a value but only used as a type  @typescript-eslint/no-unused-vars

/home/aidan/betbrain/src/lib/sports/__tests__/odds.test.ts
  11:3  warning  'NormalizedBookmakerOdds' is defined but never used  @typescript-eslint/no-unused-vars
  12:3  warning  'OddsApiGame' is defined but never used              @typescript-eslint/no-unused-vars
  13:3  warning  'OddsApiBookmaker' is defined but never used         @typescript-eslint/no-unused-vars

/home/aidan/betbrain/src/lib/sports/__tests__/stats.test.ts
  10:3  warning  'NBAPlayerStats' is defined but never used  @typescript-eslint/no-unused-vars

✖ 12 problems (2 errors, 10 warnings) |
| TypeScript | PASS | `npm run typecheck` passed. |
| Dangerous imports in routes/proxy | PASS | Route handlers import only server-side modules. |
| API route error handling | PASS | Every route handler has explicit auth/error handling. |
| Bare except count | PASS | Bare except count: 0 |
| Widget sync | N/A | No widget files or widget pipeline found in this repo. |
| Hardcoded secrets | FAIL | src/lib/__tests__/env.test.ts:172: process.env.ANTHROPIC_API_KEY = 'sk-test-anthropic'<br>src/lib/__tests__/env.test.ts:173: expect(getRequiredEnvVar('ANTHROPIC_API_KEY')).toBe('sk-test-anthropic') |
| Env coverage | PASS | `.env.example` covers the currently required application env vars. |
| `any` type usage | WARN | src/app/api/saved-analyses/route.ts:23: const { data, error } = await (supabase as any)<br>src/app/api/saved-analyses/route.ts:84: const { data: insight, error: insightError } = await (supabase as any)<br>src/app/api/saved-analyses/route.ts:100: const { data: existing } = await (supabase as any)<br>src/app/api/saved-analyses/route.ts:121: const { data: saved, error: insertError } = await (supabase as any)<br>src/app/api/saved-analyses/route.ts:159: const { data: record, error: lookupError } = await (supabase as any)<br>src/app/api/saved-analyses/route.ts:182: const { data: updated, error: updateError } = await (supabase as any)<br>src/app/api/saved-analyses/route.ts:214: const { data: record, error: lookupError } = await (supabase as any)<br>src/app/api/saved-analyses/route.ts:237: const { error: deleteError } = await (supabase as any) |
| AI disclaimer enforcement | PASS | Schema default, architecture rule, and runtime assertDisclaimer() guard all present. |
| Migration drift | ACTION REQUIRED | Apply `supabase/migrations/002_fix_api_usage_system_tracking.sql` in Supabase environments. |

