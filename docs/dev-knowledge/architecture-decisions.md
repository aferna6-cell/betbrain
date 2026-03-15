# Architecture Decisions — BetBrain

---

### Next.js monolith (no separate backend)
**Decision:** Use Next.js API routes for the backend, not a separate FastAPI/Express server.
**Why:** One codebase, one deploy, one Vercel project. Simpler infrastructure for a solo/small team. Can always extract a backend later if needed.

### Supabase for auth + data
**Decision:** Supabase handles authentication and database.
**Why:** Auth is built-in (no custom JWT system). PostgreSQL is powerful. Row Level Security for data isolation. Free tier is generous.

### Cache-first data strategy
**Decision:** All sports API data is cached in Supabase. Check cache before every API call.
**Why:** The Odds API free tier is 500 requests/month. That's ~16/day. We MUST cache aggressively. Even on paid tiers, caching reduces latency and cost.

### Analytics only — never handle bets or money
**Decision:** BetBrain provides data and analysis. It never takes bets, holds funds, or facilitates gambling transactions.
**Why:** Sports betting is heavily regulated (state-by-state in the US). Providing analytics/information is legal everywhere. Taking bets requires gaming licenses.

### Dark theme dashboard
**Decision:** Dark theme throughout.
**Why:** Sports analytics users often check at night. Dark theme reduces eye strain. Also looks more "pro" for a data-heavy product.

### Structured AI output
**Decision:** All Claude API analysis returns defined JSON structures, never freeform text.
**Why:** Consistent UI rendering. Easier to cache and compare. Enables features like Smart Signals (multiple analyses agreeing).

### Disclaimer on every insight
**Decision:** Every AI-generated analysis includes "For informational purposes only. Not financial advice."
**Why:** Legal protection. Gambling advice regulations vary by state. The disclaimer must be mandatory and non-removable.

### Row Level Security (RLS) strategy
**Decision:** Three access patterns: (1) user reads/writes own rows (profiles, saved_analyses, user_picks), (2) authenticated users read cached data, service role writes it (game_cache, odds_cache, ai_insights), (3) hybrid for api_usage (user reads own, service role writes).
**Why:** Cached data is shared — any user should see the same odds. User data is private. API routes run with the service role key to write cache data, while the browser client uses the anon key and RLS handles isolation.

### Supabase SSR client pattern
**Decision:** Three client types: (1) browser client via `createBrowserClient`, (2) server client via `createServerClient` with cookie adapter for Server Components/Route Handlers, (3) service client via `createClient` with service role key for admin operations.
**Why:** Next.js App Router needs different client initialization depending on context. The cookie adapter ensures auth sessions are refreshed on every server request via middleware. The service client bypasses RLS for cache writes.

### TypeScript-first database types
**Decision:** Hand-written `Database` interface in `src/lib/supabase/types.ts` matching the SQL schema exactly. Row/Insert/Update variants per table.
**Why:** Type-safe queries prevent column name typos and wrong types at compile time. The types mirror the SQL — when the schema changes, the types file is the single place to update. Future option: auto-generate from Supabase CLI.

### Auth flow: server actions + middleware route protection
**Decision:** Auth operations (login, signup, password reset) use Next.js server actions. Route protection uses Supabase middleware that checks `getUser()` and redirects unauthenticated users from `/dashboard/*` to `/login`. Auth pages redirect logged-in users to `/dashboard`.
**Why:** Server actions provide seamless form handling with progressive enhancement. Middleware-based protection is more reliable than per-page checks — every request is guarded. Route groups `(auth)` and `(dashboard)` keep layouts separate.

### Supabase Database type workaround
**Decision:** Explicit `as Profile | null` casts on `.from('profiles').select('*').single()` results instead of relying on inferred types.
**Why:** supabase-js v2.99+ with `@supabase/ssr` v0.5 has a type resolution issue where the `Database` generic doesn't flow through to `from()` query results (resolves to `never`). The `Relationships` field on `GenericTable` changed in newer versions. Explicit casts maintain type safety until upstream is fixed or types are auto-generated.

### Dark/light theme: `ThemeProvider` context, `localStorage` persistence
**Decision:** A `ThemeProvider` client component manages a `betbrain-theme` key in `localStorage` and toggles the `dark` class on `<html>` via `useEffect`. The root layout keeps `className="dark"` as the SSR default to avoid a flash-of-light-theme before hydration. The `ThemeToggle` button (dark → light → system cycle) lives in `DashboardNav` only — public pages (landing, blog) remain dark-only.
**Why:** Users increasingly expect theme control. The implementation avoids any external package (next-themes) and is self-contained. The SSR default of `dark` preserves existing behavior for first-load and for users who haven't set a preference.

