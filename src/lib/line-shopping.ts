/**
 * Line Shopping Helper — Find the best available odds across bookmakers.
 *
 * Shows how much value you gain by shopping lines instead of using one book.
 * Highlights when books disagree on spread/total numbers (key lines).
 * Identifies "stale" books that haven't updated their lines.
 *
 * Pure functions, no side effects.
 */

import { americanToImplied, americanToDecimal } from '@/lib/odds'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LineShopResult {
  /** Best available moneyline for each side */
  moneyline: {
    home: BestLine | null
    away: BestLine | null
  }
  /** Best available spread for each side */
  spread: {
    home: BestSpreadLine | null
    away: BestSpreadLine | null
  }
  /** Best available total for over/under */
  total: {
    over: BestTotalLine | null
    under: BestTotalLine | null
  }
  /** Key line discrepancies — when books post different numbers */
  keyLineDiscrepancies: KeyLineDiscrepancy[]
  /** Total savings in implied probability from shopping vs. worst line */
  edgeSummary: EdgeSummary
}

export interface BestLine {
  bookmaker: string
  odds: number
  implied: number
  /** How much better this is vs. the worst available line (in implied prob %) */
  edgeVsWorst: number
  /** How much better this is vs. the average line */
  edgeVsAvg: number
  allBooks: { bookmaker: string; odds: number; implied: number }[]
}

export interface BestSpreadLine {
  bookmaker: string
  line: number
  odds: number
  implied: number
  edgeVsWorst: number
  allBooks: { bookmaker: string; line: number; odds: number }[]
}

export interface BestTotalLine {
  bookmaker: string
  line: number
  odds: number
  implied: number
  edgeVsWorst: number
  allBooks: { bookmaker: string; line: number; odds: number }[]
}

export interface KeyLineDiscrepancy {
  market: 'spread' | 'total'
  /** The different line values posted by different books */
  lines: { bookmaker: string; line: number }[]
  /** The range of line values (max - min) */
  range: number
  /** Whether this crosses a key number (3, 7 for NFL; 0.5 for NBA) */
  crossesKeyNumber: boolean
  /** The key number being crossed, if applicable */
  keyNumber?: number
}

export interface EdgeSummary {
  /** Average edge (implied prob %) gained by shopping across all markets */
  avgEdge: number
  /** Total number of markets where shopping found a better line */
  marketsWithEdge: number
  /** Total markets analyzed */
  totalMarkets: number
}

// ---------------------------------------------------------------------------
// Key numbers by sport (spread values that matter most)
// ---------------------------------------------------------------------------

