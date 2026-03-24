import { describe, it, expect } from 'vitest'
import {
  aggregateDailyPnL,
  buildCalendarMonth,
  getHeatLevel,
  getHeatColor,
  getMonthLabel,
  getStreakInfo,
} from '../profit-calendar'

describe('aggregateDailyPnL', () => {
  it('returns empty map for no picks', () => {
    expect(aggregateDailyPnL([]).size).toBe(0)
  })

  it('ignores pending picks', () => {
    const picks = [
      { game_date: '2026-03-10', outcome: 'pending', profit: null, units: 1 },
    ]
    expect(aggregateDailyPnL(picks).size).toBe(0)
  })

  it('aggregates multiple picks on the same day', () => {
    const picks = [
      { game_date: '2026-03-10', outcome: 'win', profit: 2.5, units: 1 },
      { game_date: '2026-03-10', outcome: 'loss', profit: -1.0, units: 1 },
      { game_date: '2026-03-10', outcome: 'win', profit: 1.5, units: 1 },
    ]
    const map = aggregateDailyPnL(picks)
    expect(map.size).toBe(1)
    const day = map.get('2026-03-10')!
    expect(day.profit).toBe(3.0)
    expect(day.wins).toBe(2)
    expect(day.losses).toBe(1)
    expect(day.totalPicks).toBe(3)
    expect(day.units).toBe(3)
  })

  it('separates different dates', () => {
    const picks = [
      { game_date: '2026-03-10', outcome: 'win', profit: 2.0, units: 1 },
      { game_date: '2026-03-11', outcome: 'loss', profit: -1.0, units: 1 },
    ]
    const map = aggregateDailyPnL(picks)
    expect(map.size).toBe(2)
    expect(map.get('2026-03-10')!.profit).toBe(2.0)
    expect(map.get('2026-03-11')!.profit).toBe(-1.0)
  })

  it('calculates ROI correctly', () => {
    const picks = [
      { game_date: '2026-03-10', outcome: 'win', profit: 5.0, units: 2 },
      { game_date: '2026-03-10', outcome: 'loss', profit: -1.0, units: 1 },
    ]
    const map = aggregateDailyPnL(picks)
    const day = map.get('2026-03-10')!
    // profit = 4.0, units = 3, ROI = (4/3)*100 = 133.33%
    expect(day.roi).toBeCloseTo(133.33, 1)
  })

  it('counts pushes', () => {
    const picks = [
      { game_date: '2026-03-10', outcome: 'push', profit: 0, units: 1 },
    ]
    const map = aggregateDailyPnL(picks)
    expect(map.get('2026-03-10')!.pushes).toBe(1)
  })
})

describe('buildCalendarMonth', () => {
  it('builds correct number of cells for March 2026', () => {
    const dailyPnL = new Map()
    const cal = buildCalendarMonth(2026, 2, dailyPnL) // March 2026
    expect(cal.year).toBe(2026)
    expect(cal.month).toBe(2)
    expect(cal.days.length).toBe(42) // 6 weeks
    expect(cal.activeDays).toBe(0)
  })

  it('places P/L data in correct slots', () => {
    const dailyPnL = aggregateDailyPnL([
      { game_date: '2026-03-01', outcome: 'win', profit: 5.0, units: 1 },
    ])
    const cal = buildCalendarMonth(2026, 2, dailyPnL)
    // March 1, 2026 is a Sunday (day 0), so slot 0
    expect(cal.days[0]).not.toBeNull()
    expect(cal.days[0]!.profit).toBe(5.0)
    expect(cal.winningDays).toBe(1)
  })

  it('calculates best and worst days', () => {
    const dailyPnL = aggregateDailyPnL([
      { game_date: '2026-03-10', outcome: 'win', profit: 10, units: 1 },
      { game_date: '2026-03-11', outcome: 'loss', profit: -5, units: 1 },
      { game_date: '2026-03-12', outcome: 'win', profit: 3, units: 1 },
    ])
    const cal = buildCalendarMonth(2026, 2, dailyPnL)
    expect(cal.bestDay!.profit).toBe(10)
    expect(cal.worstDay!.profit).toBe(-5)
    expect(cal.totalProfit).toBe(8)
  })
})

