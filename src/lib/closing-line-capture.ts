/**
 * Closing Line Capture — Automatically records the last known odds
 * before a game starts for CLV calculation.
 *
 * Works with cached odds data to find the most recent odds snapshot
 * for each pending pick's game, and writes closing_odds to the pick record.
 *
 * Pure helper functions + one Supabase-integrated capture function.
 */

import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingPickForCapture {
  id: string
  external_game_id: string
  pick_type: string
  pick_team: string | null
  odds: number
  closing_odds?: number | null
  game_date: string
}

export interface ClosingLineMatch {
  pickId: string
  closingOdds: number
  bookmaker: string
  /** How this compares to the bet odds: positive = positive CLV */
  clv: number
}

// ---------------------------------------------------------------------------
// Core logic (pure functions)
// ---------------------------------------------------------------------------

/**
 * For each pending pick, find the best matching closing line from cached odds.
 *
 * Matching logic:
 * - Match pick's external_game_id to game.id
 * - For moneyline picks: use the moneyline odds for the pick's team side
 * - For spread picks: use the spread odds for the pick's team side
 * - For over/under picks: use the total over/under odds
 * - Use the consensus (average) across bookmakers as the closing line
 *
 * Only processes picks that don't already have closing_odds set.
 */
export function matchClosingLines(
  pendingPicks: PendingPickForCapture[],
  games: NormalizedGame[]
): ClosingLineMatch[] {
  const matches: ClosingLineMatch[] = []
  const gameMap = new Map(games.map((g) => [g.id, g]))

  for (const pick of pendingPicks) {
    // Skip picks that already have closing odds
    if (pick.closing_odds != null) continue

    const game = gameMap.get(pick.external_game_id)
    if (!game || game.bookmakers.length === 0) continue

    // Determine which side the pick is on
    const isHome = pick.pick_team
      ? normalizeTeamName(pick.pick_team) === normalizeTeamName(game.homeTeam)
      : null

    const closingOdds = getConsensusOdds(game.bookmakers, pick.pick_type, isHome)
    if (closingOdds === null) continue

    // Calculate CLV: positive means the bettor got better odds than the closing line
    const clv = calculateCLV(pick.odds, closingOdds)

    // Find which bookmaker is closest to the consensus
    const closestBook = findClosestBookmaker(game.bookmakers, pick.pick_type, isHome, closingOdds)

    matches.push({
      pickId: pick.id,
      closingOdds: Math.round(closingOdds),
      bookmaker: closestBook,
      clv: Math.round(clv * 100) / 100,
    })
  }

  return matches
}

/**
 * Get the consensus (average) odds across bookmakers for a specific market/side.
 */
function getConsensusOdds(
  bookmakers: NormalizedBookmakerOdds[],
  pickType: string,
  isHome: boolean | null
): number | null {
  const odds: number[] = []

  for (const bk of bookmakers) {
    const value = extractOdds(bk, pickType, isHome)
    if (value !== null) odds.push(value)
  }

  if (odds.length === 0) return null

  return odds.reduce((s, v) => s + v, 0) / odds.length
}

/**
 * Extract the relevant odds from a bookmaker based on pick type and side.
 */
function extractOdds(
  bk: NormalizedBookmakerOdds,
  pickType: string,
  isHome: boolean | null
): number | null {
  switch (pickType) {
    case 'moneyline':
      if (isHome === true) return bk.moneyline?.home ?? null
      if (isHome === false) return bk.moneyline?.away ?? null
      return null

    case 'spread':
      if (isHome === true) return bk.spread?.homeOdds ?? null
      if (isHome === false) return bk.spread?.awayOdds ?? null
      return null

    case 'over':
      return bk.total?.overOdds ?? null

    case 'under':
      return bk.total?.underOdds ?? null

    default:
      return null
  }
}

/**
 * Calculate CLV (Closing Line Value) in implied probability terms.
 *
 * Positive CLV = bettor got better odds than closing line (good).
 * Negative CLV = bettor got worse odds than closing line (bad).
 */
export function calculateCLV(betOdds: number, closingOdds: number): number {
  const betImplied = impliedProb(betOdds)
  const closeImplied = impliedProb(closingOdds)

  // CLV = close implied - bet implied
  // If closing line implied is higher (shorter odds), it means the market moved
  // toward your bet, which means you had positive CLV
  return (closeImplied - betImplied) * 100
}

/**
 * Find the bookmaker whose odds are closest to the consensus.
 */
function findClosestBookmaker(
  bookmakers: NormalizedBookmakerOdds[],
  pickType: string,
  isHome: boolean | null,
  consensus: number
): string {
  let closest = bookmakers[0]?.bookmaker ?? 'unknown'
  let minDiff = Infinity

  for (const bk of bookmakers) {
    const value = extractOdds(bk, pickType, isHome)
    if (value === null) continue
    const diff = Math.abs(value - consensus)
    if (diff < minDiff) {
      minDiff = diff
      closest = bk.bookmaker
    }
  }

  return closest
}

/**
 * Normalize team name for fuzzy matching.
 */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function impliedProb(americanOdds: number): number {
  if (americanOdds < 0) return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
  return 100 / (americanOdds + 100)
}
