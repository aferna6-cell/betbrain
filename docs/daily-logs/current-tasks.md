# Current Tasks — 2026-03-19

## Session Summary — 131 Cycles

### Total Output
- 139 commits (uncommitted: auto-resolve, tooltips, tests, refactor), 1048 unit tests, 15 E2E tests
- Build: PASS | Lint: 0 errors | TypeScript: 0 errors
- Health check: all PASS (migration drift = pre-deploy expected)
- All Phase 1 features complete (MVP + Growth + Premium + Polish + Auto-resolve)

### This Session (Cycles 129-131)
- **Auto-resolve picks (NBA)** — pure-function resolver + API route + UI button + 44 tests
- **Game card tooltips** — moneyline/win probability tooltips wired
- **EV scanner API tests** — 6 response shape tests
- **Architecture docs** — 3 new decisions (+EV, arb, auto-resolve)
- **computeProfit deduplication** — single source in auto-resolve.ts

### Test Growth
| Checkpoint | Tests |
|-----------|-------|
| Cycle 65 (deploy readiness) | 862 |
| Cycle 120 (final polish) | 920 |
| Cycle 128 (last session) | 998 |
| Current (2026-03-19) | 1048 |

## Open Work
- [ ] Onboarding checklist rewrite — beginner-friendly descriptions
- [ ] Resend email integration (post-launch)
- [ ] Additional sports data sources (post-launch)
- [ ] Supabase type generation (post-launch)

## External Tasks for User (docs/DEPLOY-CHECKLIST.md)
1. Apply Supabase migrations 001-007
2. Configure Supabase Auth redirect URLs
3. Set 10+ Vercel environment variables
4. Create Stripe product + webhook
5. Configure domain DNS
6. Run post-deploy verification
7. (Optional) Enable pg_cron for odds cleanup
8. (Optional) Set up Resend for email notifications

## Next Priorities
1. **Deploy** — execute DEPLOY-CHECKLIST.md
2. **Onboarding checklist rewrite** — last beginner UX gap
3. **Resend email integration** — wire digest + alert emails
