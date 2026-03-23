/**
 * Confidence Calibration Tracker
 *
 * Tracks how often picks at various confidence levels actually hit.
 * e.g., "When I say I'm 70% confident, do I actually win ~70% of the time?"
 *
 * Good calibration = confidence matches actual win rate.
 * Over-confident = you say 80% but only win 55%.
 * Under-confident = you say 50% but actually win 70%.
 *
 * Pure functions — no API calls.
 */

export interface CalibrationBucket {
  /** Bucket label, e.g. "60-69%" */
  label: string
  /** Range lower bound (inclusive) */
  rangeMin: number
  /** Range upper bound (inclusive) */
  rangeMax: number
  /** Midpoint confidence for calibration chart */
  midpoint: number
  /** Number of resolved picks in this bucket */
  total: number
  /** Number of wins */
  wins: number
  /** Actual win rate (0-100) */
  actualWinRate: number | null
  /** Expected win rate (midpoint of bucket) */
  expectedWinRate: number
  /** Calibration error: actual - expected (positive = under-confident, negative = over-confident) */
  calibrationError: number | null
}

export interface CalibrationResult {
  /** Buckets from low to high confidence */
  buckets: CalibrationBucket[]
  /** Total resolved picks with confidence data */
  totalPicks: number
  /** Overall calibration score (0-100, higher = better calibrated) */
  calibrationScore: number
  /** Weighted average calibration error */
  avgCalibrationError: number
  /** Diagnosis: 'well-calibrated' | 'over-confident' | 'under-confident' | 'insufficient-data' */
  diagnosis: 'well-calibrated' | 'over-confident' | 'under-confident' | 'insufficient-data'
  /** Human-readable summary */
  summary: string
}

interface PickForCalibration {
  outcome: string | null
  confidence?: number | null
}

const BUCKETS = [
  { label: '0-49%', rangeMin: 0, rangeMax: 49, midpoint: 25 },
  { label: '50-59%', rangeMin: 50, rangeMax: 59, midpoint: 55 },
  { label: '60-69%', rangeMin: 60, rangeMax: 69, midpoint: 65 },
  { label: '70-79%', rangeMin: 70, rangeMax: 79, midpoint: 75 },
  { label: '80-89%', rangeMin: 80, rangeMax: 89, midpoint: 85 },
  { label: '90-100%', rangeMin: 90, rangeMax: 100, midpoint: 95 },
] as const

const MIN_PICKS_FOR_DIAGNOSIS = 10
const WELL_CALIBRATED_THRESHOLD = 8 // within 8 percentage points on average

/**
 * Calculate confidence calibration from a set of picks.
 *
 * Picks must have a `confidence` field (0-100).
 * Only resolved picks (win/loss) are included.
 */
export function calculateCalibration(picks: PickForCalibration[]): CalibrationResult {
  const resolved = picks.filter(
    (p) =>
      p.confidence != null &&
      p.confidence >= 0 &&
      p.confidence <= 100 &&
      p.outcome != null &&
      (p.outcome === 'win' || p.outcome === 'loss')
  )

  const buckets: CalibrationBucket[] = BUCKETS.map((b) => {
    const inBucket = resolved.filter(
      (p) => p.confidence! >= b.rangeMin && p.confidence! <= b.rangeMax
    )
    const wins = inBucket.filter((p) => p.outcome === 'win').length
    const total = inBucket.length
    const actualWinRate = total > 0 ? Math.round((wins / total) * 1000) / 10 : null
    const calibrationError = actualWinRate !== null ? Math.round((actualWinRate - b.midpoint) * 10) / 10 : null

    return {
      label: b.label,
      rangeMin: b.rangeMin,
      rangeMax: b.rangeMax,
      midpoint: b.midpoint,
      total,
      wins,
      actualWinRate,
      expectedWinRate: b.midpoint,
      calibrationError,
    }
  })

  // Calculate overall calibration score
  const bucketsWithData = buckets.filter((b) => b.total >= 3 && b.calibrationError !== null)

  if (resolved.length < MIN_PICKS_FOR_DIAGNOSIS || bucketsWithData.length === 0) {
    return {
      buckets,
      totalPicks: resolved.length,
      calibrationScore: 0,
      avgCalibrationError: 0,
      diagnosis: 'insufficient-data',
      summary: `Need at least ${MIN_PICKS_FOR_DIAGNOSIS} picks with confidence ratings to calculate calibration. Currently have ${resolved.length}.`,
    }
  }

  // Weighted average calibration error (weighted by number of picks in each bucket)
  let totalWeightedError = 0
  let totalWeight = 0
  for (const b of bucketsWithData) {
    totalWeightedError += Math.abs(b.calibrationError!) * b.total
    totalWeight += b.total
  }
  const avgAbsError = totalWeight > 0 ? Math.round((totalWeightedError / totalWeight) * 10) / 10 : 0

  // Signed average (positive = under-confident, negative = over-confident)
  let totalSignedError = 0
  for (const b of bucketsWithData) {
    totalSignedError += b.calibrationError! * b.total
  }
  const avgSignedError = totalWeight > 0 ? Math.round((totalSignedError / totalWeight) * 10) / 10 : 0

  // Score: 100 = perfect, 0 = off by 50+ points on average
  const calibrationScore = Math.max(0, Math.round(100 - avgAbsError * 2))

  let diagnosis: CalibrationResult['diagnosis']
  let summary: string

  if (avgAbsError <= WELL_CALIBRATED_THRESHOLD) {
    diagnosis = 'well-calibrated'
    summary = `Your confidence is well-calibrated (avg ${avgAbsError}pp error). Your stated confidence levels closely match actual outcomes.`
  } else if (avgSignedError < -WELL_CALIBRATED_THRESHOLD) {
    diagnosis = 'over-confident'
    summary = `You tend to be over-confident by ${Math.abs(avgSignedError).toFixed(1)}pp on average. Consider lowering confidence ratings or being more selective with high-confidence picks.`
  } else {
    diagnosis = 'under-confident'
    summary = `You tend to be under-confident by ${avgSignedError.toFixed(1)}pp on average. Your picks hit more often than you expect — trust your analysis more.`
  }

  return {
    buckets,
    totalPicks: resolved.length,
    calibrationScore,
    avgCalibrationError: avgSignedError,
    diagnosis,
    summary,
  }
}

/**
 * Store confidence for a pick in localStorage.
 * Key format: 'betbrain-confidence-{pickId}'
 */
export function savePickConfidence(pickId: string, confidence: number): void {
  if (typeof window === 'undefined') return
  const key = `betbrain-confidence-${pickId}`
  localStorage.setItem(key, JSON.stringify({ confidence, savedAt: new Date().toISOString() }))
}

/**
 * Get confidence for a pick from localStorage.
 */
export function getPickConfidence(pickId: string): number | null {
  if (typeof window === 'undefined') return null
  const key = `betbrain-confidence-${pickId}`
  const stored = localStorage.getItem(key)
  if (!stored) return null
  try {
    const data = JSON.parse(stored)
    return typeof data.confidence === 'number' ? data.confidence : null
  } catch {
    return null
  }
}

/**
 * Get all stored confidence ratings.
 */
export function getAllConfidenceRatings(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  const result: Record<string, number> = {}
  const prefix = 'betbrain-confidence-'
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) {
      const pickId = key.slice(prefix.length)
      const confidence = getPickConfidence(pickId)
      if (confidence !== null) {
        result[pickId] = confidence
      }
    }
  }
  return result
}
