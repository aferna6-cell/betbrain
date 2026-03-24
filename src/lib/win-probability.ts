/**
 * Win Probability Calculator — Pre-game win probability from odds data.
 *
 * Calculates and compares win probabilities across bookmakers using:
 * - Individual book implied probabilities
 * - Consensus (no-vig) fair probabilities
 * - Book-to-book disagreement analysis
 * - Probability trend from odds movement
 *
 * Pure functions, no side effects.
 */

import { americanToImplied } from '@/lib/odds'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookProbability {
  bookmaker: string
  homeProb: number  // raw implied (includes vig)
  awayProb: number
  vig: number       // overround amount
  noVigHome: number // vig-removed fair probability
  noVigAway: number
}

export interface WinProbability {
  game: NormalizedGame
  /** Consensus no-vig probability for home team */
  homeProb: number
  /** Consensus no-vig probability for away team */
  awayProb: number
  /** Per-bookmaker probabilities */
  byBook: BookProbability[]
  /** How much bookmakers disagree (std dev of home prob) */
  disagreement: number
  /** The book most favorable to home */
  mostBullishHome: { bookmaker: string; prob: number } | null
  /** The book least favorable to home */
  leastBullishHome: { bookmaker: string; prob: number } | null
  /** Average vig across books */
  avgVig: number
  /** Which side has value based on vig distribution */
  vigTilt: 'home' | 'away' | 'neutral'
  /** Confidence in the probability estimate (based on book count and agreement) */
  confidence: number
}

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/**
 * Calculate implied probabilities for a single bookmaker.
 */
export function calcBookProbability(bk: NormalizedBookmakerOdds): BookProbability | null {
  if (bk.moneyline?.home == null || bk.moneyline?.away == null) return null

  const homeImpl = americanToImplied(bk.moneyline.home)
  const awayImpl = americanToImplied(bk.moneyline.away)
  const total = homeImpl + awayImpl
  const vig = total - 1

  return {
    bookmaker: bk.bookmaker,
    homeProb: Math.round(homeImpl * 10000) / 10000,
    awayProb: Math.round(awayImpl * 10000) / 10000,
    vig: Math.round(vig * 10000) / 10000,
    noVigHome: Math.round((homeImpl / total) * 10000) / 10000,
    noVigAway: Math.round((awayImpl / total) * 10000) / 10000,
  }
}

/**
 * Calculate standard deviation of an array of numbers.
 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const squaredDiffs = values.map((v) => (v - mean) ** 2)
  return Math.sqrt(squaredDiffs.reduce((s, v) => s + v, 0) / values.length)
}

/**
 * Calculate comprehensive win probability for a game.
 */
export function calculateWinProbability(game: NormalizedGame): WinProbability {
  const byBook: BookProbability[] = []

  for (const bk of game.bookmakers) {
    const prob = calcBookProbability(bk)
    if (prob) byBook.push(prob)
  }

  if (byBook.length === 0) {
    return {
      game,
      homeProb: 0.5,
      awayProb: 0.5,
      byBook: [],
      disagreement: 0,
      mostBullishHome: null,
      leastBullishHome: null,
      avgVig: 0,
      vigTilt: 'neutral',
      confidence: 0,
    }
  }

  // Consensus no-vig probabilities (average of all books' no-vig probs)
  const avgNoVigHome = byBook.reduce((s, b) => s + b.noVigHome, 0) / byBook.length
  const avgNoVigAway = byBook.reduce((s, b) => s + b.noVigAway, 0) / byBook.length

  // Normalize to sum to 1 (in case of rounding)
  const total = avgNoVigHome + avgNoVigAway
  const homeProb = Math.round((avgNoVigHome / total) * 10000) / 10000
  const awayProb = Math.round((avgNoVigAway / total) * 10000) / 10000

  // Disagreement
  const homeProbs = byBook.map((b) => b.noVigHome)
  const disagreement = Math.round(stdDev(homeProbs) * 10000) / 10000

  // Most/least bullish
  const sorted = [...byBook].sort((a, b) => b.noVigHome - a.noVigHome)
  const mostBullishHome = sorted[0]
    ? { bookmaker: sorted[0].bookmaker, prob: sorted[0].noVigHome }
    : null
  const leastBullishHome = sorted[sorted.length - 1]
    ? { bookmaker: sorted[sorted.length - 1].bookmaker, prob: sorted[sorted.length - 1].noVigHome }
    : null

  // Vig analysis
  const avgVig = Math.round((byBook.reduce((s, b) => s + b.vig, 0) / byBook.length) * 10000) / 10000

  // Vig tilt: which side has more vig loaded
  const homeVigRatio = byBook.reduce((s, b) => s + b.homeProb, 0) / byBook.length
  const awayVigRatio = byBook.reduce((s, b) => s + b.awayProb, 0) / byBook.length
  const vigDiff = homeVigRatio - awayVigRatio
  const vigTilt = Math.abs(vigDiff) < 0.02 ? 'neutral' : vigDiff > 0 ? 'home' : 'away'

  // Confidence (higher with more books and less disagreement)
  let confidence = 50
  if (byBook.length >= 5) confidence += 20
  else if (byBook.length >= 3) confidence += 10
  if (disagreement < 0.01) confidence += 15
  else if (disagreement < 0.02) confidence += 5
  else if (disagreement > 0.04) confidence -= 10
  confidence = Math.max(10, Math.min(95, confidence))

  return {
    game,
    homeProb,
    awayProb,
    byBook,
    disagreement,
    mostBullishHome,
    leastBullishHome,
    avgVig,
    vigTilt,
    confidence,
  }
}

/**
 * Calculate win probabilities for all games, sorted by confidence.
 */
export function calculateAllWinProbabilities(games: NormalizedGame[]): WinProbability[] {
  return games
    .map(calculateWinProbability)
    .filter((wp) => wp.byBook.length > 0)
    .sort((a, b) => b.confidence - a.confidence)
}

/**
 * Format probability as percentage string.
 */
export function formatProb(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`
}
