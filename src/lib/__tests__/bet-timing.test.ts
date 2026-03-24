import { describe, it, expect } from 'vitest'
import {
  calcHoursBeforeGame,
  getBucketForHours,
  analyzeTimingPerformance,
  getTimingRecommendation,
} from '../bet-timing'

describe('calcHoursBeforeGame', () => {
  it('calculates hours between creation and game', () => {
    const hours = calcHoursBeforeGame('2026-01-01T12:00:00Z', '2026-01-02T00:00:00Z')
    expect(hours).toBe(12)
  })

  it('returns 0 for live bets (created after game start)', () => {
    const hours = calcHoursBeforeGame('2026-01-02T01:00:00Z', '2026-01-02T00:00:00Z')
    expect(hours).toBe(0)
  })

  it('returns null for missing dates', () => {
    expect(calcHoursBeforeGame(undefined, '2026-01-01')).toBeNull()
    expect(calcHoursBeforeGame('2026-01-01', undefined)).toBeNull()
  })

  it('returns null for invalid dates', () => {
    expect(calcHoursBeforeGame('not-a-date', '2026-01-01')).toBeNull()
  })
})

describe('getBucketForHours', () => {
  it('assigns game day bucket', () => {
    expect(getBucketForHours(3)).toBe('Game day (<6h)')
  })

  it('assigns morning of bucket', () => {
    expect(getBucketForHours(9)).toBe('Morning of (6-12h)')
  })

  it('assigns night before bucket', () => {
    expect(getBucketForHours(18)).toBe('Night before (12-24h)')
  })

  it('assigns 1-2 days early bucket', () => {
    expect(getBucketForHours(36)).toBe('1-2 days early')
  })

  it('assigns 2-3 days early bucket', () => {
    expect(getBucketForHours(60)).toBe('2-3 days early')
  })

  it('assigns 3+ days early bucket', () => {
    expect(getBucketForHours(100)).toBe('3+ days early')
  })

  it('assigns 0 hours to game day', () => {
    expect(getBucketForHours(0)).toBe('Game day (<6h)')
  })
})

describe('analyzeTimingPerformance', () => {
  const basePick = (overrides: Record<string, unknown>) => ({
    outcome: 'win' as const,
    profit: 100,
    units: 1,
    odds: -110,
    sport: 'nba',
    created_at: '2026-01-01T12:00:00Z',
    game_date: '2026-01-02T00:00:00Z', // 12 hours later
    ...overrides,
  })

  it('calculates buckets with wins and losses', () => {
    const picks = [
      basePick({ outcome: 'win', profit: 100 }),
      basePick({ outcome: 'loss', profit: -100 }),
    ]
    const result = analyzeTimingPerformance(picks)
    // Both picks are 12h before game = "Night before"
    const nightBucket = result.buckets.find((b) => b.label === 'Night before (12-24h)')!
    expect(nightBucket.wins).toBe(1)
    expect(nightBucket.losses).toBe(1)
    expect(nightBucket.total).toBe(2)
  })

  it('identifies best and worst buckets', () => {
    const picks = [
      basePick({ outcome: 'win', profit: 100, created_at: '2026-01-01T18:00:00Z', game_date: '2026-01-02T00:00:00Z' }), // 6h = morning
      basePick({ outcome: 'loss', profit: -100, created_at: '2026-01-01T12:00:00Z', game_date: '2026-01-02T00:00:00Z' }), // 12h = night before
    ]
    const result = analyzeTimingPerformance(picks)
    expect(result.bestBucket).not.toBeNull()
    expect(result.worstBucket).not.toBeNull()
    expect(result.bestBucket!.roi).toBeGreaterThan(result.worstBucket!.roi)
  })

  it('calculates average hours before game', () => {
    const picks = [
      basePick({}), // 12 hours
      basePick({ created_at: '2026-01-01T00:00:00Z' }), // 24 hours
    ]
    const result = analyzeTimingPerformance(picks)
    expect(result.avgHoursBeforeGame).toBe(18) // avg of 12 and 24
  })

  it('breaks down by sport', () => {
    const picks = [
      basePick({ sport: 'nba' }),
      basePick({ sport: 'nfl' }),
    ]
    const result = analyzeTimingPerformance(picks)
    expect(result.bySport.length).toBe(2)
    expect(result.bySport.map((s) => s.sport)).toContain('nba')
    expect(result.bySport.map((s) => s.sport)).toContain('nfl')
  })

  it('ignores pending picks', () => {
    const picks = [
      basePick({ outcome: 'pending', profit: null }),
    ]
    const result = analyzeTimingPerformance(picks)
    expect(result.buckets.every((b) => b.total === 0)).toBe(true)
  })

  it('ignores picks without dates', () => {
    const picks = [
      basePick({ created_at: undefined }),
    ]
    const result = analyzeTimingPerformance(picks)
    expect(result.avgHoursBeforeGame).toBeNull()
  })

  it('handles empty input', () => {
    const result = analyzeTimingPerformance([])
    expect(result.bestBucket).toBeNull()
    expect(result.bySport).toEqual([])
  })

  it('handles push outcomes', () => {
    const picks = [basePick({ outcome: 'push', profit: 0 })]
    const result = analyzeTimingPerformance(picks)
    const nightBucket = result.buckets.find((b) => b.label === 'Night before (12-24h)')!
    expect(nightBucket.pushes).toBe(1)
  })
})

describe('getTimingRecommendation', () => {
  it('returns data message when no best bucket', () => {
    const analysis = analyzeTimingPerformance([])
    const rec = getTimingRecommendation(analysis)
    expect(rec).toContain('Not enough data')
  })

  it('returns recommendation with best bucket', () => {
    const picks = [
      {
        outcome: 'win' as const, profit: 100, units: 1, odds: -110,
        created_at: '2026-01-01T18:00:00Z', game_date: '2026-01-02T00:00:00Z',
      },
      {
        outcome: 'win' as const, profit: 100, units: 1, odds: -110,
        created_at: '2026-01-02T18:00:00Z', game_date: '2026-01-03T00:00:00Z',
      },
    ]
    const analysis = analyzeTimingPerformance(picks)
    const rec = getTimingRecommendation(analysis)
    expect(rec.length).toBeGreaterThan(20)
    expect(rec).toContain('ROI')
  })
})
