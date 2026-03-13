/**
 * balldontlie API wrapper — NBA stats, player stats, and game results.
 *
 * Implements a cache-first strategy: all results are stored in the
 * `game_cache` Supabase table and re-used within their TTL window before
 * a fresh API call is made.
 *
 * NOTE: balldontlie v1 primarily covers the NBA. Methods that accept a
 * `sport` parameter will return an empty result (with a note) for NFL,
 * MLB, and NHL until balldontlie adds official coverage.
 */

import { getBalldontlieApiKey } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Constants local to the balldontlie wrapper.
// ---------------------------------------------------------------------------

const BALLDONTLIE_BASE_URL = 'https://api.balldontlie.io/v1'

/** Cache TTLs in milliseconds. */
const CACHE_TTL = {
  /** Game results and live data: 1 hour. */
  GAME: 60 * 60 * 1000,
  /** Player / team season stats: 24 hours. */
  STATS: 24 * 60 * 60 * 1000,
} as const

/** Alert when API usage reaches this fraction of the monthly limit. */
const USAGE_ALERT_THRESHOLD = 0.8

// ---------------------------------------------------------------------------
// Row-level types derived from the Database generic.
// ---------------------------------------------------------------------------

type GameCacheRow = Database['public']['Tables']['game_cache']['Row']
type GameCacheInsert = Database['public']['Tables']['game_cache']['Insert']
type ApiUsageRow = Database['public']['Tables']['api_usage']['Row']

// ---------------------------------------------------------------------------
// Normalised output interfaces
// ---------------------------------------------------------------------------

export interface NBAGame {
  /** balldontlie game id (stringified). */
  id: string
  date: string
  status: string
  period: number
  time: string
  homeTeam: NBATeam
  awayTeam: NBATeam
  homeTeamScore: number
  awayTeamScore: number
  season: number
  postseason: boolean
}

export interface NBATeam {
  id: number
  name: string
  fullName: string
  abbreviation: string
  city: string
  conference: string
  division: string
}

export interface NBAPlayerStats {
  id: number
  player: NBAPlayer
  team: NBATeam
  game: { id: number; date: string; season: number; postseason: boolean }
  min: string
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  fgm: number
  fga: number
  fg3m: number
  fg3a: number
  ftm: number
  fta: number
  oreb: number
  dreb: number
  turnover: number
  pf: number
  fgPct: number
  fg3Pct: number
  ftPct: number
}

export interface NBAPlayer {
  id: number
  firstName: string
  lastName: string
  position: string
  heightFeet: number | null
  heightInches: number | null
  weightPounds: number | null
  jerseyNumber: string | null
  college: string | null
  country: string | null
  draftYear: number | null
  draftRound: number | null
  draftNumber: number | null
  team: NBATeam | null
}

export interface NBASeasonAverages {
  playerId: number
  season: number
  gamesPlayed: number
  min: string
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  fgm: number
  fga: number
  fg3m: number
  fg3a: number
  ftm: number
  fta: number
  oreb: number
  dreb: number
  turnover: number
  pf: number
  fgPct: number
  fg3Pct: number
  ftPct: number
}

/** Wrapper returned by all public functions. */
export interface StatsResult<T> {
  data: T
  /** True when data was served from cache rather than a live API call. */
  fromCache: boolean
  /** ISO timestamp when the cache entry was created (null for live data). */
  cachedAt: string | null
  /** ISO timestamp when the cache entry expires (null for live data). */
  expiresAt: string | null
  /** Warning message present when data is stale or the API was unavailable. */
  warning?: string
  /** Informational note (e.g. sport-not-supported). */
  note?: string
}

// ---------------------------------------------------------------------------
// Raw balldontlie API shapes (minimal — only the fields we consume)
// ---------------------------------------------------------------------------

interface BDLTeamRaw {
  id: number
  name: string
  full_name: string
  abbreviation: string
  city: string
  conference: string
  division: string
}

interface BDLGameRaw {
  id: number
  date: string
  status: string
  period: number
  time: string
  home_team: BDLTeamRaw
  visitor_team: BDLTeamRaw
  home_team_score: number
  visitor_team_score: number
  season: number
  postseason: boolean
}

