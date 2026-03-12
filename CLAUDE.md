# BetBrain

AI-powered sports analytics dashboard. Surfaces data-driven insights across NBA, NFL, MLB, NHL to help bettors find value. NOT a sportsbook — analytics and insights only.

## Stack

- **Framework:** Next.js 14 (App Router) — frontend + API routes in one
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** Anthropic Claude API for game analysis
- **Sports Data:** The Odds API (odds/lines) + balldontlie API (stats/scores)
- **Payments:** Stripe subscriptions
- **Hosting:** Vercel

## Key Directories

- `src/app/` — Pages and layouts (App Router)
- `src/app/api/` — API route handlers
- `src/components/` — React components
- `src/lib/sports/` — Sports API wrappers (odds, stats)
- `src/lib/ai/` — Claude API integration
- `src/lib/supabase/` — Supabase client + helpers
- `src/lib/stripe/` — Stripe integration

## Commands

```bash
npm run dev       # Local dev server
npm run build     # Production build
npm run lint      # Lint check
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
