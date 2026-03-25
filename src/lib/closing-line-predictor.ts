/**
 * Closing Line Prediction Model — Predict where a line will close.
 *
 * Analyzes historical line movement patterns to predict the closing line
 * for in-progress markets. Uses:
 *   1. Weighted linear regression on line movement trajectory
 *   2. Time-decay: recent movements matter more than early ones
 *   3. Velocity acceleration: accelerating movement signals stronger close
 *   4. Market consensus convergence: books tend to converge near close
 *
 * Pure functions — no side effects, no API calls.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OddsSnapshot {
  /** American odds at this point in time */
  odds: number
  /** ISO timestamp */
  timestamp: string
  /** Bookmaker key */
  bookmaker: string
}

export interface LineSnapshot {
  /** Spread or total line value */
  line: number
  /** ISO timestamp */
  timestamp: string
  bookmaker: string
}

export type MarketType = 'moneyline' | 'spread' | 'total'

export interface ClosingPrediction {
  /** Predicted closing value (odds for ML, line for spread/total) */
  predicted: number
  /** Current consensus value */
  current: number
  /** Direction of expected movement: 'up' | 'down' | 'stable' */
  direction: 'up' | 'down' | 'stable'
  /** Confidence in prediction (0-100) */
  confidence: number
  /** Predicted change from current */
  expectedChange: number
  /** Movement velocity (units per hour) */
  velocity: number
  /** Is the movement accelerating? */
  accelerating: boolean
  /** Market type analyzed */
  market: MarketType
  /** Number of snapshots used */
  dataPoints: number
  /** Time until game start (hours) */
  hoursUntilStart: number
  /** Explanation for the prediction */
  reasoning: string
}

export interface MovementProfile {
  /** Total movement from first to last snapshot */
  totalMovement: number
  /** Average velocity (units per hour) */
  avgVelocity: number
  /** Recent velocity (last 25% of snapshots) */
  recentVelocity: number
  /** Is recent velocity faster than average? */
  accelerating: boolean
  /** Standard deviation of movement steps */
  volatility: number
  /** Number of direction changes */
  reversals: number
  /** Percentage of movement in one direction */
  directionality: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum snapshots needed for a meaningful prediction */
const MIN_SNAPSHOTS = 3

/** Maximum confidence cap (we can never be 100% sure) */
const MAX_CONFIDENCE = 90

/** Minimum time between first and last snapshot (30 min) */
const MIN_TIME_SPAN_MS = 30 * 60 * 1000

/** Movement thresholds below which we call it "stable" */
const STABLE_THRESHOLD_ODDS = 5 // 5 points for American odds
const STABLE_THRESHOLD_LINE = 0.25 // quarter point for spreads/totals

// ---------------------------------------------------------------------------
// Core prediction
// ---------------------------------------------------------------------------

/**
 * Predict the closing line/odds for a market.
 *
 * @param snapshots - Historical odds/line snapshots sorted chronologically
 * @param gameTime - ISO timestamp of game start
 * @param market - Market type
 * @param now - Current time (for testing)
 */
export function predictClosingLine(
  snapshots: Array<{ value: number; timestamp: string; bookmaker: string }>,
  gameTime: string,
  market: MarketType,
  now: Date = new Date()
): ClosingPrediction | null {
  if (snapshots.length < MIN_SNAPSHOTS) return null

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const firstTime = new Date(sorted[0].timestamp).getTime()
  const lastTime = new Date(sorted[sorted.length - 1].timestamp).getTime()
  const timeSpan = lastTime - firstTime

  if (timeSpan < MIN_TIME_SPAN_MS) return null

  const gameTimeMs = new Date(gameTime).getTime()
  const nowMs = now.getTime()
  const hoursUntilStart = Math.max((gameTimeMs - nowMs) / (3600 * 1000), 0)

  // Get consensus values (average across books at each time point)
  const consensusSnapshots = buildConsensusTimeline(sorted)
  if (consensusSnapshots.length < MIN_SNAPSHOTS) return null

  const current = consensusSnapshots[consensusSnapshots.length - 1].value
  const profile = analyzeMovement(consensusSnapshots)

  // Weighted linear regression for prediction
  const regression = weightedLinearRegression(consensusSnapshots, nowMs)

  // Project to game time
  const projectedAtClose = regression.slope * gameTimeMs + regression.intercept

  // Apply dampening for far-out predictions (uncertainty increases with time)
  const hoursOfData = timeSpan / (3600 * 1000)
  const dampening = Math.min(hoursOfData / Math.max(hoursUntilStart, 1), 1)
  const predicted = current + (projectedAtClose - current) * dampening

  // Determine direction and expected change
  const expectedChange = predicted - current
  const stableThreshold = market === 'moneyline' ? STABLE_THRESHOLD_ODDS : STABLE_THRESHOLD_LINE
  const direction: 'up' | 'down' | 'stable' =
    Math.abs(expectedChange) < stableThreshold ? 'stable' : expectedChange > 0 ? 'up' : 'down'

  // Calculate confidence
  const confidence = calculateConfidence(
    consensusSnapshots.length,
    profile,
    hoursUntilStart,
    regression.rSquared,
    timeSpan
  )

  // Generate reasoning
  const reasoning = generateReasoning(
    direction, expectedChange, confidence, profile, market, hoursUntilStart
  )

  return {
    predicted: roundValue(predicted, market),
    current: roundValue(current, market),
    direction,
    confidence,
    expectedChange: roundValue(expectedChange, market),
    velocity: Math.round(profile.avgVelocity * 100) / 100,
    accelerating: profile.accelerating,
    market,
    dataPoints: consensusSnapshots.length,
    hoursUntilStart: Math.round(hoursUntilStart * 10) / 10,
    reasoning,
  }
}

// ---------------------------------------------------------------------------
// Movement analysis
// ---------------------------------------------------------------------------

/**
 * Analyze the movement profile of a series of snapshots.
 */
export function analyzeMovement(
  snapshots: Array<{ value: number; timeMs: number }>
): MovementProfile {
  if (snapshots.length < 2) {
    return {
      totalMovement: 0,
      avgVelocity: 0,
      recentVelocity: 0,
      accelerating: false,
      volatility: 0,
      reversals: 0,
      directionality: 1,
    }
  }

  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]
  const totalMovement = last.value - first.value
  const totalTimeHours = (last.timeMs - first.timeMs) / (3600 * 1000)
  const avgVelocity = totalTimeHours > 0 ? totalMovement / totalTimeHours : 0

