# BetBrain — Local Development Setup

## Prerequisites

- Node.js 22+
- npm 10+
- A Supabase project (free tier works)
- API keys for: The Odds API, balldontlie, Anthropic Claude, Stripe (test mode)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd betbrain
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your actual keys (see below)

# 3. Apply database migrations
# Option A: Supabase CLI
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# Option B: SQL Editor
# Open supabase/migrations/*.sql files and run them in order (001-007)
# in your Supabase Dashboard > SQL Editor

# 4. Start dev server
npm run dev
# Open http://localhost:3000
```

## Environment Variables

Create `.env.local` from `.env.example`:

| Variable | Required | Where to get it |
|----------|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase > Settings > API |
| `NEXT_PUBLIC_SITE_URL` | No | Defaults to `http://localhost:3000` |
| `ODDS_API_KEY` | Yes | the-odds-api.com |
| `BALLDONTLIE_API_KEY` | Yes | balldontlie.io |
| `ANTHROPIC_API_KEY` | Yes | console.anthropic.com |
| `STRIPE_SECRET_KEY` | Yes | Stripe Dashboard (use test key for dev) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe Dashboard > Webhooks |
| `STRIPE_PRO_PRICE_ID` | Yes | Stripe Dashboard > Products > Pro > Price ID |

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript check
npm run test         # Run unit tests (909 tests)
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright E2E (needs browser deps)
npm run health-check # Run health check suite
```

## Database Migrations

7 migration files in `supabase/migrations/`, applied in order:

1. **001** — Core schema (profiles, game_cache, odds_cache, etc.)
2. **002** — API usage tracking fix
3. **003** — Odds history table
4. **004** — Alerts table
5. **005** — CLV tracking (closing_odds column)
6. **006** — Expand alert markets to spreads + totals
7. **007** — Odds history retention function

## Project Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components
├── lib/
│   ├── ai/        # Claude API analysis
│   ├── api/       # Shared API route helpers
│   ├── hooks/     # Custom React hooks
│   ├── sports/    # Odds API + stats wrappers
│   ├── supabase/  # Supabase clients + types
│   ├── clv.ts     # CLV calculations
│   ├── bankroll.ts # Bankroll management
│   ├── format.ts  # Display formatters
│   ├── odds.ts    # Odds conversion utilities
│   └── sanitize.ts # Input sanitization
├── middleware.ts   # Auth middleware
e2e/               # Playwright E2E tests
supabase/          # Database migrations
docs/              # Documentation
```
