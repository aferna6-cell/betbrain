# BetBrain

AI-powered sports analytics dashboard. Surfaces data-driven insights across NBA, NFL, MLB, NHL to help bettors find value. NOT a sportsbook — analytics and insights only.

## Stack

- **Framework:** Next.js 16 (App Router) — frontend + API routes in one
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** Anthropic Claude API for game analysis
- **Sports Data:** The Odds API (odds/lines) + balldontlie API (stats/scores)
- **Payments:** Stripe subscriptions
- **Hosting:** Vercel

## Key Directories

- `src/app/` — Pages and layouts (App Router)
- `src/app/api/` — API route handlers (analysis, odds, stats, picks, stripe)
- `src/components/` — React components
- `src/lib/api/` — Shared API route/auth/error helpers
- `src/lib/ai/` — Claude API analysis (structured output, caching)
- `src/lib/sports/` — Sports API wrappers (odds, stats, config)
- `src/lib/supabase/` — Supabase client + helpers
- `src/lib/stripe.ts` — Stripe client singleton
- `scripts/daily/` — Health-check and daily review automation
- `docs/dev-knowledge/` — Architecture decisions, schema log, bug patterns

## Commands

```bash
npm run dev       # Local dev server
npm run build     # Production build
npm run lint      # Lint check
npm run typecheck # TypeScript check
npm run health-check # Write docs/dev-knowledge/health-check-latest.md
npm run evening:auto # Run scripts/daily/evening-auto.sh
```

## Critical Rules

- NEVER hardcode API keys — use environment variables via .env.local
- NEVER handle real money or bets — analytics only
- ALWAYS cache sports API data in Supabase to stay within rate limits
- ALWAYS include disclaimer on AI insights: "For informational purposes only"
- The Odds API free tier: 500 requests/month — cache aggressively
- Every AI analysis must be structured: summary, key factors, value assessment, risk level
- Dark theme throughout the dashboard

## Database Tables

| Table | Purpose |
|-------|---------|
| profiles | User profile, subscription tier |
| game_cache | Cached game data from sports APIs |
| odds_cache | Cached odds from bookmakers |
| ai_insights | Generated AI analysis per game |
| saved_analyses | User's bookmarked analyses |
| user_picks | Personal pick tracking (record keeping, no real money) |
| api_usage | Track API call counts for rate limiting |
| odds_history | Append-only odds snapshots for line movement charts |
| alerts | User-defined line movement alert rules |

## Agents

- `data-engineer` — Sports API integration, caching, data pipelines
- `ai-analyst` — Claude-powered analysis features, prompt engineering
- `frontend-dev` — Next.js pages, components, charts, UI
- `qa-tester` — Build verification, API testing, edge cases

## Skills

- `sports-data` — API integration patterns, rate limiting, caching
- `ai-analysis` — Analysis prompt design, structured output, disclaimers
- `schema-guard` — Database schema verification before queries
- `feature-build` — Feature development workflow
- `team-orchestration` — Agent delegation patterns

## Memory

- `docs/dev-knowledge/bug-patterns.md`
- `docs/dev-knowledge/schema-log.md`
- `docs/dev-knowledge/architecture-decisions.md`
