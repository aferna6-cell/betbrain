import { describe, it, expect } from 'vitest'
import {
  calcExpectedWins,
  calcExpectedWinsBySport,
  getLuckDescription,
} from '../expected-wins'

describe('calcExpectedWins', () => {
  it('calculates cumulative actual and expected wins', () => {
    const picks = [
      { outcome: 'win', odds: -110, created_at: '2026-01-01' },
      { outcome: 'loss', odds: -110, created_at: '2026-01-02' },
      { outcome: 'win', odds: 150, created_at: '2026-01-03' },
    ]
    const result = calcExpectedWins(picks)
    expect(result.totalPicks).toBe(3)
    expect(result.totalActualWins).toBe(2)
    expect(result.actualWins.length).toBe(3)
    expect(result.expectedWins.length).toBe(3)
    expect(result.labels).toEqual([1, 2, 3])
  })

  it('handles all wins scenario', () => {
    const picks = [
      { outcome: 'win', odds: -200, created_at: '2026-01-01' },
      { outcome: 'win', odds: -200, created_at: '2026-01-02' },
      { outcome: 'win', odds: -200, created_at: '2026-01-03' },
    ]
    const result = calcExpectedWins(picks)
    expect(result.totalActualWins).toBe(3)
    // -200 implied = 200/300 = 0.667, expected ~2.0
    expect(result.totalExpectedWins).toBeCloseTo(2.0, 1)
    expect(result.winDelta).toBeGreaterThan(0)
  })

  it('handles all losses scenario', () => {
    const picks = [
      { outcome: 'loss', odds: -200, created_at: '2026-01-01' },
      { outcome: 'loss', odds: -200, created_at: '2026-01-02' },
    ]
    const result = calcExpectedWins(picks)
    expect(result.totalActualWins).toBe(0)
    expect(result.totalExpectedWins).toBeGreaterThan(0)
    expect(result.winDelta).toBeLessThan(0)
  })

  it('treats pushes as half wins', () => {
    const picks = [
      { outcome: 'push', odds: -110, created_at: '2026-01-01' },
    ]
    const result = calcExpectedWins(picks)
    expect(result.totalActualWins).toBe(0.5)
  })

  it('ignores pending picks', () => {
    const picks = [
      { outcome: 'win', odds: -110, created_at: '2026-01-01' },
      { outcome: 'pending', odds: -110, created_at: '2026-01-02' },
    ]
    const result = calcExpectedWins(picks)
    expect(result.totalPicks).toBe(1)
  })

  it('returns empty arrays for no resolved picks', () => {
    const result = calcExpectedWins([])
    expect(result.totalPicks).toBe(0)
    expect(result.actualWins).toEqual([])
    expect(result.expectedWins).toEqual([])
  })

  it('sorts by date', () => {
    const picks = [
      { outcome: 'loss', odds: -110, created_at: '2026-01-03' },
      { outcome: 'win', odds: -110, created_at: '2026-01-01' },
    ]
    const result = calcExpectedWins(picks)
    // First pick (Jan 1) is win, so cumulative actual[0] = 1
    expect(result.actualWins[0]).toBe(1)
    // Second pick (Jan 3) is loss, cumulative stays at 1
    expect(result.actualWins[1]).toBe(1)
  })

  it('calculates win delta percentage', () => {
    const picks = [
      { outcome: 'win', odds: -110, created_at: '2026-01-01' },
      { outcome: 'win', odds: -110, created_at: '2026-01-02' },
    ]
    const result = calcExpectedWins(picks)
    expect(result.winDeltaPct).not.toBeNull()
    expect(typeof result.winDeltaPct).toBe('number')
  })

  it('calculates luck z-score', () => {
    const picks = Array.from({ length: 20 }, (_, i) => ({
      outcome: 'win' as const,
      odds: -110,
      created_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
    }))
    const result = calcExpectedWins(picks)
    expect(result.luckZScore).not.toBeNull()
    expect(result.luckZScore!).toBeGreaterThan(0)
    expect(result.assessment).toBe('hot')
  })

  it('assesses cold streak', () => {
    const picks = Array.from({ length: 20 }, (_, i) => ({
      outcome: 'loss' as const,
      odds: 150, // 40% implied, expected ~8 wins but got 0
      created_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
    }))
    const result = calcExpectedWins(picks)
    expect(result.assessment).toBe('cold')
  })

  it('assesses expected when close', () => {
    // Mix of wins and losses at roughly -110 should be near expected
    const picks = [
      { outcome: 'win', odds: -110, created_at: '2026-01-01' },
      { outcome: 'loss', odds: -110, created_at: '2026-01-02' },
      { outcome: 'win', odds: -110, created_at: '2026-01-03' },
      { outcome: 'loss', odds: -110, created_at: '2026-01-04' },
    ]
    const result = calcExpectedWins(picks)
    // 2 wins vs ~2.1 expected, should be "expected"
    expect(result.assessment).toBe('expected')
  })
})

