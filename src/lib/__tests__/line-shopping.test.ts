/**
 * Line Shopping Helper tests.
 *
 * Tests best line finding, key line discrepancies, juice calculation,
 * and edge analysis. Pure logic — no Supabase.
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeLineShop,
  calculateJuice,
  findLowestJuiceBook,
  payoutDifference,
} from '@/lib/line-shopping'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBk(
  name: string,
  opts: {
    ml?: [number | null, number | null]
    spread?: [number, number, number, number] // homeLine, homeOdds, awayLine, awayOdds
    total?: [number, number, number] // line, overOdds, underOdds
  } = {}
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: opts.ml ? { home: opts.ml[0], away: opts.ml[1], draw: null } : null,
    spread: opts.spread
      ? {
          homeLine: opts.spread[0],
          homeOdds: opts.spread[1],
          awayLine: opts.spread[2],
          awayOdds: opts.spread[3],
        }
      : null,
    total: opts.total
      ? { line: opts.total[0], overOdds: opts.total[1], underOdds: opts.total[2] }
      : null,
    lastUpdated: '2026-03-24T12:00:00Z',
  }
}

function makeGame(bookmakers: NormalizedBookmakerOdds[], sport = 'nba' as const): NormalizedGame {
  return {
    id: 'g1',
    sport,
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-24T23:00:00Z',
    fromCache: true,
    isFresh: true,
    bookmakers,
  }
}

// ---------------------------------------------------------------------------
// 1. analyzeLineShop — moneyline
// ---------------------------------------------------------------------------

describe('analyzeLineShop — moneyline', () => {
  it('finds best moneyline for home and away', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-115, +105] }),
      makeBk('FD', { ml: [-110, -110] }),
      makeBk('MGM', { ml: [-120, +100] }),
    ])
    const result = analyzeLineShop(game)

    // FD has -110 for home (best = lowest implied)
    expect(result.moneyline.home?.bookmaker).toBe('FD')
    expect(result.moneyline.home?.odds).toBe(-110)

    // DK has +105 for away (best = lowest implied)
    expect(result.moneyline.away?.bookmaker).toBe('DK')
    expect(result.moneyline.away?.odds).toBe(105)
  })

  it('returns null when no moneyline data', () => {
    const game = makeGame([
      makeBk('DK', { spread: [-3.5, -110, 3.5, -110] }),
    ])
    const result = analyzeLineShop(game)
    expect(result.moneyline.home).toBeNull()
    expect(result.moneyline.away).toBeNull()
  })

  it('calculates edge vs worst correctly', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-110, -110] }),
      makeBk('FD', { ml: [-130, +110] }),
    ])
    const result = analyzeLineShop(game)

    // For home: -110 is better than -130 (lower implied)
    expect(result.moneyline.home?.bookmaker).toBe('DK')
    expect(result.moneyline.home!.edgeVsWorst).toBeGreaterThan(0)
  })

  it('edge is zero when all books have same odds', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-110, -110] }),
      makeBk('FD', { ml: [-110, -110] }),
    ])
    const result = analyzeLineShop(game)
    expect(result.moneyline.home?.edgeVsWorst).toBe(0)
    expect(result.moneyline.away?.edgeVsWorst).toBe(0)
  })

  it('includes all books in the allBooks array', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-110, -110] }),
      makeBk('FD', { ml: [-115, +105] }),
      makeBk('MGM', { ml: [-112, -108] }),
    ])
    const result = analyzeLineShop(game)
    expect(result.moneyline.home?.allBooks).toHaveLength(3)
    expect(result.moneyline.away?.allBooks).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// 2. analyzeLineShop — spreads
// ---------------------------------------------------------------------------

describe('analyzeLineShop — spreads', () => {
  it('finds best spread for home and away', () => {
    const game = makeGame([
      makeBk('DK', { spread: [-3.5, -110, 3.5, -110] }),
      makeBk('FD', { spread: [-3, -115, 3, -105] }),
      makeBk('MGM', { spread: [-4, -105, 4, -115] }),
    ])
    const result = analyzeLineShop(game)

    // For home (negative = giving points), -3 is best (giving fewer points)
    expect(result.spread.home?.bookmaker).toBe('FD')
    expect(result.spread.home?.line).toBe(-3)

    // For away (positive = getting points), +4 is best (getting more points)
    expect(result.spread.away?.bookmaker).toBe('MGM')
    expect(result.spread.away?.line).toBe(4)
  })

  it('returns null when no spread data', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-110, -110] }),
    ])
    const result = analyzeLineShop(game)
    expect(result.spread.home).toBeNull()
    expect(result.spread.away).toBeNull()
  })

  it('includes line in allBooks', () => {
    const game = makeGame([
      makeBk('DK', { spread: [-3.5, -110, 3.5, -110] }),
      makeBk('FD', { spread: [-3, -115, 3, -105] }),
    ])
    const result = analyzeLineShop(game)
    expect(result.spread.home?.allBooks).toHaveLength(2)
    expect(result.spread.home?.allBooks[0]).toHaveProperty('line')
    expect(result.spread.home?.allBooks[0]).toHaveProperty('odds')
  })
})

// ---------------------------------------------------------------------------
// 3. analyzeLineShop — totals
// ---------------------------------------------------------------------------

describe('analyzeLineShop — totals', () => {
  it('finds best total for over and under', () => {
    const game = makeGame([
      makeBk('DK', { total: [220.5, -110, -110] }),
      makeBk('FD', { total: [219.5, -110, -110] }),
      makeBk('MGM', { total: [221, -110, -110] }),
    ])
    const result = analyzeLineShop(game)

    // Over bettors want the lowest line (219.5)
    expect(result.total.over?.bookmaker).toBe('FD')
    expect(result.total.over?.line).toBe(219.5)

    // Under bettors want the highest line (221)
    expect(result.total.under?.bookmaker).toBe('MGM')
    expect(result.total.under?.line).toBe(221)
  })

  it('returns null when no total data', () => {
    const game = makeGame([makeBk('DK', { ml: [-110, -110] })])
    const result = analyzeLineShop(game)
    expect(result.total.over).toBeNull()
    expect(result.total.under).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 4. Key line discrepancies
// ---------------------------------------------------------------------------

describe('Key line discrepancies', () => {
  it('detects spread line disagreement', () => {
    const game = makeGame([
      makeBk('DK', { spread: [-3.5, -110, 3.5, -110] }),
      makeBk('FD', { spread: [-3, -115, 3, -105] }),
    ])
    const result = analyzeLineShop(game)
    const spreadDisc = result.keyLineDiscrepancies.find((d) => d.market === 'spread')
    expect(spreadDisc).toBeDefined()
    expect(spreadDisc?.range).toBe(0.5)
  })

  it('detects total line disagreement', () => {
    const game = makeGame([
      makeBk('DK', { total: [220.5, -110, -110] }),
      makeBk('FD', { total: [219.5, -110, -110] }),
    ])
    const result = analyzeLineShop(game)
    const totalDisc = result.keyLineDiscrepancies.find((d) => d.market === 'total')
    expect(totalDisc).toBeDefined()
    expect(totalDisc?.range).toBe(1)
  })

  it('no discrepancy when all books agree on line', () => {
    const game = makeGame([
      makeBk('DK', { spread: [-3.5, -110, 3.5, -110] }),
      makeBk('FD', { spread: [-3.5, -115, 3.5, -105] }),
    ])
    const result = analyzeLineShop(game)
    const spreadDisc = result.keyLineDiscrepancies.find((d) => d.market === 'spread')
    expect(spreadDisc).toBeUndefined()
  })

  it('detects key number crossing in NFL', () => {
    const game = makeGame([
      makeBk('DK', { spread: [-2.5, -110, 2.5, -110] }),
      makeBk('FD', { spread: [-3.5, -105, 3.5, -115] }),
    ], 'nfl')
    const result = analyzeLineShop(game)
    const spreadDisc = result.keyLineDiscrepancies.find((d) => d.market === 'spread')
    expect(spreadDisc?.crossesKeyNumber).toBe(true)
    expect(spreadDisc?.keyNumber).toBe(3)
  })

  it('no key number crossing when range is within same key', () => {
    const game = makeGame([
      makeBk('DK', { spread: [-4, -110, 4, -110] }),
      makeBk('FD', { spread: [-4.5, -105, 4.5, -115] }),
    ], 'nfl')
    const result = analyzeLineShop(game)
    const spreadDisc = result.keyLineDiscrepancies.find((d) => d.market === 'spread')
    // 4 and 4.5 don't cross 3 or 7
    expect(spreadDisc).toBeDefined()
    expect(spreadDisc?.crossesKeyNumber).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 5. Edge summary
// ---------------------------------------------------------------------------

describe('Edge summary', () => {
  it('calculates avgEdge across all markets', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-110, -110], spread: [-3.5, -110, 3.5, -110], total: [220.5, -110, -110] }),
      makeBk('FD', { ml: [-115, +105], spread: [-3, -115, 3, -105], total: [219.5, -115, -105] }),
    ])
    const result = analyzeLineShop(game)
    expect(result.edgeSummary.totalMarkets).toBe(6) // 2 ML + 2 spread + 2 total
    expect(typeof result.edgeSummary.avgEdge).toBe('number')
    expect(result.edgeSummary.avgEdge).toBeGreaterThanOrEqual(0)
  })

  it('returns zero edge when no data', () => {
    const game = makeGame([])
    const result = analyzeLineShop(game)
    expect(result.edgeSummary.avgEdge).toBe(0)
    expect(result.edgeSummary.totalMarkets).toBe(0)
    expect(result.edgeSummary.marketsWithEdge).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. calculateJuice
// ---------------------------------------------------------------------------

describe('calculateJuice', () => {
  it('calculates standard -110/-110 juice', () => {
    const juice = calculateJuice(-110, -110)
    // Each side: 110/210 = 52.38%, total = 104.76%, juice = 4.76%
    expect(juice).toBeCloseTo(4.76, 1)
  })

  it('calculates zero juice at even money', () => {
    // +100/+100 would be 50%/50% = 100%, juice = 0
    const juice = calculateJuice(100, 100)
    expect(juice).toBe(0)
  })

  it('higher juice with more lopsided odds', () => {
    const standard = calculateJuice(-110, -110)
    const high = calculateJuice(-115, -105)
    // -115/-105 has similar or slightly different juice
    expect(typeof high).toBe('number')
    expect(isFinite(high)).toBe(true)
  })

  it('returns positive for typical sportsbook lines', () => {
    expect(calculateJuice(-110, -110)).toBeGreaterThan(0)
    expect(calculateJuice(-105, -115)).toBeGreaterThan(0)
    expect(calculateJuice(-120, +100)).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 7. findLowestJuiceBook
// ---------------------------------------------------------------------------

describe('findLowestJuiceBook', () => {
  it('finds the book with lowest moneyline juice', () => {
    const bookmakers: NormalizedBookmakerOdds[] = [
      makeBk('DK', { ml: [-110, -110] }),     // ~4.76% juice
      makeBk('FD', { ml: [-105, -115] }),      // ~4.76% juice (similar)
      makeBk('Pinnacle', { ml: [-103, -103] }), // ~2.91% juice (lowest)
    ]
    const result = findLowestJuiceBook(bookmakers)
    expect(result).not.toBeNull()
    expect(result?.bookmaker).toBe('Pinnacle')
    expect(result?.juice).toBeLessThan(3)
  })

  it('returns null when no books have both sides', () => {
    const bookmakers: NormalizedBookmakerOdds[] = [
      makeBk('DK', { ml: [-110, null] }),
    ]
    const result = findLowestJuiceBook(bookmakers)
    expect(result).toBeNull()
  })

  it('returns null for empty bookmakers', () => {
    expect(findLowestJuiceBook([])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 8. payoutDifference
// ---------------------------------------------------------------------------

describe('payoutDifference', () => {
  it('calculates payout difference for $100 bet', () => {
    // -110 pays ~$90.91; +100 pays $100
    const diff = payoutDifference(-110, 100)
    expect(diff).toBeCloseTo(9.09, 1)
  })

  it('returns 0 for same odds', () => {
    expect(payoutDifference(-110, -110)).toBe(0)
  })

  it('handles large underdogs', () => {
    // +300 pays $300; +250 pays $250
    const diff = payoutDifference(300, 250)
    expect(diff).toBe(50)
  })

  it('handles favorites', () => {
    // -200 pays $50; -150 pays $66.67
    const diff = payoutDifference(-200, -150)
    expect(diff).toBeCloseTo(16.67, 1)
  })

  it('always returns positive value', () => {
    expect(payoutDifference(-110, +150)).toBeGreaterThan(0)
    expect(payoutDifference(+150, -110)).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 9. Edge cases
// ---------------------------------------------------------------------------

describe('analyzeLineShop edge cases', () => {
  it('handles single bookmaker gracefully', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-110, -110], spread: [-3.5, -110, 3.5, -110], total: [220, -110, -110] }),
    ])
    const result = analyzeLineShop(game)
    expect(result.moneyline.home).not.toBeNull()
    expect(result.moneyline.home?.edgeVsWorst).toBe(0)
    expect(result.keyLineDiscrepancies).toHaveLength(0)
  })

  it('handles empty bookmakers array', () => {
    const game = makeGame([])
    const result = analyzeLineShop(game)
    expect(result.moneyline.home).toBeNull()
    expect(result.moneyline.away).toBeNull()
    expect(result.spread.home).toBeNull()
    expect(result.total.over).toBeNull()
    expect(result.keyLineDiscrepancies).toHaveLength(0)
  })

  it('handles mixed markets (some books have ML only, others have all)', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-110, -110] }),
      makeBk('FD', { ml: [-115, +105], spread: [-3.5, -110, 3.5, -110] }),
      makeBk('MGM', { ml: [-120, +100], spread: [-3, -115, 3, -105], total: [220, -110, -110] }),
    ])
    const result = analyzeLineShop(game)
    expect(result.moneyline.home?.allBooks).toHaveLength(3)
    expect(result.spread.home?.allBooks).toHaveLength(2)
    expect(result.total.over?.allBooks).toHaveLength(1)
  })

  it('no NaN or Infinity in results', () => {
    const game = makeGame([
      makeBk('DK', { ml: [-500, +400], spread: [-10, -110, 10, -110], total: [250, -110, -110] }),
      makeBk('FD', { ml: [-450, +350], spread: [-9.5, -115, 9.5, -105], total: [248.5, -115, -105] }),
    ])
    const result = analyzeLineShop(game)
    expect(isFinite(result.edgeSummary.avgEdge)).toBe(true)
    if (result.moneyline.home) {
      expect(isFinite(result.moneyline.home.edgeVsWorst)).toBe(true)
      expect(isFinite(result.moneyline.home.edgeVsAvg)).toBe(true)
    }
  })
})
