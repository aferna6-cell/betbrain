/**
 * Risk Assessment — Pre-bet risk scoring and bankroll impact analysis.
 *
 * Evaluates a potential bet across multiple risk dimensions:
 * - Bankroll exposure (what % of bankroll is at risk)
 * - Odds value (is this +EV or -EV based on market consensus)
 * - Correlation with existing bets (portfolio concentration)
 * - Recency bias check (are you chasing losses?)
 *
 * Returns a composite risk score and actionable warnings.
 *
 * Pure functions, no side effects.
 */

import { americanToImplied, americanToDecimal } from '@/lib/odds'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiskInput {
  /** American odds of the bet */
  odds: number
  /** Units to wager */
  units: number
  /** Sport */
  sport: string
  /** Bet type */
  betType: string
  /** Current bankroll */
  bankroll: number
  /** Unit size in dollars */
  unitSize: number
  /** Recent pick outcomes (last 10) */
  recentOutcomes: ('win' | 'loss' | 'push')[]
  /** Number of existing pending picks */
  pendingPickCount: number
  /** Fair implied probability from market consensus (0-1), if available */
  fairImplied?: number
}

export interface RiskAssessment {
  /** Composite risk score (0-100). Higher = riskier. */
  score: number
  /** Risk level label */
  level: 'low' | 'moderate' | 'elevated' | 'high' | 'extreme'
  /** Individual risk factors */
  factors: RiskFactor[]
  /** Overall recommendation */
  recommendation: string
  /** Max recommended units based on Kelly + bankroll */
  maxRecommendedUnits: number
}