const KEY_NUMBERS: Record<string, number[]> = {
  nfl: [3, 7, 10, 14],
  nba: [1, 2, 3, 4, 5, 6, 7],
  mlb: [1, 1.5],
  nhl: [1, 1.5],
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Analyze a game for line shopping opportunities.
 * Returns the best lines, discrepancies, and edge summary.
 */
export function analyzeLineShop(game: NormalizedGame): LineShopResult {
  const moneylineHome = findBestMoneyline(game.bookmakers, 'home')
  const moneylineAway = findBestMoneyline(game.bookmakers, 'away')
  const spreadHome = findBestSpread(game.bookmakers, 'home')
  const spreadAway = findBestSpread(game.bookmakers, 'away')
  const totalOver = findBestTotal(game.bookmakers, 'over')
  const totalUnder = findBestTotal(game.bookmakers, 'under')

  const discrepancies = findKeyLineDiscrepancies(game)

  // Calculate edge summary
  const edges: number[] = []
  if (moneylineHome) edges.push(moneylineHome.edgeVsWorst)
  if (moneylineAway) edges.push(moneylineAway.edgeVsWorst)
  if (spreadHome) edges.push(spreadHome.edgeVsWorst)
  if (spreadAway) edges.push(spreadAway.edgeVsWorst)
  if (totalOver) edges.push(totalOver.edgeVsWorst)
  if (totalUnder) edges.push(totalUnder.edgeVsWorst)

  const marketsWithEdge = edges.filter((e) => e > 0.5).length
  const avgEdge = edges.length > 0
    ? Math.round((edges.reduce((s, v) => s + v, 0) / edges.length) * 100) / 100
    : 0

  return {
    moneyline: { home: moneylineHome, away: moneylineAway },
    spread: { home: spreadHome, away: spreadAway },
    total: { over: totalOver, under: totalUnder },
    keyLineDiscrepancies: discrepancies,
    edgeSummary: {
      avgEdge,
      marketsWithEdge,
      totalMarkets: edges.length,
    },
  }
}

function findBestMoneyline(
  bookmakers: NormalizedBookmakerOdds[],
  side: 'home' | 'away'
): BestLine | null {
  const entries: { bookmaker: string; odds: number; implied: number }[] = []

  for (const bk of bookmakers) {
    const odds = side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (odds != null) {
      entries.push({
        bookmaker: bk.bookmaker,
        odds,
        implied: Math.round(americanToImplied(odds) * 10000) / 10000,
      })
    }
  }

  if (entries.length === 0) return null

  // Best odds = lowest implied probability (best payout)
  entries.sort((a, b) => a.implied - b.implied)
  const best = entries[0]
  const worst = entries[entries.length - 1]
  const avgImplied = entries.reduce((s, e) => s + e.implied, 0) / entries.length

  return {
    bookmaker: best.bookmaker,
    odds: best.odds,
    implied: best.implied,
    edgeVsWorst: Math.round((worst.implied - best.implied) * 10000) / 100,
    edgeVsAvg: Math.round((avgImplied - best.implied) * 10000) / 100,
    allBooks: entries,
  }
}

function findBestSpread(
  bookmakers: NormalizedBookmakerOdds[],
  side: 'home' | 'away'
): BestSpreadLine | null {
  const entries: { bookmaker: string; line: number; odds: number; implied: number }[] = []

  for (const bk of bookmakers) {
    if (!bk.spread) continue
    const line = side === 'home' ? bk.spread.homeLine : bk.spread.awayLine
    const odds = side === 'home' ? bk.spread.homeOdds : bk.spread.awayOdds
    if (line != null && odds != null) {
      entries.push({
        bookmaker: bk.bookmaker,
        line,
        odds,
        implied: Math.round(americanToImplied(odds) * 10000) / 10000,
      })
    }
  }

  if (entries.length === 0) return null

  // For spreads, "best" considers both line and odds
  // A more favorable line (higher for the side you're betting) is better
  // e.g., getting +3.5 instead of +3 is better for the underdog
  // Sort by: better line first, then lower implied
  entries.sort((a, b) => {
    // For home bets: more negative is worse (giving points), more positive is better
    // For away bets: more positive is better (getting points)
    // Actually, for the bettor: higher line = more points received = better
    if (a.line !== b.line) return b.line - a.line // higher line first
    return a.implied - b.implied // lower implied = better odds
  })

  const best = entries[0]
  const worst = entries[entries.length - 1]

  return {
    bookmaker: best.bookmaker,
    line: best.line,
    odds: best.odds,
    implied: best.implied,
    edgeVsWorst: Math.round((worst.implied - best.implied) * 10000) / 100,
    allBooks: entries.map(({ bookmaker, line, odds }) => ({ bookmaker, line, odds })),
  }
}

function findBestTotal(
  bookmakers: NormalizedBookmakerOdds[],
  side: 'over' | 'under'
): BestTotalLine | null {
  const entries: { bookmaker: string; line: number; odds: number; implied: number }[] = []

  for (const bk of bookmakers) {
    if (!bk.total) continue
    const odds = side === 'over' ? bk.total.overOdds : bk.total.underOdds
    const line = bk.total.line
    if (odds != null && line != null) {
      entries.push({
        bookmaker: bk.bookmaker,
        line,
        odds,
        implied: Math.round(americanToImplied(odds) * 10000) / 10000,
      })
    }
  }

  if (entries.length === 0) return null

  // For totals: over bettors want a lower line, under bettors want a higher line
  // Sort by: best line for the side, then lower implied
  entries.sort((a, b) => {
    if (a.line !== b.line) {
      return side === 'over' ? a.line - b.line : b.line - a.line
    }
    return a.implied - b.implied
  })

  const best = entries[0]
  const worst = entries[entries.length - 1]

  return {
    bookmaker: best.bookmaker,
    line: best.line,
    odds: best.odds,
    implied: best.implied,
    edgeVsWorst: Math.round((worst.implied - best.implied) * 10000) / 100,
    allBooks: entries.map(({ bookmaker, line, odds }) => ({ bookmaker, line, odds })),
  }
}

/**
 * Find cases where bookmakers disagree on the actual line number
 * (not just the price). This is where real value lives.
 */
function findKeyLineDiscrepancies(game: NormalizedGame): KeyLineDiscrepancy[] {
  const discrepancies: KeyLineDiscrepancy[] = []
  const sportKeys = KEY_NUMBERS[game.sport] ?? []

  // Check spread lines
  const spreadLines: { bookmaker: string; line: number }[] = []
  for (const bk of game.bookmakers) {
    if (bk.spread?.homeLine != null) {
      spreadLines.push({ bookmaker: bk.bookmaker, line: bk.spread.homeLine })
    }
  }

  if (spreadLines.length >= 2) {
    const uniqueLines = [...new Set(spreadLines.map((sl) => sl.line))]
    if (uniqueLines.length > 1) {
      const min = Math.min(...uniqueLines)
      const max = Math.max(...uniqueLines)
      const range = Math.round((max - min) * 10) / 10

      // Check if the range crosses a key number
      let crossesKey = false
      let keyNum: number | undefined
      for (const kn of sportKeys) {
        if ((min < -kn && max >= -kn) || (min <= kn && max > kn)) {
          crossesKey = true
          keyNum = kn
          break
        }
      }

      discrepancies.push({
        market: 'spread',
        lines: spreadLines,
        range,
        crossesKeyNumber: crossesKey,
        keyNumber: keyNum,
      })
    }
  }

  // Check total lines
  const totalLines: { bookmaker: string; line: number }[] = []
  for (const bk of game.bookmakers) {
    if (bk.total?.line != null) {
      totalLines.push({ bookmaker: bk.bookmaker, line: bk.total.line })
    }
  }

  if (totalLines.length >= 2) {
    const uniqueLines = [...new Set(totalLines.map((tl) => tl.line))]
    if (uniqueLines.length > 1) {
      const min = Math.min(...uniqueLines)
      const max = Math.max(...uniqueLines)
      const range = Math.round((max - min) * 10) / 10

      discrepancies.push({
        market: 'total',
        lines: totalLines,
        range,
        crossesKeyNumber: false, // totals don't have "key numbers" the same way
      })
    }
  }

  return discrepancies
}

/**
 * Calculate the "juice" (vig) for a two-sided market.
 * Returns the overround as a percentage (e.g., 4.76 for -110/-110).
 */
export function calculateJuice(oddsA: number, oddsB: number): number {
  const implA = americanToImplied(oddsA)
  const implB = americanToImplied(oddsB)
  return Math.round((implA + implB - 1) * 10000) / 100
}

/**
 * Find the bookmaker with the lowest juice (vig) for a given game's moneyline.
 */
export function findLowestJuiceBook(
  bookmakers: NormalizedBookmakerOdds[]
): { bookmaker: string; juice: number; homeOdds: number; awayOdds: number } | null {
  let best: { bookmaker: string; juice: number; homeOdds: number; awayOdds: number } | null = null

  for (const bk of bookmakers) {
    if (bk.moneyline?.home != null && bk.moneyline?.away != null) {
      const juice = calculateJuice(bk.moneyline.home, bk.moneyline.away)
      if (!best || juice < best.juice) {
        best = {
          bookmaker: bk.bookmaker,
          juice,
          homeOdds: bk.moneyline.home,
          awayOdds: bk.moneyline.away,
        }
      }
    }
  }

  return best
}

/**
 * Compare the payout difference between two odds for a $100 bet.
 * Returns the dollar difference.
 */
export function payoutDifference(oddsA: number, oddsB: number): number {
  const payA = (americanToDecimal(oddsA) - 1) * 100
  const payB = (americanToDecimal(oddsB) - 1) * 100
  return Math.round(Math.abs(payA - payB) * 100) / 100
}
