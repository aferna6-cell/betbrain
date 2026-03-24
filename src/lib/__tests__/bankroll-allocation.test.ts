import { describe, it, expect } from 'vitest'
import { calcSportPerformance, suggestAllocation, type SportPerformance } from '../bankroll-allocation'

describe('calcSportPerformance', () => {
  it('returns empty for no picks', () => {
    expect(calcSportPerformance([])).toEqual([])
  })

  it('skips pending picks', () => {
    const picks = [
      { sport: 'nba', outcome: 'pending', profit: null, units: 1 },
      { sport: 'nba', outcome: null, profit: null, units: 1 },
    ]
    expect(calcSportPerformance(picks)).toEqual([])
  })

  it('calculates performance by sport', () => {
    const picks = [
      { sport: 'nba', outcome: 'win', profit: 1.5, units: 1 },
      { sport: 'nba', outcome: 'loss', profit: -1.0, units: 1 },
      { sport: 'nfl', outcome: 'win', profit: 2.0, units: 1 },
    ]
    const perfs = calcSportPerformance(picks)
    expect(perfs).toHaveLength(2)

    const nfl = perfs.find((p) => p.sport === 'nfl')!
    expect(nfl.wins).toBe(1)
    expect(nfl.losses).toBe(0)
    expect(nfl.roi).toBe(200)

    const nba = perfs.find((p) => p.sport === 'nba')!
    expect(nba.wins).toBe(1)
    expect(nba.losses).toBe(1)
    expect(nba.roi).toBe(25)
  })

  it('sorts by ROI descending', () => {
    const picks = [
      { sport: 'nba', outcome: 'loss', profit: -1, units: 1 },
      { sport: 'nfl', outcome: 'win', profit: 2, units: 1 },
    ]
    const perfs = calcSportPerformance(picks)
    expect(perfs[0].sport).toBe('nfl')
    expect(perfs[1].sport).toBe('nba')
  })
})

describe('suggestAllocation', () => {
  it('returns empty for no data', () => {
    const result = suggestAllocation([])
    expect(result.suggestions).toEqual([])
    expect(result.minSampleWarning).toBe(true)
  })

  it('allocates to single sport at 100%', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 30, losses: 20, total: 50, winRate: 60, profit: 15, units: 50, roi: 30 },
    ]
    const result = suggestAllocation(perfs)
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].percentage).toBe(100)
  })

  it('allocates more to higher ROI sport', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 30, losses: 20, total: 50, winRate: 60, profit: 15, units: 50, roi: 30 },
      { sport: 'nfl', wins: 5, losses: 15, total: 20, winRate: 25, profit: -10, units: 20, roi: -50 },
    ]
    const result = suggestAllocation(perfs)
    const nba = result.suggestions.find((s) => s.sport === 'nba')!
    const nfl = result.suggestions.find((s) => s.sport === 'nfl')!
    expect(nba.percentage).toBeGreaterThan(nfl.percentage)
  })

  it('respects minimum allocation (5%)', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 40, losses: 10, total: 50, winRate: 80, profit: 30, units: 50, roi: 60 },
      { sport: 'nfl', wins: 2, losses: 18, total: 20, winRate: 10, profit: -15, units: 20, roi: -75 },
    ]
    const result = suggestAllocation(perfs)
    const nfl = result.suggestions.find((s) => s.sport === 'nfl')!
    expect(nfl.percentage).toBeGreaterThanOrEqual(5)
  })

  it('respects maximum allocation (50%)', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 40, losses: 10, total: 50, winRate: 80, profit: 30, units: 50, roi: 60 },
      { sport: 'nfl', wins: 20, losses: 10, total: 30, winRate: 66.7, profit: 15, units: 30, roi: 50 },
      { sport: 'mlb', wins: 10, losses: 10, total: 20, winRate: 50, profit: 0, units: 20, roi: 0 },
    ]
    const result = suggestAllocation(perfs)
    for (const s of result.suggestions) {
      expect(s.percentage).toBeLessThanOrEqual(50)
    }
  })

  it('sums to 100%', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 30, losses: 20, total: 50, winRate: 60, profit: 15, units: 50, roi: 30 },
      { sport: 'nfl', wins: 15, losses: 10, total: 25, winRate: 60, profit: 10, units: 25, roi: 40 },
      { sport: 'mlb', wins: 10, losses: 10, total: 20, winRate: 50, profit: 0, units: 20, roi: 0 },
    ]
    const result = suggestAllocation(perfs)
    const total = result.suggestions.reduce((s, x) => s + x.percentage, 0)
    expect(total).toBeCloseTo(100, 0)
  })

  it('flags min sample warning', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 5, losses: 3, total: 8, winRate: 62.5, profit: 5, units: 8, roi: 62.5 },
    ]
    const result = suggestAllocation(perfs)
    expect(result.minSampleWarning).toBe(true)
  })

  it('no min sample warning when all sports have 20+ picks', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 15, losses: 10, total: 25, winRate: 60, profit: 10, units: 25, roi: 40 },
    ]
    const result = suggestAllocation(perfs)
    expect(result.minSampleWarning).toBe(false)
  })

  it('assigns confidence based on sample size', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 30, losses: 20, total: 50, winRate: 60, profit: 15, units: 50, roi: 30 },
      { sport: 'nfl', wins: 10, losses: 15, total: 25, winRate: 40, profit: -5, units: 25, roi: -20 },
      { sport: 'mlb', wins: 3, losses: 2, total: 5, winRate: 60, profit: 3, units: 5, roi: 60 },
    ]
    const result = suggestAllocation(perfs)
    const nba = result.suggestions.find((s) => s.sport === 'nba')!
    expect(nba.confidence).toBe('high')
    const nfl = result.suggestions.find((s) => s.sport === 'nfl')!
    expect(nfl.confidence).toBe('medium')
    const mlb = result.suggestions.find((s) => s.sport === 'mlb')!
    expect(mlb.confidence).toBe('low')
  })

  it('uses custom totalBankroll', () => {
    const perfs: SportPerformance[] = [
      { sport: 'nba', wins: 30, losses: 20, total: 50, winRate: 60, profit: 15, units: 50, roi: 30 },
    ]
    const result = suggestAllocation(perfs, 5000)
    expect(result.totalBankroll).toBe(5000)
  })
})
