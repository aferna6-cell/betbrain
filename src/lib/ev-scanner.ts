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

// ---------------------------------------------------------------------------
// Multi-market arbitrage detection (spreads + totals)
// ---------------------------------------------------------------------------

export type ArbMarket = 'moneyline' | 'spread' | 'total'

export interface MultiMarketArb {
  game: NormalizedGame
  market: ArbMarket
  side1: { label: string; bookmaker: string; odds: number; implied: number; line?: number }
  side2: { label: string; bookmaker: string; odds: number; implied: number; line?: number }
  totalImplied: number
  profit: number // guaranteed profit %
  /** Optimal stake split for $100 total investment */
  stakes: { side1: number; side2: number; totalReturn: number }
}

/**
 * Calculate optimal stakes for a 2-way arbitrage.
 * Given two implied probabilities that sum to < 1, compute how much to
 * wager on each side so the payout is equal regardless of outcome.
 */
function calculateArbStakes(
  implied1: number,
  implied2: number,
  totalInvestment: number = 100
): { side1: number; side2: number; totalReturn: number } {
  const totalImplied = implied1 + implied2
  const stake1 = Math.round((implied1 / totalImplied) * totalInvestment * 100) / 100
  const stake2 = Math.round(totalInvestment * 100 - stake1 * 100) / 100
  const return1 = stake1 / implied1
  return {
    side1: stake1,
    side2: stake2,
    totalReturn: Math.round(return1 * 100) / 100,
  }
}

/**
 * Detect arbitrage opportunities across ALL markets: moneyline, spread, and totals.
 * Returns combined results sorted by profit descending.
 */
export function detectMultiMarketArbitrage(games: NormalizedGame[]): MultiMarketArb[] {
  const arbs: MultiMarketArb[] = []

  for (const game of games) {
    if (game.bookmakers.length < 2) continue

    // --- Moneyline arbs ---
    {
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

      if (bestHome && bestAway) {
        const totalImplied = bestHome.implied + bestAway.implied
        if (totalImplied < 1) {
          const stakes = calculateArbStakes(bestHome.implied, bestAway.implied)
          arbs.push({
            game,
            market: 'moneyline',
            side1: { label: game.homeTeam, ...bestHome },
            side2: { label: game.awayTeam, ...bestAway },
            totalImplied: Math.round(totalImplied * 10000) / 10000,
            profit: Math.round((1 / totalImplied - 1) * 10000) / 100,
            stakes,
          })
        }
      }
    }

    // --- Spread arbs (same line number, different books) ---
    {
      // Group by absolute spread line to find matching spread pairs
      const spreadsByLine = new Map<number, { bk: string; homeOdds: number; awayOdds: number; homeLine: number }[]>()
      for (const bk of game.bookmakers) {
        if (bk.spread?.homeLine != null && bk.spread?.homeOdds != null && bk.spread?.awayOdds != null) {
          const lineKey = Math.abs(bk.spread.homeLine)
          const existing = spreadsByLine.get(lineKey) || []
          existing.push({
            bk: bk.bookmaker,
            homeOdds: bk.spread.homeOdds,
            awayOdds: bk.spread.awayOdds,
            homeLine: bk.spread.homeLine,
          })
          spreadsByLine.set(lineKey, existing)
        }
      }

      for (const [, entries] of spreadsByLine) {
        if (entries.length < 2) continue
        // Find best home spread odds and best away spread odds
        let bestHomeSp: { bk: string; odds: number; implied: number; line: number } | null = null
        let bestAwaySp: { bk: string; odds: number; implied: number; line: number } | null = null

        for (const e of entries) {
          const homeImpl = americanToImplied(e.homeOdds)
          const awayImpl = americanToImplied(e.awayOdds)
          if (!bestHomeSp || homeImpl < bestHomeSp.implied) {
            bestHomeSp = { bk: e.bk, odds: e.homeOdds, implied: homeImpl, line: e.homeLine }
          }
          if (!bestAwaySp || awayImpl < bestAwaySp.implied) {
            bestAwaySp = { bk: e.bk, odds: e.awayOdds, implied: awayImpl, line: -e.homeLine }
          }
        }

        if (bestHomeSp && bestAwaySp) {
          const totalImplied = bestHomeSp.implied + bestAwaySp.implied
          if (totalImplied < 1) {
            const stakes = calculateArbStakes(bestHomeSp.implied, bestAwaySp.implied)
            arbs.push({
              game,
              market: 'spread',
              side1: {
                label: `${game.homeTeam} ${bestHomeSp.line > 0 ? '+' : ''}${bestHomeSp.line}`,
                bookmaker: bestHomeSp.bk,
                odds: bestHomeSp.odds,
                implied: bestHomeSp.implied,
                line: bestHomeSp.line,
              },
              side2: {
                label: `${game.awayTeam} ${bestAwaySp.line > 0 ? '+' : ''}${bestAwaySp.line}`,
                bookmaker: bestAwaySp.bk,
                odds: bestAwaySp.odds,
                implied: bestAwaySp.implied,
                line: bestAwaySp.line,
              },
              totalImplied: Math.round(totalImplied * 10000) / 10000,
              profit: Math.round((1 / totalImplied - 1) * 10000) / 100,
              stakes,
            })
          }
        }
      }
    }

    // --- Total arbs (same line number, different books) ---
    {
      const totalsByLine = new Map<number, { bk: string; overOdds: number; underOdds: number; line: number }[]>()
      for (const bk of game.bookmakers) {
        if (bk.total?.line != null && bk.total?.overOdds != null && bk.total?.underOdds != null) {
          const existing = totalsByLine.get(bk.total.line) || []
          existing.push({
            bk: bk.bookmaker,
            overOdds: bk.total.overOdds,
            underOdds: bk.total.underOdds,
            line: bk.total.line,
          })
          totalsByLine.set(bk.total.line, existing)
        }
      }

      for (const [totalLine, entries] of totalsByLine) {
        if (entries.length < 2) continue
        let bestOver: { bk: string; odds: number; implied: number } | null = null
        let bestUnder: { bk: string; odds: number; implied: number } | null = null

        for (const e of entries) {
          const overImpl = americanToImplied(e.overOdds)
          const underImpl = americanToImplied(e.underOdds)
          if (!bestOver || overImpl < bestOver.implied) {
            bestOver = { bk: e.bk, odds: e.overOdds, implied: overImpl }
          }
          if (!bestUnder || underImpl < bestUnder.implied) {
            bestUnder = { bk: e.bk, odds: e.underOdds, implied: underImpl }
          }
        }

        if (bestOver && bestUnder) {
          const totalImplied = bestOver.implied + bestUnder.implied
          if (totalImplied < 1) {
            const stakes = calculateArbStakes(bestOver.implied, bestUnder.implied)
            arbs.push({
              game,
              market: 'total',
              side1: {
                label: `Over ${totalLine}`,
                bookmaker: bestOver.bk,
                odds: bestOver.odds,
                implied: bestOver.implied,
                line: totalLine,
              },
              side2: {
                label: `Under ${totalLine}`,
                bookmaker: bestUnder.bk,
                odds: bestUnder.odds,
                implied: bestUnder.implied,
                line: totalLine,
              },
              totalImplied: Math.round(totalImplied * 10000) / 10000,
              profit: Math.round((1 / totalImplied - 1) * 10000) / 100,
              stakes,
            })
          }
        }
      }
    }
  }

  return arbs.sort((a, b) => b.profit - a.profit)
}

