/**
 * Vig (Juice) Comparison by Bookmaker
 *
 * Calculates and compares the overround (vig) each bookmaker charges
 * across different markets and sports. Lower vig = better value for bettors.
 *
 * Vig = (sum of implied probabilities) - 1
 * A "fair" market has 0% vig. Typical books charge 4-5% vig on main markets.
 *
 * For informational purposes only. Not financial advice.
 */

import { americanToImplied } from '@/lib/odds'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

export interface BookVigProfile {
  bookmaker: string
  /** Average vig across all markets */
  avgVig: number
  /** Average vig per market type */
  mlVig: number
  spreadVig: number
  totalVig: number
  /** Best (lowest) vig seen */
  bestVig: number
  /** Worst (highest) vig seen */
  worstVig: number
  /** Number of markets analyzed */
  marketsAnalyzed: number
  /** Per-sport breakdown */
  bySport: Record<string, { avgVig: number; count: number }>
  /** Classification */
  classification: 'low-vig' | 'average' | 'high-vig'
}

export interface VigComparisonResult {
  profiles: BookVigProfile[]
  gamesAnalyzed: number
  lowestVigBook: string | null
  highestVigBook: string | null
  /** Average vig across all books */
  marketAvgVig: number
}

interface VigAccumulator {
  mlVigs: number[]
  spreadVigs: number[]
  totalVigs: number[]
  allVigs: number[]
  bySport: Record<string, number[]>
}

/**
 * Calculate vig for a two-way market.
 */
export function calculateTwoWayVig(odds1: number, odds2: number): number {
  const impl1 = americanToImplied(odds1)
  const impl2 = americanToImplied(odds2)
  return (impl1 + impl2 - 1) * 100 // percentage
}

/**
 * Calculate vig for a three-way market (draws possible).
 */
export function calculateThreeWayVig(odds1: number, odds2: number, drawOdds: number): number {
  const impl1 = americanToImplied(odds1)
  const impl2 = americanToImplied(odds2)
  const implDraw = americanToImplied(drawOdds)
  return (impl1 + impl2 + implDraw - 1) * 100
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length
}

/**
 * Extract vig from each market of a bookmaker's odds for a game.
 */
function extractVigs(bk: NormalizedBookmakerOdds): { ml?: number; spread?: number; total?: number } {
  const result: { ml?: number; spread?: number; total?: number } = {}

  if (bk.moneyline?.home != null && bk.moneyline?.away != null) {
    if (bk.moneyline.draw != null) {
      result.ml = calculateThreeWayVig(bk.moneyline.home, bk.moneyline.away, bk.moneyline.draw)
    } else {
      result.ml = calculateTwoWayVig(bk.moneyline.home, bk.moneyline.away)
    }
  }

  if (bk.spread?.homeOdds != null && bk.spread?.awayOdds != null) {
    result.spread = calculateTwoWayVig(bk.spread.homeOdds, bk.spread.awayOdds)
  }

  if (bk.total?.overOdds != null && bk.total?.underOdds != null) {
    result.total = calculateTwoWayVig(bk.total.overOdds, bk.total.underOdds)
  }

  return result
}

/**
 * Compare vig across all bookmakers for a set of games.
 */
export function compareVig(games: NormalizedGame[]): VigComparisonResult {
  const accumulators = new Map<string, VigAccumulator>()

  for (const game of games) {
    for (const bk of game.bookmakers) {
      if (!accumulators.has(bk.bookmaker)) {
        accumulators.set(bk.bookmaker, {
          mlVigs: [], spreadVigs: [], totalVigs: [], allVigs: [],
          bySport: {},
        })
      }
      const acc = accumulators.get(bk.bookmaker)!
      const vigs = extractVigs(bk)

      if (!acc.bySport[game.sport]) acc.bySport[game.sport] = []

      if (vigs.ml != null) {
        acc.mlVigs.push(vigs.ml)
        acc.allVigs.push(vigs.ml)
        acc.bySport[game.sport].push(vigs.ml)
      }
      if (vigs.spread != null) {
        acc.spreadVigs.push(vigs.spread)
        acc.allVigs.push(vigs.spread)
        acc.bySport[game.sport].push(vigs.spread)
      }
      if (vigs.total != null) {
        acc.totalVigs.push(vigs.total)
        acc.allVigs.push(vigs.total)
        acc.bySport[game.sport].push(vigs.total)
      }
    }
  }

  const profiles: BookVigProfile[] = []

  for (const [bookmaker, acc] of accumulators) {
    if (acc.allVigs.length === 0) continue

    const avgVig = avg(acc.allVigs)

    const bySport: Record<string, { avgVig: number; count: number }> = {}
    for (const [sport, vigs] of Object.entries(acc.bySport)) {
      bySport[sport] = { avgVig: Math.round(avg(vigs) * 100) / 100, count: vigs.length }
    }

    const classification: BookVigProfile['classification'] =
      avgVig <= 3.5 ? 'low-vig' : avgVig >= 5.5 ? 'high-vig' : 'average'

    profiles.push({
      bookmaker,
      avgVig: Math.round(avgVig * 100) / 100,
      mlVig: Math.round(avg(acc.mlVigs) * 100) / 100,
      spreadVig: Math.round(avg(acc.spreadVigs) * 100) / 100,
      totalVig: Math.round(avg(acc.totalVigs) * 100) / 100,
      bestVig: Math.round(Math.min(...acc.allVigs) * 100) / 100,
      worstVig: Math.round(Math.max(...acc.allVigs) * 100) / 100,
      marketsAnalyzed: acc.allVigs.length,
      bySport,
      classification,
    })
  }

  profiles.sort((a, b) => a.avgVig - b.avgVig) // lowest vig first

  const allVigs = profiles.map(p => p.avgVig)
  const marketAvgVig = allVigs.length > 0 ? Math.round(avg(allVigs) * 100) / 100 : 0

  return {
    profiles,
    gamesAnalyzed: games.length,
    lowestVigBook: profiles[0]?.bookmaker ?? null,
    highestVigBook: profiles.length > 0 ? profiles[profiles.length - 1].bookmaker : null,
    marketAvgVig,
  }
}