### Sports API wrappers: cache-first with fallback to stale data
**Decision:** Both The Odds API and balldontlie wrappers follow: check fresh cache -> call API on miss -> write cache -> fallback to stale cache on API error. Each returns an envelope (`OddsResult` / `StatsResult<T>`) with `fromCache`, `warning`, and usage metadata.
**Why:** The Odds API free tier is 500 requests/month. Cache-first prevents waste. Stale data fallback means the dashboard never shows empty when the API is down. Usage tracking in `api_usage` enables the dashboard to show remaining quota and hard-stop before hitting limits.

### Odds API: system-level usage tracking (null user_id)
**Decision:** Track shared external API usage with `user_id = null` in `api_usage`, backed by a partial unique index on `(api_name, month)` for null-scoped rows.
**Why:** The Odds API and balldontlie keys are shared across all users, so one durable system counter per API/month is more accurate than fake sentinel users or duplicated null rows.

### balldontlie: NBA only, graceful non-NBA handling
**Decision:** `isSupportedSport()` guard + `UNSUPPORTED_SPORT_NOTE` constant. Non-NBA requests return empty results with an informational note.
**Why:** balldontlie v1 only covers NBA. Rather than error on NFL/MLB/NHL, we return a helpful note. Future: add additional API sources for other sports.

### Dashboard data flow: server-fetch, client-filter
**Decision:** The dashboard page is a server component that calls `getAllOdds()` directly (no HTTP round-trip). It serializes all games by sport into a plain object and passes it to a client `GamesDashboard` component that handles league filtering and rendering.
**Why:** Server components can call data functions directly — no need to route through `/api/odds`. This avoids an HTTP request, keeps auth simple (layout already guards the route), and reduces latency. The client component receives pre-fetched data and only manages UI state (active league filter). Game cards are leaf components that receive a single `NormalizedGame` prop.

### AI analysis: POST route with free-tier gating
**Decision:** AI analysis is behind `POST /api/analysis` (takes `gameId` + `sport`). The route looks up the game from odds data, checks the user's daily analysis count, calls Claude, caches the result in `ai_insights`, and increments the counter. Free tier gets 3/day; Pro gets unlimited. A GET endpoint returns the current limit status.
**Why:** POST avoids accidental re-analysis from browser reloads. Free-tier gating prevents runaway Claude API costs before Stripe is wired up. Caching in `ai_insights` means the same game isn't re-analyzed for 6 hours (odds don't change that fast). The structured JSON response format (summary, key factors, value assessment, risk level, confidence) maps directly to the `ai_insights` schema.

### Game detail page: cache-only lookup, no live API calls
**Decision:** `/dashboard/games/[gameId]` loads game data from `odds_cache` only (via `getGameById`). If the game has never been cached, it 404s. No live Odds API calls are triggered from the detail page.
**Why:** Every live API call costs against the 500/month quota. Games on the dashboard are already cached from `getAllOdds()`. If a user navigates to a detail page, the data is already in cache. Serving even expired cache (with a stale notice) is better than burning API calls. The `isFresh` flag tells the UI whether the data is within TTL.

### Game detail page: tabbed odds + analysis layout
**Decision:** The game detail page uses a two-tab layout: Odds (full bookmaker comparison table) and AI Analysis (inline analysis panel). Stats/H2H/Injuries tabs are deferred to future cycles when team-matching and additional data sources are available.
**Why:** Odds comparison across all bookmakers is the core value prop of the detail page and only requires data already available in `NormalizedGame`. AI analysis reuses the existing `/api/analysis` POST endpoint. Stats require matching The Odds API team names to balldontlie team IDs, which is nontrivial and should be its own feature.

### Landing page: self-contained, no shadcn dependencies
**Decision:** The landing page uses raw Tailwind CSS only. No shadcn/ui components, no images, no external dependencies.
**Why:** The landing page is a marketing page that should load as fast as possible. shadcn components pull in Base UI React which adds JS bundle size. The landing page is static content — no interactivity needed. Also allows the page to be redesigned independently of the dashboard UI system.

### API error responses: no internal details to client
**Decision:** 500 error responses return only a generic message. Internal error details are logged server-side only.
**Why:** Leaking error.message to clients exposes database structure, API key patterns, and internal service names. OWASP top 10 violation. The `details` field was removed from `routeErrorResponse`.

### Stripe: hosted Checkout, not custom forms
**Decision:** Use Stripe Checkout (hosted page) for subscription creation, not embedded forms or Stripe Elements.
**Why:** PCI compliance is handled by Stripe. No card data touches our servers. Faster to implement. Stripe handles SCA, 3D Secure, tax, and receipt emails. The trade-off (less UI control) is acceptable for MVP.

### Stripe: webhook-driven subscription state
**Decision:** Profile `subscription_tier` is updated only via Stripe webhooks, never directly by the client. Checkout creates a session; when Stripe confirms payment, the webhook flips the user from `free` to `pro`.
**Why:** Webhook is the single source of truth. Client-side "I paid" signals can be faked. If a webhook fails, Stripe retries. The `stripe_customer_id` and `stripe_subscription_id` columns on `profiles` enable lookup in both directions (Supabase → Stripe, Stripe → Supabase).

