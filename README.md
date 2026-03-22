# BetBrain

AI-powered sports analytics dashboard. Find value in betting lines across NBA, NFL, MLB, and NHL with data-driven insights, CLV tracking, and bankroll management.

**Not a sportsbook.** Analytics and insights only.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** Anthropic Claude API
- **Sports Data:** The Odds API + balldontlie
- **Payments:** Stripe
- **Testing:** Vitest (1127 unit tests) + Playwright (24 E2E)
- **Hosting:** Vercel

## Features

- Odds comparison across 20+ bookmakers with implied probability (American/Decimal toggle)
- AI-powered game analysis (structured output, not gut feelings)
- Closing Line Value (CLV) tracking per pick
- Bankroll management with Kelly Criterion guidance
- Smart Signals (multi-factor consensus detection)
- Line movement alerts on moneyline, spread, and totals
- Pick tracker with ROI, CLV, and profit tracking
- Parlay EV calculator with correlation warnings
- Player prop analyzer
- Historical backtesting
- Public leaderboard
- Guided onboarding for new users
- +EV scanner + arbitrage detection
- Auto-resolve NBA picks from final scores
- Betting glossary (20 terms) + Betting 101 guide
- Privacy policy + Terms of service
- Changelog with feature timeline
- Dark theme throughout

## Quick Start

```bash
npm install
cp .env.example .env.local   # Fill in your API keys
npm run dev                   # http://localhost:3000
```

See [docs/SETUP.md](docs/SETUP.md) for full setup instructions.

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run test         # Unit tests (1127)
npm run test:e2e     # E2E tests (24)
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run health-check # Health check suite
```

## Deployment

See [docs/DEPLOY-CHECKLIST.md](docs/DEPLOY-CHECKLIST.md) for the complete deployment guide covering Supabase migrations, Vercel env vars, Stripe setup, and post-deploy verification.

## License

Private.
