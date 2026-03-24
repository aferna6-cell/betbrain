import { describe, it, expect } from 'vitest'
import {
  compareOddsSnapshots,
  getChangeColor,
  formatChange,
  type OddsSnapshot,
} from '../odds-comparator'

function makeSnapshot(overrides: Partial<OddsSnapshot> = {}): OddsSnapshot {
  return {
    bookmaker: 'DraftKings',
    home_odds: -110,
    away_odds: -110,
    spread_home: -110,
    spread_away: -110,
    spread_line: -3.5,
    total_over: -110,
    total_under: -110,
    total_line: 220.5,
    fetched_at: '2026-03-20T10:00:00Z',
    ...overrides,
  }
}

describe('compareOddsSnapshots', () => {
  it('returns empty result for no snapshots', () => {
    const result = compareOddsSnapshots([], [])
    expect(result.diffs.length).toBe(0)
    expect(result.totalBooks).toBe(0)
  })

  it('calculates moneyline changes', () => {
    const before = [makeSnapshot({ home_odds: -110, away_odds: -110 })]
    const after = [makeSnapshot({ home_odds: -130, away_odds: +110 })]
    const result = compareOddsSnapshots(before, after)

    expect(result.diffs[0].moneyline.home.change).toBe(-20)
    expect(result.diffs[0].moneyline.away.change).toBe(220)
  })

  it('calculates spread changes', () => {
    const before = [makeSnapshot({ spread_line: -3.5 })]
    const after = [makeSnapshot({ spread_line: -4.5 })]
    const result = compareOddsSnapshots(before, after)
    expect(result.diffs[0].spread.line.change).toBe(-1)
  })

  it('calculates total changes', () => {
    const before = [makeSnapshot({ total_line: 220.5 })]
    const after = [makeSnapshot({ total_line: 222.0 })]
    const result = compareOddsSnapshots(before, after)
    expect(result.diffs[0].total.line.change).toBe(1.5)
  })

  it('handles null values', () => {
    const before = [makeSnapshot({ home_odds: null })]
    const after = [makeSnapshot({ home_odds: -110 })]
    const result = compareOddsSnapshots(before, after)
    expect(result.diffs[0].moneyline.home.change).toBeNull()
  })

  it('detects significant changes', () => {
    const before = [makeSnapshot({ home_odds: -110 })]
    const after = [makeSnapshot({ home_odds: -120 })]
    const result = compareOddsSnapshots(before, after)
    expect(result.diffs[0].hasSignificantChange).toBe(true)
  })

  it('does not flag small changes as significant', () => {
    const before = [makeSnapshot({ home_odds: -110 })]
    const after = [makeSnapshot({ home_odds: -112 })]
    const result = compareOddsSnapshots(before, after)
    expect(result.diffs[0].hasSignificantChange).toBe(false)
  })

  it('handles multiple bookmakers', () => {
    const before = [
      makeSnapshot({ bookmaker: 'DraftKings', home_odds: -110 }),
      makeSnapshot({ bookmaker: 'FanDuel', home_odds: -115 }),
    ]
    const after = [
      makeSnapshot({ bookmaker: 'DraftKings', home_odds: -120 }),
      makeSnapshot({ bookmaker: 'FanDuel', home_odds: -108 }),
    ]
    const result = compareOddsSnapshots(before, after)
    expect(result.totalBooks).toBe(2)
  })

  it('counts books with movement', () => {
    const before = [
      makeSnapshot({ bookmaker: 'DK', home_odds: -110 }),
      makeSnapshot({ bookmaker: 'FD', home_odds: -110 }),
    ]
    const after = [
      makeSnapshot({ bookmaker: 'DK', home_odds: -130 }), // significant
      makeSnapshot({ bookmaker: 'FD', home_odds: -111 }), // not significant
    ]
    const result = compareOddsSnapshots(before, after)
    expect(result.booksWithMovement).toBe(1)
  })

  it('finds the biggest move', () => {
    const before = [
      makeSnapshot({ bookmaker: 'DK', home_odds: -110 }),
      makeSnapshot({ bookmaker: 'FD', home_odds: -110 }),
    ]
    const after = [
      makeSnapshot({ bookmaker: 'DK', home_odds: -115 }),
      makeSnapshot({ bookmaker: 'FD', home_odds: -150 }),
    ]
    const result = compareOddsSnapshots(before, after)
    expect(result.biggestMove?.bookmaker).toBe('FD')
    expect(result.biggestMove?.change).toBe(-40)
  })

  it('handles bookmaker only in after snapshot', () => {
    const before: OddsSnapshot[] = []
    const after = [makeSnapshot({ bookmaker: 'NewBook' })]
    const result = compareOddsSnapshots(before, after)
    expect(result.diffs.length).toBe(1)
    expect(result.diffs[0].bookmaker).toBe('NewBook')
  })

  it('sorts diffs by biggest change first', () => {
    const before = [
      makeSnapshot({ bookmaker: 'SmallMove', home_odds: -110 }),
      makeSnapshot({ bookmaker: 'BigMove', home_odds: -110 }),
    ]
    const after = [
      makeSnapshot({ bookmaker: 'SmallMove', home_odds: -112 }),
      makeSnapshot({ bookmaker: 'BigMove', home_odds: -150 }),
    ]
    const result = compareOddsSnapshots(before, after)
    expect(result.diffs[0].bookmaker).toBe('BigMove')
  })
})

describe('getChangeColor', () => {
  it('returns zinc for null', () => {
    expect(getChangeColor(null)).toContain('zinc')
  })

  it('returns zinc for small changes', () => {
    expect(getChangeColor(2)).toContain('zinc')
  })

  it('returns green for positive significant change', () => {
    expect(getChangeColor(10)).toContain('green')
  })

  it('returns red for negative significant change', () => {
    expect(getChangeColor(-10)).toContain('red')
  })
})

describe('formatChange', () => {
  it('returns dash for null', () => {
    expect(formatChange(null)).toBe('-')
  })

  it('returns equals for zero', () => {
    expect(formatChange(0)).toBe('=')
  })

  it('adds plus for positive', () => {
    expect(formatChange(5)).toBe('+5')
  })

  it('keeps minus for negative', () => {
    expect(formatChange(-5)).toBe('-5')
  })
})
