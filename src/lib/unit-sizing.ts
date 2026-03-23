/**
 * Unit size recommendations based on bankroll and confidence level.
 * Uses fractional Kelly criterion for conservative sizing.
 */

import { kellyCriterion } from './bankroll'

export interface UnitRecommendation {
  confidence: 'low' | 'medium' | 'high' | 'max'
  kellyFraction: number
  /** Recommended units as fraction of bankroll (0 to 1) */
  bankrollPct: number
  /** Dollar amount for this confidence level */
  dollarAmount: number
  /** Units to wager */
  units: number
  label: string
}

export interface UnitSizingConfig {
  bankroll: number
  unitSize: number
  /** Kelly fraction multiplier (0.25 = quarter Kelly, conservative default) */
  kellyMultiplier?: number
}

/**
 * Standard confidence tiers with fractional Kelly multipliers.
 * Even "max" confidence uses half Kelly for risk management.
 */
const CONFIDENCE_TIERS = [
  { confidence: 'low' as const, kellyMult: 0.25, label: 'Low confidence — quarter Kelly' },
  { confidence: 'medium' as const, kellyMult: 0.5, label: 'Medium confidence — half Kelly' },
  { confidence: 'high' as const, kellyMult: 0.75, label: 'High confidence — three-quarter Kelly' },
  { confidence: 'max' as const, kellyMult: 1.0, label: 'Maximum confidence — full Kelly (capped at 5%)' },
]

/**
 * Generate unit size recommendations for a specific bet.
 *
 * @param winProbability - Estimated win probability (0 to 1)
 * @param americanOdds - The odds offered
 * @param config - Bankroll and unit size settings
 */
export function getUnitRecommendations(
  winProbability: number,
  americanOdds: number,
  config: UnitSizingConfig
): UnitRecommendation[] {
  const { bankroll, unitSize, kellyMultiplier = 1 } = config

  if (bankroll <= 0 || unitSize <= 0) return []

  // Get full Kelly fraction
  const fullKelly = kellyCriterion(winProbability, americanOdds)

  return CONFIDENCE_TIERS.map((tier) => {
    const adjustedKelly = fullKelly * tier.kellyMult * kellyMultiplier
    // Cap at 5% of bankroll for risk management
    const bankrollPct = Math.min(adjustedKelly, 0.05)
    const dollarAmount = Math.round(bankroll * bankrollPct * 100) / 100
    const units = unitSize > 0 ? Math.round((dollarAmount / unitSize) * 10) / 10 : 0

    return {
      confidence: tier.confidence,
      kellyFraction: Math.round(adjustedKelly * 10000) / 10000,
      bankrollPct: Math.round(bankrollPct * 10000) / 10000,
      dollarAmount,
      units: Math.max(0, units),
      label: tier.label,
    }
  })
}

/**
 * Flat staking recommendation based on bankroll percentage.
 * For users who prefer simpler sizing without Kelly.
 */
export function getFlatUnitSize(bankroll: number, riskLevel: 'conservative' | 'moderate' | 'aggressive'): number {
  const pcts: Record<string, number> = {
    conservative: 0.01, // 1% of bankroll
    moderate: 0.02, // 2% of bankroll
    aggressive: 0.03, // 3% of bankroll
  }
  return Math.round(bankroll * (pcts[riskLevel] ?? 0.02) * 100) / 100
}
