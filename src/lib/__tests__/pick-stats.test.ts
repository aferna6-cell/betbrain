import { describe, it, expect } from 'vitest'
import { calcTypeBreakdown, calcSportBreakdown } from '@/lib/pick-stats'

const makePick = (overrides: Partial<{
  pick_type: string; sport: string; outcome: string | null; profit: number | null; units: number
}> = {}) => ({
  pick_type: 'moneyline',
  sport: 'nba',
  outcome: 'win' as string | null,
  profit: 0.91,
  units: 1,
  ...overrides,
})

describe('calcTypeBreakdown', () => {
  it('returns empty array for no picks', () => {
    expect(calcTypeBreakdown([])).toEqual([])
  })

  it('ignores pending picks', () => {
    const result = calcTypeBreakdown([
      makePick({ outcome: 'pending' }),
      makePick({ outcome: null }),
    ])
    expect(result).toEqual([])
  })

  it('calculates W-L and ROI per type', () => {
    const picks = [
      makePick({ pick_type: 'moneyline', outcome: 'win', profit: 1, units: 1 }),
      makePick({ pick_type: 'moneyline', outcome: 'loss', profit: -1, units: 1 }),
      makePick({ pick_type: 'spread', outcome: 'win', profit: 0.91, units: 1 }),
    ]
    const result = calcTypeBreakdown(picks)
    expect(result).toHaveLength(2)

    const ml = result.find((r) => r.type === 'moneyline')!
    expect(ml.wins).toBe(1)
    expect(ml.losses).toBe(1)
    expect(ml.winRate).toBe(50)
    expect(ml.roi).toBe(0)

    const sp = result.find((r) => r.type === 'spread')!
    expect(sp.wins).toBe(1)
    expect(sp.losses).toBe(0)
    expect(sp.roi).toBe(91)
  })

  it('sorts by total picks descending', () => {
    const picks = [
      makePick({ pick_type: 'prop', outcome: 'win', profit: 1, units: 1 }),
      makePick({ pick_type: 'moneyline', outcome: 'win', profit: 1, units: 1 }),
      makePick({ pick_type: 'moneyline', outcome: 'win', profit: 1, units: 1 }),
    ]
    const result = calcTypeBreakdown(picks)
    expect(result[0].type).toBe('moneyline')
  })

  it('handles pushes correctly', () => {
    const picks = [
      makePick({ pick_type: 'spread', outcome: 'push', profit: 0, units: 1 }),
    ]
    const result = calcTypeBreakdown(picks)
    expect(result[0].wins).toBe(0)
    expect(result[0].losses).toBe(0)
    expect(result[0].winRate).toBeNull()
  })
})

describe('calcSportBreakdown', () => {
  it('returns empty array for no picks', () => {
    expect(calcSportBreakdown([])).toEqual([])
  })

  it('calculates per-sport stats', () => {
    const picks = [
      makePick({ sport: 'nba', outcome: 'win', profit: 1, units: 1 }),
      makePick({ sport: 'nba', outcome: 'loss', profit: -1, units: 1 }),
      makePick({ sport: 'nfl', outcome: 'win', profit: 2, units: 1 }),
    ]
    const result = calcSportBreakdown(picks)
    expect(result).toHaveLength(2)

    const nba = result.find((r) => r.sport === 'nba')!
    expect(nba.wins).toBe(1)
    expect(nba.losses).toBe(1)
    expect(nba.roi).toBe(0)

    const nfl = result.find((r) => r.sport === 'nfl')!
    expect(nfl.wins).toBe(1)
    expect(nfl.roi).toBe(200)
  })

  it('includes pending picks in total count but not in W-L', () => {
    const picks = [
      makePick({ sport: 'nba', outcome: 'win', profit: 1, units: 1 }),
      makePick({ sport: 'nba', outcome: 'pending', profit: null, units: 1 }),
    ]
    const result = calcSportBreakdown(picks)
    expect(result[0].total).toBe(2) // includes pending
    expect(result[0].wins).toBe(1)
    expect(result[0].losses).toBe(0)
  })

  it('sorts by total picks descending', () => {
    const picks = [
      makePick({ sport: 'mlb', outcome: 'win', profit: 1, units: 1 }),
      makePick({ sport: 'nba', outcome: 'win', profit: 1, units: 1 }),
      makePick({ sport: 'nba', outcome: 'win', profit: 1, units: 1 }),
    ]
    const result = calcSportBreakdown(picks)
    expect(result[0].sport).toBe('nba')
  })
})
