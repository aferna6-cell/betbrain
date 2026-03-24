# BetBrain

AI-powered sports analytics dashboard. Surfaces data-driven insights across NBA, NFL, MLB, NHL to help bettors find value. NOT a sportsbook — analytics and insights only.

## Stack

- **Framework:** Next.js 16 (App Router) — frontend + API routes in one
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** Anthropic Claude API for game analysis
- **Sports Data:** The Odds API (odds/lines) + balldontlie API (stats/scores)
- **Payments:** None (personal tool — Stripe code is legacy, tier checks bypassed)
- **Testing:** Vitest (unit, 2609 tests) + Playwright (E2E, 24 smoke tests)
- **Hosting:** Vercel

## Key Directories

- `src/app/` — Pages and layouts (App Router, 62 routes)
- `src/app/api/` — API route handlers (analysis, odds, stats, picks, stripe, alerts, signals, digest, ev, cron, health)
- `src/components/` — React components (game cards, odds tables, charts, nav, etc.)
- `src/lib/api/` — Shared API route/auth/error helpers
- `src/lib/ai/` — Claude API analysis (structured output, caching)
- `src/lib/sports/` — Sports API wrappers (odds, stats, config)
- `src/lib/supabase/` — Supabase client + helpers
- `src/lib/odds.ts` — Shared odds utilities (formatOdds, getBestMoneyline/Spread/Total)
- `src/lib/format.ts` — Shared formatters (formatGameTime, RISK_COLORS, date formatters)
- `src/lib/env.ts` — Canonical env var access (all env reads go through here)
- `src/lib/auto-resolve.ts` — NBA pick auto-resolution (team matching, outcome determination)
- `src/lib/ev-scanner.ts` — +EV scanner + arbitrage detection
- `src/lib/line-shopping.ts` — Best line finder, juice comparison, key line discrepancies
- `src/lib/bet-calculator.ts` — Payout, hedge, parlay calculators + EV math
- `src/lib/value-finder.ts` — Composite value play scoring across all games
- `src/lib/performance-insights.ts` — Actionable feedback on betting patterns (6 dimensions)
- `src/lib/closing-line-capture.ts` — Automatic closing odds capture for CLV tracking
- `src/lib/risk-assessment.ts` — Pre-bet risk scoring (5-factor composite)
- `src/lib/line-movement-heatmap.ts` — Line activity analysis across markets
- `src/lib/bankroll-recovery.ts` — Drawdown recovery timeline calculator
- `src/lib/public-money.ts` — Public vs sharp money estimation from odds
- `src/lib/daily-review.ts` — End-of-day process grading and lesson capture
- `src/lib/book-performance.ts` — CLV and ROI per bookmaker
- `src/lib/profit-calendar.ts` — Monthly P/L calendar with heat levels
- `src/lib/api-usage-forecast.ts` — Odds API budget forecasting and exhaustion prediction
- `src/lib/kelly-override.ts` — Global and per-bet Kelly fraction preferences
- `src/lib/results-feed.ts` — Daily pick results timeline with outcome matching
- `src/lib/bet-sizing-optimizer.ts` — Performance-based unit sizing adjustment
- `src/lib/bet-grading.ts` — 6-factor bet process quality grading (A+ to F)
- `src/lib/quality-outcome-matrix.ts` — 2x2 process quality vs outcome matrix
- `src/lib/streak-probability.ts` — Streak continuation probability calculator
- `src/lib/pick-import.ts` — CSV pick import with flexible column mapping
- `src/lib/auto-grade.ts` — Auto-grade picks from metadata (CLV, timing, chase)
- `src/lib/weekly-process-grade.ts` — Weekly process grade trends with regression
- `src/lib/fade-tracker.ts` — Contrarian vs public-side performance tracking
- `src/lib/bankroll-milestones.ts` — Growth milestones and drawdown alerts
- `src/lib/odds-comparator.ts` — Side-by-side odds diff at two timestamps
- `src/lib/confidence-clv-scatter.ts` — Confidence vs CLV scatter analysis
- `src/lib/alert-templates.ts` — Save/reuse alert configurations
- `src/lib/multi-book-tracker.ts` — Track balances across multiple sportsbooks
- `src/lib/clv-distribution.ts` — Historical CLV distribution histogram
- `src/lib/ev-attribution.ts` — 6-factor EV edge attribution analysis
- `src/lib/kelly-simulator.ts` — Kelly fraction bankroll trajectory simulator
- `src/lib/seasonal-trends.ts` — Monthly, weekly, day-of-week performance trends
- `src/lib/drawdown-heatmap.ts` — Calendar view of bankroll drawdown depth
- `src/lib/smart-bankroll-alerts.ts` — Configurable bankroll health alerts
- `src/lib/pick-dependencies.ts` — Correlated picks detection and clustering
- `src/lib/stripe.ts` — Stripe client singleton (legacy, bypassed)
- `e2e/` — Playwright E2E smoke tests
- `scripts/` — Health-check, daily review, post-deploy verification
- `vercel.json` — Cron job config (daily auto-resolve at 10am ET)
- `docs/dev-knowledge/` — Architecture decisions, schema log, bug patterns

## Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run lint         # Lint check
npm run typecheck    # TypeScript check
npm run test         # Run Vitest unit tests (2609 tests)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Run Playwright E2E smoke tests
npm run health-check # Write docs/dev-knowledge/health-check-latest.md
npm run evening:auto # Run scripts/daily/evening-auto.sh
```

## Critical Rules

- NEVER hardcode API keys — use environment variables via `src/lib/env.ts`
- NEVER handle real money or bets — analytics only
- ALWAYS cache sports API data in Supabase to stay within rate limits
- ALWAYS include disclaimer on AI insights: "For informational purposes only"
- The Odds API free tier: 500 requests/month — cache aggressively
- Every AI analysis must be structured: summary, key factors, value assessment, risk level
- Dark theme throughout the dashboard
- This is a PERSONAL TOOL — no Stripe, no subscriptions, no pricing tiers, no multi-user features
- All features are unlimited (analysis limits bypassed)
- Stage specific files when committing (`git add <files>`) — never `git add .` or `git add -A`
- Do NOT auto-push — only push when explicitly asked

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
| signal_history | Persisted Smart Signals for hit rate tracking |

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
- `test-writer` — Unit test creation with Vitest
- `deploy` — Vercel deployment workflow and checklist
- `team-orchestration` — Agent delegation patterns

## Memory

- `docs/dev-knowledge/bug-patterns.md`
- `docs/dev-knowledge/schema-log.md`
- `docs/dev-knowledge/architecture-decisions.md`
