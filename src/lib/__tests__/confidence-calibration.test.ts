import { describe, it, expect } from 'vitest'
import { calculateCalibration } from '../confidence-calibration'

function makePick(confidence: number, outcome: string) {
  return { confidence, outcome }
}

describe('confidence-calibration', () => {
  it('returns insufficient-data for empty picks', () => {
    const result = calculateCalibration([])
    expect(result.diagnosis).toBe('insufficient-data')
    expect(result.totalPicks).toBe(0)
    expect(result.buckets).toHaveLength(6)
  })

  it('returns insufficient-data when fewer than 10 picks', () => {
    const picks = [
      makePick(70, 'win'),
      makePick(70, 'win'),
      makePick(70, 'loss'),
    ]
    const result = calculateCalibration(picks)
    expect(result.diagnosis).toBe('insufficient-data')
    expect(result.totalPicks).toBe(3)
  })

  it('ignores pending and push outcomes', () => {
    const picks = Array.from({ length: 15 }, () => makePick(70, 'pending'))
    const result = calculateCalibration(picks)
    expect(result.totalPicks).toBe(0)
    expect(result.diagnosis).toBe('insufficient-data')
  })

  it('ignores picks without confidence', () => {
    const picks = Array.from({ length: 15 }, (_, i) => ({
      confidence: null,
      outcome: i % 2 === 0 ? 'win' : 'loss',
    }))
    const result = calculateCalibration(picks)
    expect(result.totalPicks).toBe(0)
  })

  it('detects well-calibrated picks', () => {
    // 75% confidence, ~75% actual win rate
    const picks = [
      ...Array.from({ length: 15 }, () => makePick(75, 'win')),
      ...Array.from({ length: 5 }, () => makePick(75, 'loss')),
    ]
    const result = calculateCalibration(picks)
    expect(result.diagnosis).toBe('well-calibrated')
    expect(result.calibrationScore).toBeGreaterThan(80)
    expect(result.totalPicks).toBe(20)
  })

  it('detects over-confidence', () => {
    // Says 85% confident but only wins 40%
    const picks = [
      ...Array.from({ length: 8 }, () => makePick(85, 'win')),
      ...Array.from({ length: 12 }, () => makePick(85, 'loss')),
    ]
    const result = calculateCalibration(picks)
    expect(result.diagnosis).toBe('over-confident')
    expect(result.avgCalibrationError).toBeLessThan(0)
  })

  it('detects under-confidence', () => {
    // Says 50% confident but wins 90%
    const picks = [
      ...Array.from({ length: 18 }, () => makePick(55, 'win')),
      ...Array.from({ length: 2 }, () => makePick(55, 'loss')),
    ]
    const result = calculateCalibration(picks)
    expect(result.diagnosis).toBe('under-confident')
    expect(result.avgCalibrationError).toBeGreaterThan(0)
  })

  it('calculates per-bucket stats correctly', () => {
    const picks = [
      ...Array.from({ length: 5 }, () => makePick(65, 'win')),
      ...Array.from({ length: 5 }, () => makePick(65, 'loss')),
      ...Array.from({ length: 4 }, () => makePick(85, 'win')),
      ...Array.from({ length: 1 }, () => makePick(85, 'loss')),
    ]
    const result = calculateCalibration(picks)

    const bucket60 = result.buckets.find((b) => b.label === '60-69%')!
    expect(bucket60.total).toBe(10)
    expect(bucket60.wins).toBe(5)
    expect(bucket60.actualWinRate).toBe(50)
    expect(bucket60.expectedWinRate).toBe(65)
    expect(bucket60.calibrationError).toBe(-15)

    const bucket80 = result.buckets.find((b) => b.label === '80-89%')!
    expect(bucket80.total).toBe(5)
    expect(bucket80.wins).toBe(4)
    expect(bucket80.actualWinRate).toBe(80)
    expect(bucket80.expectedWinRate).toBe(85)
    expect(bucket80.calibrationError).toBe(-5)
  })

  it('handles confidence values at boundaries', () => {
    const picks = [
      ...Array.from({ length: 5 }, () => makePick(0, 'loss')),
      ...Array.from({ length: 5 }, () => makePick(100, 'win')),
      ...Array.from({ length: 5 }, () => makePick(50, 'win')),
    ]
    const result = calculateCalibration(picks)
    expect(result.totalPicks).toBe(15)

    const bucketLow = result.buckets.find((b) => b.label === '0-49%')!
    expect(bucketLow.total).toBe(5)

    const bucketHigh = result.buckets.find((b) => b.label === '90-100%')!
    expect(bucketHigh.total).toBe(5)
  })

  it('ignores confidence outside 0-100 range', () => {
    const picks = [
      ...Array.from({ length: 10 }, () => makePick(70, 'win')),
      makePick(-10, 'win'),
      makePick(150, 'win'),
    ]
    const result = calculateCalibration(picks)
    expect(result.totalPicks).toBe(10) // Only valid confidence picks
  })

  it('provides meaningful summary text', () => {
    const picks = Array.from({ length: 20 }, () => makePick(75, 'win'))
    const result = calculateCalibration(picks)
    expect(result.summary).toBeTruthy()
    expect(result.summary.length).toBeGreaterThan(20)
  })

  it('calibration score is bounded 0-100', () => {
    // Extremely over-confident
    const picks = Array.from({ length: 20 }, () => makePick(95, 'loss'))
    const result = calculateCalibration(picks)
    expect(result.calibrationScore).toBeGreaterThanOrEqual(0)
    expect(result.calibrationScore).toBeLessThanOrEqual(100)
  })
})
