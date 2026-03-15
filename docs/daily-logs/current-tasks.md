# Current Tasks — 2026-03-14

## Completed This Session (Cycles 28-64)

### Improvements (Cycles 28-36)
- [x] Health check fixes — false positive secrets scanner, disclaimer detection _(Cycle 28)_
- [x] Mobile navigation — hamburger menu with slide-down panel _(Cycle 29)_
- [x] Error boundaries — class component + Next.js error.tsx _(Cycle 29)_
- [x] 404 pages — custom global + dashboard-scoped not-found _(Cycle 29)_
- [x] Global search — Cmd+K command palette with keyboard nav _(Cycle 30)_
- [x] Landing page footer — links to How It Works, Blog, Legal, FAQ _(Cycle 31)_
- [x] Saved analyses — bookmark AI analyses for later review _(Cycle 32)_
- [x] Dark/light theme toggle — user preference _(Cycle 32)_
- [x] Game watchlist — star/favorite games _(Cycle 33)_
- [x] Dashboard stats summary — total picks, win rate, ROI cards _(Cycle 33)_
- [x] Web Vitals monitoring — LCP/FID/CLS tracking _(Cycle 33)_
- [x] Accessibility audit — ARIA labels, focus management, screen reader support _(Cycle 34)_
- [x] Toast notifications — non-blocking feedback system _(Cycle 35)_
- [x] Odds conversion utility — American/decimal/fractional converter _(Cycle 35)_
- [x] Profile stats card — pick record on profile page _(Cycle 35)_
- [x] Odds converter page + FAQ page _(Cycle 36)_

### Code Quality (Cycles 37, 52-61)
- [x] Fix lint errors — 0 errors, 0 warnings (was 2 errors, 10 warnings)
- [x] Fix hardcoded secrets — false positive in env.test.ts
- [x] Fix `any` type usage — replaced with typed SupabaseClient helper
- [x] Remove unused imports/variables across 6 files
- [x] Extract `isSport` type guard to shared config (was duplicated in 3 routes)
- [x] Extract `formatOdds` to shared lib/odds.ts (was duplicated in 10 components)
- [x] Extract `SPORT_LABELS` to shared config (was duplicated in 6 components)
- [x] Extract `formatGameTime` to shared lib/format.ts (was duplicated in 3 components) _(Cycle 56)_
- [x] Extract `RISK_COLORS` to shared lib/format.ts (was duplicated in 3 components) _(Cycle 57)_
- [x] Extract date formatters to shared lib/format.ts (was duplicated in 4 components) _(Cycle 58)_
- [x] Extract `getBestMoneyline/Spread/Total` to shared lib/odds.ts (was duplicated in 3 components) _(Cycle 61)_

### Bug Fixes (Cycles 60, 62-63)
- [x] Fix API key leak in build logs — add force-dynamic to digest + signals pages _(Cycle 60)_
- [x] Add error handling to AlertsView — error state + toast on delete failure _(Cycle 62)_
- [x] Add error handling to PicksTracker — error state with retry _(Cycle 63)_

### Tests (Cycles 29-59)
- [x] Backtesting tests — 52 tests _(Cycle 29)_
- [x] Signals + digest tests — 95 tests _(Cycle 31)_
- [x] Leaderboard + onboarding tests — 94 tests _(Cycle 31)_
- [x] Env helper tests — 40 tests _(Cycle 31)_
- [x] Watchlist tests — 45 tests _(Cycle 34)_
- [x] Odds conversion tests — 82→94 tests _(Cycles 35, 55, 61)_
- [x] Parlay analyzer tests — 61 tests _(Cycle 38)_
- [x] Prop analyzer tests — 74 tests _(Cycle 38)_
- [x] Route handler tests — 14 tests _(Cycle 39)_
- [x] Sports config tests — 56 tests _(Cycles 40, 52, 55)_
- [x] Alert condition tests — 27 tests _(Cycle 41)_
- [x] Game card helper tests — 20 tests _(Cycle 46)_
- [x] Middleware routing tests — 26 tests _(Cycle 48)_
- [x] Pick stats calculation tests — 20 tests _(Cycle 49)_
- [x] Format module tests — 15 tests _(Cycle 59)_

### SEO & UX (Cycles 38-51)
- [x] robots.txt + sitemap.xml _(Cycle 38)_
- [x] Picks error logging fix _(Cycle 39)_
- [x] PWA manifest _(Cycle 40)_
- [x] Loading skeletons — billing, league, profile pages _(Cycle 42)_
- [x] JSON-LD structured data — landing page + FAQ + blog posts _(Cycles 43, 47)_
- [x] Profile page metadata fix _(Cycle 44)_
- [x] Auth layout with metadata + noindex _(Cycle 51)_

### Security (Cycle 45)
- [x] Security headers — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

## Stats
- 856 tests passing across 24 test files
- Build: PASS | Lint: PASS (0 errors, 0 warnings) | TypeScript: PASS
- 64 development cycles completed

## Backlog Status: COMPLETE
All original backlog items done. All improvements committed.
