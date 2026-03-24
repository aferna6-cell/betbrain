/**
 * Bet Sizing Confidence Matrix
 *
 * Grid showing optimal unit count at each combination of confidence level
 * and edge size. Helps standardize position sizing decisions based on
 * two key variables rather than gut feel.
 *
 * For informational purposes only. Not financial advice.
 */

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5

export interface MatrixCell {
  confidence: ConfidenceLevel
  edgePct: number
  units: number
  /** Risk level for this cell */
  risk: 'low' | 'medium' | 'high'
  /** Kelly-derived fraction of bankroll */
  kellyFraction: number
}

export interface SizingMatrix {
  cells: MatrixCell[][]
  edgeBuckets: number[]
  confidenceLevels: ConfidenceLevel[]
  /** Max units in the matrix */
  maxUnits: number
  /** Recommended baseline unit */
  baselineUnit: number
}

export interface MatrixConfig {
  /** Bankroll in dollars */
  bankroll: number
  /** Base unit size in dollars */
  baseUnit: number
  /** Kelly fraction multiplier (0.25 = quarter Kelly) */
  kellyMultiplier: number
  /** Maximum units per bet */
  maxUnits: number
  /** Edge buckets to evaluate (percentages) */
  edgeBuckets?: number[]
}

const DEFAULT_EDGE_BUCKETS = [1, 2, 3, 5, 7, 10, 15]
const DEFAULT_CONFIDENCE_LEVELS: ConfidenceLevel[] = [1, 2, 3, 4, 5]

/**
 * Map confidence level to estimated true win probability boost.
 * Higher confidence = we believe the true edge is real.
 * Lower confidence = we discount the edge significantly.
 */
function confidenceMultiplier(conf: ConfidenceLevel): number {
  const multipliers: Record<ConfidenceLevel, number> = {
    1: 0.3,  // Very uncertain — discount heavily
    2: 0.5,  // Below average confidence
    3: 0.7,  // Average confidence
    4: 0.85, // High confidence
    5: 1.0,  // Maximum confidence — trust the full edge
  }
  return multipliers[conf]
}

/**
 * Calculate Kelly fraction for given edge and win probability.
 */
function kellyFraction(edgePct: number, avgOdds: number): number {
  // Simplified: edge = p * b - (1-p) where b is payout multiplier
  // We have edge directly, so kelly = edge / b
  // Assume avg payout multiplier of ~1.0 (even odds) for simplicity
  const payoutMultiplier = avgOdds > 0 ? avgOdds / 100 : 100 / Math.abs(avgOdds)
  if (payoutMultiplier <= 0) return 0
  return Math.max(0, (edgePct / 100) / payoutMultiplier)
}

/**
 * Generate the sizing matrix.
 */
export function generateSizingMatrix(config: MatrixConfig): SizingMatrix {
  const edgeBuckets = config.edgeBuckets ?? DEFAULT_EDGE_BUCKETS
  const cells: MatrixCell[][] = []
  let maxUnits = 0

  for (const conf of DEFAULT_CONFIDENCE_LEVELS) {
    const row: MatrixCell[] = []
    for (const edgePct of edgeBuckets) {
      // Adjust edge by confidence
      const adjustedEdge = edgePct * confidenceMultiplier(conf)

      // Kelly fraction (assuming -110 average odds for calculation)
      const kf = kellyFraction(adjustedEdge, -110) * config.kellyMultiplier

      // Convert to units: fraction of bankroll / base unit size
      let units = config.baseUnit > 0
        ? (kf * config.bankroll) / config.baseUnit
        : kf * 100

      // Apply caps
      units = Math.max(0.5, Math.min(units, config.maxUnits))
      units = Math.round(units * 10) / 10

      if (units > maxUnits) maxUnits = units

      const risk: MatrixCell['risk'] =
        units >= config.maxUnits * 0.75 ? 'high' :
        units >= config.maxUnits * 0.4 ? 'medium' : 'low'

      row.push({
        confidence: conf,
        edgePct,
        units,
        risk,
        kellyFraction: Math.round(kf * 10000) / 100,
      })
    }
    cells.push(row)
  }

  return {
    cells,
    edgeBuckets,
    confidenceLevels: [...DEFAULT_CONFIDENCE_LEVELS],
    maxUnits,
    baselineUnit: config.baseUnit,
  }
}

/**
 * Look up the recommended units for a specific confidence and edge.
 */
export function lookupUnits(
  matrix: SizingMatrix,
  confidence: ConfidenceLevel,
  edgePct: number
): MatrixCell | null {
  const confIdx = matrix.confidenceLevels.indexOf(confidence)
  if (confIdx === -1) return null

  // Find nearest edge bucket
  let nearestIdx = 0
  let nearestDist = Infinity
  for (let i = 0; i < matrix.edgeBuckets.length; i++) {
    const dist = Math.abs(matrix.edgeBuckets[i] - edgePct)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestIdx = i
    }
  }

  return matrix.cells[confIdx]?.[nearestIdx] ?? null
}

/**
 * Generate a default matrix with standard config.
 */
export function defaultSizingMatrix(bankroll = 1000, baseUnit = 10): SizingMatrix {
  return generateSizingMatrix({
    bankroll,
    baseUnit,
    kellyMultiplier: 0.25,
    maxUnits: 5,
  })
}
