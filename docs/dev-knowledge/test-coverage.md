# Test Coverage — BetBrain

Last updated: 2026-03-22

## Overview
- **Total tests:** 1288
- **Test files:** 62
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

### src/app/api/ — API Routes (Cycles 230-233)
- picks/route.test.ts — POST validation (7 fields), PATCH, DELETE, auth
- alerts/route.test.ts — GET response shape, POST validation (7 fields), DELETE
- saved-analyses/route.test.ts — POST/PATCH/DELETE validation, auth
- analysis/route.test.ts — POST validation, 429 limit handling, game-not-found, auth
- ev/route.test.ts — response shape (opportunities, arbs, meta), serialization, auth
- signals/route.test.ts — response shape, strength counting, auth
- odds/route.test.ts — sport filtering/validation, all-sports response, auth
- cron/resolve.test.ts — CRON_SECRET bearer token auth, empty state
- digest/route.test.ts — GET preview, POST send flow, auth
- leaderboard/route.test.ts — sort param validation, error handling (public route)
- backtesting/route.test.ts — POST validation (5 fields: sport, season, strategy, unit, bankroll)
- stats/route.test.ts — type validation, unsupported sport, date param, auth
- analytics/route.test.ts — user analytics passthrough, auth

**Strategy:** Mock `@/lib/supabase/server` at module level, test validation logic
and response shapes. Shared mock helpers in `src/app/api/__tests__/mock-supabase.ts`.

- analysis/injury/route.test.ts — POST validation (4 fields), 429, auth
- analysis/parlay/route.test.ts — legs validation (min 2, max 10, per-leg), 429, auth
- analysis/prop/route.test.ts — POST validation (8 required fields), 429, auth
- odds/history/route.test.ts — gameId validation, market param, auth
- health/route.test.ts — env var detection, response shape, secret safety
- signals/history/route.test.ts — GET param validation, PATCH, limit clamping, auth

### Remaining API Route Gaps (3 routes)
- /api/picks/resolve (POST/GET) — complex: Supabase + balldontlie + batch resolve
- /api/stripe/checkout (POST) — requires Stripe SDK mock
- /api/stripe/webhook (POST) — requires Stripe webhook signature mock

### src/components/ — UI (minimal)
- game-card.test.tsx — game card rendering
- Most components are untested (44 of 45)

## Test Patterns
- Pure logic: import + assert (no mocking)
- API routes: vi.mock Supabase server module, test validation/auth/response shape
- Type compliance: construct valid objects, assert shape matches interfaces
