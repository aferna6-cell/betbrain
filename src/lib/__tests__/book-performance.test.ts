/**
 * Book Performance tests.
 */

import { describe, it, expect } from 'vitest'
import { analyzeBookPerformance, type PickWithBook } from '@/lib/book-performance'

function makePick(overrides: Partial<PickWithBook> = {}): PickWithBook {
  return {
    id: 'p1',
    odds: -110,
    closing_odds: -105,
    bookmaker: 'draftkings',
    outcome: 'win',
    profit: 0.91,
    units: 1,
    sport: 'nba',
    ...overrides,
  }
}

describe('analyzeBookPerformance', () => {
  it('returns empty for no picks', () => {
    const result = analyzeBookPerformance([])
    expect(result.performances).toHaveLength(0)
    expect(result.bestCLVBook).toBeNull()
  })

  it('skips picks without bookmaker', () => {
    const result = analyzeBookPerformance([
      makePick({ bookmaker: null }),
      makePick({ bookmaker: '' }),
    ])
    expect(result.performances).toHaveLength(0)
  })

  it('groups picks by bookmaker', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', bookmaker: 'draftkings' }),
      makePick({ id: 'p2', bookmaker: 'fanduel' }),
      makePick({ id: 'p3', bookmaker: 'draftkings' }),
    ])
    expect(result.performances).toHaveLength(2)
    const dk = result.performances.find((p) => p.bookmaker === 'draftkings')
    expect(dk?.totalPicks).toBe(2)
  })

  it('calculates CLV correctly', () => {
    // Bet at -110 (52.4% implied), closing at -120 (54.5% implied)
    // CLV = 54.5 - 52.4 = +2.1% (got a better price)
    const result = analyzeBookPerformance([
      makePick({ odds: -110, closing_odds: -120 }),
    ])
    expect(result.performances[0].avgCLV).toBeGreaterThan(0)
  })

  it('handles negative CLV', () => {
    // Bet at -120 (54.5% implied), closing at -110 (52.4% implied)
    // CLV = 52.4 - 54.5 = -2.1% (got a worse price)
    const result = analyzeBookPerformance([
      makePick({ odds: -120, closing_odds: -110 }),
    ])
    expect(result.performances[0].avgCLV).toBeLessThan(0)
  })

  it('calculates positive CLV rate', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', odds: -110, closing_odds: -120 }), // +CLV
      makePick({ id: 'p2', odds: -120, closing_odds: -110 }), // -CLV
      makePick({ id: 'p3', odds: -110, closing_odds: -130 }), // +CLV
    ])
    expect(result.performances[0].positiveCLVRate).toBeGreaterThan(0)
  })

  it('calculates win rate', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', outcome: 'win' }),
      makePick({ id: 'p2', outcome: 'loss' }),
      makePick({ id: 'p3', outcome: 'win' }),
    ])
    expect(result.performances[0].winRate).toBe(67)
  })

  it('calculates ROI', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', outcome: 'win', profit: 1, units: 1 }),
      makePick({ id: 'p2', outcome: 'loss', profit: -1, units: 1 }),
    ])
    // Profit: 0, Units: 2, ROI: 0%
    expect(result.performances[0].roi).toBe(0)
  })

  it('identifies best CLV book with enough data', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', bookmaker: 'fanduel', odds: -110, closing_odds: -130 }),
      makePick({ id: 'p2', bookmaker: 'fanduel', odds: -110, closing_odds: -125 }),
      makePick({ id: 'p3', bookmaker: 'fanduel', odds: -110, closing_odds: -120 }),
      makePick({ id: 'p4', bookmaker: 'draftkings', odds: -120, closing_odds: -110 }),
      makePick({ id: 'p5', bookmaker: 'draftkings', odds: -120, closing_odds: -115 }),
      makePick({ id: 'p6', bookmaker: 'draftkings', odds: -120, closing_odds: -110 }),
    ])
    expect(result.bestCLVBook).toBe('fanduel')
  })

  it('returns null best CLV book with insufficient data', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', bookmaker: 'fanduel', closing_odds: null }),
    ])
    expect(result.bestCLVBook).toBeNull()
  })

  it('sorts performances by CLV descending', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', bookmaker: 'bad-book', odds: -120, closing_odds: -110 }),
      makePick({ id: 'p2', bookmaker: 'bad-book', odds: -120, closing_odds: -110 }),
      makePick({ id: 'p3', bookmaker: 'bad-book', odds: -120, closing_odds: -110 }),
      makePick({ id: 'p4', bookmaker: 'good-book', odds: -110, closing_odds: -130 }),
      makePick({ id: 'p5', bookmaker: 'good-book', odds: -110, closing_odds: -130 }),
      makePick({ id: 'p6', bookmaker: 'good-book', odds: -110, closing_odds: -130 }),
    ])
    expect(result.performances[0].bookmaker).toBe('good-book')
  })

  it('normalizes bookmaker names to lowercase', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', bookmaker: 'DraftKings' }),
      makePick({ id: 'p2', bookmaker: 'draftkings' }),
    ])
    expect(result.performances).toHaveLength(1)
    expect(result.performances[0].totalPicks).toBe(2)
  })

  it('handles pending picks gracefully', () => {
    const result = analyzeBookPerformance([
      makePick({ id: 'p1', outcome: 'pending', profit: null }),
    ])
    expect(result.performances[0].winRate).toBe(0)
    expect(result.performances[0].roi).toBe(0)
  })
})
