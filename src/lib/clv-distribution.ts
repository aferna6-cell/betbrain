/**
 * Historical CLV Distribution — Histogram of CLV values across all picks.
 *
 * Provides bucket analysis of closing line value distribution, identifying
 * the shape of the bettor's edge and where most value is captured.
 *
 * Pure functions — no side effects.
 */

export interface CLVBucket {
  /** Lower bound of bucket (inclusive) */
  min: number
  /** Upper bound of bucket (exclusive, except last) */
  max: number
  /** Label like "-5% to -3%" */
  label: string
  /** Number of picks in this bucket */
  count: number
  /** Percentage of all CLV picks */
  percentage: number
  /** Average CLV in this bucket */
  avgCLV: number
  /** Win rate in this bucket */
  winRate: number | null
}

export interface CLVDistribution {
  /** Total picks with CLV data */
  totalPicks: number
  /** Buckets from most negative to most positive */
  buckets: CLVBucket[]
  /** Overall average CLV */
  avgCLV: number
  /** Median CLV */
  medianCLV: number
  /** Standard deviation */
  stdDev: number
  /** Percentage of picks with positive CLV */
  positiveCLVRate: number
  /** Distribution shape assessment */
  shape: 'left-skewed' | 'normal' | 'right-skewed' | 'insufficient'
  /** Interpretive summary */
  summary: string
}

interface PickForCLV {
  odds: number
  closing_odds?: number | null
  outcome?: string | null
}

// Default bucket boundaries (in percentage points)
const DEFAULT_BOUNDARIES = [-10, -7, -5, -3, -1, 0, 1, 3, 5, 7, 10]

/**
 * Convert American odds to implied probability.
 */
function impliedProbability(odds: number): number {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

/**
 * Calculate CLV as the difference in implied probability (bet vs closing).
 * Positive = you beat the closing line = good.
 */
export function calculateCLV(betOdds: number, closingOdds: number): number {
  const betProb = impliedProbability(betOdds)
  const closeProb = impliedProbability(closingOdds)
  return (closeProb - betProb) * 100
}

/**
 * Build a CLV distribution from pick data.
 */
export function buildCLVDistribution(
  picks: PickForCLV[],
  boundaries?: number[]
): CLVDistribution {
  // Filter to picks with closing odds
  const withCLV = picks.filter(
    (p) => p.closing_odds != null && p.closing_odds !== 0 && p.odds !== 0
  )

  if (withCLV.length < 5) {
    return {
      totalPicks: withCLV.length,
      buckets: [],
      avgCLV: 0,
      medianCLV: 0,
      stdDev: 0,
      positiveCLVRate: 0,
      shape: 'insufficient',
      summary: `Need at least 5 picks with closing odds (have ${withCLV.length}).`,
    }
  }

  // Calculate CLV for each pick
  const clvValues = withCLV.map((p) => ({
    clv: calculateCLV(p.odds, p.closing_odds!),
    outcome: p.outcome,
  }))

  const clvNums = clvValues.map((v) => v.clv)

  // Stats
  const avg = clvNums.reduce((s, v) => s + v, 0) / clvNums.length
  const sorted = [...clvNums].sort((a, b) => a - b)
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  const variance = clvNums.reduce((s, v) => s + (v - avg) ** 2, 0) / clvNums.length
  const stdDev = Math.sqrt(variance)
  const positiveCount = clvNums.filter((v) => v > 0).length
  const positiveCLVRate = (positiveCount / clvNums.length) * 100

  // Build buckets
  const bounds = boundaries ?? DEFAULT_BOUNDARIES
  const bucketDefs: { min: number; max: number; label: string }[] = []

  // First bucket: -inf to first boundary
  bucketDefs.push({
    min: -Infinity,
    max: bounds[0],
    label: `< ${bounds[0]}%`,
  })

  // Middle buckets
  for (let i = 0; i < bounds.length - 1; i++) {
    bucketDefs.push({
      min: bounds[i],
      max: bounds[i + 1],
      label: `${bounds[i]}% to ${bounds[i + 1]}%`,
    })
  }

  // Last bucket: last boundary to +inf
  bucketDefs.push({
    min: bounds[bounds.length - 1],
    max: Infinity,
    label: `> ${bounds[bounds.length - 1]}%`,
  })

  const buckets: CLVBucket[] = bucketDefs.map((def) => {
    const inBucket = clvValues.filter((v) => {
      if (def.max === Infinity) return v.clv >= def.min
      return v.clv >= def.min && v.clv < def.max
    })

    const resolved = inBucket.filter(
      (v) => v.outcome === 'win' || v.outcome === 'loss'
    )
    const wins = inBucket.filter((v) => v.outcome === 'win').length

    return {
      min: def.min,
      max: def.max,
      label: def.label,
      count: inBucket.length,
      percentage: (inBucket.length / clvValues.length) * 100,
      avgCLV:
        inBucket.length > 0
          ? inBucket.reduce((s, v) => s + v.clv, 0) / inBucket.length
          : 0,
      winRate: resolved.length > 0 ? (wins / resolved.length) * 100 : null,
    }
  })

  // Shape analysis
  let shape: CLVDistribution['shape'] = 'normal'
  const skewness = clvNums.reduce((s, v) => s + ((v - avg) / (stdDev || 1)) ** 3, 0) / clvNums.length
  if (skewness < -0.5) shape = 'left-skewed'
  else if (skewness > 0.5) shape = 'right-skewed'

  // Summary
  let summary = ''
  if (avg > 1) {
    summary = `Strong edge: averaging ${avg.toFixed(1)}% CLV across ${clvValues.length} picks. ${positiveCLVRate.toFixed(0)}% of picks beat the closing line.`
  } else if (avg > 0) {
    summary = `Slight edge: averaging ${avg.toFixed(1)}% CLV. You beat the closing line ${positiveCLVRate.toFixed(0)}% of the time, but the margin is thin.`
  } else if (avg > -1) {
    summary = `Near break-even: averaging ${avg.toFixed(1)}% CLV. Your line timing is close to market efficiency.`
  } else {
    summary = `Negative CLV: averaging ${avg.toFixed(1)}%. You are consistently getting worse odds than the closing line. Focus on earlier bet timing or sharper line shopping.`
  }

  return {
    totalPicks: clvValues.length,
    buckets,
    avgCLV: avg,
    medianCLV: median,
    stdDev,
    positiveCLVRate,
    shape,
    summary,
  }
}

/**
 * Get CLV percentile rank for a single value within the distribution.
 */
export function getCLVPercentile(clvValue: number, allCLVs: number[]): number {
  if (allCLVs.length === 0) return 0
  const below = allCLVs.filter((v) => v < clvValue).length
  return (below / allCLVs.length) * 100
}

/**
 * Find the "sweet spot" — the CLV bucket with the highest win rate.
 */
export function findSweetSpot(buckets: CLVBucket[]): CLVBucket | null {
  const withWinRate = buckets.filter((b) => b.winRate !== null && b.count >= 3)
  if (withWinRate.length === 0) return null
  return withWinRate.reduce((best, b) => (b.winRate! > best.winRate! ? b : best))
}
