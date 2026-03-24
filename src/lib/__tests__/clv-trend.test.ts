/**
 * Tests for CLV trend chart data builder.
 */

import { describe, it, expect } from 'vitest'
import { buildCLVTrendData } from '@/components/clv-trend-chart'
import { calculateCLV } from '@/lib/clv'

function makePick(overrides: Partial<{
  id: string
  odds: number
  closing_odds: number | null
  units: number
  game_date: string
  outcome: string | null
}> = {}) {
  return {
    id: 'pick-1',
    odds: -110,
    closing_odds: -120 as number | null,
    units: 1,
    game_date: '2026-03-20',
    outcome: 'win' as string | null,
    ...overrides,
  }
}

describe('buildCLVTrendData', () => {
  it('returns empty array for no picks', () => {
    expect(buildCLVTrendData([])).toHaveLength(0)
  })

  it('filters out picks without closing odds', () => {
    const picks = [
      makePick({ id: '1', closing_odds: null }),
      makePick({ id: '2', closing_odds: -120 }),
    ]
    const data = buildCLVTrendData(picks)
    expect(data).toHaveLength(1)
  })

  it('sorts by game date ascending', () => {
    const picks = [
      makePick({ id: '2', game_date: '2026-03-22', closing_odds: -115 }),
      makePick({ id: '1', game_date: '2026-03-20', closing_odds: -120 }),
      makePick({ id: '3', game_date: '2026-03-21', closing_odds: -118 }),
    ]
    const data = buildCLVTrendData(picks)
    expect(data[0].date).toBe('2026-03-20')
    expect(data[1].date).toBe('2026-03-21')
    expect(data[2].date).toBe('2026-03-22')
  })

  it('calculates per-pick CLV correctly', () => {
    const picks = [
      makePick({ odds: -110, closing_odds: -120 }),
    ]
    const data = buildCLVTrendData(picks)
    const expectedCLV = calculateCLV(-110, -120)
    expect(data[0].clv).toBeCloseTo(expectedCLV, 1)
  })

  it('calculates running average correctly', () => {
    const picks = [
      makePick({ id: '1', game_date: '2026-03-20', odds: -110, closing_odds: -120 }),
      makePick({ id: '2', game_date: '2026-03-21', odds: -110, closing_odds: -110 }),
      makePick({ id: '3', game_date: '2026-03-22', odds: -110, closing_odds: -130 }),
    ]
    const data = buildCLVTrendData(picks)

    // First point: running avg = clv1
    expect(data[0].runningAvg).toBeCloseTo(data[0].clv, 1)

    // Second point: running avg = (clv1 + clv2) / 2
    expect(data[1].runningAvg).toBeCloseTo((data[0].clv + data[1].clv) / 2, 1)

    // Third: avg of all three
    expect(data[2].runningAvg).toBeCloseTo(
      (data[0].clv + data[1].clv + data[2].clv) / 3,
      1
    )
  })

  it('tracks pick count incrementally', () => {
    const picks = [
      makePick({ id: '1', game_date: '2026-03-20' }),
      makePick({ id: '2', game_date: '2026-03-21' }),
      makePick({ id: '3', game_date: '2026-03-22' }),
    ]
    const data = buildCLVTrendData(picks)
    expect(data[0].pickCount).toBe(1)
    expect(data[1].pickCount).toBe(2)
    expect(data[2].pickCount).toBe(3)
  })

  it('positive CLV when bet odds are better than closing', () => {
    // Bet at -110 (52.38%), closed at -130 (56.52%) -> positive CLV
    const picks = [
      makePick({ odds: -110, closing_odds: -130 }),
    ]
    const data = buildCLVTrendData(picks)
    expect(data[0].clv).toBeGreaterThan(0)
  })

  it('negative CLV when closing odds are better than bet', () => {
    // Bet at -130 (56.52%), closed at -110 (52.38%) -> negative CLV
    const picks = [
      makePick({ odds: -130, closing_odds: -110 }),
    ]
    const data = buildCLVTrendData(picks)
    expect(data[0].clv).toBeLessThan(0)
  })

  it('zero CLV when odds match', () => {
    const picks = [
      makePick({ odds: -110, closing_odds: -110 }),
    ]
    const data = buildCLVTrendData(picks)
    expect(data[0].clv).toBe(0)
  })

  it('handles underdog odds correctly', () => {
    // Bet at +150 (40%), closed at +130 (43.48%) -> positive CLV
    const picks = [
      makePick({ odds: 150, closing_odds: 130 }),
    ]
    const data = buildCLVTrendData(picks)
    expect(data[0].clv).toBeGreaterThan(0)
  })

  it('all values are finite numbers', () => {
    const picks = [
      makePick({ id: '1', game_date: '2026-03-20', odds: -500, closing_odds: -450 }),
      makePick({ id: '2', game_date: '2026-03-21', odds: 300, closing_odds: 250 }),
      makePick({ id: '3', game_date: '2026-03-22', odds: -110, closing_odds: -110 }),
    ]
    const data = buildCLVTrendData(picks)
    for (const point of data) {
      expect(isFinite(point.clv)).toBe(true)
      expect(isFinite(point.runningAvg)).toBe(true)
      expect(isNaN(point.clv)).toBe(false)
      expect(isNaN(point.runningAvg)).toBe(false)
    }
  })
})
