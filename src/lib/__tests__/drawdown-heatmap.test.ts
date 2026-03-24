import { describe, it, expect } from 'vitest'
import { buildDrawdownHeatmap, getHeatLevel } from '../drawdown-heatmap'

function makePick(date: string, profit: number, outcome = 'win') {
  return { created_at: date, profit, outcome }
}

describe('getHeatLevel', () => {
  it('none for 0%', () => expect(getHeatLevel(0)).toBe('none'))
  it('mild for 3%', () => expect(getHeatLevel(3)).toBe('mild'))
  it('moderate for 7%', () => expect(getHeatLevel(7)).toBe('moderate'))
  it('significant for 15%', () => expect(getHeatLevel(15)).toBe('significant'))
  it('severe for 30%', () => expect(getHeatLevel(30)).toBe('severe'))
  it('critical for 50%', () => expect(getHeatLevel(50)).toBe('critical'))
})

describe('buildDrawdownHeatmap', () => {
  it('returns insufficient for < 5 picks', () => {
    const picks = [makePick('2026-01-10', 100)]
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.months).toEqual([])
    expect(result.summary).toContain('Need at least 5')
  })

  it('returns insufficient for zero bankroll', () => {
    const picks = Array.from({ length: 5 }, (_, i) =>
      makePick(`2026-01-${10 + i}`, 100)
    )
    const result = buildDrawdownHeatmap(picks, 0)
    expect(result.summary).toContain('positive')
  })

  it('builds months with drawdown data', () => {
    const picks = [
      makePick('2026-01-10', 100),
      makePick('2026-01-11', -200, 'loss'),
      makePick('2026-01-12', 50),
      makePick('2026-01-13', 100),
      makePick('2026-01-14', -50, 'loss'),
    ]
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.months.length).toBeGreaterThan(0)
    expect(result.months[0].label).toContain('January')
  })

  it('calculates drawdown after a loss', () => {
    const picks = [
      makePick('2026-01-10', 100),
      makePick('2026-01-11', -300, 'loss'),
      makePick('2026-01-12', 50),
      makePick('2026-01-13', 50),
      makePick('2026-01-14', 50),
    ]
    // Start: 1000, day 1: 1100 (peak), day 2: 800 (DD = (1100-800)/1100 = 27.3%)
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.maxDrawdown).toBeCloseTo(27.3, 0)
  })

  it('no drawdown when only winning', () => {
    const picks = Array.from({ length: 5 }, (_, i) =>
      makePick(`2026-01-${10 + i}`, 100)
    )
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.maxDrawdown).toBe(0)
    expect(result.summary).toContain('only grown')
  })

  it('tracks current drawdown', () => {
    const picks = [
      makePick('2026-01-10', 500),
      makePick('2026-01-11', -200, 'loss'),
      makePick('2026-01-12', -100, 'loss'),
      makePick('2026-01-13', 50),
      makePick('2026-01-14', -100, 'loss'),
    ]
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.currentDrawdown).toBeGreaterThan(0)
  })

  it('calculates longest drawdown streak', () => {
    const picks = [
      makePick('2026-01-10', 200),          // peak
      makePick('2026-01-11', -50, 'loss'),   // in DD
      makePick('2026-01-12', -50, 'loss'),   // in DD
      makePick('2026-01-13', -50, 'loss'),   // in DD
      makePick('2026-01-14', 200),            // out of DD
    ]
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.longestDrawdownStreak).toBe(3)
  })

  it('records max drawdown date', () => {
    const picks = [
      makePick('2026-01-10', 100),
      makePick('2026-01-11', -500, 'loss'),
      makePick('2026-01-12', 100),
      makePick('2026-01-13', 100),
      makePick('2026-01-14', 100),
    ]
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.maxDrawdownDate).toBe('2026-01-11')
  })

  it('handles multiple months', () => {
    const picks = [
      makePick('2026-01-15', 100),
      makePick('2026-01-20', -50, 'loss'),
      makePick('2026-02-05', 100),
      makePick('2026-02-10', -50, 'loss'),
      makePick('2026-03-01', 100),
    ]
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.months.length).toBe(3)
  })

  it('skips pending picks', () => {
    const picks = [
      ...Array.from({ length: 5 }, (_, i) => makePick(`2026-01-${10 + i}`, 100)),
      { created_at: '2026-01-20', profit: -500, outcome: 'pending' },
    ]
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.maxDrawdown).toBe(0) // only wins
  })

  it('aggregates multiple picks on same day', () => {
    const picks = [
      makePick('2026-01-10', 100),
      makePick('2026-01-10', -50, 'loss'),
      makePick('2026-01-11', 100),
      makePick('2026-01-12', 50),
      makePick('2026-01-13', 50),
    ]
    // Day 1 net: +50
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.months[0].days[10]).toBeTruthy()
    expect(result.months[0].days[10]!.dailyPL).toBe(50)
  })

  it('generates appropriate summary for deep drawdown', () => {
    const picks = [
      makePick('2026-01-10', 100),
      makePick('2026-01-11', -800, 'loss'),
      makePick('2026-01-12', 50),
      makePick('2026-01-13', 50),
      makePick('2026-01-14', 50),
    ]
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.summary).toContain('Deep')
  })

  it('days array is 1-indexed with null at 0', () => {
    const picks = Array.from({ length: 5 }, (_, i) =>
      makePick(`2026-01-${10 + i}`, 100)
    )
    const result = buildDrawdownHeatmap(picks, 1000)
    expect(result.months[0].days[0]).toBeNull()
    expect(result.months[0].days.length).toBeGreaterThan(28) // January has 31 days
  })
})
