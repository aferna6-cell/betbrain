# Test Coverage — BetBrain

Last updated: 2026-03-22

## Overview
- **Total tests:** 1174
- **Test files:** 46
- **Framework:** Vitest (node environment)

## Coverage by Layer

### src/lib/ — Business Logic (well covered)
All major lib files have corresponding test suites in `src/lib/__tests__/`:
- odds.ts, format.ts, clv.ts, sanitize.ts, ev-scanner.ts
- auto-resolve.ts, pick-stats.ts, analytics.ts, share-stats.ts
- alerts.ts (alert value extraction + trigger logic)
- bankroll.ts, backtesting.ts, digest.ts, signals.ts
- signal-history.ts, leaderboard.ts, onboarding-emails.ts
- env.ts, stripe.ts, json-ld.ts, watchlist.ts

### src/lib/api/ — Route Helpers (covered)
- `route-handler.test.ts` — badRequest, routeErrorResponse

### src/lib/sports/ — Sports Data (covered)
- config.test.ts — sport keys, cache TTLs
- odds.test.ts — odds data shape, best line selection
- stats.test.ts — type compliance, isSupportedSport

### src/lib/ai/ — AI Analysis (covered)
- analysis.test.ts — structured output shape, disclaimer, limits
- injury-impact.test.ts — type compliance

### src/app/api/ — API Routes (started Cycle 230)
- picks/route.test.ts — POST validation, PATCH updates, DELETE, auth
- alerts/route.test.ts — GET response shape, POST validation, DELETE
- saved-analyses/route.test.ts — POST/PATCH/DELETE validation, auth

**Strategy:** Mock `@/lib/supabase/server` at module level, test validation logic
and response shapes. Shared mock helpers in `src/app/api/__tests__/mock-supabase.ts`.

### Remaining API Route Gaps
Routes without tests (validation + auth testing recommended):
- /api/analysis (POST)
- /api/analysis/injury (POST)
- /api/analysis/parlay (POST)
- /api/analysis/prop (POST)
- /api/analytics (GET)
- /api/backtesting (POST)
- /api/cron/resolve (POST)
- /api/digest (GET)
- /api/ev (GET)
- /api/health (GET)
- /api/leaderboard (GET)
- /api/odds (GET)
- /api/odds/history (GET)
- /api/picks/resolve (POST)
- /api/signals (GET)
- /api/signals/history (GET/PATCH)
- /api/stats (GET)
- /api/stripe/checkout (POST)
- /api/stripe/webhook (POST)

### src/components/ — UI (minimal)
- game-card.test.tsx — game card rendering
- Most components are untested (44 of 45)

## Test Patterns
- Pure logic: import + assert (no mocking)
- API routes: vi.mock Supabase server module, test validation/auth/response shape
- Type compliance: construct valid objects, assert shape matches interfaces