/**
 * Scan for +EV opportunities in spread and total markets (in addition to moneyline).
 */
export interface SpreadEVOpportunity {
  game: NormalizedGame
  market: 'spread'
  side: 'home' | 'away'
  team: string
  line: number
  bookmaker: string
  bookOdds: number
  fairOdds: number
  ev: number
  fairProbability: number
  bookImplied: number
}

export interface TotalEVOpportunity {
  game: NormalizedGame
  market: 'total'
  side: 'over' | 'under'
  totalLine: number
  bookmaker: string
  bookOdds: number
  fairOdds: number
  ev: number
  fairProbability: number
  bookImplied: number
}

export type AnyEVOpportunity = EVOpportunity | SpreadEVOpportunity | TotalEVOpportunity

export interface FullEVScanResult {
  moneyline: EVOpportunity[]
  spread: SpreadEVOpportunity[]
  total: TotalEVOpportunity[]
  allSorted: AnyEVOpportunity[]
  gamesScanned: number
}

/**
 * Scan all markets (moneyline + spread + total) for +EV opportunities.
 */
export function scanAllMarketsForEV(games: NormalizedGame[]): FullEVScanResult {
  // Moneyline (reuse existing)
  const mlResult = scanForEV(games)

  const spreadOpps: SpreadEVOpportunity[] = []
  const totalOpps: TotalEVOpportunity[] = []

  for (const game of games) {
    if (game.bookmakers.length < MIN_BOOKMAKERS) continue

    // --- Spread EV ---
    {
      const homeImplied: number[] = []
      const awayImplied: number[] = []

      for (const bk of game.bookmakers) {
        if (bk.spread?.homeOdds != null) homeImplied.push(americanToImplied(bk.spread.homeOdds))
        if (bk.spread?.awayOdds != null) awayImplied.push(americanToImplied(bk.spread.awayOdds))
      }

      if (homeImplied.length >= MIN_BOOKMAKERS && awayImplied.length >= MIN_BOOKMAKERS) {
        const avgHome = homeImplied.reduce((s, v) => s + v, 0) / homeImplied.length
        const avgAway = awayImplied.reduce((s, v) => s + v, 0) / awayImplied.length
        const overround = avgHome + avgAway
        if (overround > 0) {
          const fairHome = avgHome / overround
          const fairAway = avgAway / overround

          for (const bk of game.bookmakers) {
            if (bk.spread?.homeOdds != null && bk.spread?.homeLine != null) {
              const bookImpl = americanToImplied(bk.spread.homeOdds)
              const ev = ((fairHome / bookImpl) - 1) * 100
              if (ev >= MIN_EV_THRESHOLD) {
                spreadOpps.push({
                  game,
                  market: 'spread',
                  side: 'home',
                  team: game.homeTeam,
                  line: bk.spread.homeLine,
                  bookmaker: bk.bookmaker,
                  bookOdds: bk.spread.homeOdds,
                  fairOdds: impliedToAmerican(fairHome),
                  ev: Math.round(ev * 10) / 10,
                  fairProbability: Math.round(fairHome * 1000) / 1000,
                  bookImplied: Math.round(bookImpl * 1000) / 1000,
                })
              }
            }
            if (bk.spread?.awayOdds != null && bk.spread?.awayLine != null) {
              const bookImpl = americanToImplied(bk.spread.awayOdds)
              const ev = ((fairAway / bookImpl) - 1) * 100
              if (ev >= MIN_EV_THRESHOLD) {
                spreadOpps.push({
                  game,
                  market: 'spread',
                  side: 'away',
                  team: game.awayTeam,
                  line: bk.spread.awayLine,
                  bookmaker: bk.bookmaker,
                  bookOdds: bk.spread.awayOdds,
                  fairOdds: impliedToAmerican(fairAway),
                  ev: Math.round(ev * 10) / 10,
                  fairProbability: Math.round(fairAway * 1000) / 1000,
                  bookImplied: Math.round(bookImpl * 1000) / 1000,
                })
              }
            }
          }
        }
      }
    }

    // --- Total EV ---
    {
      const overImplied: number[] = []
      const underImplied: number[] = []

      for (const bk of game.bookmakers) {
        if (bk.total?.overOdds != null) overImplied.push(americanToImplied(bk.total.overOdds))
        if (bk.total?.underOdds != null) underImplied.push(americanToImplied(bk.total.underOdds))
      }

      if (overImplied.length >= MIN_BOOKMAKERS && underImplied.length >= MIN_BOOKMAKERS) {
        const avgOver = overImplied.reduce((s, v) => s + v, 0) / overImplied.length
        const avgUnder = underImplied.reduce((s, v) => s + v, 0) / underImplied.length
        const overround = avgOver + avgUnder
        if (overround > 0) {
          const fairOver = avgOver / overround
          const fairUnder = avgUnder / overround

          for (const bk of game.bookmakers) {
            if (bk.total?.overOdds != null && bk.total?.line != null) {
              const bookImpl = americanToImplied(bk.total.overOdds)
              const ev = ((fairOver / bookImpl) - 1) * 100
              if (ev >= MIN_EV_THRESHOLD) {
                totalOpps.push({
                  game,
                  market: 'total',
                  side: 'over',
                  totalLine: bk.total.line,
                  bookmaker: bk.bookmaker,
                  bookOdds: bk.total.overOdds,
                  fairOdds: impliedToAmerican(fairOver),
                  ev: Math.round(ev * 10) / 10,
                  fairProbability: Math.round(fairOver * 1000) / 1000,
                  bookImplied: Math.round(bookImpl * 1000) / 1000,
                })
              }
            }
            if (bk.total?.underOdds != null && bk.total?.line != null) {
              const bookImpl = americanToImplied(bk.total.underOdds)
              const ev = ((fairUnder / bookImpl) - 1) * 100
              if (ev >= MIN_EV_THRESHOLD) {
                totalOpps.push({
                  game,
                  market: 'total',
                  side: 'under',
                  totalLine: bk.total.line,
                  bookmaker: bk.bookmaker,
                  bookOdds: bk.total.underOdds,
                  fairOdds: impliedToAmerican(fairUnder),
                  ev: Math.round(ev * 10) / 10,
                  fairProbability: Math.round(fairUnder * 1000) / 1000,
                  bookImplied: Math.round(bookImpl * 1000) / 1000,
                })
              }
            }
          }
        }
      }
    }
  }

  // Combine and sort all by EV descending
  const allSorted: AnyEVOpportunity[] = [
    ...mlResult.opportunities,
    ...spreadOpps,
    ...totalOpps,
  ].sort((a, b) => b.ev - a.ev)

  return {
    moneyline: mlResult.opportunities,
    spread: spreadOpps.sort((a, b) => b.ev - a.ev),
    total: totalOpps.sort((a, b) => b.ev - a.ev),
    allSorted,
    gamesScanned: games.length,
  }
}

export { MIN_BOOKMAKERS, MIN_EV_THRESHOLD, calculateArbStakes }
