---
name: test-writer
description: "Write test suites for BetBrain. Use when creating tests for API routes, components, or utility functions."
---

# Test Writer Skill — BetBrain

## Stack
- **Test runner:** Vitest (preferred) or Jest
- **Component testing:** @testing-library/react
- **HTTP mocking:** msw (Mock Service Worker) for API mocks
- **Setup:** `vitest.config.ts` at project root

## Test File Conventions
- Co-locate with source: `src/lib/sports/odds.test.ts`
- Or in `__tests__/` directory: `src/__tests__/odds-wrapper.test.ts`
- Name pattern: `*.test.ts` or `*.test.tsx`

## What to Test

### API Wrappers (Priority 1)
- **Odds wrapper** (`src/lib/sports/odds.ts`): Cache hit returns cached data, cache miss calls API and writes cache, stale fallback on API error, rate limit tracking
- **Stats wrapper** (`src/lib/sports/stats.ts`): Same pattern — cache-first, fallback, unsupported sport handling

### AI Analysis (Priority 2)
- **Analysis** (`src/lib/ai/analysis.ts`): Structured output matches schema, disclaimer is always present, free tier limit enforced
- **Injury impact** (`src/lib/ai/injury-impact.ts`): Same structure validation

### Auth Flow (Priority 3)
- Server actions return correct redirect on success/failure
- Middleware redirects unauthenticated users from `/dashboard/*`
- Auth callback handles code exchange

### Stripe (Priority 4)
- Webhook signature verification
- Subscription state updates on checkout.session.completed
- Free tier limits enforced when `subscription_tier = 'free'`

## Testing Patterns

### Mock Supabase
```typescript
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({ data: [], error: null })
        })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }) }
  })
}));
```

### Mock External APIs
```typescript
vi.mock('global', () => ({
  fetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockOddsResponse)
  })
}));
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
});
```

## Setup Command
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom msw
```
