/**
 * Sharp Book Identifier
 *
 * Identifies which bookmakers consistently lead line movements (are "sharp")
 * versus which follow (are "soft"). Sharp books set the market; soft books
 * copy them with a delay. Knowing which is which helps identify where to
 * look for opening value.
 *
 * Methodology:
 * 1. Track when each bookmaker's line differs from consensus
 * 2. Books that deviate early and others follow = sharp indicators
 * 3. Books that are last to move = soft indicators
 * 4. Bookmaker outlier frequency shows independence of line-setting
 *
 * For informational purposes only. Not financial advice.
 */

import { americanToImplied } from '@/lib/odds'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

export interface BookSharpnessScore {
  bookmaker: string
  /** Overall sharpness score 0-100 */
  sharpnessScore: number
  /** Classification */
  classification: 'sharp' | 'moderate' | 'soft'
  /** How often this book is an outlier (deviates from consensus) */
  outlierRate: number
  /** Average distance from consensus (in implied probability points) */
  avgDeviation: number
  /** How often this book has the best (lowest vig) line */
  bestLineRate: number
  /** How often this book has the worst (highest vig) line */
  worstLineRate: number
  /** Number of games analyzed */
  gamesAnalyzed: number
  /** Breakdown by market type */
  byMarket: {
    moneyline: { outlierRate: number; bestLineRate: number; avgDeviation: number }
    spread: { outlierRate: number; bestLineRate: number; avgDeviation: number }
    total: { outlierRate: number; bestLineRate: number; avgDeviation: number }
  }
}

export interface SharpBookResult {
  scores: BookSharpnessScore[]
  /** Games analyzed */
  gamesAnalyzed: number
  /** Most likely sharp book */
  sharpestBook: string | null
  /** Most likely soft book */
  softestBook: string | null
}

interface BookStats {
  outlierCount: number
  bestLineCount: number
  worstLineCount: number
  deviations: number[]
  gamesAnalyzed: number
  mlOutliers: number
  mlBest: number
  mlDeviations: number[]
  mlGames: number
  spreadOutliers: number
  spreadBest: number
  spreadDeviations: number[]
  spreadGames: number
  totalOutliers: number
  totalBest: number
  totalDeviations: number[]
  totalGames: number
}

