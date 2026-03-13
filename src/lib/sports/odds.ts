/**
 * The Odds API wrapper — fetches upcoming game odds for NBA, NFL, MLB, NHL.
 *
 * Strategy:
 *   1. Check odds_cache in Supabase; return immediately if all rows are fresh.
 *   2. If cache is stale or absent, call the external API.
 *   3. Persist the response to odds_cache and track the call in api_usage.
 *   4. At 80 % of the monthly limit, stop making live calls and serve cache
 *      with a staleness notice.
 */

import { getOddsApiKey } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/server'
import type { Sport } from '@/lib/supabase/types'
import type { Database } from '@/lib/supabase/types'
import {
  ODDS_API_SPORT_KEYS,
  SUPPORTED_SPORTS,
  CACHE_TTL_MS,
  ODDS_API_MONTHLY_LIMIT,
  ODDS_API_WARN_AT,
  type NormalizedGame,
  type NormalizedBookmakerOdds,
  type NormalizedMoneyline,
  type NormalizedSpread,
  type NormalizedTotal,
  type OddsApiGame,
  type OddsApiBookmaker,
  type OddsApiMarket,
  type OddsResult,
} from './config'

// Re-export the result type so callers only need one import.
export type { OddsResult, NormalizedGame, NormalizedBookmakerOdds } from './config'

type OddsCache = Database['public']['Tables']['odds_cache']['Row']
type OddsCacheInsert = Database['public']['Tables']['odds_cache']['Insert']
type ApiUsageRow = Database['public']['Tables']['api_usage']['Row']

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the current month string used as the api_usage key (e.g. "2026-03"). */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Returns an ISO-8601 string that is `ttlMs` milliseconds from now. */
function expiresAt(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString()
}

/**
 * Normalizes a raw OddsApiBookmaker object into our consistent interface.
 * Returns null for any market that is absent in the bookmaker's response.
 */
function normalizeBookmaker(bk: OddsApiBookmaker): NormalizedBookmakerOdds {
  const findMarket = (key: string): OddsApiMarket | undefined =>
    bk.markets.find((m) => m.key === key)

  // Moneyline (h2h)
  let moneyline: NormalizedMoneyline | null = null
  const h2h = findMarket('h2h')
  if (h2h) {
    const home = h2h.outcomes[0] ?? null
    const away = h2h.outcomes[1] ?? null
    const draw = h2h.outcomes[2] ?? null
    moneyline = {
      home: home?.price ?? null,
      away: away?.price ?? null,
      draw: draw?.price ?? null,
    }
  }

  // Spread
  let spread: NormalizedSpread | null = null
  const spreadsMarket = findMarket('spreads')
  if (spreadsMarket) {
    const homeOutcome = spreadsMarket.outcomes.find(
      (o) => o.name === 'home' || spreadsMarket.outcomes.indexOf(o) === 0
    )
    const awayOutcome = spreadsMarket.outcomes.find(
      (o) => o.name === 'away' || spreadsMarket.outcomes.indexOf(o) === 1
    )
    spread = {
      homeLine: homeOutcome?.point ?? null,
      homeOdds: homeOutcome?.price ?? null,
      awayLine: awayOutcome?.point ?? null,
      awayOdds: awayOutcome?.price ?? null,
    }
  }

  // Totals
  let total: NormalizedTotal | null = null
  const totalsMarket = findMarket('totals')
  if (totalsMarket) {
    const over = totalsMarket.outcomes.find((o) => o.name === 'Over')
    const under = totalsMarket.outcomes.find((o) => o.name === 'Under')
    total = {
      line: over?.point ?? under?.point ?? null,
      overOdds: over?.price ?? null,
      underOdds: under?.price ?? null,
    }
  }

  return {
    bookmaker: bk.key,
    moneyline,
    spread,
    total,
    lastUpdated: bk.last_update,
  }
}

/**
 * Converts a raw OddsApiGame into our NormalizedGame shape.
 * `fromCache` and `isFresh` are set by the caller since they depend on context.
 */
function normalizeGame(raw: OddsApiGame, sport: Sport): NormalizedGame {
  return {
    id: raw.id,
    sport,
    homeTeam: raw.home_team,
    awayTeam: raw.away_team,
    commenceTime: raw.commence_time,
    fromCache: false,
    isFresh: true,
    bookmakers: raw.bookmakers.map(normalizeBookmaker),
  }
}

// ---------------------------------------------------------------------------
// Cache layer
// ---------------------------------------------------------------------------

/**
 * Reads cached odds rows for a sport from Supabase.
 * Returns only rows that have not yet expired.
 */
async function readOddsCache(sport: Sport): Promise<OddsCache[]> {
  const supabase = await createServiceClient()
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('odds_cache')
    .select('*')
    .eq('sport', sport)
    .gt('expires_at', now)

  return (data as OddsCache[] | null) ?? []
}

/**
 * Persists normalized game odds into odds_cache.
 * Uses upsert on the (external_game_id, bookmaker, market) unique constraint.
 */
