# Current Tasks — 2026-03-15

## Completed This Session (Cycles 65-70)

### Deployment Readiness (Cycle 65)
- [x] Deployment dry-run — build passes, 53 routes clean, metadataBase fixed
- [x] E2E smoke tests — 15 Playwright tests (landing, auth, dashboard, SEO, 404)
- [x] Performance audit — bundle analysis, no issues found
- [x] Rate limit hardening — 6 new cache-first prevention tests
- [x] Architecture decisions updated — 3 new entries

### Claude Code Optimizations (Cycle 66)
- [x] CLAUDE.md refreshed — accurate project state, commands, directories, skills
- [x] .gitignore updated — Playwright artifacts
- [x] loop-prompt safety fixes — removed auto-push, fixed `git add .`
- [x] deploy-check updated — Vercel-specific checks
- [x] test-writer skill refreshed — matches actual Vitest setup
- [x] Memory files created — project_status, project_deploy_blockers, user_profile

### Customer Simulation (Cycle 67)
- [x] Sharp NBA bettor walkthrough — 14-page analysis of every dashboard feature
- [x] Identified 10 critical gaps and 10 missing features
- [x] Documented in docs/dev-knowledge/simulation-sharp-nba-bettor.md

### New Features (Cycles 68-69)
- [x] CLV tracker — closing line value tracking for picks (migration 003, lib, API, UI)
- [x] Bankroll management — balance tracking, drawdown, Kelly criterion, history table

### Polish (Cycle 70)
- [x] Empty states — leaderboard, backtesting, parlay, props all have initial guidance
- [x] API docs expanded — 6 endpoints documented (added picks/CLV + odds history)

## Stats
- 894 tests passing across 26 test files + 15 E2E smoke tests
- Build: PASS | Lint: PASS | TypeScript: PASS
- 70 development cycles completed
- 55 routes (added bankroll page)

## Remaining Deploy Blockers
1. Migration 002 + 003 need to be applied in production Supabase
2. Vercel env vars need to be configured (10 vars)
3. Stripe webhook URL needs production domain
4. Supabase Auth redirect URL needs production domain