function initStats(): BookStats {
  return {
    outlierCount: 0, bestLineCount: 0, worstLineCount: 0,
    deviations: [], gamesAnalyzed: 0,
    mlOutliers: 0, mlBest: 0, mlDeviations: [], mlGames: 0,
    spreadOutliers: 0, spreadBest: 0, spreadDeviations: [], spreadGames: 0,
    totalOutliers: 0, totalBest: 0, totalDeviations: [], totalGames: 0,
  }
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = avg(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
}

/**
 * Analyze a set of odds values to find outliers and best/worst lines.
 * Returns which bookmakers are outliers and which have best/worst.
 */
function analyzeMarketValues(
  values: Array<{ bookmaker: string; implied: number }>
): { outliers: Set<string>; best: string | null; worst: string | null; deviations: Map<string, number> } {
  if (values.length < 3) {
    return { outliers: new Set(), best: null, worst: null, deviations: new Map() }
  }

  const imps = values.map(v => v.implied)
  const mean = avg(imps)
  const sd = stdDev(imps)
  const threshold = sd > 0 ? 1.5 : 0.02 // 1.5 std devs, or 2% if no variance

  const outliers = new Set<string>()
  const deviations = new Map<string, number>()

  for (const v of values) {
    const dev = Math.abs(v.implied - mean)
    deviations.set(v.bookmaker, dev)
    if (sd > 0 && dev > threshold * sd) {
      outliers.add(v.bookmaker)
    } else if (sd === 0 && dev > threshold) {
      outliers.add(v.bookmaker)
    }
  }

  // Best line = lowest implied probability (best payout for bettor)
  // Worst line = highest implied probability
  const sorted = [...values].sort((a, b) => a.implied - b.implied)
  const best = sorted[0]?.bookmaker ?? null
  const worst = sorted[sorted.length - 1]?.bookmaker ?? null

  return { outliers, best, worst, deviations }
}

/**
 * Analyze sharpness across a set of games.
 */
export function identifySharpBooks(games: NormalizedGame[]): SharpBookResult {
  const bookStats = new Map<string, BookStats>()

  for (const game of games) {
    if (game.bookmakers.length < 3) continue

    // Collect moneyline implied probabilities
    const homeML: Array<{ bookmaker: string; implied: number }> = []
    const awayML: Array<{ bookmaker: string; implied: number }> = []
    const homeSpread: Array<{ bookmaker: string; implied: number }> = []
    const awaySpread: Array<{ bookmaker: string; implied: number }> = []
    const overTotal: Array<{ bookmaker: string; implied: number }> = []
    const underTotal: Array<{ bookmaker: string; implied: number }> = []

    for (const bk of game.bookmakers) {
      if (!bookStats.has(bk.bookmaker)) bookStats.set(bk.bookmaker, initStats())

      if (bk.moneyline?.home != null) {
        homeML.push({ bookmaker: bk.bookmaker, implied: americanToImplied(bk.moneyline.home) })
      }
      if (bk.moneyline?.away != null) {
        awayML.push({ bookmaker: bk.bookmaker, implied: americanToImplied(bk.moneyline.away) })
      }
      if (bk.spread?.homeOdds != null) {
        homeSpread.push({ bookmaker: bk.bookmaker, implied: americanToImplied(bk.spread.homeOdds) })
      }
      if (bk.spread?.awayOdds != null) {
        awaySpread.push({ bookmaker: bk.bookmaker, implied: americanToImplied(bk.spread.awayOdds) })
      }
      if (bk.total?.overOdds != null) {
        overTotal.push({ bookmaker: bk.bookmaker, implied: americanToImplied(bk.total.overOdds) })
      }
      if (bk.total?.underOdds != null) {
        underTotal.push({ bookmaker: bk.bookmaker, implied: americanToImplied(bk.total.underOdds) })
      }
    }

    // Analyze each market
    const mlAnalyses = [analyzeMarketValues(homeML), analyzeMarketValues(awayML)]
    const spreadAnalyses = [analyzeMarketValues(homeSpread), analyzeMarketValues(awaySpread)]
    const totalAnalyses = [analyzeMarketValues(overTotal), analyzeMarketValues(underTotal)]

    // Tally stats per bookmaker
    for (const bk of game.bookmakers) {
      const stats = bookStats.get(bk.bookmaker)!
      stats.gamesAnalyzed++

      // Moneyline
      if (bk.moneyline?.home != null) {
        stats.mlGames++
        for (const analysis of mlAnalyses) {
          if (analysis.outliers.has(bk.bookmaker)) { stats.mlOutliers++; stats.outlierCount++ }
          if (analysis.best === bk.bookmaker) { stats.mlBest++; stats.bestLineCount++ }
          if (analysis.worst === bk.bookmaker) stats.worstLineCount++
          const dev = analysis.deviations.get(bk.bookmaker)
          if (dev != null) { stats.mlDeviations.push(dev); stats.deviations.push(dev) }
        }
      }

      // Spread
      if (bk.spread?.homeOdds != null) {
        stats.spreadGames++
        for (const analysis of spreadAnalyses) {
          if (analysis.outliers.has(bk.bookmaker)) { stats.spreadOutliers++; stats.outlierCount++ }
          if (analysis.best === bk.bookmaker) { stats.spreadBest++; stats.bestLineCount++ }
          if (analysis.worst === bk.bookmaker) stats.worstLineCount++
          const dev = analysis.deviations.get(bk.bookmaker)
          if (dev != null) { stats.spreadDeviations.push(dev); stats.deviations.push(dev) }
        }
      }

      // Total
      if (bk.total?.overOdds != null) {
        stats.totalGames++
        for (const analysis of totalAnalyses) {
          if (analysis.outliers.has(bk.bookmaker)) { stats.totalOutliers++; stats.outlierCount++ }
          if (analysis.best === bk.bookmaker) { stats.totalBest++; stats.bestLineCount++ }
          if (analysis.worst === bk.bookmaker) stats.worstLineCount++
          const dev = analysis.deviations.get(bk.bookmaker)
          if (dev != null) { stats.totalDeviations.push(dev); stats.deviations.push(dev) }
        }
      }
    }
  }

  // Calculate scores
  const scores: BookSharpnessScore[] = []

  for (const [bookmaker, stats] of bookStats) {
    if (stats.gamesAnalyzed === 0) continue

    const totalOpportunities = stats.deviations.length || 1
    const outlierRate = stats.outlierCount / totalOpportunities
    const bestLineRate = stats.bestLineCount / totalOpportunities
    const worstLineRate = stats.worstLineCount / totalOpportunities
    const avgDeviation = avg(stats.deviations)

    // Sharpness score formula:
    // - High outlier rate = independent line-setting = sharp (30%)
    // - High best line rate = consistently best prices = sharp (30%)
    // - Low worst line rate = not soft (20%)
    // - High avg deviation = divergent from herd = sharp (20%)
    const outlierComponent = Math.min(outlierRate * 3, 1) * 30
    const bestLineComponent = bestLineRate * 30
    const notWorstComponent = (1 - worstLineRate) * 20
    const deviationComponent = Math.min(avgDeviation * 50, 1) * 20

    const sharpnessScore = Math.round(outlierComponent + bestLineComponent + notWorstComponent + deviationComponent)

    const classification: BookSharpnessScore['classification'] =
      sharpnessScore >= 60 ? 'sharp' : sharpnessScore >= 40 ? 'moderate' : 'soft'

    const mlOppCount = stats.mlDeviations.length || 1
    const spreadOppCount = stats.spreadDeviations.length || 1
    const totalOppCount = stats.totalDeviations.length || 1

    scores.push({
      bookmaker,
      sharpnessScore,
      classification,
      outlierRate: Math.round(outlierRate * 10000) / 100,
      avgDeviation: Math.round(avgDeviation * 10000) / 100,
      bestLineRate: Math.round(bestLineRate * 10000) / 100,
      worstLineRate: Math.round(worstLineRate * 10000) / 100,
      gamesAnalyzed: stats.gamesAnalyzed,
      byMarket: {
        moneyline: {
          outlierRate: Math.round((stats.mlOutliers / mlOppCount) * 10000) / 100,
          bestLineRate: Math.round((stats.mlBest / mlOppCount) * 10000) / 100,
          avgDeviation: Math.round(avg(stats.mlDeviations) * 10000) / 100,
        },
        spread: {
          outlierRate: Math.round((stats.spreadOutliers / spreadOppCount) * 10000) / 100,
          bestLineRate: Math.round((stats.spreadBest / spreadOppCount) * 10000) / 100,
          avgDeviation: Math.round(avg(stats.spreadDeviations) * 10000) / 100,
        },
        total: {
          outlierRate: Math.round((stats.totalOutliers / totalOppCount) * 10000) / 100,
          bestLineRate: Math.round((stats.totalBest / totalOppCount) * 10000) / 100,
          avgDeviation: Math.round(avg(stats.totalDeviations) * 10000) / 100,
        },
      },
    })
  }

  scores.sort((a, b) => b.sharpnessScore - a.sharpnessScore)

  return {
    scores,
    gamesAnalyzed: games.filter(g => g.bookmakers.length >= 3).length,
    sharpestBook: scores[0]?.bookmaker ?? null,
    softestBook: scores.length > 0 ? scores[scores.length - 1].bookmaker : null,
  }
}
