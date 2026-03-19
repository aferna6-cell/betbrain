# Current Tasks — 2026-03-19

## Session Summary — 140 Cycles

### Total Output
- 147 commits, 1053 unit tests, 15 E2E tests, 58 routes
- Build: PASS | Lint: 0 errors | TypeScript: 0 errors
- Health check: all PASS (migration drift = pre-deploy expected)
- All Phase 1 features complete + auto-resolve + PWA icons + cron

### This Session (Cycles 129-140)
- **Auto-resolve picks (NBA)** — pure-function resolver + API route + UI button + 49 tests
- **Auto-resolve signals** — resolves signal_history outcomes alongside picks
- **Cron auto-resolve** — /api/cron/resolve for daily Vercel cron + vercel.json
- **Game card tooltips** — moneyline/win probability TermTooltips
- **Onboarding checklist rewrite** — beginner-friendly descriptions + Betting 101 link
- **PWA icons** — dynamic icon generation (192, 512, Apple)
- **EV scanner API tests** — 6 response shape tests
- **computeProfit deduplication** — single source in auto-resolve.ts
- **Deploy checklist updates** — migration 008, CRON_SECRET, cron section
- **Sitemap fix** — added Betting 101 page
- **Architecture docs** — 3 new decisions

### Test Growth
| Checkpoint | Tests |
|-----------|-------|
| Cycle 65 (deploy readiness) | 862 |
| Cycle 120 (final polish) | 920 |
| Cycle 128 (last session) | 998 |
| Current (2026-03-19) | 1053 |

## Open Work
- [ ] Resend email integration (post-launch)
- [ ] Additional sports data sources (post-launch)
- [ ] Supabase type generation (post-launch)
- [ ] Mobile app / PWA improvements (post-launch)

## External Tasks for User (docs/DEPLOY-CHECKLIST.md)
1. Apply Supabase migrations 001-008
2. Configure Supabase Auth redirect URLs
3. Set 12 Vercel environment variables (including CRON_SECRET)
4. Create Stripe product + webhook
5. Configure domain DNS
6. Run post-deploy verification
