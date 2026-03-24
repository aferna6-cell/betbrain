/**
 * Bet Calculator — Comprehensive payout, hedge, and parlay math.
 *
 * Pure functions for:
 * - Single bet payout calculation
 * - Hedge bet calculation (lock in profit or minimize loss)
 * - Parlay payout calculation
 * - Round-robin combination generation
 * - Break-even win rate calculation
 *
 * All functions are pure — no side effects, no API calls.
 */

import { americanToDecimal, americanToImplied } from '@/lib/odds'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BetPayout {
  wager: number
  odds: number
  decimalOdds: number
  impliedProbability: number
  /** Total payout including original wager */
  totalPayout: number
  /** Profit if the bet wins */
  profit: number
  /** Win rate needed to break even at these odds */
  breakEvenRate: number
}

export interface HedgeBet {
  /** Amount to wager on the hedge side */
  hedgeWager: number
  /** Your guaranteed profit regardless of outcome */
  guaranteedProfit: number
  /** Total outlay (original wager + hedge wager) */
  totalOutlay: number
  /** ROI on total outlay */
  roi: number
  /** What happens if original bet wins */
  ifOriginalWins: { payout: number; profit: number }
  /** What happens if hedge bet wins */
  ifHedgeWins: { payout: number; profit: number }
}

export interface ParlayCalculation {
  legs: { odds: number; decimalOdds: number; impliedProbability: number }[]
  /** Combined decimal odds */
  combinedDecimalOdds: number
  /** Combined American odds */
  combinedAmericanOdds: number
  /** Combined implied probability (true probability, not vig-adjusted) */
  combinedImpliedProbability: number
  /** Total payout for the given wager */
  totalPayout: number
  /** Profit if all legs hit */
  profit: number
  /** Wager amount */
  wager: number
}

// ---------------------------------------------------------------------------
// Single bet payout
// ---------------------------------------------------------------------------

/**
 * Calculate payout for a single bet.
 */
export function calculatePayout(wager: number, americanOdds: number): BetPayout {
  const decimalOdds = americanToDecimal(americanOdds)
  const impliedProbability = americanToImplied(americanOdds)
  const totalPayout = Math.round(wager * decimalOdds * 100) / 100
  const profit = Math.round((totalPayout - wager) * 100) / 100
  const breakEvenRate = Math.round(impliedProbability * 10000) / 10000

  return {
    wager,
    odds: americanOdds,
    decimalOdds: Math.round(decimalOdds * 1000) / 1000,
    impliedProbability: Math.round(impliedProbability * 10000) / 10000,
    totalPayout,
    profit,
    breakEvenRate,
  }
}

// ---------------------------------------------------------------------------
// Hedge bet calculator
// ---------------------------------------------------------------------------

/**
 * Calculate the optimal hedge bet to guarantee profit.
 *
 * Scenario: You have a bet at `originalOdds` with `originalWager`.
 * The other side is now available at `hedgeOdds`.
 * How much should you bet on the hedge to lock in profit?
 *
 * @param originalWager - Amount wagered on original bet
 * @param originalOdds - American odds of original bet
 * @param hedgeOdds - American odds available for the opposite side
 */
export function calculateHedge(
  originalWager: number,
  originalOdds: number,
  hedgeOdds: number
): HedgeBet {
  const originalDecimal = americanToDecimal(originalOdds)
  const hedgeDecimal = americanToDecimal(hedgeOdds)

  // Original total payout if it wins
  const originalPayout = originalWager * originalDecimal

  // To equalize profit: hedgeWager * hedgeDecimal = originalPayout
  // hedgeWager = originalPayout / hedgeDecimal
  // But we want equal profit on both sides:
  // If original wins: originalPayout - originalWager - hedgeWager = profit
  // If hedge wins: hedgeWager * hedgeDecimal - originalWager - hedgeWager = profit
  // Set equal: originalPayout - totalOutlay = hedgePayout - totalOutlay
  // hedgeWager = originalPayout / hedgeDecimal
  const hedgeWager = Math.round((originalPayout / hedgeDecimal) * 100) / 100

  const totalOutlay = originalWager + hedgeWager
  const hedgePayout = Math.round(hedgeWager * hedgeDecimal * 100) / 100

  const ifOriginalWins = {
    payout: Math.round(originalPayout * 100) / 100,
    profit: Math.round((originalPayout - totalOutlay) * 100) / 100,
  }

  const ifHedgeWins = {
    payout: hedgePayout,
    profit: Math.round((hedgePayout - totalOutlay) * 100) / 100,
  }

  // Guaranteed profit is the minimum of both outcomes
  const guaranteedProfit = Math.min(ifOriginalWins.profit, ifHedgeWins.profit)
  const roi = totalOutlay > 0
    ? Math.round((guaranteedProfit / totalOutlay) * 10000) / 100
    : 0

  return {
    hedgeWager,
    guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
    totalOutlay: Math.round(totalOutlay * 100) / 100,
    roi,
    ifOriginalWins,
    ifHedgeWins,
  }
}

// ---------------------------------------------------------------------------
// Parlay calculator
// ---------------------------------------------------------------------------

/**
 * Calculate parlay payout from an array of American odds.
 */
export function calculateParlay(wager: number, legOdds: number[]): ParlayCalculation {
  const legs = legOdds.map((odds) => ({
    odds,
    decimalOdds: Math.round(americanToDecimal(odds) * 1000) / 1000,
    impliedProbability: Math.round(americanToImplied(odds) * 10000) / 10000,
  }))

  const combinedDecimalOdds = legs.reduce((acc, leg) => acc * leg.decimalOdds, 1)
  const combinedImpliedProbability = legs.reduce((acc, leg) => acc * leg.impliedProbability, 1)

  const totalPayout = Math.round(wager * combinedDecimalOdds * 100) / 100
  const profit = Math.round((totalPayout - wager) * 100) / 100

  // Convert combined decimal to American
  let combinedAmericanOdds: number
  if (combinedDecimalOdds >= 2) {
    combinedAmericanOdds = Math.round((combinedDecimalOdds - 1) * 100)
  } else {
    combinedAmericanOdds = Math.round(-100 / (combinedDecimalOdds - 1))
  }

  return {
    legs,
    combinedDecimalOdds: Math.round(combinedDecimalOdds * 1000) / 1000,
    combinedAmericanOdds,
    combinedImpliedProbability: Math.round(combinedImpliedProbability * 10000) / 10000,
    totalPayout,
    profit,
    wager,
  }
}

/**
 * Calculate the break-even win rate for given American odds.
 * This is the minimum win rate needed to profit long-term at these odds.
 */
export function breakEvenWinRate(americanOdds: number): number {
  return Math.round(americanToImplied(americanOdds) * 10000) / 10000
}

/**
 * Calculate the expected value of a bet.
 * Returns dollar EV per $1 wagered.
 *
 * @param winProbability - Your estimated true win probability (0-1)
 * @param americanOdds - The odds offered
 */
export function expectedValue(winProbability: number, americanOdds: number): number {
  const decimalOdds = americanToDecimal(americanOdds)
  const ev = (winProbability * (decimalOdds - 1)) - (1 - winProbability)
  return Math.round(ev * 10000) / 10000
}

/**
 * Calculate how many wins needed out of N bets to profit at given odds.
 */
export function winsNeededToProfit(totalBets: number, americanOdds: number): number {
  const be = breakEvenWinRate(americanOdds)
  return Math.ceil(totalBets * be)
}