interface BDLPlayerRaw {
  id: number
  first_name: string
  last_name: string
  position: string
  height_feet: number | null
  height_inches: number | null
  weight_pounds: number | null
  jersey_number: string | null
  college: string | null
  country: string | null
  draft_year: number | null
  draft_round: number | null
  draft_number: number | null
  team: BDLTeamRaw | null
}

interface BDLStatsRaw {
  id: number
  player: BDLPlayerRaw
  team: BDLTeamRaw
  game: {
    id: number
    date: string
    season: number
    postseason: boolean
  }
  min: string
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  fgm: number
  fga: number
  fg3m: number
  fg3a: number
  ftm: number
  fta: number
  oreb: number
  dreb: number
  turnover: number
  pf: number
  fg_pct: number
  fg3_pct: number
  ft_pct: number
}

interface BDLSeasonAveragesRaw {
  player_id: number
  season: number
  games_played: number
  min: string
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  fgm: number
  fga: number
  fg3m: number
  fg3a: number
  ftm: number
  fta: number
  oreb: number
  dreb: number
  turnover: number
  pf: number
  fg_pct: number
  fg3_pct: number
  ft_pct: number
}

interface BDLPaginatedResponse<T> {
  data: T[]
  meta?: {
    next_cursor?: number
    per_page?: number
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns the current month string used as the api_usage key (e.g. "2026-03"). */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Builds an ISO expires_at timestamp offset from now by `ttlMs`. */
function expiresAt(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString()
}

/** Normalises a raw balldontlie team into our NBATeam interface. */
function normaliseTeam(raw: BDLTeamRaw): NBATeam {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    abbreviation: raw.abbreviation,
    city: raw.city,
    conference: raw.conference,
    division: raw.division,
  }
}

/** Normalises a raw balldontlie game into our NBAGame interface. */
function normaliseGame(raw: BDLGameRaw): NBAGame {
  return {
    id: String(raw.id),
    date: raw.date,
    status: raw.status,
    period: raw.period,
    time: raw.time,
    homeTeam: normaliseTeam(raw.home_team),
    awayTeam: normaliseTeam(raw.visitor_team),
    homeTeamScore: raw.home_team_score,
    awayTeamScore: raw.visitor_team_score,
    season: raw.season,
    postseason: raw.postseason,
  }
}

/** Normalises a raw balldontlie player into our NBAPlayer interface. */
function normalisePlayer(raw: BDLPlayerRaw): NBAPlayer {
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    position: raw.position,
    heightFeet: raw.height_feet,
    heightInches: raw.height_inches,
    weightPounds: raw.weight_pounds,
    jerseyNumber: raw.jersey_number,
    college: raw.college,
    country: raw.country,
    draftYear: raw.draft_year,
    draftRound: raw.draft_round,
    draftNumber: raw.draft_number,
    team: raw.team ? normaliseTeam(raw.team) : null,
  }
}

/** Normalises a raw balldontlie stats row into our NBAPlayerStats interface. */
function normaliseStats(raw: BDLStatsRaw): NBAPlayerStats {
  return {
    id: raw.id,
    player: normalisePlayer(raw.player),
    team: normaliseTeam(raw.team),
    game: raw.game,
    min: raw.min,
    pts: raw.pts,
    reb: raw.reb,
    ast: raw.ast,
    stl: raw.stl,
    blk: raw.blk,
    fgm: raw.fgm,
    fga: raw.fga,
    fg3m: raw.fg3m,
    fg3a: raw.fg3a,
    ftm: raw.ftm,
    fta: raw.fta,
    oreb: raw.oreb,
    dreb: raw.dreb,
    turnover: raw.turnover,
    pf: raw.pf,
    fgPct: raw.fg_pct,
    fg3Pct: raw.fg3_pct,
    ftPct: raw.ft_pct,
  }
}

