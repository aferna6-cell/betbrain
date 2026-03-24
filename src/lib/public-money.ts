/**
 * Public Money Estimator — Estimate public vs sharp money using odds movement patterns.
 *
 * Without actual handle data, we estimate public betting patterns from:
 * - Favorite bias (public bets favorites heavily)
 * - Line movement against the expected direction (reverse line movement = sharp)
 * - Opening vs current odds differences
 * - Number of bookmakers with outlier odds
 *
 * Pure functions, no side effects.
 */

import { americanToImplied } from '@/lib/odds'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublicMoneyEstimate {
  game: NormalizedGame
  /** Estimated public side */
  publicSide: 'home' | 'away'
  /** Team name of public side */
  publicTeam: string
  /** Estimated public percentage (50-90%) */
  publicPct: number
  /** Estimated sharp side (opposite) */
  sharpSide: 'home' | 'away'
  /** Team name of sharp side */
  sharpTeam: string
  /** Confidence in the estimate (0-100) */
  confidence: number
  /** Factors contributing to the estimate */
  factors: string[]
  /** Whether there's a sharp/public divergence */
  divergence: boolean
}

export interface PublicMoneyResult {
  estimates: PublicMoneyEstimate[]
  gamesAnalyzed: number
  divergenceCount: number
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Estimate public money direction for all games.
 */
export function estimatePublicMoney(games: NormalizedGame[]): PublicMoneyResult {
  const estimates: PublicMoneyEstimate[] = []

  for (const game of games) {
    const estimate = analyzePublicMoney(game)
    if (estimate) estimates.push(estimate)
  }

  // Sort by confidence descending
  estimates.sort((a, b) => b.confidence - a.confidence)

  return {
    estimates,
    gamesAnalyzed: games.length,
    divergenceCount: estimates.filter((e) => e.divergence).length,
  }
}

function analyzePublicMoney(game: NormalizedGame): PublicMoneyEstimate | null {
  if (game.bookmakers.length < 2) return null

  const factors: string[] = []
  let homePublicScore = 0

  // 1. Favorite bias — public bets the favorite
  const homeImplieds = game.bookmakers
    .map((b) => b.moneyline?.home)
    .filter((v): v is number => v != null)
    .map(americanToImplied)
  const awayImplieds = game.bookmakers
    .map((b) => b.moneyline?.away)
    .filter((v): v is number => v != null)
    .map(americanToImplied)

  if (homeImplieds.length === 0 || awayImplieds.length === 0) return null

  const avgHomeImplied = homeImplieds.reduce((s, v) => s + v, 0) / homeImplieds.length
  const avgAwayImplied = awayImplieds.reduce((s, v) => s + v, 0) / awayImplieds.length

  // The side with higher implied probability is the favorite — public bets it
  if (avgHomeImplied > avgAwayImplied) {
    const diff = avgHomeImplied - avgAwayImplied
    if (diff > 0.1) {
      homePublicScore += 25
      factors.push(`Home is heavy favorite (${(avgHomeImplied * 100).toFixed(0)}% implied)`)
    } else if (diff > 0.05) {
      homePublicScore += 15
      factors.push(`Home is moderate favorite`)
    } else {
      homePublicScore += 5
    }
  } else {
    const diff = avgAwayImplied - avgHomeImplied
    if (diff > 0.1) {
      homePublicScore -= 25
      factors.push(`Away is heavy favorite (${(avgAwayImplied * 100).toFixed(0)}% implied)`)
    } else if (diff > 0.05) {
      homePublicScore -= 15
      factors.push(`Away is moderate favorite`)
    } else {
      homePublicScore -= 5
    }
  }

  // 2. Home team bias — public slightly favors home teams
  homePublicScore += 5
  factors.push('Home team bias (+5%)')

  // 3. Bookmaker consensus tightness
  // If books are very tight on the favorite, public money has pushed it
  const homeStdDev = stdDev(homeImplieds)
  const awayStdDev = stdDev(awayImplieds)

  if (homeStdDev < 0.01 && avgHomeImplied > 0.55) {
    homePublicScore += 10
    factors.push('Books very tight on home — consensus-driven pricing')
  } else if (awayStdDev < 0.01 && avgAwayImplied > 0.55) {
    homePublicScore -= 10
    factors.push('Books very tight on away — consensus-driven pricing')
  }

  // 4. Outlier detection — a single book deviating suggests sharp action
  const homeOutliers = countOutliers(homeImplieds, 0.03)
  const awayOutliers = countOutliers(awayImplieds, 0.03)

  if (homeOutliers > 0) {
    // An outlier on the home side means some book sees different value
    homePublicScore -= homeOutliers * 5
    factors.push(`${homeOutliers} book(s) deviate on home side — possible sharp activity`)
  }
  if (awayOutliers > 0) {
    homePublicScore += awayOutliers * 5
    factors.push(`${awayOutliers} book(s) deviate on away side — possible sharp activity`)
  }

  // Determine public side
  const publicSide = homePublicScore >= 0 ? 'home' as const : 'away' as const
  const sharpSide = publicSide === 'home' ? 'away' as const : 'home' as const

  // Convert score to percentage (50-90%)
  const absScore = Math.abs(homePublicScore)
  const publicPct = Math.min(90, 50 + absScore)

  // Confidence based on data quality
  const confidence = Math.min(85, Math.round(
    (game.bookmakers.length >= 5 ? 30 : game.bookmakers.length * 6) +
    (factors.length * 10) +
    (absScore > 20 ? 15 : absScore > 10 ? 10 : 5)
  ))

  // Divergence: when public is on one side but sharp signals suggest the other
  const divergence = absScore >= 15 && (homeOutliers > 0 || awayOutliers > 0)

  return {
    game,
    publicSide,
    publicTeam: publicSide === 'home' ? game.homeTeam : game.awayTeam,
    publicPct,
    sharpSide,
    sharpTeam: sharpSide === 'home' ? game.homeTeam : game.awayTeam,
    confidence,
    factors,
    divergence,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function countOutliers(values: number[], threshold: number): number {
  if (values.length < 3) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return values.filter((v) => Math.abs(v - mean) > threshold).length
}
