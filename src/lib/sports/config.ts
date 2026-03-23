/**
 * Shared configuration, constants, and normalized types for sports data APIs.
 * Import from here rather than hard-coding values across multiple modules.
 */

import type { Sport } from '@/lib/supabase/types'
export type { Sport } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Sport key mapping — our internal Sport type -> The Odds API sport keys
// ---------------------------------------------------------------------------

export const ODDS_API_SPORT_KEYS: Record<Sport, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  mlb: 'baseball_mlb',
  nhl: 'icehockey_nhl',
}

/** All sports we actively support. Iterate over this to fetch all leagues. */
export const SUPPORTED_SPORTS: Sport[] = ['nba', 'nfl', 'mlb', 'nhl']

/** Type guard — checks if an arbitrary string is a valid Sport. */
export function isSport(value: string): value is Sport {
  return SUPPORTED_SPORTS.includes(value as Sport)
}

/** Human-readable sport labels for display. */
export const SPORT_LABELS: Record<string, string> = {
  nba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
  nhl: 'NHL',
}

// ---------------------------------------------------------------------------
// Cache TTLs (milliseconds)
// ---------------------------------------------------------------------------

export const CACHE_TTL_MS = {
  /** Live and upcoming odds — refresh aggressively. */
  ODDS: 5 * 60 * 1000,          // 5 minutes
  /** Player / team stats. */
  STATS: 60 * 60 * 1000,        // 1 hour
  /** Historical game results. */
  HISTORICAL: 24 * 60 * 60 * 1000, // 24 hours
  /** League standings. */
  STANDINGS: 6 * 60 * 60 * 1000,   // 6 hours
} as const

// ---------------------------------------------------------------------------
// Rate limit constants — The Odds API free tier
// ---------------------------------------------------------------------------

export const ODDS_API_MONTHLY_LIMIT = 500
/** Alert and switch to cache-only mode when usage crosses this threshold. */
export const ODDS_API_WARN_AT = Math.floor(ODDS_API_MONTHLY_LIMIT * 0.8) // 400

// ---------------------------------------------------------------------------
// Normalized data types
// ---------------------------------------------------------------------------

/** A single set of moneyline prices for one bookmaker on one game. */
export interface NormalizedMoneyline {
  home: number | null
  away: number | null
  draw: number | null
}

/** A single spread offer for one bookmaker on one game. */
export interface NormalizedSpread {
  /** Points the home team is giving or receiving (e.g. -3.5). */
  homeLine: number | null
  homeOdds: number | null
  awayLine: number | null
  awayOdds: number | null
}

/** A single totals (over/under) offer for one bookmaker on one game. */
export interface NormalizedTotal {
  line: number | null
  overOdds: number | null
  underOdds: number | null
}

/** All markets for a single bookmaker on a single game. */
export interface NormalizedBookmakerOdds {
  bookmaker: string
  moneyline: NormalizedMoneyline | null
  spread: NormalizedSpread | null
  total: NormalizedTotal | null
  /** ISO-8601 timestamp of when the bookmaker last updated these odds. */
  lastUpdated: string
}

/** Fully normalized game with all attached odds across bookmakers. */
export interface NormalizedGame {
  /** Stable external identifier from The Odds API (e.g. "abc123def456"). */
  id: string
  sport: Sport
  homeTeam: string
  awayTeam: string
  /** ISO-8601 game start time. */
  commenceTime: string
  /** Whether this data came from cache rather than a live API call. */
  fromCache: boolean
  /** ISO-8601 timestamp of when the cache entry was written, if applicable. */
  cachedAt?: string
  /** True when the data is within TTL; false signals stale cache being served. */
  isFresh: boolean
  bookmakers: NormalizedBookmakerOdds[]
}

/** Wrapper returned from odds-fetching functions with metadata for callers. */
export interface OddsResult {
  games: NormalizedGame[]
  /** Current monthly API call count for The Odds API. */
  apiUsageCount: number
  /** Whether usage has crossed the 80% warning threshold. */
  usageWarning: boolean
  /** Human-readable message when serving stale or cached data. */
  dataNotice?: string
}

// ---------------------------------------------------------------------------
// Raw Odds API response shapes (typed minimally for safety)
// ---------------------------------------------------------------------------

export interface OddsApiOutcome {
  name: string
  price: number
  point?: number
  description?: string
}

export interface OddsApiMarket {
  key: 'h2h' | 'spreads' | 'totals'
  last_update: string
  outcomes: OddsApiOutcome[]
}

export interface OddsApiBookmaker {
  key: string
  title: string
  last_update: string
  markets: OddsApiMarket[]
}

export interface OddsApiGame {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: OddsApiBookmaker[]
}

