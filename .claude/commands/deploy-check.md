Pre-deploy validation for BetBrain. Runs health-check plus Vercel-specific checks.

1. Run `npm run health-check` — all checks must PASS
2. Read `docs/dev-knowledge/health-check-latest.md` for results
3. Verify no `force-dynamic` pages that should be static
4. Verify `metadataBase` is set in root layout
5. Check `.env.example` lists all required Vercel env vars (10 total):
   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY, ODDS_API_KEY, BALLDONTLIE_API_KEY
   - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID
   - NEXT_PUBLIC_APP_URL
6. Verify Supabase migrations are applied (no drift)
7. Run `npx vitest run` — all tests must pass
8. Run E2E tests if Playwright deps are available: `npx playwright test`

Print PASS/FAIL checklist. If anything fails, list the specific fix needed.