### Smart Signals: cache-only detection, no extra API calls
**Decision:** Smart Signals detects value by analyzing existing cached odds data (bookmaker variance) and cached AI insights (confidence, value assessment). It does NOT trigger new API calls or new AI analyses.
**Why:** The Odds API is rate-limited (500 req/month free tier). Signals runs on every page load — hitting APIs per-visit would burn quota instantly. Instead, signals are only as fresh as the cached data, which is acceptable. Users can trigger AI analysis manually from game detail if they want a fresh insight.

### Smart Signals: server-side detection, client-side display
**Decision:** Signal detection runs server-side in the page component (RSC), passing results to a client component for rendering. The API route exists for programmatic access (future: alerts, email digest).
**Why:** Server-side detection can query Supabase directly without CORS/auth overhead. The API route uses `withAuthenticatedRoute` for consistency with other endpoints. Both share the same `detectSmartSignals()` function.

---

### Line movement: separate odds_history table, not modifying odds_cache
**Decision:** Created a new `odds_history` append-only table instead of changing the `odds_cache` upsert strategy. Both are written to on each fetch: cache gets upserted (latest), history gets inserted (append).
**Why:** Changing odds_cache to allow multiple rows would break all existing cache-read logic (hydration, TTL checks, game lookup). A separate table isolates history concerns. If history grows too large, we can truncate it without affecting the cache.

### Custom alerts: in-app first, email later
**Decision:** Phase 1 of alerts is in-app only — users create alert rules and check the Alerts page for triggered alerts. No email notifications yet. Email (via Resend) is deferred to Phase 2.
**Why:** Adding a transactional email service (Resend) introduces a new dependency, DNS verification, and deliverability concerns. In-app alerts deliver immediate value with zero new infrastructure. The architecture supports email easily — `checkAlerts()` already returns triggered count and could dispatch emails in the same loop.

### Alerts: non-blocking check after odds fetch
**Decision:** `checkAlerts(games)` is called fire-and-forget (no `await`, with `.catch()`) inside `getOddsForSport()` after writing to cache.
**Why:** Alert checking is a side effect — it must never slow down or break the primary odds pipeline. If alert checking fails (DB error, edge case), odds still return normally. The `.catch()` handler logs the error without crashing the request.

### Alerts: moneyline-only for now
**Decision:** Alert rules are constrained to moneyline market via SQL CHECK constraint.
**Why:** Moneyline is the simplest odds format to compare against a threshold. Spread and total alerts would need additional logic (comparing point values, not just odds). The `market` column allows future expansion without migration.

### Daily digest: in-app preview first, email deferred
**Decision:** The daily digest generates content from cached data (games, signals, line moves) and displays it on a `/dashboard/digest` page. A `sendDigestEmail()` function exists but logs to console instead of sending. Resend integration is a future phase.
**Why:** Adding Resend requires a new dependency, API key, DNS verification, and deliverability setup. The digest content generator and preview page deliver immediate value. The email sender abstraction is already in place — swapping in Resend is a one-line change when ready.

### Daily digest: no new API calls
**Decision:** `generateDigest()` calls `getAllOdds()` and `detectSmartSignals()` which both read from cache. No new external API calls are made.
**Why:** The digest may be generated on page load for any user. Burning Odds API quota per-pageview would be catastrophic for the 500/month budget.

### Prop analyzer: no caching, shared analysis limit
**Decision:** Prop analyses are not cached (each is unique — different player/line combos). They share the free-tier daily analysis limit with game analysis and injury impact.
**Why:** Props are player+matchup+line specific — the cache key space is too large to be useful. Sharing the analysis limit keeps Claude API costs predictable and incentivizes Pro upgrades.

### Deployment: metadataBase for OG images
**Decision:** Set `metadataBase` in root layout using `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → `localhost:3000` fallback chain.
**Why:** Without `metadataBase`, Next.js resolves OG image URLs against `localhost:3000` in production builds, breaking social sharing previews. The fallback chain ensures correct resolution in Vercel (auto-sets `VERCEL_URL`), custom domains (`NEXT_PUBLIC_SITE_URL`), and local dev.

### E2E testing: Playwright smoke tests
**Decision:** Added Playwright for E2E smoke tests covering landing page, auth pages, dashboard access control, static pages, SEO meta, and 404 handling. Separate from Vitest unit tests.
**Why:** Unit tests validate logic; E2E tests validate the assembled app works end-to-end. Smoke tests catch regressions that unit tests miss (broken routes, middleware issues, missing pages). Lightweight — 15 tests that run in under 30 seconds.

### Rate limit budget: 4 calls per refresh cycle
**Decision:** With 500 monthly calls and 4 sports, each 5-minute refresh cycle uses at most 4 API calls. This allows ~10+ hours of continuous fresh data per month.
**Why:** Sequential sport fetching in `getAllOdds()` and aggressive caching ensure the budget is predictable. The cache-first pattern means repeated requests within the 5-minute TTL cost zero API calls.

_Add new decisions below._
