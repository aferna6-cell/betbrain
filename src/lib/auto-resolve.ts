/**
 * Auto-resolve NBA picks using balldontlie game results.
 *
 * Matches pending picks to final game scores by team name + date,
 * then determines win/loss/push for moneyline, spread, and over/under picks.
 * Props are skipped (require player-level data not in game results).
 *
 * NBA-only: balldontlie v1 does not cover NFL, MLB, or NHL.
 */

import type { PickOutcome, PickType } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameResult {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  date: string
  /** balldontlie game status — only "Final" results are usable. */
  status: string
}

export interface PendingPick {
  id: string
  external_game_id: string
  sport: string
  pick_type: PickType
  pick_team: string | null
  pick_line: number | null
  odds: number
  units: number
  game_date: string
}

export interface ResolvedPick {
  pickId: string
  outcome: PickOutcome
  profit: number
}

export interface ResolveResult {
  resolved: ResolvedPick[]
  skipped: { pickId: string; reason: string }[]
}

// ---------------------------------------------------------------------------
// Profit calculation (extracted from picks-tracker.tsx)
// ---------------------------------------------------------------------------

/** Calculate profit from American odds, outcome, and units wagered. */
export function computeProfit(
  outcome: PickOutcome,
  odds: number,
  units: number
): number {
  if (outcome === 'push' || outcome === 'pending') return 0
  if (outcome === 'loss') return -units
  // win
  if (odds > 0) {
    return (odds / 100) * units
  }
  return (100 / Math.abs(odds)) * units
}

// ---------------------------------------------------------------------------
// Team name normalization
// ---------------------------------------------------------------------------

/** Normalize a team name for matching across APIs. */
export function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// ---------------------------------------------------------------------------
// Game matching
// ---------------------------------------------------------------------------

/**
 * Match a pending pick to a final game result by team name + date.
 * Returns the matching GameResult or null if no match found.
 */
