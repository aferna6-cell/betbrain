/**
 * Player prop odds wrapper — fetches prop markets from The Odds API for a
 * specific game and aggregates them across bookmakers.
 *
 * Strategy:
 *   1. Check odds_cache in Supabase for a fresh prop cache entry; return
 *      immediately if found.
 *   2. On cache miss, call The Odds API event-level odds endpoint with the
 *      requested prop markets.
 *   3. Persist the response to odds_cache and track the call in api_usage.
 *   4. At 80% of the monthly limit, stop making live calls and serve cache
 *      with a staleness notice.
 *
 * Cache key: odds_cache rows keyed by (external_game_id, bookmaker, market)
 * where market is the prop market key (e.g. "player_points"). The full
 * aggregated PropOddsResult is stored in the `data` JSONB column.
 */

import { getOddsApiKey } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/server'
import {
  ODDS_API_SPORT_KEYS,
  ODDS_API_MONTHLY_LIMIT,
  ODDS_API_WARN_AT,
  CACHE_TTL_MS,
  SPORT_PROP_MARKETS,
  isPropMarket,
  type Sport,
  type PropMarket,
  type PropApiGame,
  type PropApiBookmaker,
  type NormalizedPlayerProp,
  type NormalizedPropLine,
  type PropOddsResult,
} from './config'

// Re-export the result type so callers only need one import.
export type { PropOddsResult, NormalizedPlayerProp, NormalizedPropLine, PropMarket } from './config'

import type { Database } from '@/lib/supabase/types'

type OddsCache = Database['public']['Tables']['odds_cache']['Row']
type OddsCacheInsert = Database['public']['Tables']['odds_cache']['Insert']
type ApiUsageRow = Database['public']['Tables']['api_usage']['Row']

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'

/**
 * Cache marker value stored in odds_cache.market to distinguish a full prop
 * result snapshot from per-market rows. We store one row per game with the
 * entire PropOddsResult in the `data` column.
 */
const PROP_CACHE_MARKET_KEY = 'props_snapshot'

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

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Builds a player name -> market -> bookmaker-lines map from a raw prop API
 * response, then collapses it into NormalizedPlayerProp records.
 */
function normalizeProps(
  bookmakers: PropApiBookmaker[],
  requestedMarkets: PropMarket[]
): NormalizedPlayerProp[] {
  // player -> market -> bookmaker lines
  type PropKey = `${string}::${PropMarket}`
  const aggregated = new Map<PropKey, NormalizedPropLine[]>()

  for (const bk of bookmakers) {
    for (const market of bk.markets) {
      if (!isPropMarket(market.key)) continue
      if (!requestedMarkets.includes(market.key)) continue

      // Group outcomes by player name — each player has an Over and Under outcome
      const byPlayer = new Map<string, { over: number | null; under: number | null; point: number }>()

      for (const outcome of market.outcomes) {
        const player = outcome.description
        if (!byPlayer.has(player)) {
          byPlayer.set(player, { over: null, under: null, point: outcome.point })
        }
        const entry = byPlayer.get(player)!
        if (outcome.name === 'Over') {
          entry.over = outcome.price
          entry.point = outcome.point
        } else if (outcome.name === 'Under') {
          entry.under = outcome.price
          entry.point = outcome.point
        }
      }

      for (const [player, { over, under, point }] of byPlayer) {
        const key: PropKey = `${player}::${market.key}`
        const line: NormalizedPropLine = {
          bookmaker: bk.key,
          line: point,
          overOdds: over,
          underOdds: under,
          lastUpdated: market.last_update,
        }
        const existing = aggregated.get(key) ?? []
        existing.push(line)
        aggregated.set(key, existing)
      }
    }
  }

  const props: NormalizedPlayerProp[] = []

  for (const [key, lines] of aggregated) {
    const separatorIdx = key.indexOf('::')
    const playerName = key.slice(0, separatorIdx)
    const market = key.slice(separatorIdx + 2) as PropMarket

    const bestOverOdds = lines.reduce<number | null>((best, l) => {
      if (l.overOdds === null) return best
      return best === null || l.overOdds > best ? l.overOdds : best
    }, null)

    const bestUnderOdds = lines.reduce<number | null>((best, l) => {
      if (l.underOdds === null) return best
      return best === null || l.underOdds > best ? l.underOdds : best
    }, null)

    // Consensus line: most frequently occurring line value
    const lineCounts = new Map<number, number>()
    for (const l of lines) {
      lineCounts.set(l.line, (lineCounts.get(l.line) ?? 0) + 1)
    }
    let consensusLine: number | null = null
    let maxCount = 0
    for (const [lineVal, count] of lineCounts) {
      if (count > maxCount) {
        maxCount = count
        consensusLine = lineVal
      }
    }

    props.push({ playerName, market, bookmakers: lines, bestOverOdds, bestUnderOdds, consensusLine })
  }

  // Sort by player name then market for stable output
  props.sort((a, b) => {
    if (a.playerName < b.playerName) return -1
    if (a.playerName > b.playerName) return 1
    if (a.market < b.market) return -1
    if (a.market > b.market) return 1
    return 0
  })

  return props
}