describe('calcExpectedWinsBySport', () => {
  it('breaks down by sport', () => {
    const picks = [
      { outcome: 'win', odds: -110, sport: 'nba' },
      { outcome: 'loss', odds: -110, sport: 'nba' },
      { outcome: 'win', odds: -110, sport: 'nfl' },
    ]
    const result = calcExpectedWinsBySport(picks)
    expect(result.length).toBe(2)
    const nba = result.find((r) => r.sport === 'nba')!
    expect(nba.actualWins).toBe(1)
    expect(nba.totalPicks).toBe(2)
    const nfl = result.find((r) => r.sport === 'nfl')!
    expect(nfl.actualWins).toBe(1)
    expect(nfl.totalPicks).toBe(1)
  })

  it('uses "unknown" for missing sport', () => {
    const picks = [
      { outcome: 'win', odds: -110 },
    ]
    const result = calcExpectedWinsBySport(picks)
    expect(result[0].sport).toBe('unknown')
  })

  it('sorts by total picks descending', () => {
    const picks = [
      { outcome: 'win', odds: -110, sport: 'nba' },
      { outcome: 'win', odds: -110, sport: 'nba' },
      { outcome: 'win', odds: -110, sport: 'nfl' },
    ]
    const result = calcExpectedWinsBySport(picks)
    expect(result[0].sport).toBe('nba')
  })

  it('ignores pending picks', () => {
    const picks = [
      { outcome: 'pending', odds: -110, sport: 'nba' },
      { outcome: 'win', odds: -110, sport: 'nba' },
    ]
    const result = calcExpectedWinsBySport(picks)
    expect(result[0].totalPicks).toBe(1)
  })
})

describe('getLuckDescription', () => {
  it('warns about small sample size', () => {
    const data = calcExpectedWins([
      { outcome: 'win', odds: -110 },
    ])
    const desc = getLuckDescription(data)
    expect(desc).toContain('Not enough data')
  })

  it('describes running hot', () => {
    const picks = Array.from({ length: 20 }, (_, i) => ({
      outcome: 'win' as const,
      odds: -110,
      created_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
    }))
    const data = calcExpectedWins(picks)
    const desc = getLuckDescription(data)
    expect(desc.toLowerCase()).toContain('hot')
  })

  it('describes running cold', () => {
    const picks = Array.from({ length: 20 }, (_, i) => ({
      outcome: 'loss' as const,
      odds: 150,
      created_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
    }))
    const data = calcExpectedWins(picks)
    const desc = getLuckDescription(data)
    expect(desc.toLowerCase()).toContain('cold')
  })

  it('describes expected results', () => {
    // Create a balanced set
    const picks = Array.from({ length: 20 }, (_, i) => ({
      outcome: (i % 2 === 0 ? 'win' : 'loss') as 'win' | 'loss',
      odds: -110,
      created_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
    }))
    const data = calcExpectedWins(picks)
    const desc = getLuckDescription(data)
    // Should mention expectations or sustainable
    expect(desc.length).toBeGreaterThan(0)
  })
})
