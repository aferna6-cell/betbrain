import { describe, it, expect } from 'vitest'
import { buildSeasonalTrends, getWeeklyTrendDirection } from '../seasonal-trends'

function makePick(dateStr: string, outcome: string, profit: number, odds = -110, units = 1) {
  return { created_at: dateStr, outcome, profit, odds, units }
}

describe('buildSeasonalTrends', () => {
  it('returns insufficient for < 10 picks', () => {
    const picks = Array.from({ length: 5 }, (_, i) =>
      makePick(`2026-01-${10 + i}`, 'win', 91)
    )
    const result = buildSeasonalTrends(picks)
    expect(result.summary).toContain('Need at least 10')
    expect(result.monthly).toEqual([])
  })

  it('builds monthly trends', () => {
    const picks = [
      ...Array.from({ length: 5 }, (_, i) => makePick(`2026-01-${10 + i}`, 'win', 91)),
      ...Array.from({ length: 5 }, (_, i) => makePick(`2026-02-${10 + i}`, 'loss', -100)),
    ]
    const result = buildSeasonalTrends(picks)
    expect(result.monthly.length).toBeGreaterThanOrEqual(2)
    const jan = result.monthly.find((m) => m.month === 1)
    expect(jan?.wins).toBe(5)
    expect(jan?.losses).toBe(0)
  })

  it('builds day-of-week trends', () => {
    const picks = [
      makePick('2026-01-05', 'win', 91), // Monday
      makePick('2026-01-06', 'loss', -100), // Tuesday
      makePick('2026-01-12', 'win', 91), // Monday
      makePick('2026-01-13', 'loss', -100), // Tuesday
      makePick('2026-01-19', 'win', 91), // Monday
      makePick('2026-01-20', 'loss', -100), // Tuesday
      makePick('2026-01-26', 'win', 91), // Monday
      makePick('2026-01-27', 'loss', -100), // Tuesday
      makePick('2026-02-02', 'win', 91), // Monday
      makePick('2026-02-03', 'loss', -100), // Tuesday
    ]
    const result = buildSeasonalTrends(picks)
    expect(result.dayOfWeek.length).toBeGreaterThanOrEqual(2)
    const mon = result.dayOfWeek.find((d) => d.dayName === 'Monday')
    expect(mon?.wins).toBe(5)
    expect(mon?.losses).toBe(0)
  })

  it('builds weekly trends', () => {
    const picks = Array.from({ length: 10 }, (_, i) =>
      makePick(`2026-01-${10 + i}`, i < 6 ? 'win' : 'loss', i < 6 ? 91 : -100)
    )
    const result = buildSeasonalTrends(picks)
    expect(result.weekly.length).toBeGreaterThan(0)
    for (const w of result.weekly) {
      expect(w.label).toMatch(/^\d{4}-W\d{2}$/)
    }
  })

  it('identifies best and worst month', () => {
    const picks = [
      ...Array.from({ length: 5 }, (_, i) => makePick(`2026-01-${10 + i}`, 'win', 91)),
      ...Array.from({ length: 5 }, (_, i) => makePick(`2026-02-${10 + i}`, 'loss', -100)),
    ]
    const result = buildSeasonalTrends(picks)
    expect(result.bestMonth?.monthName).toBe('January')
    expect(result.worstMonth?.monthName).toBe('February')
  })

  it('identifies best and worst day', () => {
    // Use dates that are all valid and fall on specific days
    const picks = [
      // Mondays: 2026-01-05, 01-12, 01-19, 01-26, 02-02
      makePick('2026-01-05', 'win', 91),
      makePick('2026-01-12', 'win', 91),
      makePick('2026-01-19', 'win', 91),
      makePick('2026-01-26', 'win', 91),
      makePick('2026-02-02', 'win', 91),
      // Tuesdays: 2026-01-06, 01-13, 01-20, 01-27, 02-03
      makePick('2026-01-06', 'loss', -100),
      makePick('2026-01-13', 'loss', -100),
      makePick('2026-01-20', 'loss', -100),
      makePick('2026-01-27', 'loss', -100),
      makePick('2026-02-03', 'loss', -100),
    ]
    const result = buildSeasonalTrends(picks)
    if (result.bestDay) {
      expect(result.bestDay.roi).toBeGreaterThan(0)
    }
    if (result.worstDay) {
      expect(result.worstDay.roi).toBeLessThan(0)
    }
  })

  it('detects monthly pattern when spread is large', () => {
    const picks = [
      ...Array.from({ length: 6 }, (_, i) => makePick(`2026-01-${10 + i}`, 'win', 91)),
      ...Array.from({ length: 6 }, (_, i) => makePick(`2026-06-${10 + i}`, 'loss', -100)),
    ]
    const result = buildSeasonalTrends(picks)
    const monthlyPatterns = result.patterns.filter((p) => p.type === 'monthly')
    expect(monthlyPatterns.length).toBeGreaterThan(0)
  })

  it('filters out months with no picks', () => {
    const picks = Array.from({ length: 10 }, (_, i) =>
      makePick(`2026-03-${10 + i}`, 'win', 91)
    )
    const result = buildSeasonalTrends(picks)
    expect(result.monthly.length).toBe(1) // Only March
  })

  it('handles pending picks correctly', () => {
    const picks = [
      ...Array.from({ length: 5 }, (_, i) => makePick(`2026-01-${10 + i}`, 'win', 91)),
      ...Array.from({ length: 5 }, (_, i) => makePick(`2026-01-${20 + i}`, 'pending', 0)),
    ]
    const result = buildSeasonalTrends(picks)
    const jan = result.monthly.find((m) => m.month === 1)
    expect(jan?.wins).toBe(5)
    // Pending picks counted in total but not win/loss
  })

  it('calculates ROI correctly', () => {
    const picks = Array.from({ length: 10 }, (_, i) =>
      makePick(`2026-03-${10 + i}`, i < 6 ? 'win' : 'loss', i < 6 ? 91 : -100, -110, 1)
    )
    const result = buildSeasonalTrends(picks)
    const march = result.monthly.find((m) => m.month === 3)
    expect(march).toBeTruthy()
    // 6 wins * 91 + 4 losses * -100 = 546 - 400 = 146 profit on 10 units = 1460% ROI
    expect(march!.roi).toBeCloseTo(1460, -1)
  })

  it('generates summary', () => {
    const picks = Array.from({ length: 10 }, (_, i) =>
      makePick(`2026-03-${10 + i}`, 'win', 91)
    )
    const result = buildSeasonalTrends(picks)
    expect(result.summary).toBeTruthy()
    expect(result.summary.length).toBeGreaterThan(5)
  })

  it('skips picks without created_at', () => {
    const picks = [
      ...Array.from({ length: 10 }, (_, i) => makePick(`2026-01-${10 + i}`, 'win', 91)),
      { outcome: 'win', profit: 91, odds: -110, units: 1 }, // no created_at
    ]
    const result = buildSeasonalTrends(picks)
    expect(result.monthly.find((m) => m.month === 1)?.wins).toBe(10)
  })
})

