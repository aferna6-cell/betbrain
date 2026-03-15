/**
 * Odds conversion utility — pure functions, no side effects.
 *
 * All American odds are integers (e.g. -110, +150).
 * Decimal odds are multipliers (e.g. 2.5 means a $1 bet returns $2.50 total).
 * Implied probability is expressed as a fraction in [0, 1].
 */

/** Convert American odds to decimal odds */
export function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1
  return 100 / Math.abs(american) + 1
}

/** Convert decimal odds to American odds */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

/** Convert American odds to implied probability (0–1) */
export function americanToImplied(american: number): number {
  if (american < 0) return Math.abs(american) / (Math.abs(american) + 100)
  return 100 / (american + 100)
}

/** Convert implied probability (0–1) to American odds */
export function impliedToAmerican(probability: number): number {
  if (probability <= 0 || probability >= 1) {
    throw new RangeError('probability must be strictly between 0 and 1')
  }
  if (probability >= 0.5) {
    // Favourite — negative American odds
    return Math.round(-100 * probability / (1 - probability))
  }
  // Underdog — positive American odds
  return Math.round(100 * (1 - probability) / probability)
}

/** Convert American odds to fractional string (e.g. "+150" → "3/2") */
export function americanToFractional(american: number): string {
  // Convert to decimal, subtract 1 to get the profit multiplier, then reduce
  const decimal = americanToDecimal(american)
  const profit = decimal - 1 // profit per unit staked

  // Express as a fraction with denominator scaled to avoid floating point issues
  // Multiply by 1000 to work with integers, then find GCD
  const SCALE = 1000
  const numerator = Math.round(profit * SCALE)
  const denominator = SCALE

  const divisor = gcd(Math.abs(numerator), denominator)
  return `${numerator / divisor}/${denominator / divisor}`
}

/** Format American odds with + prefix for positive values */
export function formatAmerican(american: number): string {
  if (american >= 0) return `+${american}`
  return `${american}`
}

/** Display-format American odds, with em dash for null. */
export function formatOdds(price: number | null): string {
  if (price === null) return '—'
  return price > 0 ? `+${price}` : `${price}`
}

/** Format implied probability as a percentage string (e.g. "52.4%"). Returns "—" for null. */
export function formatImpliedProb(price: number | null): string {
  if (price === null) return '—'
  return `${(americanToImplied(price) * 100).toFixed(1)}%`
}

/**
 * Calculate the vig (overround) from a two-sided market.
 * Returns the excess implied probability above 1.0 (e.g. 0.0476 for 4.76% vig).
 */
export function calculateVig(odds1: number, odds2: number): number {
  return americanToImplied(odds1) + americanToImplied(odds2) - 1
}

/**
 * Calculate no-vig fair odds from a two-sided market.
 * Removes the bookmaker's margin proportionally, so the fair probabilities sum to exactly 1.
 */
export function noVigOdds(odds1: number, odds2: number): { fair1: number; fair2: number } {
  const implied1 = americanToImplied(odds1)
  const implied2 = americanToImplied(odds2)
  const total = implied1 + implied2

  const fair1 = implied1 / total
  const fair2 = implied2 / total

  return {
    fair1: decimalToAmerican(1 / fair1),
    fair2: decimalToAmerican(1 / fair2),
  }
}

// ---------------------------------------------------------------------------
// Best-odds finders (scan bookmakers for the most favorable line)
// ---------------------------------------------------------------------------

import type { NormalizedBookmakerOdds } from '@/lib/sports/config'

/** Return the best (highest) moneyline price across bookmakers for a given side. */
export function getBestMoneyline(
  bookmakers: NormalizedBookmakerOdds[],
  side: 'home' | 'away'
): number | null {
  let best: number | null = null
  for (const bk of bookmakers) {
    const price = side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (price !== null && price !== undefined) {
      if (best === null || price > best) best = price
    }
  }
  return best
}

/** Return the best (highest) spread odds across bookmakers for a given side. */
export function getBestSpreadOdds(
  bookmakers: NormalizedBookmakerOdds[],
  side: 'home' | 'away'
): number | null {
  let best: number | null = null
  for (const bk of bookmakers) {
    const price = side === 'home' ? bk.spread?.homeOdds : bk.spread?.awayOdds
    if (price !== null && price !== undefined) {
      if (best === null || price > best) best = price
    }
  }
  return best
}

/** Return the best (highest) total odds across bookmakers for over or under. */
export function getBestTotalOdds(
  bookmakers: NormalizedBookmakerOdds[],
  side: 'over' | 'under'
): number | null {
  let best: number | null = null
  for (const bk of bookmakers) {
    const price = side === 'over' ? bk.total?.overOdds : bk.total?.underOdds
    if (price !== null && price !== undefined) {
      if (best === null || price > best) best = price
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}