describe('getHeatLevel', () => {
  it('returns big-win for 3+ units profit', () => {
    expect(getHeatLevel(30, 10)).toBe('big-win')
  })

  it('returns win for 1.5-3 units profit', () => {
    expect(getHeatLevel(20, 10)).toBe('win')
  })

  it('returns small-win for 0-1.5 units profit', () => {
    expect(getHeatLevel(5, 10)).toBe('small-win')
  })

  it('returns break-even for zero', () => {
    expect(getHeatLevel(0, 10)).toBe('break-even')
  })

  it('returns small-loss for 0 to -1.5 units', () => {
    expect(getHeatLevel(-10, 10)).toBe('small-loss')
  })

  it('returns loss for -1.5 to -3 units', () => {
    expect(getHeatLevel(-20, 10)).toBe('loss')
  })

  it('returns big-loss for -3+ units', () => {
    expect(getHeatLevel(-50, 10)).toBe('big-loss')
  })

  it('returns no-activity for zero unit size', () => {
    expect(getHeatLevel(5, 0)).toBe('no-activity')
  })
})

describe('getHeatColor', () => {
  it('returns green for wins', () => {
    expect(getHeatColor('big-win')).toContain('green')
    expect(getHeatColor('win')).toContain('green')
    expect(getHeatColor('small-win')).toContain('green')
  })

  it('returns red for losses', () => {
    expect(getHeatColor('big-loss')).toContain('red')
    expect(getHeatColor('loss')).toContain('red')
    expect(getHeatColor('small-loss')).toContain('red')
  })

  it('returns zinc for break-even', () => {
    expect(getHeatColor('break-even')).toContain('zinc')
  })

  it('returns transparent for no-activity', () => {
    expect(getHeatColor('no-activity')).toContain('transparent')
  })
})

describe('getMonthLabel', () => {
  it('formats month correctly', () => {
    expect(getMonthLabel(2026, 2)).toBe('March 2026')
    expect(getMonthLabel(2026, 0)).toBe('January 2026')
    expect(getMonthLabel(2026, 11)).toBe('December 2026')
  })
})

describe('getStreakInfo', () => {
  it('returns zeros for empty data', () => {
    const result = getStreakInfo(new Map())
    expect(result.currentStreak).toBe(0)
    expect(result.longestWinStreak).toBe(0)
    expect(result.longestLoseStreak).toBe(0)
  })

  it('tracks winning streak', () => {
    const pnl = aggregateDailyPnL([
      { game_date: '2026-03-10', outcome: 'win', profit: 5, units: 1 },
      { game_date: '2026-03-11', outcome: 'win', profit: 3, units: 1 },
      { game_date: '2026-03-12', outcome: 'win', profit: 2, units: 1 },
    ])
    const result = getStreakInfo(pnl)
    expect(result.currentStreak).toBe(3)
    expect(result.longestWinStreak).toBe(3)
  })

  it('tracks losing streak', () => {
    const pnl = aggregateDailyPnL([
      { game_date: '2026-03-10', outcome: 'loss', profit: -2, units: 1 },
      { game_date: '2026-03-11', outcome: 'loss', profit: -3, units: 1 },
    ])
    const result = getStreakInfo(pnl)
    expect(result.currentStreak).toBe(-2)
    expect(result.longestLoseStreak).toBe(2)
  })

  it('resets streak on direction change', () => {
    const pnl = aggregateDailyPnL([
      { game_date: '2026-03-10', outcome: 'win', profit: 5, units: 1 },
      { game_date: '2026-03-11', outcome: 'win', profit: 3, units: 1 },
      { game_date: '2026-03-12', outcome: 'loss', profit: -2, units: 1 },
    ])
    const result = getStreakInfo(pnl)
    expect(result.currentStreak).toBe(-1)
    expect(result.longestWinStreak).toBe(2)
    expect(result.longestLoseStreak).toBe(1)
  })
})
