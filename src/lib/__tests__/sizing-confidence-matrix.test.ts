import { describe, it, expect } from 'vitest'
import {
  generateSizingMatrix,
  lookupUnits,
  defaultSizingMatrix,
  type MatrixConfig,
} from '../sizing-confidence-matrix'

const defaultConfig: MatrixConfig = {
  bankroll: 1000,
  baseUnit: 10,
  kellyMultiplier: 0.25,
  maxUnits: 5,
}

describe('generateSizingMatrix', () => {
  it('generates a 5 x 7 matrix by default', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    expect(matrix.cells).toHaveLength(5) // 5 confidence levels
    expect(matrix.cells[0]).toHaveLength(7) // 7 edge buckets
  })

  it('uses custom edge buckets', () => {
    const config: MatrixConfig = { ...defaultConfig, edgeBuckets: [1, 5, 10] }
    const matrix = generateSizingMatrix(config)
    expect(matrix.edgeBuckets).toEqual([1, 5, 10])
    expect(matrix.cells[0]).toHaveLength(3)
  })

  it('higher confidence = more units for same edge', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    // Compare confidence 1 vs confidence 5 at same edge (e.g., 5%)
    const edgeIdx = matrix.edgeBuckets.indexOf(5)
    const lowConf = matrix.cells[0][edgeIdx] // confidence 1
    const highConf = matrix.cells[4][edgeIdx] // confidence 5
    expect(highConf.units).toBeGreaterThanOrEqual(lowConf.units)
  })

  it('higher edge = more units for same confidence', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    const confIdx = 2 // confidence 3
    const lowEdge = matrix.cells[confIdx][0] // 1% edge
    const highEdge = matrix.cells[confIdx][matrix.edgeBuckets.length - 1] // 15% edge
    expect(highEdge.units).toBeGreaterThanOrEqual(lowEdge.units)
  })

  it('respects max units cap', () => {
    const matrix = generateSizingMatrix({ ...defaultConfig, maxUnits: 3 })
    for (const row of matrix.cells) {
      for (const cell of row) {
        expect(cell.units).toBeLessThanOrEqual(3)
      }
    }
  })

  it('minimum is 0.5 units', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    for (const row of matrix.cells) {
      for (const cell of row) {
        expect(cell.units).toBeGreaterThanOrEqual(0.5)
      }
    }
  })

  it('assigns risk levels correctly', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    for (const row of matrix.cells) {
      for (const cell of row) {
        expect(['low', 'medium', 'high']).toContain(cell.risk)
        if (cell.units >= defaultConfig.maxUnits * 0.75) {
          expect(cell.risk).toBe('high')
        }
      }
    }
  })

  it('calculates Kelly fraction', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    for (const row of matrix.cells) {
      for (const cell of row) {
        expect(cell.kellyFraction).toBeGreaterThanOrEqual(0)
        expect(typeof cell.kellyFraction).toBe('number')
      }
    }
  })

  it('tracks maxUnits across matrix', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    expect(matrix.maxUnits).toBeGreaterThan(0)
    let foundMax = false
    for (const row of matrix.cells) {
      for (const cell of row) {
        if (cell.units === matrix.maxUnits) foundMax = true
      }
    }
    expect(foundMax).toBe(true)
  })
})

describe('lookupUnits', () => {
  it('finds exact confidence and edge match', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    const cell = lookupUnits(matrix, 3, 5)
    expect(cell).not.toBeNull()
    expect(cell!.confidence).toBe(3)
    expect(cell!.edgePct).toBe(5)
  })

  it('finds nearest edge bucket', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    const cell = lookupUnits(matrix, 3, 4) // 4% not in buckets, nearest is 3 or 5
    expect(cell).not.toBeNull()
    expect([3, 5]).toContain(cell!.edgePct)
  })

  it('returns null for invalid confidence', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    expect(lookupUnits(matrix, 6 as any, 5)).toBeNull()
  })

  it('works at extremes', () => {
    const matrix = generateSizingMatrix(defaultConfig)
    const low = lookupUnits(matrix, 1, 1)
    const high = lookupUnits(matrix, 5, 15)
    expect(low).not.toBeNull()
    expect(high).not.toBeNull()
    expect(high!.units).toBeGreaterThanOrEqual(low!.units)
  })
})

describe('defaultSizingMatrix', () => {
  it('creates matrix with default bankroll', () => {
    const matrix = defaultSizingMatrix()
    expect(matrix.cells).toHaveLength(5)
    expect(matrix.baselineUnit).toBe(10)
  })

  it('accepts custom bankroll and base unit', () => {
    const matrix = defaultSizingMatrix(5000, 50)
    expect(matrix.baselineUnit).toBe(50)
  })

  it('maxUnits is 5 by default', () => {
    const matrix = defaultSizingMatrix()
    for (const row of matrix.cells) {
      for (const cell of row) {
        expect(cell.units).toBeLessThanOrEqual(5)
      }
    }
  })
})
