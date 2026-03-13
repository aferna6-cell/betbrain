# Bug Patterns — BetBrain

_Bugs found and fixed. Read before debugging to avoid rediscovering known issues._

---

### Shared API usage tracking broke on nullable `user_id`
**Date:** 2026-03-12
**Symptom:** The Odds API and balldontlie usage counters could not reliably accumulate shared system usage. Null-keyed rows could duplicate, and the balldontlie sentinel UUID path would fail the `api_usage.user_id -> profiles.id` foreign key.
**Root Cause:** `api_usage` used one unique constraint on `(user_id, api_name, month)`, but PostgreSQL treats `NULL` values as distinct, so system rows never conflicted. The sentinel UUID workaround was not backed by a real profile row.
**Fix:** Added `supabase/migrations/002_fix_api_usage_system_tracking.sql` with separate partial unique indexes for user-scoped and system-scoped rows, updated `increment_api_usage()` to branch on `p_user_id is null`, and switched both sports wrappers to use `user_id = null` for shared keys.
**Files:** `supabase/migrations/002_fix_api_usage_system_tracking.sql`, `src/lib/sports/odds.ts`, `src/lib/sports/stats.ts`, `src/lib/supabase/types.ts`, `docs/dev-knowledge/architecture-decisions.md`, `docs/dev-knowledge/schema-log.md`
**Prevention:** When shared/system state and user-scoped state coexist, encode that distinction explicitly in schema constraints instead of relying on nullable columns or fake sentinel IDs.

### Environment names drifted between code and repo setup
**Date:** 2026-03-12
**Symptom:** The odds wrapper expected `THE_ODDS_API_KEY` while the repo env files used `ODDS_API_KEY`, and auth email redirects depended on `NEXT_PUBLIC_SITE_URL` even though `.env.example` did not document it.
**Root Cause:** Feature code read environment variables directly in multiple modules without a shared helper or a single authoritative env checklist.
**Fix:** Added `src/lib/env.ts` for canonical env access, supported `THE_ODDS_API_KEY` as a deprecated fallback, switched auth and Supabase callers to the helper, and documented `NEXT_PUBLIC_SITE_URL` in `.env.example`.
**Files:** `.env.example`, `src/lib/env.ts`, `src/app/(auth)/actions.ts`, `src/lib/sports/odds.ts`, `src/lib/sports/stats.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/lib/supabase/server.ts`
**Prevention:** Centralize env access behind helper functions, treat `.env.example` as the source of truth, and include env drift checks in the daily health routine.