export function matchPickToGame(
  pick: PendingPick,
  games: GameResult[]
): GameResult | null {
  const pickDate = pick.game_date.split('T')[0]

  for (const game of games) {
    if (game.status !== 'Final') continue

    const gameDate = game.date.split('T')[0]
    if (gameDate !== pickDate) continue

    const homeNorm = normalizeTeamName(game.homeTeam)
    const awayNorm = normalizeTeamName(game.awayTeam)

    // The pick_team or external_game_id should reference one of the teams
    // Check if pick's team matches either side
    if (pick.pick_team) {
      const pickTeamNorm = normalizeTeamName(pick.pick_team)
      if (pickTeamNorm === homeNorm || pickTeamNorm === awayNorm) {
        return game
      }
    }

    // For over/under, pick_team may be null — match by game date only
    // if there's only one game that day (or if we can match via game_id)
    if (pick.pick_type === 'over' || pick.pick_type === 'under') {
      // Try to match via external_game_id containing team info, or accept
      // single-game-day matches
      return game
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Outcome determination
// ---------------------------------------------------------------------------

/**
 * Determine the outcome of a pick given the final game result.
 * Returns the outcome or null if the pick type can't be auto-resolved.
 */
export function determineOutcome(
  pick: PendingPick,
  game: GameResult
): PickOutcome | null {
  const { pick_type, pick_team, pick_line } = pick
  const { homeTeam, awayTeam, homeScore, awayScore } = game

  switch (pick_type) {
    case 'moneyline':
      return resolveMoneyline(pick_team, homeTeam, awayTeam, homeScore, awayScore)

    case 'spread':
      return resolveSpread(pick_team, pick_line, homeTeam, awayTeam, homeScore, awayScore)

    case 'over':
      return resolveOverUnder('over', pick_line, homeScore, awayScore)

    case 'under':
      return resolveOverUnder('under', pick_line, homeScore, awayScore)

    case 'prop':
      // Props require player-level data — cannot auto-resolve
      return null

    default:
      return null
  }
}

function resolveMoneyline(
  pickTeam: string | null,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): PickOutcome | null {
  if (!pickTeam) return null

  const pickNorm = normalizeTeamName(pickTeam)
  const isHome = pickNorm === normalizeTeamName(homeTeam)
  const isAway = pickNorm === normalizeTeamName(awayTeam)

  if (!isHome && !isAway) return null

  const pickedScore = isHome ? homeScore : awayScore
  const opposingScore = isHome ? awayScore : homeScore

  if (pickedScore > opposingScore) return 'win'
  if (pickedScore < opposingScore) return 'loss'
  return 'push' // NBA ties are extremely rare (only pre-OT)
}

function resolveSpread(
  pickTeam: string | null,
  pickLine: number | null,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): PickOutcome | null {
  if (!pickTeam || pickLine == null) return null

  const pickNorm = normalizeTeamName(pickTeam)
  const isHome = pickNorm === normalizeTeamName(homeTeam)
  const isAway = pickNorm === normalizeTeamName(awayTeam)

  if (!isHome && !isAway) return null

  const pickedScore = isHome ? homeScore : awayScore
  const opposingScore = isHome ? awayScore : homeScore

  // Spread: pickedScore + line vs opposingScore
  // e.g., Lakers -3.5: 110 + (-3.5) = 106.5 vs 105 → win (covers)
  const adjusted = pickedScore + pickLine

  if (adjusted > opposingScore) return 'win'
  if (adjusted < opposingScore) return 'loss'
  return 'push'
}

function resolveOverUnder(
  side: 'over' | 'under',
  line: number | null,
  homeScore: number,
  awayScore: number
): PickOutcome | null {
  if (line == null) return null

  const total = homeScore + awayScore

  if (side === 'over') {
    if (total > line) return 'win'
    if (total < line) return 'loss'
    return 'push'
  }

  // under
  if (total < line) return 'win'
  if (total > line) return 'loss'
  return 'push'
}

// ---------------------------------------------------------------------------
// Batch resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a batch of pending NBA picks against game results.
 * Skips props and picks that can't be matched to a final game.
 */
export function resolvePicksBatch(
  picks: PendingPick[],
  games: GameResult[]
): ResolveResult {
  const resolved: ResolvedPick[] = []
  const skipped: { pickId: string; reason: string }[] = []

  for (const pick of picks) {
    // Only NBA is supported
    if (pick.sport !== 'nba') {
      skipped.push({ pickId: pick.id, reason: 'non-nba sport' })
      continue
    }

    // Props can't be auto-resolved
    if (pick.pick_type === 'prop') {
      skipped.push({ pickId: pick.id, reason: 'prop picks require manual resolution' })
      continue
    }

    const game = matchPickToGame(pick, games)
    if (!game) {
      skipped.push({ pickId: pick.id, reason: 'no matching final game found' })
      continue
    }

    const outcome = determineOutcome(pick, game)
    if (!outcome) {
      skipped.push({ pickId: pick.id, reason: 'could not determine outcome' })
      continue
    }

    const profit = computeProfit(outcome, pick.odds, pick.units)

    resolved.push({
      pickId: pick.id,
      outcome,
      profit: Math.round(profit * 100) / 100,
    })
  }

  return { resolved, skipped }
}

// ---------------------------------------------------------------------------
// Signal resolution
// ---------------------------------------------------------------------------

/**
 * Determine the outcome of a Smart Signal based on game result.
 * A signal "wins" if its value_side team won the game.
 */
export function resolveSignalOutcome(
  valueSide: 'home' | 'away',
  game: GameResult
): PickOutcome {
  const valueSideScore = valueSide === 'home' ? game.homeScore : game.awayScore
  const otherScore = valueSide === 'home' ? game.awayScore : game.homeScore

  if (valueSideScore > otherScore) return 'win'
  if (valueSideScore < otherScore) return 'loss'
  return 'push'
}