// ---------------------------------------------------------------------------
// Cache layer
// ---------------------------------------------------------------------------

/**
 * Reads the cached prop snapshot for a game from Supabase.
 * Returns the full PropOddsResult stored in the `data` column, or null if
 * absent or expired.
 */
async function readPropCache(gameId: string): Promise<PropOddsResult | null> {
  const supabase = await createServiceClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('odds_cache')
    .select('data, expires_at, created_at')
    .eq('external_game_id', gameId)
    .eq('market', PROP_CACHE_MARKET_KEY)
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[props] readPropCache failed:', error.message)
    return null
  }

  const rows = (data as Pick<OddsCache, 'data' | 'expires_at' | 'created_at'>[] | null) ?? []
  if (rows.length === 0) return null

  const row = rows[0]
  const cached = row.data as unknown as PropOddsResult
  return {
    ...cached,
    fromCache: true,
    isFresh: new Date(row.expires_at) > new Date(),
    cachedAt: row.created_at,
  }
}

/**
 * Persists a PropOddsResult snapshot to odds_cache.
 * Uses a single row per game (upsert on external_game_id + bookmaker + market).
 * The `data` column holds the full result for hydration.
 */
async function writePropCache(result: PropOddsResult, sport: string): Promise<void> {
  const supabase = await createServiceClient()
  const expires = expiresAt(CACHE_TTL_MS.ODDS)

  const row: OddsCacheInsert = {
    external_game_id: result.gameId,
    sport: sport as OddsCacheInsert['sport'],
    bookmaker: 'aggregated',
    market: PROP_CACHE_MARKET_KEY,
    data: result as unknown as Record<string, unknown>,
    expires_at: expires,
    // Prop snapshots do not use the standard odds columns
    home_odds: null,
    away_odds: null,
    draw_odds: null,
    spread_home: null,
    spread_away: null,
    spread_line: null,
    total_over: null,
    total_under: null,
    total_line: null,
  }

  const { error } = await supabase
    .from('odds_cache')
    .upsert([row], { onConflict: 'external_game_id,bookmaker,market' })

  if (error) {
    console.error('[props] cache write failed:', error.message)
  }
}

// ---------------------------------------------------------------------------
// API usage tracking
// ---------------------------------------------------------------------------

/** Returns the current api_usage call count for The Odds API this month. */
async function getApiUsageCount(): Promise<number> {
  const supabase = await createServiceClient()
  const month = currentMonth()

  const { data, error } = await supabase
    .from('api_usage')
    .select('call_count')
    .eq('api_name', 'odds')
    .eq('month', month)
    .is('user_id', null)
    .maybeSingle()

  if (error) {
    console.error('[props] getApiUsageCount failed:', error.message)
    return 0
  }

  const row = data as Pick<ApiUsageRow, 'call_count'> | null
  return row?.call_count ?? 0
}

/** Increments the system-level api_usage counter for The Odds API. */
async function incrementApiUsage(): Promise<void> {
  const supabase = await createServiceClient()

  const { error } = await supabase.rpc('increment_api_usage', {
    p_user_id: null as unknown as string,
    p_api_name: 'odds',
    p_month: currentMonth(),
  })

  if (error) {
    console.error('[props] failed to increment api_usage:', error.message)
  }
}

// ---------------------------------------------------------------------------
// External API call
// ---------------------------------------------------------------------------

/**
 * Fetches player prop odds from The Odds API for a single event.
 *
 * Uses the event-level endpoint:
 *   GET /v4/sports/{sport_key}/events/{event_id}/odds
 *
 * Throws on non-OK responses (caller handles RateLimitError vs generic errors).
 */
