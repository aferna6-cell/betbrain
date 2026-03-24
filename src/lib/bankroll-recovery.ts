/**
 * Bankroll Recovery Calculator — How many bets to recover from a drawdown.
 *
 * Given current bankroll, peak bankroll, win rate, and avg odds,
 * calculates the expected number of bets to recover.
 *
 * Pure functions, no side effects.
 */

import { americanToDecimal } from '@/lib/odds'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecoveryInput {
  /** Current bankroll */
  current: number
  /** Peak bankroll (the high-water mark) */
  peak: number
  /** Historical win rate (0-1) */
  winRate: number
  /** Average American odds on bets */
  avgOdds: number
  /** Unit size in dollars */
  unitSize: number
}

export interface RecoveryResult {
  /** Dollar amount to recover */
  deficit: number
  /** Percentage drawdown from peak */
  drawdownPct: number
  /** Expected bets needed to recover (at avg odds and win rate) */
  expectedBets: number
  /** Expected profit per bet in units */
  expectedProfitPerBet: number
  /** Optimistic scenario (win rate + 5%) */
  optimisticBets: number
  /** Pessimistic scenario (win rate - 5%) */
  pessimisticBets: number
  /** Probability of recovery within N bets (using simplified model) */
  recoveryProbability50: number  // within 50 bets
  recoveryProbability100: number // within 100 bets
  /** Estimated days at N bets/day */
  daysAt2Bets: number
  daysAt5Bets: number
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Calculate recovery timeline from a drawdown.
 */
export function calculateRecovery(input: RecoveryInput): RecoveryResult {
  const deficit = Math.max(0, input.peak - input.current)
  const drawdownPct = input.peak > 0 ? (deficit / input.peak) * 100 : 0

  if (deficit <= 0 || input.unitSize <= 0) {
    return {
      deficit: 0,
      drawdownPct: 0,
      expectedBets: 0,
      expectedProfitPerBet: 0,
      optimisticBets: 0,
      pessimisticBets: 0,
      recoveryProbability50: 100,
      recoveryProbability100: 100,
      daysAt2Bets: 0,
      daysAt5Bets: 0,
    }
  }

  const decimalOdds = americanToDecimal(input.avgOdds)
  const expectedProfitPerBet = calcExpectedProfit(input.winRate, decimalOdds)

  // Units needed to recover
  const unitsNeeded = deficit / input.unitSize

  // Expected bets at current rate
  const expectedBets = expectedProfitPerBet > 0
    ? Math.ceil(unitsNeeded / expectedProfitPerBet)
    : Infinity

  // Optimistic (win rate + 5%)
  const optimisticProfit = calcExpectedProfit(
    Math.min(1, input.winRate + 0.05),
    decimalOdds
  )
  const optimisticBets = optimisticProfit > 0
    ? Math.ceil(unitsNeeded / optimisticProfit)
    : Infinity

  // Pessimistic (win rate - 5%)
  const pessimisticProfit = calcExpectedProfit(
    Math.max(0, input.winRate - 0.05),
    decimalOdds
  )
  const pessimisticBets = pessimisticProfit > 0
    ? Math.ceil(unitsNeeded / pessimisticProfit)
    : Infinity

  // Simplified recovery probability using normal approximation
  const recoveryProbability50 = calcRecoveryProbability(
    50, unitsNeeded, expectedProfitPerBet, input.winRate, decimalOdds
  )
  const recoveryProbability100 = calcRecoveryProbability(
    100, unitsNeeded, expectedProfitPerBet, input.winRate, decimalOdds
  )

  return {
    deficit,
    drawdownPct: Math.round(drawdownPct * 10) / 10,
    expectedBets: isFinite(expectedBets) ? expectedBets : 999,
    expectedProfitPerBet: Math.round(expectedProfitPerBet * 1000) / 1000,
    optimisticBets: isFinite(optimisticBets) ? optimisticBets : 999,
    pessimisticBets: isFinite(pessimisticBets) ? pessimisticBets : 999,
    recoveryProbability50: Math.round(recoveryProbability50 * 10) / 10,
    recoveryProbability100: Math.round(recoveryProbability100 * 10) / 10,
    daysAt2Bets: isFinite(expectedBets) ? Math.ceil(expectedBets / 2) : 999,
    daysAt5Bets: isFinite(expectedBets) ? Math.ceil(expectedBets / 5) : 999,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Expected profit per bet in units.
 * E[profit] = winRate * (decimalOdds - 1) - (1 - winRate)
 */
function calcExpectedProfit(winRate: number, decimalOdds: number): number {
  return winRate * (decimalOdds - 1) - (1 - winRate)
}

/**
 * Simplified probability of recovering within N bets.
 * Uses normal approximation: sum of N independent bets.
 * P(total profit >= unitsNeeded) = P(Z >= z) where z = (unitsNeeded - N*mu) / (sqrt(N)*sigma)
 */
function calcRecoveryProbability(
  numBets: number,
  unitsNeeded: number,
  expectedPerBet: number,
  winRate: number,
  decimalOdds: number
): number {
  if (expectedPerBet <= 0) return 0
  if (numBets * expectedPerBet >= unitsNeeded * 3) return 99.9

  const mu = expectedPerBet
  // Variance of a single bet: p*(win-mu)^2 + (1-p)*(loss-mu)^2
  const winAmount = decimalOdds - 1
  const lossAmount = -1
  const variance = winRate * (winAmount - mu) ** 2 + (1 - winRate) * (lossAmount - mu) ** 2
  const sigma = Math.sqrt(variance)

  if (sigma <= 0) return expectedPerBet > 0 ? 99.9 : 0

  const totalMu = numBets * mu
  const totalSigma = Math.sqrt(numBets) * sigma

  // z-score: how many standard deviations is our target from expected
  const z = (unitsNeeded - totalMu) / totalSigma

  // Approximate P(Z >= z) using error function approximation
  const probability = (1 - erf(z / Math.sqrt(2))) / 2 * 100

  return Math.min(99.9, Math.max(0.1, probability))
}

/**
 * Error function approximation (Abramowitz and Stegun formula 7.1.26)
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1
  const a = Math.abs(x)

  const t = 1 / (1 + 0.3275911 * a)
  const y = 1 - (
    ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592
  ) * t * Math.exp(-a * a)

  return sign * y
}
