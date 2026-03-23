import { describe, it, expect } from 'vitest'
import { analyzeByTimeOfDay, type TimePeriod } from '../time-analysis'

function makePick(hour: number, outcome: string, profit: number) {
  const d = new Date('2026-03-23T00:00:00')
  d.setHours(hour, 0, 0, 0)
  return {
    outcome,
    profit,
    units: 1,
    odds: -110,
    created_at: d.toISOString(),
  }
}

describe('time-analysis', () => {
  it('returns empty periods for no picks', () => {
    const result = analyzeByTimeOfDay([])
    expect(result.totalResolvedByTime).toBe(0)
    expect(result.periods.length).toBe(5)
    expect(result.bestPeriod).toBeNull()
  })

  it('buckets picks into correct time periods', () => {
    const picks = [
      makePick(7, 'win', 1),   // early_morning (5-9)
      makePick(10, 'win', 1),  // morning (9-12)
      makePick(14, 'loss', -1), // afternoon (12-17)
      makePick(19, 'win', 2),  // evening (17-22)
      makePick(23, 'loss', -1), // late_night (22-5)
    ]
    const result = analyzeByTimeOfDay(picks)

    const getPeriod = (p: TimePeriod) => result.periods.find((pr) => pr.period === p)!

    expect(getPeriod('early_morning').picks).toBe(1)
    expect(getPeriod('morning').picks).toBe(1)
    expect(getPeriod('afternoon').picks).toBe(1)
    expect(getPeriod('evening').picks).toBe(1)
    expect(getPeriod('late_night').picks).toBe(1)
  })

  it('calculates ROI per period', () => {
    const picks = [
      makePick(7, 'win', 2),
      makePick(8, 'win', 1.5),
      makePick(6, 'loss', -1),
      makePick(14, 'loss', -1),
      makePick(15, 'loss', -1),
      makePick(16, 'loss', -1),
    ]
    const result = analyzeByTimeOfDay(picks)

    const earlyMorning = result.periods.find((p) => p.period === 'early_morning')!
    expect(earlyMorning.profit).toBeGreaterThan(0)
    expect(earlyMorning.roi).toBeGreaterThan(0)

    const afternoon = result.periods.find((p) => p.period === 'afternoon')!
    expect(afternoon.profit).toBeLessThan(0)
    expect(afternoon.roi).toBeLessThan(0)
  })

  it('identifies best and worst periods', () => {
    const picks = [
      // Good evening picks
      makePick(19, 'win', 2),
      makePick(20, 'win', 1.5),
      makePick(21, 'win', 1),
      // Bad morning picks
      makePick(9, 'loss', -1),
      makePick(10, 'loss', -1),
      makePick(11, 'loss', -1),
    ]
    const result = analyzeByTimeOfDay(picks)
    expect(result.bestPeriod?.period).toBe('evening')
    expect(result.worstPeriod?.period).toBe('morning')
  })

  it('ignores pending picks', () => {
    const picks = [
      makePick(14, 'pending', 0),
    ]
    const result = analyzeByTimeOfDay(picks)
    expect(result.totalResolvedByTime).toBe(0)
    expect(result.periods.find((p) => p.period === 'afternoon')!.picks).toBe(0)
  })

  it('calculates win rate per period', () => {
    const picks = [
      makePick(14, 'win', 1),
      makePick(15, 'win', 1),
      makePick(16, 'loss', -1),
      makePick(13, 'win', 1),
    ]
    const result = analyzeByTimeOfDay(picks)
    const afternoon = result.periods.find((p) => p.period === 'afternoon')!
    expect(afternoon.winRate).toBe(75)
  })

  it('calculates average odds per period', () => {
    const picks = [
      { outcome: 'win', profit: 1, units: 1, odds: -110, created_at: '2026-03-23T14:00:00Z' },
      { outcome: 'win', profit: 1, units: 1, odds: 150, created_at: '2026-03-23T15:00:00Z' },
    ]
    const result = analyzeByTimeOfDay(picks)
    const afternoon = result.periods.find((p) => p.period === 'afternoon')!
    expect(afternoon.avgOdds).toBe(20) // (-110 + 150) / 2 = 20
  })

  it('needs at least 3 picks for best/worst', () => {
    const picks = [
      makePick(14, 'win', 1),
      makePick(15, 'win', 1),
    ]
    const result = analyzeByTimeOfDay(picks)
    expect(result.bestPeriod).toBeNull()
  })
})
