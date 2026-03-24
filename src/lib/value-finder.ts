/**
 * Value Finder — Surfaces the best betting opportunities across all games.
 *
 * Combines signals from multiple sources:
 * - +EV scanner results
 * - Key line discrepancies (books disagree)
 * - Bookmaker disagreement (high odds variance)
 * - Steam move indicators
 *
 * Returns a ranked list of "value plays" for the dashboard.
 *
 * Pure functions, no side effects or API calls.
 */

import { americanToImplied } from '@/lib/odds'
import { scanForEV, type EVOpportunity } from '@/lib/ev-scanner'
import { analyzeLineShop, type KeyLineDiscrepancy } from '@/lib/line-shopping'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValuePlay {
  /** Unique identifier for deduplication */
  id: string
  game: NormalizedGame
  /** Why this is a value play */
  reason: ValueReason
  /** Composite score (0-100) — higher = stronger value signal */
  score: number
  /** Human-readable summary */
  summary: string
  /** Side to consider (home or away), if applicable */
  side?: 'home' | 'away'
  /** The bookmaker with the best line */
  bestBook?: string
  /** The best odds available */
  bestOdds?: number
}

export type ValueReason =
  | 'positive-ev'
  | 'key-line-discrepancy'
  | 'bookmaker-disagreement'
  | 'low-juice'

export interface ValueFinderResult {
  plays: ValuePlay[]
  gamesAnalyzed: number
  timestamp: string
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Find the best value plays across all provided games.
 * Returns plays sorted by score (highest first), deduplicated per game.
 */
export function findValuePlays(games: NormalizedGame[]): ValueFinderResult {
  const plays: ValuePlay[] = []

  // 1. Scan for +EV opportunities
  const evResult = scanForEV(games)
  for (const opp of evResult.opportunities) {
    plays.push(evOpportunityToPlay(opp))
  }

  // 2. Check each game for line discrepancies and bookmaker disagreement
  for (const game of games) {
    const shop = analyzeLineShop(game)

    // Key line discrepancies
    for (const disc of shop.keyLineDiscrepancies) {
      if (disc.crossesKeyNumber) {
        plays.push(keyLineDiscrepancyToPlay(game, disc))
      }
    }

    // Bookmaker disagreement (high moneyline odds variance)
    const disagreement = measureBookmakerDisagreement(game)
    if (disagreement.score >= 30) {
      plays.push(disagreement)
    }

    // Low juice opportunities
    if (game.bookmakers.length >= 3) {
      const lowJuice = findLowJuicePlay(game)
      if (lowJuice) plays.push(lowJuice)
    }
  }

  // Sort by score descending
  plays.sort((a, b) => b.score - a.score)

  // Deduplicate: keep only the highest-scored play per game+side combination
  const seen = new Set<string>()
  const deduplicated = plays.filter((play) => {
    const key = `${play.game.id}-${play.side ?? 'any'}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    plays: deduplicated.slice(0, 20), // Top 20
    gamesAnalyzed: games.length,
    timestamp: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

function evOpportunityToPlay(opp: EVOpportunity): ValuePlay {
  return {
    id: `ev-${opp.game.id}-${opp.side}-${opp.bookmaker}`,
    game: opp.game,
    reason: 'positive-ev',
    score: Math.min(100, Math.round(opp.ev * 15)), // 1% EV = 15 points
    summary: `${opp.team} ${opp.side === 'home' ? '(H)' : '(A)'} at ${formatOddsShort(opp.bookOdds)} on ${opp.bookmaker} — ${opp.ev.toFixed(1)}% +EV vs fair odds ${formatOddsShort(opp.fairOdds)}`,
    side: opp.side,
    bestBook: opp.bookmaker,
    bestOdds: opp.bookOdds,
  }
}

function keyLineDiscrepancyToPlay(game: NormalizedGame, disc: KeyLineDiscrepancy): ValuePlay {
  const lines = [...new Set(disc.lines.map((l) => l.line))].sort((a, b) => a - b)
  return {
    id: `disc-${game.id}-${disc.market}`,
    game,
    reason: 'key-line-discrepancy',
    score: disc.crossesKeyNumber ? 60 : 35,
    summary: `${disc.market === 'spread' ? 'Spread' : 'Total'} varies ${disc.range} pts across books (${lines.join(' / ')})${disc.crossesKeyNumber ? ` — crosses key number ${disc.keyNumber}` : ''}`,
  }
}

function measureBookmakerDisagreement(game: NormalizedGame): ValuePlay {
  const homeImplieds: number[] = []
  const awayImplieds: number[] = []

  for (const bk of game.bookmakers) {
    if (bk.moneyline?.home != null) {
      homeImplieds.push(americanToImplied(bk.moneyline.home))
    }
    if (bk.moneyline?.away != null) {
      awayImplieds.push(americanToImplied(bk.moneyline.away))
    }
  }

  if (homeImplieds.length < 2) {
    return {
      id: `disagree-${game.id}`,
      game,
      reason: 'bookmaker-disagreement',
      score: 0,
      summary: 'Not enough bookmakers to measure disagreement',
    }
  }

  const homeStdDev = standardDeviation(homeImplieds)
  const awayStdDev = standardDeviation(awayImplieds)
  const maxStdDev = Math.max(homeStdDev, awayStdDev)

  // Convert std dev to a score (0.02 std dev = moderate disagreement)
  const score = Math.min(100, Math.round(maxStdDev * 2000))

  const side = homeStdDev > awayStdDev ? 'home' : 'away'

  return {
    id: `disagree-${game.id}`,
    game,
    reason: 'bookmaker-disagreement',
    score,
    summary: `Books disagree on ${game.homeTeam} vs ${game.awayTeam} — ${(maxStdDev * 100).toFixed(1)}% implied probability variance`,
    side: side as 'home' | 'away',
  }
}

function findLowJuicePlay(game: NormalizedGame): ValuePlay | null {
  let lowestJuice = Infinity
  let bestBook = ''

  for (const bk of game.bookmakers) {
    if (bk.moneyline?.home != null && bk.moneyline?.away != null) {
      const homeImpl = americanToImplied(bk.moneyline.home)
      const awayImpl = americanToImplied(bk.moneyline.away)
      const juice = (homeImpl + awayImpl - 1) * 100
      if (juice < lowestJuice) {
        lowestJuice = juice
        bestBook = bk.bookmaker
      }
    }
  }

  // Only surface if juice is notably low (< 3%)
  if (lowestJuice >= 3 || !bestBook) return null

  return {
    id: `juice-${game.id}`,
    game,
    reason: 'low-juice',
    score: Math.round(Math.max(0, 30 - lowestJuice * 10)),
    summary: `${bestBook} has only ${lowestJuice.toFixed(2)}% juice on ${game.homeTeam} vs ${game.awayTeam}`,
    bestBook,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function formatOddsShort(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`
}
