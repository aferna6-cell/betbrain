# BetBrain Codebase Audit — 2026-03-25

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| **Tests** | ✅ PASS | 1303/1303 passing (64 test files) |
| **Build** | ✅ PASS | Production build succeeds |
| **TypeScript** | ✅ PASS | Zero type errors |
| **Lint** | ❌ FAIL | 8 source files with errors; `tmp/` not ignored |
| **npm audit** | ⚠️ HIGH | 1 high-severity vulnerability (flatted prototype pollution) |
| **Security** | ⚠️ MODERATE | Good auth coverage; missing per-route rate limiting |
| **Data Pipelines** | ⚠️ MODERATE | Missing fetch timeouts; unvalidated external API responses |
| **Test Coverage** | ⚠️ GAP | API routes 95%, lib 88%, components 2% |

---

## CRITICAL Findings

### C1: Missing Fetch Timeouts on All External API Calls
**Severity: CRITICAL** | Files: `src/lib/sports/odds.ts:357`, `src/lib/sports/props.ts:301`, `src/lib/sports/stats.ts:406`

All `fetch()` calls to The Odds API and balldontlie API lack AbortController/timeout. A network hang blocks the request indefinitely, potentially exhausting server resources.

**Fix:** Add 10-second AbortController timeout to all external fetch calls.

### C2: npm Dependency Vulnerability (flatted)
**Severity: HIGH** | Package: `flatted <=3.4.1`

Prototype Pollution via `parse()` in NodeJS flatted (GHSA-rf6f-7fwh-wjgh). Fix available via `npm audit fix`.

### C3: Lint Config Missing tmp/ Ignore
**Severity: MEDIUM** | File: `eslint.config.mjs`

ESLint scans `tmp/` build artifacts (19,000+ warnings, 1,400+ errors from generated code). The `tmp/` and `supabase/.temp/` directories should be added to globalIgnores.

---

## HIGH Findings

### H1: No Per-Route Rate Limiting
**Severity: HIGH** | Impact: DDoS/scraping risk

No request throttling per user or IP on any route. The `/api/leaderboard` route is public and completely unthrottled. CPU-intensive routes like `/api/analysis` and `/api/backtesting` could be abused.

**Recommendation:** Add Vercel Edge rate limiting or middleware-based throttle.

### H2: Unvalidated External API Response Schemas
**Severity: HIGH** | Files: `src/lib/sports/odds.ts:370`, `src/lib/sports/props.ts:314`, `src/lib/sports/stats.ts:420`

API responses are cast via `as Promise<Type>` without runtime validation. Malformed data from external APIs would silently pass through and crash downstream.

### H3: Parallel Database Updates Without Transactions
**Severity: HIGH** | Files: `src/app/api/picks/resolve/route.ts:102-122`, `src/app/api/cron/resolve/route.ts:87-122`

`Promise.allSettled()` updates picks in parallel. Partial failures leave database in inconsistent state (some picks resolved, others not). No rollback mechanism.

### H4: Supabase Query Error Handling Gaps
**Severity: HIGH** | Files: `src/lib/sports/odds.ts:148-154`, `src/lib/sports/props.ts:192`

Pattern `const { data } = await supabase.from(...).select(...)` ignores the `error` field. If query fails, `data` is null and code proceeds with `?? []`, masking the failure.

---

## MEDIUM Findings

### M1: N+1 API Call Pattern in Pick Resolution
Files: `src/app/api/picks/resolve/route.ts:74-81`, `src/app/api/cron/resolve/route.ts:72-79`

Loops over unique dates making one API call per date. Could batch into single call.

### M2: CSP Allows unsafe-inline and unsafe-eval
File: `next.config.ts`

Required for React compiler but weakens XSS protection.

### M3: odds_history Lacks Deduplication
File: `src/lib/sports/odds.ts:244-271`

Duplicate calls within same minute create duplicate rows. No unique constraint.

### M4: Fire-and-Forget Error Swallowing
Files: `src/lib/sports/odds.ts:442-444`, `src/lib/signals.ts:116-120`

Alert checks and signal persistence use `.catch(console.error)` — failures are silently logged.

### M5: AI Response Field Validation Incomplete
File: `src/lib/ai/analysis.ts:228-246`

Validates riskLevel and confidence but not summary emptiness or keyFactors array shape.

### M6: Stale Cache Served as Fresh
File: `src/lib/sports/stats.ts:619-641`

On API error, serves expired cache but `isFresh` flag may still be true.

### M7: 8 Source Files with Lint Errors
Files: `src/app/api/analysis/injury/route.ts`, `src/app/api/analysis/parlay/route.ts`, `src/app/api/health/__tests__/route.test.ts`, `src/app/api/picks/__tests__/route.test.ts`, `src/app/api/saved-analyses/__tests__/route.test.ts`, `src/components/api-docs.tsx`, `src/lib/ai/analysis.ts`, `src/lib/sports/props.ts`

Mix of `@ts-ignore` → `@ts-expect-error` and unused variable warnings.

---

## LOW Findings

### L1: Monthly Rate Limit Uses UTC
File: `src/lib/sports/odds.ts:48-50`

`currentMonth()` uses UTC, not user timezone. Edge case at month boundaries.

### L2: Component Test Coverage at 2%
Only 1 of 52 components has tests. Mitigated by E2E smoke tests.

### L3: CLAUDE.md Test Count Stale
CLAUDE.md says 1385 tests; actual count is 1303 (Stripe tests removed).

---

## Security Review Summary

| Check | Status |
|-------|--------|
| Hardcoded API keys in source | ✅ None found |
| Auth on non-public endpoints | ✅ 19/21 routes protected |
| Input validation | ✅ Comprehensive type/enum/range checks |
| SQL injection | ✅ PostgREST only, no raw SQL |
| CORS | ✅ Same-origin; security headers set |
| Rate limiting (external APIs) | ✅ Tracked in api_usage table |
| Rate limiting (per-route) | ❌ Not implemented |
| Dependency vulnerabilities | ⚠️ 1 high (flatted) |
| Secrets in frontend bundle | ✅ Only NEXT_PUBLIC_ vars exposed |
| RLS on Supabase | ✅ Enabled |
| Owner verification on mutations | ✅ All user data checks user.id |

## Test Coverage Summary

| Area | Coverage | Notes |
|------|----------|-------|
| API Routes | 95% (20/21) | All have happy + error path tests |
| Library Files | 88% (30/34) | Untested: supabase client/server, utils |
| Components | 2% (1/52) | Critical gap — only game-card helpers |
| Auth Flows | ✓ Partial | Validation tested; Supabase integration via E2E |
| AI Analysis | ✓ Full | Structured output, disclaimers, caching |
| Auto-resolve | ✓ Full | Team matching, profit calc, outcomes |
| EV Scanner | ✓ Full | +EV detection, arbitrage, edge cases |
| Rate Limiting | ✓ Full | Constants, thresholds, decision trees |

---

## Action Items (Priority Order)

1. **[CRITICAL] Fix npm vulnerability** — `npm audit fix`
2. **[CRITICAL] Add fetch timeouts** to all external API calls
3. **[HIGH] Fix eslint config** — add tmp/ to ignores; fix 8 source files
4. **[HIGH] Fix lint errors** in 8 source files
5. **[HIGH] Add Supabase error checking** on cache queries
6. **[MEDIUM] Update CLAUDE.md test count** — 1385 → 1303
7. **[MEDIUM] Write tests for untested critical paths**
8. **[LOW] Document rate limit UTC behavior**

---

*Generated by codebase audit on 2026-03-25*
