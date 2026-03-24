/**
 * Parlay Optimizer — Find optimal parlay combinations from a set of bets.
 *
 * Given a pool of potential picks, this module:
 * 1. Generates all valid N-leg parlay combinations
 * 2. Scores each combination based on EV, correlation risk, and payout
 * 3. Filters out high-correlation combos (same game, opposing sides)
 * 4. Ranks by composite score to find the best parlays
 *
 * Pure functions, no side effects.
 */

import { americanToDecimal, americanToImplied } from '@/lib/odds'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParlayCandidate {
  id: string
  description: string
  odds: number  // American odds
  sport: string
  gameId: string
  team: string
  side: 'home' | 'away' | 'over' | 'under'
  market: 'moneyline' | 'spread' | 'total'
  /** Estimated fair probability (0-1). If unknown, set to implied probability. */
  fairProbability?: number
  /** Confidence in this pick (0-100) */
  confidence?: number
}

export interface ParlayCombo {
  legs: ParlayCandidate[]
  /** Number of legs */
  legCount: number
  /** Combined decimal odds */
  combinedOdds: number
  /** Combined American odds */
  americanOdds: number
  /** Combined implied probability (product of individual implied probs) */
  impliedProbability: number
  /** Combined fair probability (product of individual fair probs) */
  fairProbability: number
  /** Expected value of the parlay as % (positive = +EV) */
  ev: number
  /** Payout on $1 wager */
  payout: number
  /** Correlation risk score (0 = no correlation, 100 = heavily correlated) */
  correlationRisk: number
  /** Composite score for ranking (higher = better) */
  score: number
  /** Warnings about this combo */
  warnings: string[]
}

export interface ParlayOptimizeResult {
  /** All valid combinations sorted by score */
  combos: ParlayCombo[]
  /** Best +EV combo */
  bestEV: ParlayCombo | null
  /** Safest (lowest correlation) combo */
  safest: ParlayCombo | null
  /** Highest payout combo */
  bestPayout: ParlayCombo | null
  /** Total candidates considered */
  candidateCount: number
  /** Total combinations evaluated */
  combosEvaluated: number
}

// ---------------------------------------------------------------------------
// Combination generator
// ---------------------------------------------------------------------------

/**
 * Generate all combinations of size k from array.
 * Limits output to maxCombos to prevent memory issues.
 */
export function combinations<T>(arr: T[], k: number, maxCombos: number = 1000): T[][] {
  const result: T[][] = []

  function backtrack(start: number, current: T[]) {
    if (result.length >= maxCombos) return
    if (current.length === k) {
      result.push([...current])
      return
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i])
      backtrack(i + 1, current)
      current.pop()
    }
  }

  backtrack(0, [])
  return result
}

// ---------------------------------------------------------------------------
// Correlation detection
// ---------------------------------------------------------------------------

/**
 * Calculate correlation risk for a set of parlay legs.
 * Returns 0-100 (0 = no correlation issues, 100 = heavily correlated).
 */
export function calculateCorrelationRisk(legs: ParlayCandidate[]): { risk: number; warnings: string[] } {
  let risk = 0
  const warnings: string[] = []

  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const a = legs[i]
      const b = legs[j]

      // Same game = heavy correlation
      if (a.gameId === b.gameId) {
        risk += 40
        warnings.push(`${a.description} and ${b.description} are from the same game`)

        // Opposing sides on same game = nearly impossible to both hit
        if (
          (a.side === 'home' && b.side === 'away' && a.market === b.market) ||
          (a.side === 'away' && b.side === 'home' && a.market === b.market) ||
          (a.side === 'over' && b.side === 'under') ||
          (a.side === 'under' && b.side === 'over')
        ) {
          risk += 60
          warnings.push(`${a.description} and ${b.description} are opposing sides — both cannot win`)
        }
      }

      // Same team in different games (moderate correlation)
      if (a.team === b.team && a.gameId !== b.gameId) {
        risk += 10
      }

      // Same sport increases overall correlation slightly
      if (a.sport === b.sport) {
        risk += 2
      }
    }
  }

  return { risk: Math.min(risk, 100), warnings }
}

