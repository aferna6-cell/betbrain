/**
 * Multi-market arbitrage + multi-market EV scanner tests.
 *
 * Tests spread arb, total arb, spread EV, total EV, stake calculation,
 * and the combined scanner. Pure logic — no Supabase.
 */

import { describe, it, expect } from 'vitest'
import {
  detectMultiMarketArbitrage,
  scanAllMarketsForEV,
  calculateArbStakes,
} from '@/lib/ev-scanner'
import type { MultiMarketArb } from '@/lib/ev-scanner'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeBookmaker(
  name: string,
  opts: {
    ml?: { home: number | null; away: number | null }
    spread?: { homeLine: number; homeOdds: number; awayLine: number; awayOdds: number }
    total?: { line: number; overOdds: number; underOdds: number }
  } = {}
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: opts.ml ? { home: opts.ml.home, away: opts.ml.away, draw: null } : null,
    spread: opts.spread
      ? {
          homeLine: opts.spread.homeLine,
          homeOdds: opts.spread.homeOdds,
          awayLine: opts.spread.awayLine,
          awayOdds: opts.spread.awayOdds,
        }
      : null,
    total: opts.total
      ? {
          line: opts.total.line,
          overOdds: opts.total.overOdds,
          underOdds: opts.total.underOdds,
        }
      : null,
    lastUpdated: '2026-03-24T08:00:00Z',
  }
}