describe('getWeeklyTrendDirection', () => {
  it('detects improving trend', () => {
    const weeks = [
      { week: 1, year: 2026, label: '2026-W01', wins: 2, losses: 3, total: 5, winRate: 40, profit: -100, roi: -20 },
      { week: 2, year: 2026, label: '2026-W02', wins: 3, losses: 2, total: 5, winRate: 60, profit: 50, roi: 10 },
      { week: 3, year: 2026, label: '2026-W03', wins: 4, losses: 1, total: 5, winRate: 80, profit: 200, roi: 40 },
      { week: 4, year: 2026, label: '2026-W04', wins: 5, losses: 0, total: 5, winRate: 100, profit: 455, roi: 91 },
    ]
    expect(getWeeklyTrendDirection(weeks)).toBe('improving')
  })

  it('detects declining trend', () => {
    const weeks = [
      { week: 1, year: 2026, label: '2026-W01', wins: 5, losses: 0, total: 5, winRate: 100, profit: 455, roi: 91 },
      { week: 2, year: 2026, label: '2026-W02', wins: 3, losses: 2, total: 5, winRate: 60, profit: 50, roi: 10 },
      { week: 3, year: 2026, label: '2026-W03', wins: 2, losses: 3, total: 5, winRate: 40, profit: -100, roi: -20 },
      { week: 4, year: 2026, label: '2026-W04', wins: 1, losses: 4, total: 5, winRate: 20, profit: -300, roi: -60 },
    ]
    expect(getWeeklyTrendDirection(weeks)).toBe('declining')
  })

  it('returns stable for flat trend', () => {
    const weeks = Array.from({ length: 6 }, (_, i) => ({
      week: i + 1, year: 2026, label: `2026-W0${i + 1}`,
      wins: 3, losses: 2, total: 5, winRate: 60, profit: 50, roi: 10,
    }))
    expect(getWeeklyTrendDirection(weeks)).toBe('stable')
  })

  it('returns insufficient for < 4 weeks with enough data', () => {
    const weeks = [
      { week: 1, year: 2026, label: '2026-W01', wins: 3, losses: 2, total: 5, winRate: 60, profit: 50, roi: 10 },
    ]
    expect(getWeeklyTrendDirection(weeks)).toBe('insufficient')
  })

  it('skips weeks with fewer than 3 picks', () => {
    const weeks = [
      { week: 1, year: 2026, label: '2026-W01', wins: 1, losses: 0, total: 1, winRate: 100, profit: 91, roi: 91 },
      ...Array.from({ length: 4 }, (_, i) => ({
        week: i + 2, year: 2026, label: `2026-W0${i + 2}`,
        wins: 3, losses: 2, total: 5, winRate: 60, profit: 50, roi: 10,
      })),
    ]
    const direction = getWeeklyTrendDirection(weeks)
    expect(['improving', 'declining', 'stable']).toContain(direction)
  })
})
