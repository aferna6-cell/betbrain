/**
 * Pick Confidence vs CLV Scatter — Scatter plot data of stated confidence vs actual CLV.
 *
 * Shows how well your confidence ratings predict closing line value.
 * Ideally, higher confidence picks should have higher CLV.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface ScatterPoint {
  id: string
  confidence: number  // 1-5 stated confidence
  clv: number         // Closing line value percentage
  outcome: 'win' | 'loss' | 'push'
  sport: string
  pickType: string
  label: string
}

export interface ScatterAnalysis {
  points: ScatterPoint[]
  /** Correlation between confidence and CLV (-1 to 1) */
  correlation: number
  /** Is the correlation statistically meaningful? */
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'none' | 'insufficient'
  /** Average CLV by confidence level */
  avgClvByConfidence: Array<{ confidence: number; avgClv: number; count: number }>
  /** Overall average CLV */
  overallAvgClv: number
  /** Insight */
  insight: string
}

export interface PickForScatter {
  id: string
  odds: number
  closing_odds: number | null
  outcome: string | null
  sport: string
  pick_type: string
  pick_team: string | null
}

/**
 * Build scatter plot data from picks with confidence ratings.
 *
 * @param picks - Array of picks
 * @param confidenceMap - Map of pickId → confidence rating (1-5)
 */
export function buildConfidenceClvScatter(
  picks: PickForScatter[],
  confidenceMap: Map<string, number>
): ScatterAnalysis {
  // Filter to picks with both confidence and closing odds
  const points: ScatterPoint[] = picks
    .filter((p) => p.closing_odds !== null && p.outcome && p.outcome !== 'pending')
    .filter((p) => confidenceMap.has(p.id))
    .map((p) => {
      const clv = calculateCLV(p.odds, p.closing_odds!)
      return {
        id: p.id,
        confidence: confidenceMap.get(p.id)!,
        clv,
        outcome: p.outcome as 'win' | 'loss' | 'push',
        sport: p.sport,
        pickType: p.pick_type,
        label: p.pick_team || p.sport.toUpperCase(),
      }
    })

  if (points.length < 3) {
    return {
      points,
      correlation: 0,
      correlationStrength: 'insufficient',
      avgClvByConfidence: [],
      overallAvgClv: 0,
      insight: 'Need at least 3 picks with confidence ratings and closing odds for scatter analysis.',
    }
  }

  // Calculate correlation
  const xs = points.map((p) => p.confidence)
  const ys = points.map((p) => p.clv)
  const correlation = pearsonCorrelation(xs, ys)

  // Determine strength
  let correlationStrength: ScatterAnalysis['correlationStrength']
  const abs = Math.abs(correlation)
  if (points.length < 10) correlationStrength = 'insufficient'
  else if (abs >= 0.7) correlationStrength = 'strong'
  else if (abs >= 0.4) correlationStrength = 'moderate'
  else if (abs >= 0.2) correlationStrength = 'weak'
  else correlationStrength = 'none'

  // Average CLV by confidence
  const confGroups = new Map<number, number[]>()
  for (const point of points) {
    const existing = confGroups.get(point.confidence) || []
    existing.push(point.clv)
    confGroups.set(point.confidence, existing)
  }

  const avgClvByConfidence = Array.from(confGroups.entries())
    .map(([confidence, clvs]) => ({
      confidence,
      avgClv: Math.round((clvs.reduce((a, b) => a + b, 0) / clvs.length) * 100) / 100,
      count: clvs.length,
    }))
    .sort((a, b) => a.confidence - b.confidence)

  const overallAvgClv = Math.round(
    (points.reduce((sum, p) => sum + p.clv, 0) / points.length) * 100
  ) / 100

  const insight = generateInsight(correlation, correlationStrength, avgClvByConfidence, overallAvgClv)

  return {
    points,
    correlation: Math.round(correlation * 1000) / 1000,
    correlationStrength,
    avgClvByConfidence,
    overallAvgClv,
    insight,
  }
}

function calculateCLV(placedOdds: number, closingOdds: number): number {
  const placedProb = oddsToImpliedProb(placedOdds)
  const closingProb = oddsToImpliedProb(closingOdds)
  // CLV = closing probability - placed probability (positive = good)
  return Math.round((closingProb - placedProb) * 10000) / 100
}

function oddsToImpliedProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0

  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0)
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0)
  const sumY2 = ys.reduce((sum, y) => sum + y * y, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0
  return numerator / denominator
}

function generateInsight(
  correlation: number,
  strength: ScatterAnalysis['correlationStrength'],
  avgByConf: ScatterAnalysis['avgClvByConfidence'],
  overallAvg: number
): string {
  if (strength === 'insufficient') {
    return 'Not enough data yet for meaningful analysis. Keep rating your confidence and tracking closing odds.'
  }

  if (strength === 'strong' && correlation > 0) {
    return `Strong positive correlation (r=${correlation.toFixed(2)}): your higher confidence picks consistently achieve better CLV. Your confidence calibration is excellent.`
  }

  if (strength === 'strong' && correlation < 0) {
    return `Warning: strong negative correlation (r=${correlation.toFixed(2)}). Your higher confidence picks actually have WORSE CLV. Consider recalibrating your confidence assessment.`
  }

  if (strength === 'moderate' && correlation > 0) {
    return `Moderate positive correlation (r=${correlation.toFixed(2)}): confidence loosely predicts CLV. Room to improve calibration.`
  }

  if (strength === 'none') {
    return `No correlation between stated confidence and CLV (r=${correlation.toFixed(2)}). Your confidence ratings don't predict line value. Consider what factors drive real edge.`
  }

  return `Weak ${correlation > 0 ? 'positive' : 'negative'} correlation (r=${correlation.toFixed(2)}). Overall avg CLV: ${overallAvg >= 0 ? '+' : ''}${overallAvg}%.`
}