export interface RiskFactor {
  name: string
  score: number // 0-100
  description: string
  severity: 'ok' | 'warning' | 'danger'
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Assess the risk of a potential bet.
 */
export function assessRisk(input: RiskInput): RiskAssessment {
  const factors: RiskFactor[] = []

  // 1. Bankroll exposure
  factors.push(assessBankrollExposure(input))

  // 2. Odds value
  factors.push(assessOddsValue(input))

  // 3. Portfolio concentration
  factors.push(assessConcentration(input))

  // 4. Tilt / recency bias
  factors.push(assessTilt(input))

  // 5. Unit sizing
  factors.push(assessUnitSizing(input))

  // Composite score (weighted average)
  const weights = [0.30, 0.25, 0.15, 0.20, 0.10]
  const compositeScore = Math.min(100, Math.round(
    factors.reduce((sum, f, i) => sum + f.score * (weights[i] ?? 0.1), 0)
  ))

  const level = scoreToLevel(compositeScore)
  const recommendation = generateRecommendation(compositeScore, factors, input)
  const maxRecommendedUnits = calculateMaxUnits(input)

  return {
    score: compositeScore,
    level,
    factors,
    recommendation,
    maxRecommendedUnits,
  }
}

// ---------------------------------------------------------------------------
// Individual factor assessments
// ---------------------------------------------------------------------------

function assessBankrollExposure(input: RiskInput): RiskFactor {
  const dollarAmount = input.units * input.unitSize
  const pct = input.bankroll > 0 ? (dollarAmount / input.bankroll) * 100 : 100

  let score: number
  let severity: 'ok' | 'warning' | 'danger'

  if (pct <= 2) {
    score = 10
    severity = 'ok'
  } else if (pct <= 5) {
    score = 30
    severity = 'ok'
  } else if (pct <= 10) {
    score = 60
    severity = 'warning'
  } else if (pct <= 20) {
    score = 80
    severity = 'danger'
  } else {
    score = 100
    severity = 'danger'
  }

  return {
    name: 'Bankroll Exposure',
    score,
    description: `${pct.toFixed(1)}% of bankroll ($${dollarAmount.toFixed(0)} of $${input.bankroll.toFixed(0)})`,
    severity,
  }
}

function assessOddsValue(input: RiskInput): RiskFactor {
  const implied = americanToImplied(input.odds)

  if (input.fairImplied != null) {
    const edge = (input.fairImplied - implied) * 100

    if (edge >= 3) {
      return {
        name: 'Odds Value',
        score: 10,
        description: `+${edge.toFixed(1)}% edge vs market consensus. Strong value.`,
        severity: 'ok',
      }
    } else if (edge >= 1) {
      return {
        name: 'Odds Value',
        score: 25,
        description: `+${edge.toFixed(1)}% edge vs market. Marginal value.`,
        severity: 'ok',
      }
    } else if (edge >= -1) {
      return {
        name: 'Odds Value',
        score: 50,
        description: `${edge.toFixed(1)}% vs market. Near break-even.`,
        severity: 'warning',
      }
    } else {
      return {
        name: 'Odds Value',
        score: 80,
        description: `${edge.toFixed(1)}% vs market. Betting into negative edge.`,
        severity: 'danger',
      }
    }
  }

  // Without market data, use odds magnitude as a proxy
  if (Math.abs(input.odds) >= 300) {
    return {
      name: 'Odds Value',
      score: 60,
      description: 'Extreme odds carry higher variance. Market data not available for edge calculation.',
      severity: 'warning',
    }
  }

  return {
    name: 'Odds Value',
    score: 40,
    description: 'Market consensus data not available. Cannot calculate edge.',
    severity: 'warning',
  }
}

function assessConcentration(input: RiskInput): RiskFactor {
  const pending = input.pendingPickCount

  if (pending <= 2) {
    return {
      name: 'Portfolio Concentration',
      score: 10,
      description: `${pending} pending picks. Low concentration.`,
      severity: 'ok',
    }
  } else if (pending <= 5) {
    return {
      name: 'Portfolio Concentration',
      score: 35,
      description: `${pending} pending picks. Moderate concentration.`,
      severity: 'ok',
    }
  } else if (pending <= 10) {
    return {
      name: 'Portfolio Concentration',
      score: 60,
      description: `${pending} pending picks. High concentration — consider waiting for some to resolve.`,
      severity: 'warning',
    }
  } else {
    return {
      name: 'Portfolio Concentration',
      score: 85,
      description: `${pending} pending picks. Very high exposure. Wait for results before adding more.`,
      severity: 'danger',
    }
  }
}

function assessTilt(input: RiskInput): RiskFactor {
  const recent = input.recentOutcomes
  if (recent.length < 3) {
    return {
      name: 'Recency Bias',
      score: 20,
      description: 'Not enough recent history to assess.',
      severity: 'ok',
    }
  }

  // Count recent losses
  const recentLosses = recent.slice(-5).filter((o) => o === 'loss').length

  if (recentLosses >= 4) {
    return {
      name: 'Recency Bias',
      score: 90,
      description: `${recentLosses} of your last 5 picks lost. High tilt risk — are you chasing?`,
      severity: 'danger',
    }
  } else if (recentLosses >= 3) {
    return {
      name: 'Recency Bias',
      score: 65,
      description: `${recentLosses} of your last 5 picks lost. Take a breath before this bet.`,
      severity: 'warning',
    }
  }

  return {
    name: 'Recency Bias',
    score: 15,
    description: 'Recent results look stable. No tilt indicators.',
    severity: 'ok',
  }
}

function assessUnitSizing(input: RiskInput): RiskFactor {
  if (input.units <= 1) {
    return {
      name: 'Unit Sizing',
      score: 10,
      description: 'Standard 1-unit bet. Conservative.',
      severity: 'ok',
    }
  } else if (input.units <= 2) {
    return {
      name: 'Unit Sizing',
      score: 30,
      description: `${input.units}-unit bet. Moderate.`,
      severity: 'ok',
    }
  } else if (input.units <= 3) {
    return {
      name: 'Unit Sizing',
      score: 55,
      description: `${input.units}-unit bet. Above average size. Confident?`,
      severity: 'warning',
    }
  } else {
    return {
      name: 'Unit Sizing',
      score: 85,
      description: `${input.units}-unit bet. Very large. Make sure this is Kelly-justified.`,
      severity: 'danger',
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreToLevel(score: number): RiskAssessment['level'] {
  if (score <= 20) return 'low'
  if (score <= 40) return 'moderate'
  if (score <= 60) return 'elevated'
  if (score <= 80) return 'high'
  return 'extreme'
}

function generateRecommendation(
  score: number,
  factors: RiskFactor[],
  input: RiskInput
): string {
  if (score <= 20) return 'This bet looks well-sized and well-reasoned. Proceed with confidence.'
  if (score <= 40) return 'Moderate risk. Double-check your reasoning and ensure this fits your bankroll strategy.'

  const dangers = factors.filter((f) => f.severity === 'danger')
  if (dangers.length > 0) {
    const topDanger = dangers[0].name.toLowerCase()
    return `Caution: ${topDanger} is elevated. Consider reducing unit size or passing on this bet.`
  }

  if (score <= 60) return 'Elevated risk across multiple factors. Reduce unit size or wait for better spots.'
  return 'High risk bet. Strong recommendation to pass or significantly reduce units.'
}

function calculateMaxUnits(input: RiskInput): number {
  if (input.bankroll <= 0 || input.unitSize <= 0) return 0

  // Max 3% of bankroll per bet (conservative)
  const maxDollars = input.bankroll * 0.03
  const maxUnits = Math.floor((maxDollars / input.unitSize) * 10) / 10

  return Math.max(0.5, Math.min(maxUnits, 5))
}
