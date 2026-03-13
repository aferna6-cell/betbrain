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

### Dark mode: static `className="dark"` on `<html>`
**Decision:** Hard-code `className="dark"` on the root `<html>` element.
**Why:** CLAUDE.md mandates "dark theme throughout the dashboard." No light mode toggle is planned for MVP. This avoids flash-of-light-theme and keeps it simple.

---

_Add new decisions below._