  // Recent velocity (last 25% of snapshots)
  const recentStart = Math.floor(snapshots.length * 0.75)
  const recentSlice = snapshots.slice(recentStart)
  let recentVelocity = 0
  if (recentSlice.length >= 2) {
    const rFirst = recentSlice[0]
    const rLast = recentSlice[recentSlice.length - 1]
    const rTimeHours = (rLast.timeMs - rFirst.timeMs) / (3600 * 1000)
    recentVelocity = rTimeHours > 0 ? (rLast.value - rFirst.value) / rTimeHours : 0
  }

  const accelerating = Math.abs(recentVelocity) > Math.abs(avgVelocity) * 1.2

  // Volatility (std dev of step sizes)
  const steps: number[] = []
  for (let i = 1; i < snapshots.length; i++) {
    steps.push(snapshots[i].value - snapshots[i - 1].value)
  }
  const avgStep = steps.reduce((s, v) => s + v, 0) / steps.length
  const variance = steps.reduce((s, v) => s + (v - avgStep) ** 2, 0) / steps.length
  const volatility = Math.sqrt(variance)

  // Reversals (direction changes)
  let reversals = 0
  for (let i = 2; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].value - snapshots[i - 2].value
    const curr = snapshots[i].value - snapshots[i - 1].value
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
      reversals++
    }
  }

  // Directionality: what fraction of total step distance was in the net direction
  const totalAbsMovement = steps.reduce((s, v) => s + Math.abs(v), 0)
  const directionality = totalAbsMovement > 0
    ? Math.abs(totalMovement) / totalAbsMovement
    : 1

  return {
    totalMovement,
    avgVelocity,
    recentVelocity,
    accelerating,
    volatility,
    reversals,
    directionality,
  }
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

function calculateConfidence(
  dataPoints: number,
  profile: MovementProfile,
  hoursUntilStart: number,
  rSquared: number,
  timeSpanMs: number
): number {
  let score = 0

  // Factor 1: Data quantity (0-25 pts)
  // More snapshots = more reliable
  score += Math.min(dataPoints / 20, 1) * 25

  // Factor 2: Trend strength / R-squared (0-25 pts)
  score += Math.max(rSquared, 0) * 25

  // Factor 3: Directionality (0-20 pts)
  // One-way movement is more predictable than choppy
  score += profile.directionality * 20

  // Factor 4: Time proximity (0-20 pts)
  // Closer to game = more confident
  if (hoursUntilStart <= 1) score += 20
  else if (hoursUntilStart <= 3) score += 15
  else if (hoursUntilStart <= 6) score += 10
  else if (hoursUntilStart <= 12) score += 5

  // Factor 5: Low volatility bonus (0-10 pts)
  if (profile.volatility < 2) score += 10
  else if (profile.volatility < 5) score += 5

  // Penalty: many reversals reduce confidence
  score -= profile.reversals * 3

  // Penalty: accelerating away from trend is suspicious
  if (profile.accelerating && Math.sign(profile.recentVelocity) !== Math.sign(profile.avgVelocity)) {
    score -= 10
  }

  return Math.max(0, Math.min(MAX_CONFIDENCE, Math.round(score)))
}

// ---------------------------------------------------------------------------
// Weighted linear regression
// ---------------------------------------------------------------------------

/**
 * Perform weighted linear regression where recent points get more weight.
 * Returns slope, intercept, and R-squared.
 */
