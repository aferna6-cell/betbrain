import { describe, it, expect } from 'vitest'
import {
  predictClosingLine,
  analyzeMovement,
  weightedLinearRegression,
  computePredictionError,
} from '../closing-line-predictor'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_MIN = 60 * 1000
const MS_HOUR = 60 * MS_MIN

function makeSnapshots(
  baseTime: Date,
  values: number[],
  intervalMs: number = 15 * MS_MIN,
  bookmaker: string = 'consensus'
) {
  return values.map((value, i) => ({
    value,
    timestamp: new Date(baseTime.getTime() + i * intervalMs).toISOString(),
    bookmaker,
  }))
}

function makeMovementPoints(
  baseTimeMs: number,
  values: number[],
  intervalMs: number = 15 * MS_MIN
) {
  return values.map((value, i) => ({
    value,
    timeMs: baseTimeMs + i * intervalMs,
  }))
}

// ---------------------------------------------------------------------------
// analyzeMovement
// ---------------------------------------------------------------------------

describe('analyzeMovement', () => {
  it('returns zeros for single snapshot', () => {
    const result = analyzeMovement([{ value: -110, timeMs: 1000 }])
    expect(result.totalMovement).toBe(0)
    expect(result.avgVelocity).toBe(0)
  })

  it('calculates total movement and velocity', () => {
    // Moves from -110 to -130 over 2 hours
    const base = Date.now()
    const points = makeMovementPoints(base, [-110, -115, -120, -125, -130], 30 * MS_MIN)
    const result = analyzeMovement(points)

    expect(result.totalMovement).toBe(-20)
    expect(result.avgVelocity).toBeCloseTo(-10, 0) // -20 over 2 hours
  })

  it('detects acceleration when recent movement is faster', () => {
    const base = Date.now()
    // Slow start, then big moves at end
    const points = makeMovementPoints(base, [-110, -111, -112, -113, -120, -130], 15 * MS_MIN)
    const result = analyzeMovement(points)

    expect(result.accelerating).toBe(true)
  })

  it('calculates volatility correctly for stable lines', () => {
    const base = Date.now()
    const points = makeMovementPoints(base, [-110, -110, -110, -110], 15 * MS_MIN)
    const result = analyzeMovement(points)

    expect(result.volatility).toBe(0)
    expect(result.reversals).toBe(0)
  })

  it('counts reversals', () => {
    const base = Date.now()
    // Goes up, down, up, down
    const points = makeMovementPoints(base, [0, 5, 2, 7, 3], 15 * MS_MIN)
    const result = analyzeMovement(points)

    expect(result.reversals).toBe(3) // direction changes at indices 2, 3, 4
  })

  it('calculates directionality', () => {
    const base = Date.now()
    // All one direction
    const oneWay = makeMovementPoints(base, [0, 1, 2, 3, 4], 15 * MS_MIN)
    const oneWayResult = analyzeMovement(oneWay)
    expect(oneWayResult.directionality).toBe(1)

    // Choppy (goes back and forth)
    const choppy = makeMovementPoints(base, [0, 5, 0, 5, 0], 15 * MS_MIN)
    const choppyResult = analyzeMovement(choppy)
    expect(choppyResult.directionality).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// weightedLinearRegression
// ---------------------------------------------------------------------------

describe('weightedLinearRegression', () => {
  it('handles single point', () => {
    const result = weightedLinearRegression([{ value: 10, timeMs: 1000 }], 2000)
    expect(result.slope).toBe(0)
    expect(result.intercept).toBe(10)
  })

  it('fits a perfect upward line', () => {
    const base = 1000000
    const points = [
      { value: 0, timeMs: base },
      { value: 10, timeMs: base + MS_HOUR },
      { value: 20, timeMs: base + 2 * MS_HOUR },
    ]
    const result = weightedLinearRegression(points, base + 2 * MS_HOUR)
    expect(result.slope).toBeGreaterThan(0)
    expect(result.rSquared).toBeCloseTo(1, 1)
  })

  it('returns low R-squared for noisy data', () => {
    const base = 1000000
    const points = [
      { value: 10, timeMs: base },
      { value: -5, timeMs: base + MS_HOUR },
      { value: 15, timeMs: base + 2 * MS_HOUR },
      { value: -10, timeMs: base + 3 * MS_HOUR },
      { value: 8, timeMs: base + 4 * MS_HOUR },
    ]
    const result = weightedLinearRegression(points, base + 4 * MS_HOUR)
    expect(result.rSquared).toBeLessThan(0.5)
  })

  it('weights recent points more heavily', () => {
    const base = 1000000
    // Early points suggest downward, late points suggest upward
    const points = [
      { value: 100, timeMs: base },
      { value: 90, timeMs: base + MS_HOUR },
      { value: 80, timeMs: base + 2 * MS_HOUR },
      { value: 85, timeMs: base + 3 * MS_HOUR },
      { value: 95, timeMs: base + 4 * MS_HOUR },
      { value: 110, timeMs: base + 5 * MS_HOUR },
    ]
    const result = weightedLinearRegression(points, base + 5 * MS_HOUR)
    // With recency weighting, the late upward trend should dominate
    // The prediction at base+6hr should be > 110
    const predicted = result.slope * (base + 6 * MS_HOUR) + result.intercept
    expect(predicted).toBeGreaterThan(100)
  })
})

// ---------------------------------------------------------------------------
// predictClosingLine
// ---------------------------------------------------------------------------

describe('predictClosingLine', () => {
  const now = new Date('2026-03-25T18:00:00Z')
  const gameTime = new Date('2026-03-25T23:00:00Z').toISOString() // 5 hours from now

  it('returns null with fewer than 3 snapshots', () => {
    const snapshots = makeSnapshots(
      new Date(now.getTime() - 2 * MS_HOUR),
      [-110, -115]
    )
    const result = predictClosingLine(snapshots, gameTime, 'moneyline', now)
    expect(result).toBeNull()
  })

  it('returns null with insufficient time span', () => {
    // All snapshots within 20 minutes
    const snapshots = makeSnapshots(
      new Date(now.getTime() - 20 * MS_MIN),
      [-110, -115, -120],
      5 * MS_MIN
    )
    const result = predictClosingLine(snapshots, gameTime, 'moneyline', now)
    expect(result).toBeNull()
  })

  it('predicts a downward closing line from consistent movement', () => {
    const baseTime = new Date(now.getTime() - 3 * MS_HOUR)
    const snapshots = makeSnapshots(baseTime, [-110, -115, -120, -125, -130, -135, -140], 30 * MS_MIN)

    const result = predictClosingLine(snapshots, gameTime, 'moneyline', now)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('down')
    expect(result!.predicted).toBeLessThan(result!.current)
    expect(result!.confidence).toBeGreaterThan(0)
    expect(result!.dataPoints).toBeGreaterThan(0)
  })

  it('predicts stable when line is not moving', () => {
    const baseTime = new Date(now.getTime() - 3 * MS_HOUR)
    const snapshots = makeSnapshots(baseTime, [-110, -110, -111, -110, -110, -111, -110], 30 * MS_MIN)

    const result = predictClosingLine(snapshots, gameTime, 'moneyline', now)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('stable')
    expect(Math.abs(result!.expectedChange)).toBeLessThanOrEqual(5)
  })

  it('works with spread market', () => {
    const baseTime = new Date(now.getTime() - 2 * MS_HOUR)
    const snapshots = makeSnapshots(baseTime, [-3.5, -4, -4.5, -5, -5.5], 30 * MS_MIN)

    const result = predictClosingLine(snapshots, gameTime, 'spread', now)
    expect(result).not.toBeNull()
    expect(result!.market).toBe('spread')
    expect(result!.predicted).toBeLessThan(result!.current)
    // Spread should round to half-point
    expect(Math.abs(result!.predicted % 0.5)).toBe(0)
  })

  it('works with total market', () => {
    const baseTime = new Date(now.getTime() - 2 * MS_HOUR)
    const snapshots = makeSnapshots(baseTime, [220, 221, 222, 223, 224], 30 * MS_MIN)

    const result = predictClosingLine(snapshots, gameTime, 'total', now)
    expect(result).not.toBeNull()
    expect(result!.market).toBe('total')
    expect(result!.direction).toBe('up')
  })

  it('includes reasoning in prediction', () => {
    const baseTime = new Date(now.getTime() - 3 * MS_HOUR)
    const snapshots = makeSnapshots(baseTime, [-110, -115, -120, -125, -130], 45 * MS_MIN)

    const result = predictClosingLine(snapshots, gameTime, 'moneyline', now)
    expect(result).not.toBeNull()
    expect(result!.reasoning.length).toBeGreaterThan(10)
  })

  it('reports hours until start', () => {
    const baseTime = new Date(now.getTime() - 2 * MS_HOUR)
    const snapshots = makeSnapshots(baseTime, [-110, -115, -120, -125, -130], 30 * MS_MIN)

    const result = predictClosingLine(snapshots, gameTime, 'moneyline', now)
    expect(result).not.toBeNull()
    expect(result!.hoursUntilStart).toBeCloseTo(5, 0)
  })

  it('handles multi-bookmaker snapshots by building consensus', () => {
    const baseTime = new Date(now.getTime() - 2 * MS_HOUR)
    const snapshots = [
      // Two bookmakers at same time points
      ...makeSnapshots(baseTime, [-110, -120, -130, -140, -150], 30 * MS_MIN, 'dk'),
      ...makeSnapshots(baseTime, [-115, -125, -135, -145, -155], 30 * MS_MIN, 'fd'),
    ]

    const result = predictClosingLine(snapshots, gameTime, 'moneyline', now)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('down')
    expect(result!.dataPoints).toBeGreaterThanOrEqual(3)
  })

  it('has higher confidence when game is close', () => {
    const baseTime = new Date(now.getTime() - 2 * MS_HOUR)
    const values = [-110, -115, -120, -125, -130]
    const snapshots = makeSnapshots(baseTime, values, 30 * MS_MIN)

    const farGame = new Date(now.getTime() + 24 * MS_HOUR).toISOString()
    const closeGame = new Date(now.getTime() + 30 * MS_MIN).toISOString()

    const farResult = predictClosingLine(snapshots, farGame, 'moneyline', now)
    const closeResult = predictClosingLine(snapshots, closeGame, 'moneyline', now)

    expect(farResult).not.toBeNull()
    expect(closeResult).not.toBeNull()
    expect(closeResult!.confidence).toBeGreaterThanOrEqual(farResult!.confidence)
  })
})

// ---------------------------------------------------------------------------
// computePredictionError
// ---------------------------------------------------------------------------

describe('computePredictionError', () => {
  it('computes error for moneyline prediction', () => {
    const result = computePredictionError(-115, -120, 'moneyline')
    expect(result.absoluteError).toBe(5)
    expect(result.withinHalfPoint).toBe(true) // 5 <= 5
    expect(result.withinFullPoint).toBe(true) // 5 <= 10
  })

  it('computes error for spread prediction', () => {
    const result = computePredictionError(-3.5, -4.5, 'spread')
    expect(result.absoluteError).toBe(1)
    expect(result.withinHalfPoint).toBe(false) // 1 > 0.5
    expect(result.withinFullPoint).toBe(true) // 1 <= 1
  })

  it('computes perfect prediction', () => {
    const result = computePredictionError(220, 220, 'total')
    expect(result.absoluteError).toBe(0)
    expect(result.percentageError).toBe(0)
    expect(result.withinHalfPoint).toBe(true)
  })

  it('handles zero actual value', () => {
    const result = computePredictionError(5, 0, 'spread')
    expect(result.absoluteError).toBe(5)
    expect(result.percentageError).toBe(0) // can't divide by zero
  })
})
