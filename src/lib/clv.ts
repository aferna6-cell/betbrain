/**
 * Closing Line Value (CLV) calculation utilities.
 *
 * CLV measures the difference between the odds you bet at and the closing line.
 * It's the #1 predictor of long-term profitability in sports betting.
 *
 * Positive CLV = you got better odds than the market close (good)
 * Negative CLV = market moved in your favor but you missed it (bad)
 */

/**
 * Converts American odds to implied probability (0-1).
 * E.g. -110 → 0.5238, +150 → 0.4
 */
export function americanToImpliedProbability(odds: number): number {
  if (odds >= 100) {
    return 100 / (odds + 100)
  }
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

/**
 * Calculates CLV in cents (percentage points of implied probability).
 *
 * CLV = closingImplied - betImplied (for bets on the side you took)
 * Positive = you got a better price than closing (the market moved toward your side)
 *
 * @param betOdds - The American odds you bet at
 * @param closingOdds - The closing line American odds
 * @returns CLV in percentage points (e.g. 2.5 means +2.5% edge)
 */
export function calculateCLV(betOdds: number, closingOdds: number): number {
  const betImplied = americanToImpliedProbability(betOdds)
  const closingImplied = americanToImpliedProbability(closingOdds)

  // CLV = closing implied - bet implied
  // If you bet at -110 (52.38%) and it closed at -120 (54.55%),
  // CLV = 54.55% - 52.38% = +2.17% (you got a better price)
  return round((closingImplied - betImplied) * 100, 2)
}

/**
 * Calculates aggregate CLV stats from a list of picks with closing odds.
 */
export function calculateCLVStats(
  picks: Array<{ odds: number; closing_odds: number | null; units: number }>
): CLVStats {
  const picksWithClosing = picks.filter(
    (p): p is { odds: number; closing_odds: number; units: number } =>
      p.closing_odds !== null
  )

  if (picksWithClosing.length === 0) {
    return {
      averageCLV: 0,
      totalPicks: 0,
      positiveCLVCount: 0,
      negativeCLVCount: 0,
      positiveCLVRate: 0,
      weightedCLV: 0,
    }
  }

  let totalCLV = 0
  let weightedCLVSum = 0
  let totalUnits = 0
  let positiveCLVCount = 0
  let negativeCLVCount = 0

  for (const pick of picksWithClosing) {
    const clv = calculateCLV(pick.odds, pick.closing_odds)
    totalCLV += clv
    weightedCLVSum += clv * pick.units
    totalUnits += pick.units

    if (clv > 0) positiveCLVCount++
    else if (clv < 0) negativeCLVCount++
  }

  return {
    averageCLV: round(totalCLV / picksWithClosing.length, 2),
    totalPicks: picksWithClosing.length,
    positiveCLVCount,
    negativeCLVCount,
    positiveCLVRate: round(
      (positiveCLVCount / picksWithClosing.length) * 100,
      1
    ),
    weightedCLV: totalUnits > 0 ? round(weightedCLVSum / totalUnits, 2) : 0,
  }
}

export interface CLVStats {
  /** Average CLV across all picks (percentage points) */
  averageCLV: number
  /** Number of picks with closing odds recorded */
  totalPicks: number
  /** Number of picks with positive CLV */
  positiveCLVCount: number
  /** Number of picks with negative CLV */
  negativeCLVCount: number
  /** Percentage of picks with positive CLV */
  positiveCLVRate: number
  /** Unit-weighted average CLV */
  weightedCLV: number
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