function makeGame(
  bookmakers: NormalizedBookmakerOdds[],
  overrides: Partial<NormalizedGame> = {}
): NormalizedGame {
  return {
    id: 'game-001',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-24T23:00:00Z',
    fromCache: true,
    isFresh: true,
    bookmakers,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. calculateArbStakes
// ---------------------------------------------------------------------------

describe('calculateArbStakes', () => {
  it('splits stakes proportionally to implied probabilities', () => {
    // Two sides each at 47.6% implied (+110), total = 95.2%
    const result = calculateArbStakes(0.476, 0.476, 100)
    expect(result.side1).toBeCloseTo(50, 0)
    expect(result.side2).toBeCloseTo(50, 0)
    expect(result.totalReturn).toBeGreaterThan(100)
  })

  it('allocates more to the heavier implied side', () => {
    const result = calculateArbStakes(0.6, 0.38, 100)
    expect(result.side1).toBeGreaterThan(result.side2)
  })

  it('total return exceeds investment when totalImplied < 1', () => {
    const result = calculateArbStakes(0.45, 0.45, 100)
    expect(result.totalReturn).toBeGreaterThan(100)
  })

  it('stakes sum to total investment', () => {
    const result = calculateArbStakes(0.48, 0.47, 200)
    expect(result.side1 + result.side2).toBeCloseTo(200, 0)
  })
})

// ---------------------------------------------------------------------------
// 2. Moneyline arbs via detectMultiMarketArbitrage
// ---------------------------------------------------------------------------

describe('detectMultiMarketArbitrage - moneyline', () => {
  it('detects moneyline arb', () => {
    const game = makeGame([
      makeBookmaker('DK', { ml: { home: 110, away: -130 } }),
      makeBookmaker('FD', { ml: { home: -130, away: 110 } }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const mlArbs = arbs.filter((a) => a.market === 'moneyline')
    expect(mlArbs.length).toBeGreaterThanOrEqual(1)
    expect(mlArbs[0].profit).toBeGreaterThan(0)
    expect(mlArbs[0].stakes).toBeDefined()
  })

  it('returns no moneyline arb for standard lines', () => {
    const game = makeGame([
      makeBookmaker('DK', { ml: { home: -110, away: -110 } }),
      makeBookmaker('FD', { ml: { home: -110, away: -110 } }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const mlArbs = arbs.filter((a) => a.market === 'moneyline')
    expect(mlArbs).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Spread arbs
// ---------------------------------------------------------------------------

describe('detectMultiMarketArbitrage - spread', () => {
  it('detects spread arb when books disagree on price', () => {
    // DK has home -3.5 at +110, FD has away +3.5 at +110
    // Each side implied = 47.6%, total = 95.2% < 100%
    const game = makeGame([
      makeBookmaker('DK', {
        spread: { homeLine: -3.5, homeOdds: 110, awayLine: 3.5, awayOdds: -130 },
      }),
      makeBookmaker('FD', {
        spread: { homeLine: -3.5, homeOdds: -130, awayLine: 3.5, awayOdds: 110 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const spreadArbs = arbs.filter((a) => a.market === 'spread')
    expect(spreadArbs.length).toBeGreaterThanOrEqual(1)
    expect(spreadArbs[0].profit).toBeGreaterThan(0)
  })

  it('no spread arb when same standard vig', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        spread: { homeLine: -3.5, homeOdds: -110, awayLine: 3.5, awayOdds: -110 },
      }),
      makeBookmaker('FD', {
        spread: { homeLine: -3.5, homeOdds: -110, awayLine: 3.5, awayOdds: -110 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const spreadArbs = arbs.filter((a) => a.market === 'spread')
    expect(spreadArbs).toHaveLength(0)
  })

  it('spread arb includes line info in labels', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        spread: { homeLine: -3.5, homeOdds: 110, awayLine: 3.5, awayOdds: -130 },
      }),
      makeBookmaker('FD', {
        spread: { homeLine: -3.5, homeOdds: -130, awayLine: 3.5, awayOdds: 110 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const spreadArbs = arbs.filter((a) => a.market === 'spread')
    if (spreadArbs.length > 0) {
      expect(spreadArbs[0].side1.label).toContain('3.5')
      expect(spreadArbs[0].side2.label).toContain('3.5')
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Total arbs
// ---------------------------------------------------------------------------

describe('detectMultiMarketArbitrage - total', () => {
  it('detects total arb when over/under prices diverge', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        total: { line: 220.5, overOdds: 110, underOdds: -130 },
      }),
      makeBookmaker('FD', {
        total: { line: 220.5, overOdds: -130, underOdds: 110 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const totalArbs = arbs.filter((a) => a.market === 'total')
    expect(totalArbs.length).toBeGreaterThanOrEqual(1)
    expect(totalArbs[0].side1.label).toContain('Over 220.5')
    expect(totalArbs[0].side2.label).toContain('Under 220.5')
  })

  it('no total arb with standard vig', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        total: { line: 220.5, overOdds: -110, underOdds: -110 },
      }),
      makeBookmaker('FD', {
        total: { line: 220.5, overOdds: -110, underOdds: -110 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const totalArbs = arbs.filter((a) => a.market === 'total')
    expect(totalArbs).toHaveLength(0)
  })

  it('only matches totals with same line number', () => {
    // DK has 220.5, FD has 221.5 — different lines, no arb should mix them
    const game = makeGame([
      makeBookmaker('DK', {
        total: { line: 220.5, overOdds: 110, underOdds: -130 },
      }),
      makeBookmaker('FD', {
        total: { line: 221.5, overOdds: -130, underOdds: 110 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const totalArbs = arbs.filter((a) => a.market === 'total')
    expect(totalArbs).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Combined multi-market results
// ---------------------------------------------------------------------------

describe('detectMultiMarketArbitrage - combined', () => {
  it('detects arbs across all three markets simultaneously', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        ml: { home: 110, away: -130 },
        spread: { homeLine: -3.5, homeOdds: 110, awayLine: 3.5, awayOdds: -130 },
        total: { line: 220.5, overOdds: 110, underOdds: -130 },
      }),
      makeBookmaker('FD', {
        ml: { home: -130, away: 110 },
        spread: { homeLine: -3.5, homeOdds: -130, awayLine: 3.5, awayOdds: 110 },
        total: { line: 220.5, overOdds: -130, underOdds: 110 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    const markets = new Set(arbs.map((a) => a.market))
    expect(markets.has('moneyline')).toBe(true)
    expect(markets.has('spread')).toBe(true)
    expect(markets.has('total')).toBe(true)
  })

  it('sorts all arbs by profit descending regardless of market', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        ml: { home: 110, away: -130 },
        spread: { homeLine: -3.5, homeOdds: 115, awayLine: 3.5, awayOdds: -130 },
        total: { line: 220.5, overOdds: 120, underOdds: -130 },
      }),
      makeBookmaker('FD', {
        ml: { home: -130, away: 110 },
        spread: { homeLine: -3.5, homeOdds: -130, awayLine: 3.5, awayOdds: 115 },
        total: { line: 220.5, overOdds: -130, underOdds: 120 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    for (let i = 1; i < arbs.length; i++) {
      expect(arbs[i - 1].profit).toBeGreaterThanOrEqual(arbs[i].profit)
    }
  })

  it('each arb includes stakes calculation', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        ml: { home: 110, away: -130 },
      }),
      makeBookmaker('FD', {
        ml: { home: -130, away: 110 },
      }),
    ])
    const arbs = detectMultiMarketArbitrage([game])
    for (const arb of arbs) {
      expect(arb.stakes.side1).toBeGreaterThan(0)
      expect(arb.stakes.side2).toBeGreaterThan(0)
      expect(arb.stakes.side1 + arb.stakes.side2).toBeCloseTo(100, 0)
      expect(arb.stakes.totalReturn).toBeGreaterThan(100)
    }
  })

  it('returns empty for game with single bookmaker', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        ml: { home: 110, away: -130 },
        spread: { homeLine: -3.5, homeOdds: 110, awayLine: 3.5, awayOdds: -130 },
      }),
    ])
    expect(detectMultiMarketArbitrage([game])).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 6. scanAllMarketsForEV
// ---------------------------------------------------------------------------

describe('scanAllMarketsForEV', () => {
  it('returns empty for no games', () => {
    const result = scanAllMarketsForEV([])
    expect(result.moneyline).toHaveLength(0)
    expect(result.spread).toHaveLength(0)
    expect(result.total).toHaveLength(0)
    expect(result.allSorted).toHaveLength(0)
    expect(result.gamesScanned).toBe(0)
  })

  it('detects spread EV when one book offers better spread price', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        spread: { homeLine: -3.5, homeOdds: -115, awayLine: 3.5, awayOdds: -105 },
      }),
      makeBookmaker('FD', {
        spread: { homeLine: -3.5, homeOdds: -115, awayLine: 3.5, awayOdds: -105 },
      }),
      makeBookmaker('MGM', {
        spread: { homeLine: -3.5, homeOdds: -115, awayLine: 3.5, awayOdds: -105 },
      }),
      makeBookmaker('Sharp', {
        spread: { homeLine: -3.5, homeOdds: -100, awayLine: 3.5, awayOdds: -105 },
      }),
    ])
    const result = scanAllMarketsForEV([game])
    const spreadEVs = result.spread
    // Sharp's -100 is better than consensus ~-115 for home spread
    expect(spreadEVs.length).toBeGreaterThanOrEqual(1)
    expect(spreadEVs[0].market).toBe('spread')
  })

  it('detects total EV when one book offers better over/under price', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        total: { line: 220.5, overOdds: -115, underOdds: -105 },
      }),
      makeBookmaker('FD', {
        total: { line: 220.5, overOdds: -115, underOdds: -105 },
      }),
      makeBookmaker('MGM', {
        total: { line: 220.5, overOdds: -115, underOdds: -105 },
      }),
      makeBookmaker('Sharp', {
        total: { line: 220.5, overOdds: -100, underOdds: -105 },
      }),
    ])
    const result = scanAllMarketsForEV([game])
    const totalEVs = result.total
    expect(totalEVs.length).toBeGreaterThanOrEqual(1)
    expect(totalEVs[0].market).toBe('total')
  })

  it('allSorted combines all markets sorted by EV', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        ml: { home: -115, away: -105 },
        spread: { homeLine: -3.5, homeOdds: -115, awayLine: 3.5, awayOdds: -105 },
        total: { line: 220.5, overOdds: -115, underOdds: -105 },
      }),
      makeBookmaker('FD', {
        ml: { home: -115, away: -105 },
        spread: { homeLine: -3.5, homeOdds: -115, awayLine: 3.5, awayOdds: -105 },
        total: { line: 220.5, overOdds: -115, underOdds: -105 },
      }),
      makeBookmaker('MGM', {
        ml: { home: -115, away: -105 },
        spread: { homeLine: -3.5, homeOdds: -115, awayLine: 3.5, awayOdds: -105 },
        total: { line: 220.5, overOdds: -115, underOdds: -105 },
      }),
      makeBookmaker('Sharp', {
        ml: { home: -100, away: 110 },
        spread: { homeLine: -3.5, homeOdds: -100, awayLine: 3.5, awayOdds: 110 },
        total: { line: 220.5, overOdds: -100, underOdds: 110 },
      }),
    ])
    const result = scanAllMarketsForEV([game])
    // Check sorted descending by EV
    for (let i = 1; i < result.allSorted.length; i++) {
      expect(result.allSorted[i - 1].ev).toBeGreaterThanOrEqual(result.allSorted[i].ev)
    }
  })

  it('skips games with fewer than 3 bookmakers for spread/total EV', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        spread: { homeLine: -3.5, homeOdds: -100, awayLine: 3.5, awayOdds: -130 },
      }),
      makeBookmaker('FD', {
        spread: { homeLine: -3.5, homeOdds: -115, awayLine: 3.5, awayOdds: -105 },
      }),
    ])
    const result = scanAllMarketsForEV([game])
    expect(result.spread).toHaveLength(0)
    expect(result.total).toHaveLength(0)
  })
})
