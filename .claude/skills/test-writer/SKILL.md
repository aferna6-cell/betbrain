---
name: test-writer
description: "Write test suites for BetBrain. Use when creating tests for API routes, components, or utility functions."
---

# Test Writer Skill — BetBrain

## Stack
- **Unit tests:** Vitest (862 tests across 24 files)
- **E2E tests:** Playwright (15 smoke tests)
- **Config:** `vitest.config.ts` (unit), `playwright.config.ts` (E2E)

## Test File Conventions
- Place in `__tests__/` directory next to source: `src/lib/sports/__tests__/odds.test.ts`
- Name pattern: `*.test.ts` or `*.test.tsx`
- E2E tests in `e2e/` directory: `e2e/smoke.spec.ts`

## What to Test

### Data Layer (Priority 1)
- **Odds wrapper** (`src/lib/sports/odds.ts`): Cache hit returns cached data, cache miss calls API, stale fallback, rate limit tracking
- **Stats wrapper** (`src/lib/sports/stats.ts`): Cache-first, fallback, unsupported sport handling
- **Config constants** (`src/lib/sports/config.ts`): Sport keys, TTL values, limit thresholds

### AI Analysis (Priority 2)
- **Analysis** (`src/lib/ai/analysis.ts`): Structured output matches schema, disclaimer present, free tier limit
- **Injury/Prop/Parlay** analyzers: Same structure validation

### Shared Utilities (Priority 3)
- **Odds utilities** (`src/lib/odds.ts`): formatOdds, getBestMoneyline/Spread/Total
- **Format utilities** (`src/lib/format.ts`): formatGameTime, RISK_COLORS, date formatters
- **Odds converter** (`src/lib/odds-converter.ts`): American/decimal/fractional conversion

### Auth & Stripe (Priority 4)
- Server actions return correct redirect on success/failure
- Middleware redirects unauthenticated users
- Webhook signature verification, subscription state updates

## Testing Patterns

### Test pure logic, not Supabase/API calls
Most tests validate interfaces, constants, and business logic without mocking external services.

```typescript
import { describe, it, expect } from 'vitest'
import { ODDS_API_MONTHLY_LIMIT, SUPPORTED_SPORTS } from '@/lib/sports/config'

it('monthly limit is 500', () => {
  expect(ODDS_API_MONTHLY_LIMIT).toBe(500)
})
```

### Test AI Output Structure
```typescript
expect(result).toMatchObject({
  summary: expect.any(String),
  key_factors: expect.any(Array),
  value_assessment: expect.any(String),
  risk_level: expect.stringMatching(/^(low|medium|high)$/),
  confidence: expect.any(Number),
  disclaimer: expect.stringContaining('informational purposes'),
})
```

## Run Commands
```bash
npm run test         # All unit tests
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright E2E
npx vitest run src/lib/sports/__tests__/rate-limiting.test.ts  # Single file
```