// ---------------------------------------------------------------------------
// EV calculation
// ---------------------------------------------------------------------------

/**
 * Calculate expected value of a parlay.
 * EV = (fairProb * payout) - 1, expressed as percentage.
 */
export function calculateParlayEV(legs: ParlayCandidate[]): {
  ev: number
  combinedOdds: number
  impliedProb: number
  fairProb: number
  payout: number
} {
  let combinedDecimal = 1
  let impliedProb = 1
  let fairProb = 1

  for (const leg of legs) {
    const decimal = americanToDecimal(leg.odds)
    const implied = americanToImplied(leg.odds)
    const fair = leg.fairProbability ?? implied

    combinedDecimal *= decimal
    impliedProb *= implied
    fairProb *= fair
  }

  const payout = combinedDecimal
  const ev = (fairProb * payout - 1) * 100

  return {
    ev: Math.round(ev * 10) / 10,
    combinedOdds: combinedDecimal,
    impliedProb: Math.round(impliedProb * 10000) / 10000,
    fairProb: Math.round(fairProb * 10000) / 10000,
    payout: Math.round(payout * 100) / 100,
  }
}

/**
 * Convert combined decimal odds to American.
 */
function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

// ---------------------------------------------------------------------------
// Main optimizer
// ---------------------------------------------------------------------------

/**
 * Evaluate a single combination of legs.
 */
export function evaluateCombo(legs: ParlayCandidate[]): ParlayCombo {
  const { ev, combinedOdds, impliedProb, fairProb, payout } = calculateParlayEV(legs)
  const { risk, warnings } = calculateCorrelationRisk(legs)

  // Composite score: heavily weight EV, penalize correlation
  // EV contribution (can be negative)
  const evScore = Math.min(ev * 3, 40)
  // Correlation penalty
  const corrPenalty = risk * 0.5
  // Confidence bonus
  const avgConfidence = legs.reduce((s, l) => s + (l.confidence ?? 50), 0) / legs.length
  const confBonus = (avgConfidence - 50) * 0.3
  // Payout bonus (small)
  const payoutBonus = Math.min(Math.log(payout) * 3, 15)

  const score = Math.round((evScore - corrPenalty + confBonus + payoutBonus) * 10) / 10

  return {
    legs,
    legCount: legs.length,
    combinedOdds: Math.round(combinedOdds * 100) / 100,
    americanOdds: decimalToAmerican(combinedOdds),
    impliedProbability: impliedProb,
    fairProbability: fairProb,
    ev,
    payout,
    correlationRisk: risk,
    score,
    warnings,
  }
}

/**
 * Optimize parlays from a pool of candidates.
 *
 * @param candidates Pool of potential picks
 * @param legCounts Array of leg counts to consider (e.g. [2, 3, 4])
 * @param maxResults Maximum results to return per leg count
 */
export function optimizeParlays(
  candidates: ParlayCandidate[],
  legCounts: number[] = [2, 3, 4],
  maxResults: number = 20
): ParlayOptimizeResult {
  const allCombos: ParlayCombo[] = []
  let combosEvaluated = 0

  for (const k of legCounts) {
    if (k > candidates.length) continue
    const combos = combinations(candidates, k, 500)
    combosEvaluated += combos.length

    for (const combo of combos) {
      const evaluated = evaluateCombo(combo)
      // Filter out combos with opposing sides (impossible to win)
      if (evaluated.correlationRisk < 100) {
        allCombos.push(evaluated)
      }
    }
  }

  // Sort by score descending
  allCombos.sort((a, b) => b.score - a.score)

  const top = allCombos.slice(0, maxResults)

  // Find special combos
  const evSorted = [...allCombos].sort((a, b) => b.ev - a.ev)
  const safeSort = [...allCombos].sort((a, b) => a.correlationRisk - b.correlationRisk)
  const paySort = [...allCombos].sort((a, b) => b.payout - a.payout)

  return {
    combos: top,
    bestEV: evSorted[0] ?? null,
    safest: safeSort[0] ?? null,
    bestPayout: paySort[0] ?? null,
    candidateCount: candidates.length,
    combosEvaluated,
  }
}
