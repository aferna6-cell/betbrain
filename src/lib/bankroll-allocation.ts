/**
 * Smart bankroll allocation.
 * Suggests how to split bankroll across sports based on historical performance.
 *
 * Uses ROI, sample size, and variance to weight allocations.
 * Inspired by Kelly criterion portfolio optimization.
 */

export interface SportPerformance {
  sport: string
  wins: number
  losses: number
  total: number
  winRate: number
  profit: number
  units: number
  roi: number
}

export interface AllocationSuggestion {
  sport: string
  percentage: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

export interface AllocationResult {
  suggestions: AllocationSuggestion[]
  methodology: string
  totalBankroll: number
  minSampleWarning: boolean
}

/**
 * Calculate sport performance from picks.
 */
export function calcSportPerformance(
  picks: { sport: string; outcome: string | null; profit: number | null; units: number }[]
): SportPerformance[] {
  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  const sports = [...new Set(resolved.map((p) => p.sport))]

  return sports.map((sport) => {
    const sportPicks = resolved.filter((p) => p.sport === sport)
    const wins = sportPicks.filter((p) => p.outcome === 'win').length
    const losses = sportPicks.filter((p) => p.outcome === 'loss').length
    const total = sportPicks.length
    const profit = sportPicks.reduce((s, p) => s + (p.profit ?? 0), 0)
    const units = sportPicks.reduce((s, p) => s + p.units, 0)
    const decided = wins + losses
    const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0
    const roi = units > 0 ? Math.round((profit / units) * 10000) / 100 : 0

    return { sport, wins, losses, total, winRate, profit, units, roi }
  }).sort((a, b) => b.roi - a.roi)
}

/**
 * Generate bankroll allocation suggestions based on performance data.
 * Pure function for testability.
 *
 * Methodology:
 * 1. Start with equal allocation across active sports
 * 2. Boost allocation for sports with positive ROI and adequate sample size
 * 3. Reduce allocation for negative ROI sports
 * 4. Apply minimum (5%) and maximum (50%) caps
 * 5. Normalize to 100%
 */
export function suggestAllocation(
  performances: SportPerformance[],
  totalBankroll: number = 1000
): AllocationResult {
  if (performances.length === 0) {
    return {
      suggestions: [],
      methodology: 'No historical data available.',
      totalBankroll,
      minSampleWarning: true,
    }
  }

  const MIN_SAMPLE = 20
  const MIN_ALLOC = 5
  const MAX_ALLOC = 50

  const minSampleWarning = performances.some((p) => p.total < MIN_SAMPLE)

  // Calculate raw scores based on ROI weighted by sample size
  const scored = performances.map((p) => {
    // Sample size confidence factor (0-1), ramps up to 1 at 50+ picks
    const sampleConfidence = Math.min(p.total / 50, 1)

    // ROI score: positive ROI gets boosted, negative gets reduced
    const roiScore = p.roi > 0
      ? 1 + (p.roi / 100) * sampleConfidence
      : Math.max(0.2, 1 + (p.roi / 100) * sampleConfidence) // Floor at 0.2 (don't go to zero)

    // Win rate bonus: above 55% gets a boost
    const winRateBonus = p.winRate > 55 ? 1.1 : p.winRate > 52 ? 1.05 : 1

    const rawScore = roiScore * winRateBonus

    const confidence: AllocationSuggestion['confidence'] =
      p.total >= 50 ? 'high' : p.total >= MIN_SAMPLE ? 'medium' : 'low'

    return { sport: p.sport, rawScore, confidence, performance: p }
  })

  // Normalize to percentages
  const totalScore = scored.reduce((s, x) => s + x.rawScore, 0)

  let suggestions = scored.map((s) => {
    let pct = totalScore > 0 ? (s.rawScore / totalScore) * 100 : 100 / scored.length
    pct = Math.max(MIN_ALLOC, Math.min(MAX_ALLOC, pct))
    pct = Math.round(pct * 10) / 10

    const reasoning = buildReasoning(s.performance, s.confidence)

    return {
      sport: s.sport,
      percentage: pct,
      reasoning,
      confidence: s.confidence,
    }
  })

  // Normalize to exactly 100%
  const total = suggestions.reduce((s, x) => s + x.percentage, 0)
  if (total !== 100 && suggestions.length > 0) {
    const diff = 100 - total
    // Distribute difference to the largest allocation
    suggestions.sort((a, b) => b.percentage - a.percentage)
    suggestions[0].percentage = Math.round((suggestions[0].percentage + diff) * 10) / 10
  }

  // Sort by percentage descending
  suggestions.sort((a, b) => b.percentage - a.percentage)

  return {
    suggestions,
    methodology: 'Allocation weighted by ROI, win rate, and sample size. Min 5%, max 50% per sport.',
    totalBankroll,
    minSampleWarning,
  }
}

function buildReasoning(p: SportPerformance, confidence: string): string {
  const parts: string[] = []

  if (p.roi > 5) parts.push(`Strong +${p.roi}% ROI`)
  else if (p.roi > 0) parts.push(`Positive ${p.roi}% ROI`)
  else if (p.roi > -5) parts.push(`Near breakeven (${p.roi}% ROI)`)
  else parts.push(`Negative ${p.roi}% ROI — consider reducing`)

  if (p.winRate > 55) parts.push(`${p.winRate}% win rate`)
  else if (p.winRate < 45) parts.push(`low ${p.winRate}% win rate`)

  if (confidence === 'low') parts.push(`small sample (${p.total} picks)`)
  else if (confidence === 'high') parts.push(`solid sample (${p.total} picks)`)

  return parts.join('. ') + '.'
}
