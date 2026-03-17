/**
 * +EV (Positive Expected Value) Scanner
 *
 * Calculates fair odds from multi-book consensus, then flags when any
 * individual book offers odds above fair value (positive EV).
 *
 * Methodology:
 * 1. Collect implied probabilities from all bookmakers for each side
 * 2. Average the implied probabilities to estimate "market consensus"
 * 3. Remove the vig (overround) to get "fair" (no-vig) probabilities
 * 4. Convert fair probabilities back to American odds
 * 5. If a book's odds are better than fair odds → positive EV
 */

import { americanToImplied, impliedToAmerican } from '@/lib/odds'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

export interface EVOpportunity {
  game: NormalizedGame
  market: 'moneyline'
  side: 'home' | 'away'
  team: string
  bookmaker: string
  bookOdds: number
  fairOdds: number
  ev: number // percentage, e.g. 3.5 means +3.5% EV
  fairProbability: number // 0-1
  bookImplied: number // 0-1
}

export interface EVScanResult {
  opportunities: EVOpportunity[]
  gamesScanned: number
  totalBooks: number
}

const MIN_BOOKMAKERS = 3
const MIN_EV_THRESHOLD = 1.0 // Only flag bets with >= 1% EV

/**
 * Calculate fair (no-vig) probabilities from a set of bookmaker odds.
 *
 * Method: Average the implied probabilities, then normalize to remove vig.
 */
function calculateFairProbabilities(
  bookmakers: NormalizedBookmakerOdds[]
): { home: number; away: number } | null {
  const homeImplied: number[] = []
  const awayImplied: number[] = []

  for (const bk of bookmakers) {
    if (bk.moneyline?.home != null) {
      homeImplied.push(americanToImplied(bk.moneyline.home))
    }
    if (bk.moneyline?.away != null) {
      awayImplied.push(americanToImplied(bk.moneyline.away))
    }
  }

  if (homeImplied.length < MIN_BOOKMAKERS || awayImplied.length < MIN_BOOKMAKERS) {
    return null
  }

  // Average implied probabilities (includes vig)
  const avgHome = homeImplied.reduce((s, v) => s + v, 0) / homeImplied.length
  const avgAway = awayImplied.reduce((s, v) => s + v, 0) / awayImplied.length

  // The overround (vig) is the amount by which probabilities sum to > 1
  const overround = avgHome + avgAway
  if (overround <= 0) return null

  // Remove vig by normalizing to sum to 1
  return {
    home: avgHome / overround,
    away: avgAway / overround,
  }
}

/**
 * Scan all games for positive EV moneyline opportunities.
 */
export function scanForEV(games: NormalizedGame[]): EVScanResult {
  const opportunities: EVOpportunity[] = []
  let totalBooks = 0

  for (const game of games) {
    if (game.bookmakers.length < MIN_BOOKMAKERS) continue
    totalBooks += game.bookmakers.length

    const fair = calculateFairProbabilities(game.bookmakers)
    if (!fair) continue

    // Check each bookmaker for +EV on each side
    for (const bk of game.bookmakers) {
      // Home side
      if (bk.moneyline?.home != null) {
        const bookImplied = americanToImplied(bk.moneyline.home)
        const ev = ((fair.home / bookImplied) - 1) * 100

        if (ev >= MIN_EV_THRESHOLD) {
          opportunities.push({
            game,
            market: 'moneyline',
            side: 'home',
            team: game.homeTeam,
            bookmaker: bk.bookmaker,
            bookOdds: bk.moneyline.home,
            fairOdds: impliedToAmerican(fair.home),
            ev: Math.round(ev * 10) / 10,
            fairProbability: Math.round(fair.home * 1000) / 1000,
            bookImplied: Math.round(bookImplied * 1000) / 1000,
          })
        }
      }

      // Away side
      if (bk.moneyline?.away != null) {
        const bookImplied = americanToImplied(bk.moneyline.away)
        const ev = ((fair.away / bookImplied) - 1) * 100

        if (ev >= MIN_EV_THRESHOLD) {
          opportunities.push({
            game,
            market: 'moneyline',
            side: 'away',
            team: game.awayTeam,
            bookmaker: bk.bookmaker,
            bookOdds: bk.moneyline.away,
            fairOdds: impliedToAmerican(fair.away),
            ev: Math.round(ev * 10) / 10,
            fairProbability: Math.round(fair.away * 1000) / 1000,
            bookImplied: Math.round(bookImplied * 1000) / 1000,
          })
        }
      }
    }
  }

  // Sort by EV descending (best opportunities first)
  opportunities.sort((a, b) => b.ev - a.ev)

  return {
    opportunities,
    gamesScanned: games.length,
    totalBooks,
  }
}

/**
 * Detect arbitrage opportunities across bookmakers.
 *
 * An arbitrage exists when the sum of the best implied probabilities
 * across all bookmakers for each outcome is less than 1 (100%).
 */
export interface ArbitrageOpportunity {
  game: NormalizedGame
  homeBest: { bookmaker: string; odds: number; implied: number }
  awayBest: { bookmaker: string; odds: number; implied: number }
  totalImplied: number // < 1 means arb exists
  profit: number // percentage profit guaranteed
}

export function detectArbitrage(games: NormalizedGame[]): ArbitrageOpportunity[] {
  const arbs: ArbitrageOpportunity[] = []

  for (const game of games) {
    if (game.bookmakers.length < 2) continue

    let bestHome: { bookmaker: string; odds: number; implied: number } | null = null
    let bestAway: { bookmaker: string; odds: number; implied: number } | null = null

    for (const bk of game.bookmakers) {
      if (bk.moneyline?.home != null) {
        const implied = americanToImplied(bk.moneyline.home)
        if (!bestHome || implied < bestHome.implied) {
          bestHome = { bookmaker: bk.bookmaker, odds: bk.moneyline.home, implied }
        }
      }
      if (bk.moneyline?.away != null) {
        const implied = americanToImplied(bk.moneyline.away)
        if (!bestAway || implied < bestAway.implied) {
          bestAway = { bookmaker: bk.bookmaker, odds: bk.moneyline.away, implied }
        }
      }
    }

    if (!bestHome || !bestAway) continue

    const totalImplied = bestHome.implied + bestAway.implied

    if (totalImplied < 1) {
      arbs.push({
        game,
        homeBest: bestHome,
        awayBest: bestAway,
        totalImplied: Math.round(totalImplied * 10000) / 10000,
        profit: Math.round((1 / totalImplied - 1) * 10000) / 100,
      })
    }
  }

  return arbs.sort((a, b) => b.profit - a.profit)
}

export { MIN_BOOKMAKERS, MIN_EV_THRESHOLD }
