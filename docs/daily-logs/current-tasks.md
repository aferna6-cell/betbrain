# Current Tasks — 2026-03-15

## Completed This Session (Cycles 65-75)

### Deployment Readiness (Cycle 65)
- [x] Deployment dry-run, E2E smoke tests, performance audit, rate limit hardening

### Claude Code Optimizations (Cycle 66)
- [x] CLAUDE.md refresh, .gitignore, loop-prompt safety, deploy-check, test-writer, memory files

### Customer Simulation (Cycle 67)
- [x] Sharp NBA bettor walkthrough — 10 critical gaps identified

### Sharp Bettor Features (Cycles 68-70)
- [x] CLV tracker — closing line value per pick + aggregate stats
- [x] Bankroll management — balance, drawdown, Kelly criterion, /dashboard/bankroll
- [x] Empty states polish, API docs expansion

### Quick Wins (Cycles 71-72)
- [x] Implied probability — shown next to moneyline odds in game detail
- [x] Cached odds timestamps — "Fetched 3m ago" instead of "may be outdated"

### Features (Cycles 73-74)
- [x] Spread + total alerts — expanded from moneyline-only (migration 005)
- [x] Guided onboarding — 4-step checklist for first-time dashboard users

### Tests + Docs (Cycle 75)
- [x] 11 new tests (formatImpliedProb, timeAgo)
- [x] Architecture decisions — 4 new entries (CLV, bankroll, onboarding, alerts)

## Stats
- 905 tests passing across 26 test files + 15 E2E smoke tests
- Build: PASS | Lint: PASS | TypeScript: PASS
- 75 development cycles completed
- 55 routes

## Remaining Deploy Blockers
1. Migrations 002-005 need to be applied in production Supabase
2. Vercel env vars need to be configured (10 vars)
3. Stripe webhook URL needs production domain
4. Supabase Auth redirect URL needs production domain
