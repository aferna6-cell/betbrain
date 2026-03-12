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

---

_Add new decisions below._