export function weightedLinearRegression(
  points: Array<{ value: number; timeMs: number }>,
  referenceTimeMs: number
): { slope: number; intercept: number; rSquared: number } {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0]?.value ?? 0, rSquared: 0 }

  // Assign weights: more recent = higher weight
  // Weight = exponential decay from most recent
  const maxTime = points[n - 1].timeMs
  const timeRange = maxTime - points[0].timeMs
  const weights = points.map((p) => {
    const recency = timeRange > 0 ? (p.timeMs - points[0].timeMs) / timeRange : 1
    return 0.5 + 0.5 * recency // Ranges from 0.5 (oldest) to 1.0 (newest)
  })

  const totalWeight = weights.reduce((s, w) => s + w, 0)

  // Weighted means
  const wMeanX = points.reduce((s, p, i) => s + weights[i] * p.timeMs, 0) / totalWeight
  const wMeanY = points.reduce((s, p, i) => s + weights[i] * p.value, 0) / totalWeight

  // Weighted covariance and variance
  let covXY = 0
  let varX = 0
  let varY = 0
  for (let i = 0; i < n; i++) {
    const dx = points[i].timeMs - wMeanX
    const dy = points[i].value - wMeanY
    covXY += weights[i] * dx * dy
    varX += weights[i] * dx * dx
    varY += weights[i] * dy * dy
  }

  const slope = varX > 0 ? covXY / varX : 0
  const intercept = wMeanY - slope * wMeanX

  // R-squared
  const rSquared = varX > 0 && varY > 0 ? (covXY * covXY) / (varX * varY) : 0

  return { slope, intercept, rSquared: Math.min(rSquared, 1) }
}

// ---------------------------------------------------------------------------
// Consensus building
// ---------------------------------------------------------------------------

/**
 * Build a consensus timeline from multi-bookmaker snapshots.
 * Groups snapshots into time windows and averages values.
 */
function buildConsensusTimeline(
  snapshots: Array<{ value: number; timestamp: string; bookmaker: string }>
): Array<{ value: number; timeMs: number }> {
  if (snapshots.length === 0) return []

  // Group by 5-minute windows
  const windowMs = 5 * 60 * 1000
  const groups = new Map<number, number[]>()

  for (const s of snapshots) {
    const timeMs = new Date(s.timestamp).getTime()
    const windowKey = Math.floor(timeMs / windowMs) * windowMs
    const existing = groups.get(windowKey) ?? []
    existing.push(s.value)
    groups.set(windowKey, existing)
  }

  // Average each window
  const timeline = Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([timeMs, values]) => ({
      value: values.reduce((s, v) => s + v, 0) / values.length,
      timeMs,
    }))

  return timeline
}

// ---------------------------------------------------------------------------
// Reasoning generation
// ---------------------------------------------------------------------------

function generateReasoning(
  direction: 'up' | 'down' | 'stable',
  expectedChange: number,
  confidence: number,
  profile: MovementProfile,
  market: MarketType,
  hoursUntilStart: number
): string {
  const parts: string[] = []

  if (direction === 'stable') {
    parts.push('Line appears stable — no significant movement expected.')
  } else {
    const dirWord = direction === 'up' ? 'upward' : 'downward'
    const changeStr = Math.abs(expectedChange).toFixed(market === 'moneyline' ? 0 : 1)
    parts.push(`Expected ${dirWord} movement of ~${changeStr} ${market === 'moneyline' ? 'points' : 'points'}.`)
  }

  if (profile.accelerating) {
    parts.push('Movement is accelerating — possible sharp action.')
  }

  if (profile.directionality > 0.8) {
    parts.push('Strong one-way movement suggests market consensus forming.')
  } else if (profile.reversals >= 3) {
    parts.push('Choppy movement with multiple reversals — prediction less reliable.')
  }

  if (hoursUntilStart < 1) {
    parts.push('Game starting soon — closing line forming now.')
  } else if (hoursUntilStart > 12) {
    parts.push('Still far from game time — significant movement may still occur.')
  }

  if (confidence < 40) {
    parts.push('Low confidence — insufficient data or unstable movement.')
  }

  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundValue(value: number, market: MarketType): number {
  if (market === 'moneyline') return Math.round(value)
  // Spreads and totals round to nearest 0.5
  return Math.round(value * 2) / 2
}

/**
 * Compute the prediction error for model evaluation.
 * Used in backtesting to measure accuracy.
 */
export function computePredictionError(
  predicted: number,
  actual: number,
  market: MarketType
): { absoluteError: number; percentageError: number; withinHalfPoint: boolean; withinFullPoint: boolean } {
  const absoluteError = Math.abs(predicted - actual)
  const percentageError = actual !== 0
    ? Math.round((absoluteError / Math.abs(actual)) * 1000) / 10
    : 0

  const threshold = market === 'moneyline' ? 5 : 0.5
  return {
    absoluteError: Math.round(absoluteError * 100) / 100,
    percentageError,
    withinHalfPoint: absoluteError <= threshold,
    withinFullPoint: absoluteError <= threshold * 2,
  }
}