/** Normalises a raw season-averages row. */
function normaliseSeasonAverages(raw: BDLSeasonAveragesRaw): NBASeasonAverages {
  return {
    playerId: raw.player_id,
    season: raw.season,
    gamesPlayed: raw.games_played,
    min: raw.min,
    pts: raw.pts,
    reb: raw.reb,
    ast: raw.ast,
    stl: raw.stl,
    blk: raw.blk,
    fgm: raw.fgm,
    fga: raw.fga,
    fg3m: raw.fg3m,
    fg3a: raw.fg3a,
    ftm: raw.ftm,
    fta: raw.fta,
    oreb: raw.oreb,
    dreb: raw.dreb,
    turnover: raw.turnover,
    pf: raw.pf,
    fgPct: raw.fg_pct,
    fg3Pct: raw.fg3_pct,
    ftPct: raw.ft_pct,
  }
}

/**
 * Makes a GET request to the balldontlie API.
 * Throws on non-2xx responses so the caller can fall back to cache.
 */
async function bdlFetch<T>(
  path: string,
  params: Record<string, string | number | string[] | number[] | undefined> = {}
): Promise<T> {
  const url = new URL(`${BALLDONTLIE_BASE_URL}${path}`)

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      // balldontlie expects repeated query params for arrays: dates[]=...&dates[]=...
      for (const item of value) {
        url.searchParams.append(`${key}[]`, String(item))
      }
    } else {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: getBalldontlieApiKey(),
    },
    // Do not cache at the HTTP layer; caching is managed by Supabase.
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `balldontlie API error: ${response.status} ${response.statusText} — ${url.toString()}`
    )
  }

  return response.json() as Promise<T>
}

/**
 * Increments the API call counter for balldontlie in the `api_usage` table
 * and logs a warning when usage crosses the 80% threshold.
 *
 * Uses null for user_id (system-level tracking rather than per-user).
 */
async function trackApiUsage(): Promise<void> {
  try {
    const supabase = await createServiceClient()
    const month = currentMonth()

    await supabase.rpc('increment_api_usage', {
      p_user_id: null,
      p_api_name: 'balldontlie',
      p_month: month,
    })

    // Fetch current count to check threshold.
    // balldontlie free tier does not have a hard monthly cap documented in
    // the same way as The Odds API, but we track at 10 000 calls/month as a
    // conservative internal limit.
    const MONTHLY_LIMIT = 10_000
    const { data } = await supabase
      .from('api_usage')
      .select('call_count')
      .eq('api_name', 'balldontlie')
      .eq('month', month)
      .is('user_id', null)
      .limit(1)

    const rows = data as Pick<ApiUsageRow, 'call_count'>[] | null
    const callCount = rows?.[0]?.call_count ?? 0

    if (callCount >= MONTHLY_LIMIT * USAGE_ALERT_THRESHOLD) {
      console.warn(
        `[stats] balldontlie API usage alert: ${callCount}/${MONTHLY_LIMIT} calls this month (${Math.round((callCount / MONTHLY_LIMIT) * 100)}%)`
      )
    }
  } catch (err) {
    // Non-fatal — tracking should never break the main data flow.
    console.error('[stats] Failed to track API usage:', err)
  }
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

/**
 * Looks up a valid (non-expired) cache entry by its external_game_id.
 * Returns null on cache miss or expiry.
 */
async function getCacheEntry(externalGameId: string): Promise<GameCacheRow | null> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('game_cache')
    .select('*')
    .eq('external_game_id', externalGameId)
    .eq('sport', 'nba')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[stats] Cache lookup error:', error.message)
    return null
  }

  return data as GameCacheRow | null
}

/**
 * Looks up all valid cache entries for a given cache key prefix.
 * The prefix pattern is stored in `external_game_id` for list-type caches.
 */
async function getCacheEntries(cacheKey: string): Promise<GameCacheRow[]> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('game_cache')
    .select('*')
    .eq('external_game_id', cacheKey)
    .eq('sport', 'nba')
    .gt('expires_at', new Date().toISOString())

  if (error) {
    console.error('[stats] Cache lookup error:', error.message)
    return []
  }

  return (data as GameCacheRow[] | null) ?? []
}

/**
 * Upserts a cache entry into `game_cache`.
 * Uses the unique constraint on (external_game_id, sport) to update in-place.
 */
