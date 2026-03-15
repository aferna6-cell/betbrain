---
name: deploy
description: "Vercel deployment workflow for BetBrain. Use when deploying, checking deployments, or debugging deploy issues."
---

# Deploy Skill — BetBrain

## Pre-deploy Checklist
1. Run `npm run build` — must pass with zero errors
2. Run `npm run lint` — must pass
3. Run `npm run typecheck` — must pass
4. Verify no hardcoded secrets: `grep -r "sk_live\|sb-\|eyJ" src/`
5. Verify `.env.local` is in `.gitignore`
6. Check all migrations are applied to production Supabase

## Required Environment Variables (Vercel)
Set these in Vercel project settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
ODDS_API_KEY=<your-odds-api-key>
BALLDONTLIE_API_KEY=<your-balldontlie-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
STRIPE_PRO_PRICE_ID=<your-price-id>
NEXT_PUBLIC_APP_URL=<your-production-url>
```

## Deploy Commands
```bash
# Deploy via Vercel CLI
vercel --prod

# Or push to main branch (if Vercel GitHub integration is connected)
git push origin master
```

## Post-deploy Verification
1. Check build logs: `vercel logs --prod`
2. Visit landing page — loads correctly
3. Visit `/login` — auth form renders
4. Visit `/dashboard` — redirects to login if not authenticated
5. Check API route: `/api/odds?sport=basketball_nba`
6. Verify Stripe webhook endpoint is configured in Stripe dashboard

## Troubleshooting
- **Build fails on Vercel but passes locally:** Check Node.js version matches (>=18). Check env vars are set.
- **API routes return 500:** Check env vars are set in Vercel dashboard. Check Supabase project is accessible.
- **Stripe webhook fails:** Update webhook URL in Stripe dashboard to production URL. Re-sign the webhook secret.
- **Auth callback fails:** Update Supabase Auth redirect URL to production domain.
