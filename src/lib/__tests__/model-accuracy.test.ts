import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calcModelAccuracy, type AccuracyRecord } from '../model-accuracy'

function makeRecord(overrides: Partial<AccuracyRecord> = {}): AccuracyRecord {
  return {
    id: crypto.randomUUID(),
    gameId: `game_${Math.random()}`,
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    aiConfidence: 70,
    aiSide: 'home',
    riskLevel: 'medium',
    pickOutcome: 'win',
    createdAt: '2026-03-20T10:00:00Z',
    ...overrides,
  }
}

describe('calcModelAccuracy', () => {
  it('returns empty stats for no records', () => {
    const stats = calcModelAccuracy([])
    expect(stats.totalRecords).toBe(0)
    expect(stats.overallAccuracy).toBeNull()
    expect(stats.brierScore).toBeNull()
    expect(stats.buckets).toHaveLength(5)
  })

  it('calculates overall accuracy correctly', () => {
    const records = [
      makeRecord({ pickOutcome: 'win' }),
      makeRecord({ pickOutcome: 'win' }),
      makeRecord({ pickOutcome: 'loss' }),
    ]
    const stats = calcModelAccuracy(records)
    expect(stats.overallAccuracy).toBe(66.7)
  })

  it('excludes push outcomes from accuracy', () => {
    const records = [
      makeRecord({ pickOutcome: 'win' }),
      makeRecord({ pickOutcome: 'push' }),
      makeRecord({ pickOutcome: 'loss' }),
    ]
    const stats = calcModelAccuracy(records)
    expect(stats.overallAccuracy).toBe(50)
  })

  it('excludes null outcomes', () => {
    const records = [
      makeRecord({ pickOutcome: 'win' }),
      makeRecord({ pickOutcome: null }),
    ]
    const stats = calcModelAccuracy(records)
    expect(stats.totalRecords).toBe(2)
    expect(stats.overallAccuracy).toBe(100)
  })

  it('calculates Brier score correctly', () => {
    // All 70% confident picks that win: (0.7 - 1)^2 = 0.09
    const records = [
      makeRecord({ aiConfidence: 70, pickOutcome: 'win' }),
      makeRecord({ aiConfidence: 70, pickOutcome: 'win' }),
    ]
    const stats = calcModelAccuracy(records)
    expect(stats.brierScore).toBeCloseTo(0.09, 3)
  })

  it('calculates Brier score for mixed outcomes', () => {
    // 80% confident: win=(0.8-1)^2=0.04, loss=(0.8-0)^2=0.64, avg=0.34
    const records = [
      makeRecord({ aiConfidence: 80, pickOutcome: 'win' }),
      makeRecord({ aiConfidence: 80, pickOutcome: 'loss' }),
    ]
    const stats = calcModelAccuracy(records)
    expect(stats.brierScore).toBeCloseTo(0.34, 3)
  })

  it('buckets by confidence range', () => {
    const records = [
      makeRecord({ aiConfidence: 55, pickOutcome: 'win' }),
      makeRecord({ aiConfidence: 55, pickOutcome: 'loss' }),
      makeRecord({ aiConfidence: 75, pickOutcome: 'win' }),
      makeRecord({ aiConfidence: 95, pickOutcome: 'win' }),
    ]
    const stats = calcModelAccuracy(records)

    const bucket50 = stats.buckets.find((b) => b.range === '50-59%')!
    expect(bucket50.total).toBe(2)
    expect(bucket50.winRate).toBe(50)

    const bucket70 = stats.buckets.find((b) => b.range === '70-79%')!
    expect(bucket70.total).toBe(1)
    expect(bucket70.winRate).toBe(100)

    const bucket90 = stats.buckets.find((b) => b.range === '90-100%')!
    expect(bucket90.total).toBe(1)
    expect(bucket90.correct).toBe(1)
  })

  it('calculates by risk level', () => {
    const records = [
      makeRecord({ riskLevel: 'low', pickOutcome: 'win' }),
      makeRecord({ riskLevel: 'low', pickOutcome: 'win' }),
      makeRecord({ riskLevel: 'high', pickOutcome: 'loss' }),
    ]
    const stats = calcModelAccuracy(records)

    const low = stats.byRiskLevel.find((r) => r.level === 'low')!
    expect(low.total).toBe(2)
    expect(low.winRate).toBe(100)

    const high = stats.byRiskLevel.find((r) => r.level === 'high')!
    expect(high.total).toBe(1)
    expect(high.winRate).toBe(0)
  })

  it('only shows risk levels with data', () => {
    const records = [
      makeRecord({ riskLevel: 'medium', pickOutcome: 'win' }),
    ]
    const stats = calcModelAccuracy(records)
    expect(stats.byRiskLevel).toHaveLength(1)
    expect(stats.byRiskLevel[0].level).toBe('medium')
  })

  it('builds recent trend sorted chronologically', () => {
    const records = [
      makeRecord({ pickOutcome: 'win', createdAt: '2026-03-22T10:00:00Z' }),
      makeRecord({ pickOutcome: 'loss', createdAt: '2026-03-20T10:00:00Z' }),
      makeRecord({ pickOutcome: 'win', createdAt: '2026-03-21T10:00:00Z' }),
    ]
    const stats = calcModelAccuracy(records)
    expect(stats.recentTrend).toHaveLength(3)
    // Should be sorted chronologically (oldest first)
    expect(stats.recentTrend[0].correct).toBe(false)
    expect(stats.recentTrend[1].correct).toBe(true)
    expect(stats.recentTrend[2].correct).toBe(true)
  })

  it('limits recent trend to 20', () => {
    const records = Array.from({ length: 25 }, (_, i) =>
      makeRecord({
        pickOutcome: 'win',
        createdAt: `2026-03-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      })
    )
    const stats = calcModelAccuracy(records)
    expect(stats.recentTrend).toHaveLength(20)
  })

  it('handles empty buckets gracefully', () => {
    const records = [
      makeRecord({ aiConfidence: 95, pickOutcome: 'win' }),
    ]
    const stats = calcModelAccuracy(records)
    const emptyBucket = stats.buckets.find((b) => b.range === '50-59%')!
    expect(emptyBucket.total).toBe(0)
    expect(emptyBucket.winRate).toBeNull()
  })

  it('perfect prediction gives Brier score 0', () => {
    // 100% confident and correct
    const records = [
      makeRecord({ aiConfidence: 100, pickOutcome: 'win' }),
    ]
    const stats = calcModelAccuracy(records)
    expect(stats.brierScore).toBe(0)
  })
})