async function writeOddsCache(games: NormalizedGame[], sport: Sport): Promise<void> {
  const supabase = await createServiceClient()
  const expires = expiresAt(CACHE_TTL_MS.ODDS)

  const rows: OddsCacheInsert[] = []

  for (const game of games) {
    for (const bk of game.bookmakers) {
      // h2h
      if (bk.moneyline) {
        rows.push({
          external_game_id: game.id,
          sport,
          bookmaker: bk.bookmaker,
          market: 'h2h',
          home_odds: bk.moneyline.home,
          away_odds: bk.moneyline.away,
          draw_odds: bk.moneyline.draw,
          spread_home: null,
          spread_away: null,
          total_over: null,
          total_under: null,
          total_line: null,
          spread_line: null,
          data: game as unknown as Record<string, unknown>,
          expires_at: expires,
        })
      }

      // spreads
      if (bk.spread) {
        rows.push({
          external_game_id: game.id,
          sport,
          bookmaker: bk.bookmaker,
          market: 'spreads',
          home_odds: bk.spread.homeOdds,
          away_odds: bk.spread.awayOdds,
          draw_odds: null,
          spread_home: bk.spread.homeLine,
          spread_away: bk.spread.awayLine,
          total_over: null,
          total_under: null,
          total_line: null,
          spread_line: bk.spread.homeLine,
          data: game as unknown as Record<string, unknown>,
          expires_at: expires,
        })
      }

      // totals
      if (bk.total) {
        rows.push({
          external_game_id: game.id,
          sport,
          bookmaker: bk.bookmaker,
          market: 'totals',
          home_odds: null,
          away_odds: null,
          draw_odds: null,
          spread_home: null,
          spread_away: null,
          total_over: bk.total.overOdds,
          total_under: bk.total.underOdds,
          total_line: bk.total.line,
          spread_line: null,
          data: game as unknown as Record<string, unknown>,
          expires_at: expires,
        })
      }
    }
  }

  if (rows.length === 0) return

  const { error } = await supabase
    .from('odds_cache')
    .upsert(rows, { onConflict: 'external_game_id,bookmaker,market' })

  if (error) {
    console.error('[odds] cache write failed:', error.message)
  }
}

/**
 * Reconstructs NormalizedGame objects from flat odds_cache rows.
 *
 * Each row's `data` column contains the full NormalizedGame JSON that was
 * stored during writeOddsCache, so we simply de-duplicate by game id.
 */
function hydrateGamesFromCache(rows: OddsCache[]): NormalizedGame[] {
  const seen = new Map<string, NormalizedGame>()

  for (const row of rows) {
    if (!seen.has(row.external_game_id)) {
      // The `data` column holds the full NormalizedGame we stored earlier.
      const game = row.data as unknown as NormalizedGame
      seen.set(row.external_game_id, {
        ...game,
        fromCache: true,
        isFresh: new Date(row.expires_at) > new Date(),
        cachedAt: row.created_at,
      })
    }
  }

  return Array.from(seen.values())
}

// ---------------------------------------------------------------------------
// API usage tracking
// ---------------------------------------------------------------------------

/**
 * Returns the current api_usage call count for The Odds API this month.
 * Reads against a null user_id row (system-level tracking).
 */
async function getApiUsageCount(): Promise<number> {
  const supabase = await createServiceClient()
  const month = currentMonth()

  const { data } = await supabase
    .from('api_usage')
    .select('call_count')
    .eq('api_name', 'odds')
    .eq('month', month)
    .is('user_id', null)
    .maybeSingle()

  const row = data as Pick<ApiUsageRow, 'call_count'> | null
  return row?.call_count ?? 0
}

/**
 * Increments the system-level api_usage counter for The Odds API.
 * Uses the `increment_api_usage` RPC defined in the database.
 */
async function incrementApiUsage(): Promise<void> {
  const supabase = await createServiceClient()

  const { error } = await supabase.rpc('increment_api_usage', {
    p_user_id: null as unknown as string, // system-level row has null user_id
    p_api_name: 'odds',
    p_month: currentMonth(),
  })

  if (error) {
    console.error('[odds] failed to increment api_usage:', error.message)
  }
}

// ---------------------------------------------------------------------------
// External API call
// ---------------------------------------------------------------------------

/**
 * Fetches odds from The Odds API for one sport.
 * Throws if the response is not OK (caller decides how to handle).
 */