async function setCacheEntry(entry: GameCacheInsert): Promise<void> {
  try {
    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('game_cache')
      .upsert(entry, { onConflict: 'external_game_id,sport' })

    if (error) {
      console.error('[stats] Cache write error:', error.message)
    }
  } catch (err) {
    console.error('[stats] Cache write exception:', err)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GetGamesOptions {
  /** Filter to specific calendar dates (YYYY-MM-DD). */
  dates?: string[]
  /** Filter to specific NBA seasons (e.g. 2024 for the 2024-25 season). */
  seasons?: number[]
  /** Filter to specific balldontlie team ids. */
  teamIds?: number[]
  /** Results per page (max 100). Defaults to 25. */
  perPage?: number
  /** Pagination cursor from a previous response meta. */
  cursor?: number
}

/**
 * Fetches NBA games from balldontlie, using Supabase cache where possible.
 *
 * Cache key is derived from the serialised query parameters so that different
 * filter combinations are cached independently.
 *
 * @param options - Query filters forwarded to the balldontlie /games endpoint.
 * @returns Normalised NBAGame array wrapped in a StatsResult.
 */
export async function getNBAGames(
  options: GetGamesOptions = {}
): Promise<StatsResult<NBAGame[]>> {
  const { dates, seasons, teamIds, perPage = 25, cursor } = options

  // Build a stable cache key from the query parameters.
  const cacheKey = `bdl:games:${JSON.stringify({ dates, seasons, teamIds, perPage, cursor })}`

  // --- Cache check ---
  const cached = await getCacheEntries(cacheKey)
  if (cached.length > 0) {
    const entry = cached[0]
    const payload = entry.data as { games: NBAGame[] }
    return {
      data: payload.games ?? [],
      fromCache: true,
      cachedAt: entry.created_at,
      expiresAt: entry.expires_at,
    }
  }

  // --- Live API call ---
  try {
    const raw = await bdlFetch<BDLPaginatedResponse<BDLGameRaw>>('/games', {
      dates,
      seasons,
      team_ids: teamIds,
      per_page: perPage,
      cursor,
    })

    await trackApiUsage()

    const games = raw.data.map(normaliseGame)

    // Persist to cache. Use the first game's date (or today) as game_date.
    const gameDate = games[0]?.date ?? new Date().toISOString().slice(0, 10)
    await setCacheEntry({
      external_game_id: cacheKey,
      sport: 'nba',
      home_team: 'multi',
      away_team: 'multi',
      game_date: gameDate,
      data: { games } as Record<string, unknown>,
      expires_at: expiresAt(CACHE_TTL.GAME),
    })

    return {
      data: games,
      fromCache: false,
      cachedAt: null,
      expiresAt: expiresAt(CACHE_TTL.GAME),
    }
  } catch (err) {
    console.error('[stats] getNBAGames API error:', err)

    // Return stale cache if any exists (ignoring expiry).
    const supabase = await createServiceClient()
    const { data: staleData } = await supabase
      .from('game_cache')
      .select('*')
      .eq('external_game_id', cacheKey)
      .eq('sport', 'nba')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const stale = staleData as GameCacheRow | null

    if (stale) {
      const payload = stale.data as { games: NBAGame[] }
      return {
        data: payload.games ?? [],
        fromCache: true,
        cachedAt: stale.created_at,
        expiresAt: stale.expires_at,
        warning: 'Data may be outdated — API unavailable, using cached data.',
      }
    }

    return {
      data: [],
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
      warning: `Failed to fetch games: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export interface GetPlayerStatsOptions {
  /** Filter by calendar dates (YYYY-MM-DD). */
  dates?: string[]
  /** Filter by seasons. */
  seasons?: number[]
  /** Filter by balldontlie player ids. */
  playerIds?: number[]
  /** Filter by balldontlie game ids. */
  gameIds?: number[]
  /** Results per page (max 100). */
  perPage?: number
  /** Pagination cursor. */
  cursor?: number
}

/**
 * Fetches NBA player stats from balldontlie, using Supabase cache where possible.
 *
 * Stats are cached for 24 hours (historical data changes rarely).
 *
 * @param options - Query filters forwarded to the balldontlie /stats endpoint.
 * @returns Normalised NBAPlayerStats array wrapped in a StatsResult.
 */
export async function getNBAPlayerStats(
  options: GetPlayerStatsOptions = {}
): Promise<StatsResult<NBAPlayerStats[]>> {
  const { dates, seasons, playerIds, gameIds, perPage = 25, cursor } = options

  const cacheKey = `bdl:player_stats:${JSON.stringify({ dates, seasons, playerIds, gameIds, perPage, cursor })}`

  const cached = await getCacheEntries(cacheKey)
  if (cached.length > 0) {
    const entry = cached[0]
    const payload = entry.data as { stats: NBAPlayerStats[] }
    return {
      data: payload.stats ?? [],
      fromCache: true,
      cachedAt: entry.created_at,
      expiresAt: entry.expires_at,
    }
  }

  try {
    const raw = await bdlFetch<BDLPaginatedResponse<BDLStatsRaw>>('/stats', {
      dates,
      seasons,
      player_ids: playerIds,
      game_ids: gameIds,
      per_page: perPage,
      cursor,
    })

    await trackApiUsage()

    const stats = raw.data.map(normaliseStats)

    const gameDate = dates?.[0] ?? stats[0]?.game.date ?? new Date().toISOString().slice(0, 10)
    await setCacheEntry({
      external_game_id: cacheKey,
      sport: 'nba',
      home_team: 'multi',
      away_team: 'multi',
      game_date: gameDate,
      data: { stats } as Record<string, unknown>,
      expires_at: expiresAt(CACHE_TTL.STATS),
    })

    return {
      data: stats,
      fromCache: false,
      cachedAt: null,
      expiresAt: expiresAt(CACHE_TTL.STATS),
    }
  } catch (err) {
    console.error('[stats] getNBAPlayerStats API error:', err)

    const supabase = await createServiceClient()
    const { data: staleData } = await supabase
      .from('game_cache')
      .select('*')
      .eq('external_game_id', cacheKey)
      .eq('sport', 'nba')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const stale = staleData as GameCacheRow | null

    if (stale) {
      const payload = stale.data as { stats: NBAPlayerStats[] }
      return {
        data: payload.stats ?? [],
        fromCache: true,
        cachedAt: stale.created_at,
        expiresAt: stale.expires_at,
        warning: 'Data may be outdated — API unavailable, using cached data.',
      }
    }

    return {
      data: [],
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
      warning: `Failed to fetch player stats: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export interface GetSeasonAveragesOptions {
  /** NBA season year (e.g. 2024 for 2024-25). */
  season: number
  /** balldontlie player ids to look up. */
  playerIds: number[]
}

/**
 * Fetches season averages for one or more NBA players.
 *
 * Season averages are highly stable historical data cached for 24 hours.
 *
 * @param options - Season and player ids to query.
 * @returns Normalised NBASeasonAverages array wrapped in a StatsResult.
 */
export async function getNBASeasonAverages(
  options: GetSeasonAveragesOptions
): Promise<StatsResult<NBASeasonAverages[]>> {
  const { season, playerIds } = options
  const sortedIds = [...playerIds].sort((a, b) => a - b)
  const cacheKey = `bdl:season_avg:${season}:${sortedIds.join(',')}`

  const cached = await getCacheEntries(cacheKey)
  if (cached.length > 0) {
    const entry = cached[0]
    const payload = entry.data as { averages: NBASeasonAverages[] }
    return {
      data: payload.averages ?? [],
      fromCache: true,
      cachedAt: entry.created_at,
      expiresAt: entry.expires_at,
    }
  }

  try {
    const raw = await bdlFetch<BDLPaginatedResponse<BDLSeasonAveragesRaw>>('/season_averages', {
      season,
      player_ids: sortedIds,
    })

    await trackApiUsage()

    const averages = raw.data.map(normaliseSeasonAverages)

    await setCacheEntry({
      external_game_id: cacheKey,
      sport: 'nba',
      home_team: 'multi',
      away_team: 'multi',
      game_date: `${season}-01-01`,
      data: { averages } as Record<string, unknown>,
      expires_at: expiresAt(CACHE_TTL.STATS),
    })

    return {
      data: averages,
      fromCache: false,
      cachedAt: null,
      expiresAt: expiresAt(CACHE_TTL.STATS),
    }
  } catch (err) {
    console.error('[stats] getNBASeasonAverages API error:', err)

    const supabase = await createServiceClient()
    const { data: staleData } = await supabase
      .from('game_cache')
      .select('*')
      .eq('external_game_id', cacheKey)
      .eq('sport', 'nba')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const stale = staleData as GameCacheRow | null

    if (stale) {
      const payload = stale.data as { averages: NBASeasonAverages[] }
      return {
        data: payload.averages ?? [],
        fromCache: true,
        cachedAt: stale.created_at,
        expiresAt: stale.expires_at,
        warning: 'Data may be outdated — API unavailable, using cached data.',
      }
    }

    return {
      data: [],
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
      warning: `Failed to fetch season averages: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export interface GetTeamsOptions {
  /** Optional conference filter ("East" | "West"). */
  conference?: string
  /** Optional division filter (e.g. "Atlantic"). */
  division?: string
}

/**
 * Fetches all NBA teams from balldontlie, using Supabase cache where possible.
 *
 * Teams almost never change so they are cached for 24 hours.
 *
 * @param options - Optional conference/division filters.
 * @returns Normalised NBATeam array wrapped in a StatsResult.
 */
export async function getNBATeams(
  options: GetTeamsOptions = {}
): Promise<StatsResult<NBATeam[]>> {
  const { conference, division } = options
  const cacheKey = `bdl:teams:${JSON.stringify({ conference, division })}`

  const cached = await getCacheEntries(cacheKey)
  if (cached.length > 0) {
    const entry = cached[0]
    const payload = entry.data as { teams: NBATeam[] }
    return {
      data: payload.teams ?? [],
      fromCache: true,
      cachedAt: entry.created_at,
      expiresAt: entry.expires_at,
    }
  }

  try {
    const raw = await bdlFetch<BDLPaginatedResponse<BDLTeamRaw>>('/teams', {
      conference,
      division,
    })

    await trackApiUsage()

    const teams = raw.data.map(normaliseTeam)

    await setCacheEntry({
      external_game_id: cacheKey,
      sport: 'nba',
      home_team: 'multi',
      away_team: 'multi',
      game_date: new Date().toISOString().slice(0, 10),
      data: { teams } as Record<string, unknown>,
      expires_at: expiresAt(CACHE_TTL.STATS),
    })

    return {
      data: teams,
      fromCache: false,
      cachedAt: null,
      expiresAt: expiresAt(CACHE_TTL.STATS),
    }
  } catch (err) {
    console.error('[stats] getNBATeams API error:', err)

    const supabase = await createServiceClient()
    const { data: staleData } = await supabase
      .from('game_cache')
      .select('*')
      .eq('external_game_id', cacheKey)
      .eq('sport', 'nba')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const stale = staleData as GameCacheRow | null

    if (stale) {
      const payload = stale.data as { teams: NBATeam[] }
      return {
        data: payload.teams ?? [],
        fromCache: true,
        cachedAt: stale.created_at,
        expiresAt: stale.expires_at,
        warning: 'Data may be outdated — API unavailable, using cached data.',
      }
    }

    return {
      data: [],
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
      warning: `Failed to fetch teams: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export interface SearchPlayersOptions {
  /** Search string (first name, last name, or both). */
  search: string
  /** Results per page (max 100). Defaults to 25. */
  perPage?: number
  /** Pagination cursor. */
  cursor?: number
}

/**
 * Searches for NBA players by name via balldontlie, using Supabase cache where possible.
 *
 * Player roster data is cached for 24 hours.
 *
 * @param options - Search term and pagination options.
 * @returns Normalised NBAPlayer array wrapped in a StatsResult.
 */
export async function searchNBAPlayers(
  options: SearchPlayersOptions
): Promise<StatsResult<NBAPlayer[]>> {
  const { search, perPage = 25, cursor } = options
  const cacheKey = `bdl:players:${JSON.stringify({ search: search.trim().toLowerCase(), perPage, cursor })}`

  const cached = await getCacheEntries(cacheKey)
  if (cached.length > 0) {
    const entry = cached[0]
    const payload = entry.data as { players: NBAPlayer[] }
    return {
      data: payload.players ?? [],
      fromCache: true,
      cachedAt: entry.created_at,
      expiresAt: entry.expires_at,
    }
  }

  try {
    const raw = await bdlFetch<BDLPaginatedResponse<BDLPlayerRaw>>('/players', {
      search: search.trim(),
      per_page: perPage,
      cursor,
    })

    await trackApiUsage()

    const players = raw.data.map(normalisePlayer)

    await setCacheEntry({
      external_game_id: cacheKey,
      sport: 'nba',
      home_team: 'multi',
      away_team: 'multi',
      game_date: new Date().toISOString().slice(0, 10),
      data: { players } as Record<string, unknown>,
      expires_at: expiresAt(CACHE_TTL.STATS),
    })

    return {
      data: players,
      fromCache: false,
      cachedAt: null,
      expiresAt: expiresAt(CACHE_TTL.STATS),
    }
  } catch (err) {
    console.error('[stats] searchNBAPlayers API error:', err)

    const supabase = await createServiceClient()
    const { data: staleData } = await supabase
      .from('game_cache')
      .select('*')
      .eq('external_game_id', cacheKey)
      .eq('sport', 'nba')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const stale = staleData as GameCacheRow | null

    if (stale) {
      const payload = stale.data as { players: NBAPlayer[] }
      return {
        data: payload.players ?? [],
        fromCache: true,
        cachedAt: stale.created_at,
        expiresAt: stale.expires_at,
        warning: 'Data may be outdated — API unavailable, using cached data.',
      }
    }

    return {
      data: [],
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
      warning: `Failed to search players: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Single-game convenience helper
// ---------------------------------------------------------------------------

/**
 * Fetches a single NBA game by its balldontlie game id.
 *
 * Checks the game_cache table first using the game id as the external_game_id.
 *
 * @param gameId - The balldontlie integer game id.
 * @returns A single NBAGame (or null) wrapped in a StatsResult.
 */
export async function getNBAGameById(
  gameId: number
): Promise<StatsResult<NBAGame | null>> {
  const externalId = `bdl:game:${gameId}`

  const cached = await getCacheEntry(externalId)
  if (cached) {
    const payload = cached.data as { game: NBAGame }
    return {
      data: payload.game ?? null,
      fromCache: true,
      cachedAt: cached.created_at,
      expiresAt: cached.expires_at,
    }
  }

  try {
    const raw = await bdlFetch<{ data: BDLGameRaw }>(`/games/${gameId}`)
    await trackApiUsage()

    const game = normaliseGame(raw.data)

    await setCacheEntry({
      external_game_id: externalId,
      sport: 'nba',
      home_team: game.homeTeam.fullName,
      away_team: game.awayTeam.fullName,
      game_date: game.date,
      data: { game } as Record<string, unknown>,
      expires_at: expiresAt(CACHE_TTL.GAME),
    })

    return {
      data: game,
      fromCache: false,
      cachedAt: null,
      expiresAt: expiresAt(CACHE_TTL.GAME),
    }
  } catch (err) {
    console.error('[stats] getNBAGameById API error:', err)

    // Try stale cache.
    const supabase = await createServiceClient()
    const { data: staleData } = await supabase
      .from('game_cache')
      .select('*')
      .eq('external_game_id', externalId)
      .eq('sport', 'nba')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const stale = staleData as GameCacheRow | null

    if (stale) {
      const payload = stale.data as { game: NBAGame }
      return {
        data: payload.game ?? null,
        fromCache: true,
        cachedAt: stale.created_at,
        expiresAt: stale.expires_at,
        warning: 'Data may be outdated — API unavailable, using cached data.',
      }
    }

    return {
      data: null,
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
      warning: `Failed to fetch game ${gameId}: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Non-NBA sport guard
// ---------------------------------------------------------------------------

/**
 * Returns an informational note for callers that request stats for sports not
 * yet supported by balldontlie (NFL, MLB, NHL).
 *
 * Intended to be used by higher-level orchestration code that dispatches by
 * sport type.
 *
 * @param sport - The requested sport.
 * @returns True if the sport is supported (NBA only).
 */
export function isSupportedSport(sport: string): boolean {
  return sport === 'nba'
}

export const UNSUPPORTED_SPORT_NOTE =
  'balldontlie v1 only covers the NBA. NFL, MLB, and NHL data are not available through this wrapper.'
