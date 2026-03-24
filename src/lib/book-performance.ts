/**
 * Book Performance Tracker — Track which bookmaker consistently gives best CLV.
 *
 * Analyzes pick history to determine which sportsbook provides the best
 * closing line value, so you know where to place bets first.
 *
 * Reads bookmaker assignments from localStorage (from book-roi.ts).
 * Pure functions for calculation.
 */

import { americanToImplied } from '@/lib/odds'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PickWithBook {
  id: string
  odds: number
  closing_odds: number | null
  bookmaker: string | null
  outcome: string | null
  profit: number | null
  units: number
  sport: string
}

export interface BookPerformance {
  bookmaker: string
  /** Total picks placed at this book */
  totalPicks: number
  /** Picks with CLV data */
  clvPicks: number
  /** Average CLV (implied prob diff) */
  avgCLV: number
  /** Positive CLV rate (percentage of picks that beat closing line) */
  positiveCLVRate: number
  /** Win rate */
  winRate: number
  /** ROI */
  roi: number
  /** Total profit in units */
  totalProfit: number
  /** Avg odds placed */
  avgOdds: number
  /** CLV consistency score (0-100) */
  consistencyScore: number
}

export interface BookPerformanceResult {
  performances: BookPerformance[]
  bestCLVBook: string | null
  bestROIBook: string | null
  totalAnalyzed: number
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Analyze performance across bookmakers.
 */
export function analyzeBookPerformance(picks: PickWithBook[]): BookPerformanceResult {
  const picksWithBook = picks.filter((p) => p.bookmaker && p.bookmaker.trim().length > 0)

  if (picksWithBook.length === 0) {
    return {
      performances: [],
      bestCLVBook: null,
      bestROIBook: null,
      totalAnalyzed: 0,
    }
  }

  // Group by bookmaker
  const byBook = new Map<string, PickWithBook[]>()
  for (const pick of picksWithBook) {
    const key = pick.bookmaker!.toLowerCase().trim()
    const existing = byBook.get(key) ?? []
    existing.push(pick)
    byBook.set(key, existing)
  }

  const performances: BookPerformance[] = []

  for (const [bookmaker, bookPicks] of byBook) {
    const resolved = bookPicks.filter((p) => p.outcome && p.outcome !== 'pending')
    const wins = resolved.filter((p) => p.outcome === 'win').length
    const decided = resolved.filter((p) => p.outcome === 'win' || p.outcome === 'loss').length
    const totalProfit = resolved.reduce((s, p) => s + (p.profit ?? 0), 0)
    const totalUnits = resolved.reduce((s, p) => s + p.units, 0)

    // CLV analysis
    const clvPicks = bookPicks.filter((p) => p.closing_odds != null && p.odds !== 0)
    const clvValues: number[] = []

    for (const pick of clvPicks) {
      if (pick.closing_odds == null) continue
      const betImplied = americanToImplied(pick.odds)
      const closingImplied = americanToImplied(pick.closing_odds)
      // Positive CLV = got better price than closing
      const clv = (closingImplied - betImplied) * 100
      clvValues.push(clv)
    }

    const avgCLV = clvValues.length > 0
      ? Math.round((clvValues.reduce((s, v) => s + v, 0) / clvValues.length) * 100) / 100
      : 0
    const positiveCLVCount = clvValues.filter((v) => v > 0).length
    const positiveCLVRate = clvValues.length > 0
      ? Math.round((positiveCLVCount / clvValues.length) * 100)
      : 0

    // CLV consistency: low std dev of CLV values = consistent
    const clvStdDev = clvValues.length >= 3 ? stdDev(clvValues) : 10
    const consistencyScore = Math.min(100, Math.max(0, Math.round(100 - clvStdDev * 10)))

    const avgOdds = bookPicks.length > 0
      ? Math.round(bookPicks.reduce((s, p) => s + p.odds, 0) / bookPicks.length)
      : 0

    performances.push({
      bookmaker,
      totalPicks: bookPicks.length,
      clvPicks: clvPicks.length,
      avgCLV,
      positiveCLVRate,
      winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0,
      roi: totalUnits > 0 ? Math.round((totalProfit / totalUnits) * 10000) / 100 : 0,
      totalProfit: Math.round(totalProfit * 100) / 100,
      avgOdds,
      consistencyScore,
    })
  }

  // Sort by CLV (best first)
  performances.sort((a, b) => b.avgCLV - a.avgCLV)

  const bestCLVBook = performances.length > 0 && performances[0].clvPicks >= 3
    ? performances[0].bookmaker
    : null

  // Best ROI
  const byROI = [...performances].sort((a, b) => b.roi - a.roi)
  const bestROIBook = byROI.length > 0 && byROI[0].totalPicks >= 5
    ? byROI[0].bookmaker
    : null

  return {
    performances,
    bestCLVBook,
    bestROIBook,
    totalAnalyzed: picksWithBook.length,
  }
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}