async function fetchOddsFromApi(sport: Sport): Promise<OddsApiGame[]> {
  const sportKey = ODDS_API_SPORT_KEYS[sport]
  const url = new URL(`${ODDS_API_BASE_URL}/sports/${sportKey}/odds`)
  url.searchParams.set('apiKey', getOddsApiKey())
  url.searchParams.set('regions', 'us')
  url.searchParams.set('markets', 'h2h,spreads,totals')
  url.searchParams.set('oddsFormat', 'american')

  const response = await fetch(url.toString(), {
    // Disable Next.js data cache — we manage our own TTL via Supabase.
    cache: 'no-store',
  })

  if (response.status === 429) {
    throw new RateLimitError('The Odds API rate limit reached (429)')
  }

  if (!response.ok) {
    throw new Error(`The Odds API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<OddsApiGame[]>
}

// ---------------------------------------------------------------------------
// Custom error types
// ---------------------------------------------------------------------------

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches upcoming odds for a single sport.
 *
 * Cache-first: returns Supabase-cached data if still within the 5-minute TTL.
 * Falls back to cache with a staleness notice if the API is unavailable or
 * the monthly usage limit has been reached (>= 80 %).
 *
 * @param sport - One of 'nba' | 'nfl' | 'mlb' | 'nhl'
 * @returns OddsResult with normalized games, usage metadata, and any notices.
 */
export async function getOddsForSport(sport: Sport): Promise<OddsResult> {
  const usageCount = await getApiUsageCount()
  const usageWarning = usageCount >= ODDS_API_WARN_AT

  // 1. Check cache first.
  const cachedRows = await readOddsCache(sport)

  if (cachedRows.length > 0) {
    const games = hydrateGamesFromCache(cachedRows)
    return {
      games,
      apiUsageCount: usageCount,
      usageWarning,
      dataNotice: usageWarning
        ? `API usage at ${usageCount}/${ODDS_API_MONTHLY_LIMIT} calls. Displaying cached odds.`
        : undefined,
    }
  }

  // 2. Cache miss — check rate limit before hitting the API.
  if (usageCount >= ODDS_API_MONTHLY_LIMIT) {
    console.warn('[odds] monthly limit reached — returning empty result')
    return {
      games: [],
      apiUsageCount: usageCount,
      usageWarning: true,
      dataNotice: `Monthly API limit of ${ODDS_API_MONTHLY_LIMIT} calls reached. No cached data available.`,
    }
  }

  if (usageWarning) {
    console.warn(`[odds] API usage at ${usageCount}/${ODDS_API_MONTHLY_LIMIT} — approaching limit`)
  }

  // 3. Live API call.
  try {
    const rawGames = await fetchOddsFromApi(sport)
    await incrementApiUsage()
    const updatedUsageCount = usageCount + 1

    const games = rawGames.map((raw) => normalizeGame(raw, sport))
    await writeOddsCache(games, sport)

    return {
      games,
      apiUsageCount: updatedUsageCount,
      usageWarning: updatedUsageCount >= ODDS_API_WARN_AT,
    }
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.error('[odds] rate-limited by API — returning stale cache if available')
      return {
        games: [],
        apiUsageCount: usageCount,
        usageWarning: true,
        dataNotice: 'Rate limit reached. Data may be outdated.',
      }
    }
    // Any other API error — log and return empty.
    console.error('[odds] API call failed:', err)
    return {
      games: [],
      apiUsageCount: usageCount,
      usageWarning,
      dataNotice: 'Sports data temporarily unavailable. Please try again shortly.',
    }
  }
}

/**
 * Fetches upcoming odds for all supported sports (NBA, NFL, MLB, NHL).
 *
 * Runs one API call per sport sequentially to avoid thundering-herd on the
 * monthly limit. Each sport benefits from independent caching — a cache hit
 * on any sport skips its API call entirely.
 *
 * @returns A map of Sport -> OddsResult.
 */
export async function getAllOdds(): Promise<Map<Sport, OddsResult>> {
  const results = new Map<Sport, OddsResult>()

  for (const sport of SUPPORTED_SPORTS) {
    results.set(sport, await getOddsForSport(sport))
  }

  return results
}

/**
 * Fetches a single game by its external id from the odds_cache.
 *
 * Returns the most recent cached version (even if expired) so the detail page
 * can always display something. The `isFresh` flag on the returned game
 * tells the caller whether the data is still within TTL.
 *
 * @param gameId - The external game id from The Odds API.
 * @returns A NormalizedGame or null if the game has never been cached.
 */
export async function getGameById(gameId: string): Promise<NormalizedGame | null> {
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('odds_cache')
    .select('*')
    .eq('external_game_id', gameId)
    .order('expires_at', { ascending: false })
    .limit(1)

  const rows = (data as OddsCache[] | null) ?? []
  if (rows.length === 0) return null

  const games = hydrateGamesFromCache(rows)
  return games[0] ?? null
}

/**
 * Returns the current monthly API usage count for The Odds API without
 * making any external calls. Useful for dashboards and health checks.
 */
export async function getOddsApiUsage(): Promise<{
  count: number
  limit: number
  warnAt: number
  isWarning: boolean
  isExhausted: boolean
}> {
  const count = await getApiUsageCount()
  return {
    count,
    limit: ODDS_API_MONTHLY_LIMIT,
    warnAt: ODDS_API_WARN_AT,
    isWarning: count >= ODDS_API_WARN_AT,
    isExhausted: count >= ODDS_API_MONTHLY_LIMIT,
  }
}