// ---------------------------------------------------------------------------
// Player prop market types
// ---------------------------------------------------------------------------

/**
 * Prop market keys supported by The Odds API for each sport.
 * NBA markets: player_points, player_rebounds, player_assists,
 *              player_threes, player_blocks, player_steals
 * NFL markets: player_pass_tds, player_rush_yds, player_reception_yds
 */
export type NbaPropMarket =
  | 'player_points'
  | 'player_rebounds'
  | 'player_assists'
  | 'player_threes'
  | 'player_blocks'
  | 'player_steals'

export type NflPropMarket =
  | 'player_pass_tds'
  | 'player_rush_yds'
  | 'player_reception_yds'

export type PropMarket = NbaPropMarket | NflPropMarket

/** All NBA prop markets BetBrain fetches. */
export const NBA_PROP_MARKETS: NbaPropMarket[] = [
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_blocks',
  'player_steals',
]

/** All NFL prop markets BetBrain fetches. */
export const NFL_PROP_MARKETS: NflPropMarket[] = [
  'player_pass_tds',
  'player_rush_yds',
  'player_reception_yds',
]

/** Map of sport -> prop markets supported. */
export const SPORT_PROP_MARKETS: Partial<Record<Sport, PropMarket[]>> = {
  nba: NBA_PROP_MARKETS,
  nfl: NFL_PROP_MARKETS,
}

/** Human-readable labels for each prop market key. */
export const PROP_MARKET_LABELS: Record<PropMarket, string> = {
  player_points: 'Points',
  player_rebounds: 'Rebounds',
  player_assists: 'Assists',
  player_threes: '3-Pointers Made',
  player_blocks: 'Blocks',
  player_steals: 'Steals',
  player_pass_tds: 'Passing TDs',
  player_rush_yds: 'Rushing Yards',
  player_reception_yds: 'Receiving Yards',
}

/** Returns true if `value` is a recognized PropMarket key. */
export function isPropMarket(value: string): value is PropMarket {
  const all: string[] = [...NBA_PROP_MARKETS, ...NFL_PROP_MARKETS]
  return all.includes(value)
}

// ---------------------------------------------------------------------------
// Normalized player prop types
// ---------------------------------------------------------------------------

/** One bookmaker's over/under line for a single player prop. */
export interface NormalizedPropLine {
  /** Bookmaker key (e.g. "draftkings"). */
  bookmaker: string
  /** The over/under line value (e.g. 24.5 for points). */
  line: number
  /** American odds for the over. */
  overOdds: number | null
  /** American odds for the under. */
  underOdds: number | null
  /** ISO-8601 timestamp of when this bookmaker last updated. */
  lastUpdated: string
}

/** Aggregated prop offering for a single player across all bookmakers. */
export interface NormalizedPlayerProp {
  /** Player's full name as returned by The Odds API. */
  playerName: string
  /** The market being offered (e.g. "player_points"). */
  market: PropMarket
  /** All bookmaker lines for this player+market combination. */
  bookmakers: NormalizedPropLine[]
  /** Best (highest) over odds across all bookmakers. */
  bestOverOdds: number | null
  /** Best (highest) under odds across all bookmakers. */
  bestUnderOdds: number | null
  /** Most common line value across bookmakers (consensus line). */
  consensusLine: number | null
}

/** Full prop odds result for one game. */
export interface PropOddsResult {
  /** The Odds API game identifier. */
  gameId: string
  sport: Sport
  homeTeam: string
  awayTeam: string
  commenceTime: string
  /** All player props grouped by player name + market. */
  props: NormalizedPlayerProp[]
  /** Whether this data came from cache. */
  fromCache: boolean
  /** Whether the cache entry is still within TTL. */
  isFresh: boolean
  /** ISO-8601 timestamp of when the cache entry was written. */
  cachedAt?: string
  /** Current monthly API call count. */
  apiUsageCount: number
  /** Whether usage has crossed the 80% warning threshold. */
  usageWarning: boolean
  /** Human-readable message when serving stale or cached data. */
  dataNotice?: string
}

// ---------------------------------------------------------------------------
// Raw Odds API player prop response shapes
// ---------------------------------------------------------------------------

/**
 * Raw bookmaker entry from The Odds API player props endpoint.
 * Prop markets use `description` (player name) on each outcome instead of
 * the game-level `home_team` / `away_team` naming convention.
 */
export interface PropApiOutcome {
  name: 'Over' | 'Under'
  description: string  // player name
  price: number
  point: number
}

export interface PropApiMarket {
  key: PropMarket
  last_update: string
  outcomes: PropApiOutcome[]
}

export interface PropApiBookmaker {
  key: string
  title: string
  last_update: string
  markets: PropApiMarket[]
}

export interface PropApiGame {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: PropApiBookmaker[]
}
