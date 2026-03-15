# Current Tasks — 2026-03-15

## Session Summary — 110 Cycles (65-110)

### Features Built
- CLV tracker (closing line value per pick + aggregate stats)
- Bankroll management dashboard (balance, drawdown, Kelly criterion)
- Guided onboarding checklist for first-time users
- Spread + total alerts (was moneyline-only)
- Betting glossary page (15 terms)
- Dedicated watchlist page
- Pick deletion + outcome setting
- Digest enhanced with weekly pick stats

### UX Improvements
- Implied probability on game cards + game detail odds tables
- "Fetched Xm ago" timestamps instead of "may be outdated"
- Bookmaker odds disagreement indicator on game cards
- Nav notification badges (triggered alerts, pending picks)
- Keyboard shortcuts (vim-style g+key navigation)
- Odds converter link on game detail
- Loading skeletons for all pages
- Per-page error boundaries
- Empty states for all data-empty pages

### Code Quality
- Input sanitization (displayName, notes — trim, length, control chars)
- Shared color utilities (profitColor, winRateColor, MAGNITUDE_COLORS)
- Server component conversions (smart-signals, h2h-history)
- useFetch hook for standardized data fetching
- odds_history 30-day retention function
- Sitemap fixed (proper dates, removed login)
- CSP security header added
- SEO metadata on all public pages
- 909 unit tests + 15 E2E smoke tests

### Infrastructure
- GitHub Actions CI (lint, typecheck, test, build)
- DEPLOY-CHECKLIST.md (comprehensive external task list)
- SETUP.md (local development guide)
- Migration files renamed to sequential 001-007
- Landing page rewritten for sharp-bettor audience

## Stats
- 909 unit tests, 15 E2E tests, 56 routes
- 119 total commits, 0 lint errors, 0 type errors
- Build: PASS | Lint: PASS | TypeScript: PASS

## External Tasks for User (see docs/DEPLOY-CHECKLIST.md)
1. Apply Supabase migrations 001-007
2. Configure Supabase Auth redirect URLs
3. Set 10 Vercel environment variables
4. Create Stripe product + webhook
5. Configure domain DNS
6. Run post-deploy verification
7. (Optional) Enable pg_cron for odds cleanup
8. (Optional) Set up Resend for email notifications