async function fetchPropsFromApi(
  sport: string,
  eventId: string,
  markets: PropMarket[]
): Promise<PropApiGame> {
  const url = new URL(`${ODDS_API_BASE_URL}/sports/${sport}/events/${eventId}/odds`)
  url.searchParams.set('apiKey', getOddsApiKey())
  url.searchParams.set('regions', 'us')
  url.searchParams.set('markets', markets.join(','))
  url.searchParams.set('oddsFormat', 'american')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url.toString(), {
      // Disable Next.js data cache — we manage our own TTL via Supabase.
      cache: 'no-store',
      signal: controller.signal,
    })

    if (response.status === 429) {
      throw new PropRateLimitError('The Odds API rate limit reached (429)')
    }

    if (!response.ok) {
      throw new Error(`The Odds API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<PropApiGame>
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Custom error types
// ---------------------------------------------------------------------------

export class PropRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PropRateLimitError'
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches player prop odds for a single game, aggregated across bookmakers.
 *
 * Cache-first: returns Supabase-cached data if still within the 5-minute TTL.
 * Falls back to cache with a staleness notice if the API is unavailable or the
 * monthly usage limit has been reached (>= 80%).
 *
 * @param gameId  - The Odds API event ID (from existing game data).
 * @param sport   - One of 'nba' | 'nfl' | 'mlb' | 'nhl'.
 * @param markets - Optional override of prop markets to fetch. Defaults to all
 *                  markets supported for the given sport.
 * @returns PropOddsResult with normalized player props and usage metadata.
 */
export async function getPropOddsForGame(
  gameId: string,
  sport: string,
  markets?: PropMarket[]
): Promise<PropOddsResult> {
  const usageCount = await getApiUsageCount()
  const usageWarning = usageCount >= ODDS_API_WARN_AT

  const sportKey = ODDS_API_SPORT_KEYS[sport as keyof typeof ODDS_API_SPORT_KEYS]

  // Determine which markets to fetch. Fall back to an empty array for sports
  // that have no configured prop markets (e.g. mlb, nhl) — the caller is
  // responsible for only requesting supported markets.
  const requestedMarkets: PropMarket[] = markets ?? (SPORT_PROP_MARKETS[sport as keyof typeof SPORT_PROP_MARKETS] ?? [])

  if (requestedMarkets.length === 0) {
    return {
      gameId,
      sport: sport as PropOddsResult['sport'],
      homeTeam: '',
      awayTeam: '',
      commenceTime: '',
      props: [],
      fromCache: false,
      isFresh: false,
      apiUsageCount: usageCount,
      usageWarning,
      dataNotice: `No prop markets configured for sport: ${sport}`,
    }
  }

  // 1. Check cache first.
  const cached = await readPropCache(gameId)
  if (cached) {
    return {
      ...cached,
      apiUsageCount: usageCount,
      usageWarning,
      dataNotice: usageWarning
        ? `API usage at ${usageCount}/${ODDS_API_MONTHLY_LIMIT} calls. Displaying cached props.`
        : cached.dataNotice,
    }
  }

  // 2. Cache miss — check rate limit before hitting the API.
  if (usageCount >= ODDS_API_MONTHLY_LIMIT) {
    console.warn('[props] monthly limit reached — returning empty result')
    return {
      gameId,
      sport: sport as PropOddsResult['sport'],
      homeTeam: '',
      awayTeam: '',
      commenceTime: '',
      props: [],
      fromCache: false,
      isFresh: false,
      apiUsageCount: usageCount,
      usageWarning: true,
      dataNotice: `Monthly API limit of ${ODDS_API_MONTHLY_LIMIT} calls reached. No cached data available.`,
    }
  }

  if (usageWarning) {
    console.warn(`[props] API usage at ${usageCount}/${ODDS_API_MONTHLY_LIMIT} — approaching limit`)
  }

  if (!sportKey) {
    return {
      gameId,
      sport: sport as PropOddsResult['sport'],
      homeTeam: '',
      awayTeam: '',
      commenceTime: '',
      props: [],
      fromCache: false,
      isFresh: false,
      apiUsageCount: usageCount,
      usageWarning,
      dataNotice: `Unsupported sport: ${sport}`,
    }
  }

  // 3. Live API call.
  try {
    const rawGame = await fetchPropsFromApi(sportKey, gameId, requestedMarkets)
    await incrementApiUsage()
    const updatedUsageCount = usageCount + 1

    const props = normalizeProps(rawGame.bookmakers, requestedMarkets)

    const result: PropOddsResult = {
      gameId: rawGame.id,
      sport: sport as PropOddsResult['sport'],
      homeTeam: rawGame.home_team,
      awayTeam: rawGame.away_team,
      commenceTime: rawGame.commence_time,
      props,
      fromCache: false,
      isFresh: true,
      apiUsageCount: updatedUsageCount,
      usageWarning: updatedUsageCount >= ODDS_API_WARN_AT,
    }

    await writePropCache(result, sport)

    return result
  } catch (err) {
    if (err instanceof PropRateLimitError) {
      console.error('[props] rate-limited by API — returning empty result')
      return {
        gameId,
        sport: sport as PropOddsResult['sport'],
        homeTeam: '',
        awayTeam: '',
        commenceTime: '',
        props: [],
        fromCache: false,
        isFresh: false,
        apiUsageCount: usageCount,
        usageWarning: true,
        dataNotice: 'Rate limit reached. Data may be outdated.',
      }
    }
    // Any other API error — log and return empty.
    console.error('[props] API call failed:', err)
    return {
      gameId,
      sport: sport as PropOddsResult['sport'],
      homeTeam: '',
      awayTeam: '',
      commenceTime: '',
      props: [],
      fromCache: false,
      isFresh: false,
      apiUsageCount: usageCount,
      usageWarning,
      dataNotice: 'Sports data temporarily unavailable. Please try again shortly.',
    }
  }
}
