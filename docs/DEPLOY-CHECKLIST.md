# BetBrain — Deployment Checklist

Everything you need to do manually to go from dev to production.

---

## 1. Supabase Setup

### Apply Migrations (in order)
Run these in the **Supabase SQL Editor** (Dashboard > SQL Editor > New Query) or via CLI:

```bash
# If using Supabase CLI:
npx supabase db push
```

**Or manually run each file in order:**

| # | File | What it does |
|---|------|-------------|
| 1 | `001_initial_schema.sql` | Core tables: profiles, game_cache, odds_cache, ai_insights, saved_analyses, user_picks, api_usage |
| 2 | `002_fix_api_usage_system_tracking.sql` | Fix system-level API usage tracking (null user_id) |
| 3 | `003_odds_history.sql` | Append-only odds snapshots for line movement charts |
| 4 | `004_alerts.sql` | User alert rules for line movement |
| 5 | `005_add_closing_odds_to_picks.sql` | CLV tracking column on user_picks |
| 6 | `006_expand_alert_markets.sql` | Expand alerts to spreads + totals (was moneyline-only) |
| 7 | `007_odds_history_retention.sql` | Cleanup function for old odds history (30-day retention) |

### Configure Auth
- [ ] Go to **Supabase Dashboard > Authentication > URL Configuration**
- [ ] Set **Site URL** to your production domain (e.g. `https://betbrain.app`)
- [ ] Add redirect URLs: `https://betbrain.app/auth/callback`, `https://betbrain.app/reset-password`
- [ ] Enable **Email/Password** sign-in method (should be on by default)

### Enable pg_cron (Optional)
For automatic odds_history cleanup:
- [ ] Go to **Supabase Dashboard > Database > Extensions**
- [ ] Enable `pg_cron`
- [ ] Run this SQL:
```sql
SELECT cron.schedule(
  'cleanup-odds-history',
  '0 4 * * *',
  $$SELECT cleanup_old_odds_history()$$
);
```

---

## 2. Vercel Setup

### Environment Variables
Set these in **Vercel Dashboard > Project > Settings > Environment Variables**:

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API > service_role key |
| `ANTHROPIC_API_KEY` | console.anthropic.com > API Keys |
| `ODDS_API_KEY` | the-odds-api.com > Dashboard > API Key |
| `BALLDONTLIE_API_KEY` | balldontlie.io > Dashboard > API Key |
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Developers > Webhooks (after creating endpoint) |
| `STRIPE_PRO_PRICE_ID` | Stripe Dashboard > Products > Pro Plan > Price ID |
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g. `https://betbrain.app`) |

### Deploy
```bash
# Option A: Push to GitHub (auto-deploys if Vercel GitHub integration is connected)
git push origin master

# Option B: Vercel CLI
vercel --prod
```

---

## 3. Stripe Setup

- [ ] Create a product called "BetBrain Pro" in Stripe Dashboard > Products
- [ ] Create a monthly price ($29/mo) — copy the Price ID to `STRIPE_PRO_PRICE_ID`
- [ ] Create a webhook endpoint:
  - URL: `https://betbrain.app/api/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

---

## 4. Domain & DNS

- [ ] Purchase/configure domain (e.g. `betbrain.app`)
- [ ] Point DNS to Vercel (CNAME or nameservers)
- [ ] Verify domain in Vercel Dashboard
- [ ] Update `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` to production domain

---

## 5. Post-Deploy Verification

- [ ] Visit landing page — loads correctly
- [ ] Visit `/login` — auth form renders
- [ ] Sign up a test account — verify email flow
- [ ] Visit `/dashboard` — games load (may be empty without Odds API calls)
- [ ] Run an AI analysis — verify Anthropic API works
- [ ] Check `/api/odds?sport=basketball_nba` — verify Odds API works
- [ ] Test Stripe checkout — go through billing page upgrade flow
- [ ] Check Stripe webhook — verify subscription tier updates in Supabase

---

## 6. API Keys & Rate Limits

| Service | Free Tier Limit | Notes |
|---------|----------------|-------|
| The Odds API | 500 req/month | BetBrain caches aggressively (5-min TTL) |
| balldontlie | 30 req/min | NBA stats only |
| Anthropic Claude | Pay-per-use | ~$0.003/analysis at Haiku pricing |
| Stripe | No limit | Test mode available for development |
| Supabase | 500MB DB, 1GB storage | Free tier generous for MVP |

---

## 7. Optional: E2E Tests in CI

The Playwright E2E tests need browser dependencies:
```bash
# On CI (GitHub Actions), add this to your workflow:
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e

# Locally (needs sudo):
sudo npx playwright install-deps chromium
npm run test:e2e
```

---

## 8. Optional: Resend Email (Phase 2)

Daily digest and alert email notifications are ready in code but need Resend:
- [ ] Sign up at resend.com
- [ ] Verify your sending domain (DNS TXT records)
- [ ] Add `RESEND_API_KEY` to Vercel env vars
- [ ] Uncomment the Resend integration in `src/lib/digest.ts`
