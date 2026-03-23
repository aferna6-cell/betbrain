/**
 * EV Scanner and Arbitrage Detector unit tests.
 *
 * Tests fair odds calculation, +EV detection, arbitrage detection,
 * and edge cases. Pure logic — no Supabase.
 */

import { describe, it, expect } from 'vitest'
import {
  scanForEV,
  detectArbitrage,
  MIN_BOOKMAKERS,
  MIN_EV_THRESHOLD,
} from '@/lib/ev-scanner'
import type { EVOpportunity } from '@/lib/ev-scanner'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'
import { americanToImplied } from '@/lib/odds'

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeBookmaker(
  name: string,
  homeOdds: number | null,
  awayOdds: number | null
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: homeOdds, away: awayOdds, draw: null },
    spread: null,
    total: null,
    lastUpdated: '2026-03-17T08:00:00Z',
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
    commenceTime: '2026-03-17T23:00:00Z',
    fromCache: true,
    isFresh: true,
    bookmakers,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------

describe('EV Scanner constants', () => {
  it('MIN_BOOKMAKERS is 3', () => {
    expect(MIN_BOOKMAKERS).toBe(3)
  })

  it('MIN_EV_THRESHOLD is 1.0', () => {
    expect(MIN_EV_THRESHOLD).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// 2. EVOpportunity interface
// ---------------------------------------------------------------------------

describe('EVOpportunity interface', () => {
  it('has required fields', () => {
    const opp: EVOpportunity = {
      game: makeGame([makeBookmaker('DK', -110, -110)]),
      market: 'moneyline',
      side: 'home',
      team: 'Lakers',
      bookmaker: 'DraftKings',
      bookOdds: -105,
      fairOdds: -115,
      ev: 3.5,
      fairProbability: 0.535,
      bookImplied: 0.512,
    }
    expect(opp.ev).toBeGreaterThan(0)
    expect(opp.market).toBe('moneyline')
    expect(['home', 'away']).toContain(opp.side)
  })
})

// ---------------------------------------------------------------------------
// 3. scanForEV
// ---------------------------------------------------------------------------

describe('scanForEV', () => {
  it('returns empty when no games', () => {
    const result = scanForEV([])
    expect(result.opportunities).toHaveLength(0)
    expect(result.gamesScanned).toBe(0)
  })

  it('skips games with fewer than MIN_BOOKMAKERS', () => {
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -110, -110),
    ])
    const result = scanForEV([game])
    expect(result.opportunities).toHaveLength(0)
  })

  it('detects +EV when one book offers significantly better odds', () => {
    // Books 1-3 have -115 home, but book 4 has -100 (much better)
    const game = makeGame([
      makeBookmaker('DK', -115, -105),
      makeBookmaker('FD', -115, -105),
      makeBookmaker('MGM', -115, -105),
      makeBookmaker('Outlier', -100, -105), // home odds much better
    ])
    const result = scanForEV([game])
    // The -100 book should be flagged as +EV for home
    const homeEVs = result.opportunities.filter((o) => o.side === 'home')
    expect(homeEVs.length).toBeGreaterThanOrEqual(1)
    const outlierEV = homeEVs.find((o) => o.bookmaker === 'Outlier')
    if (outlierEV) {
      expect(outlierEV.ev).toBeGreaterThan(0)
      expect(outlierEV.bookOdds).toBe(-100)
    }
  })

  it('does not flag bets below MIN_EV_THRESHOLD', () => {
    // All books have very similar odds — no EV above threshold
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -110, -110),
      makeBookmaker('MGM', -110, -110),
    ])
    const result = scanForEV([game])
    expect(result.opportunities).toHaveLength(0)
  })

  it('sorts opportunities by EV descending', () => {
    const game = makeGame([
      makeBookmaker('DK', -120, -105),
      makeBookmaker('FD', -120, -105),
      makeBookmaker('MGM', -120, -105),
      makeBookmaker('Sharp', -100, +110), // both sides better
    ])
    const result = scanForEV([game])
    for (let i = 1; i < result.opportunities.length; i++) {
      expect(result.opportunities[i - 1].ev).toBeGreaterThanOrEqual(result.opportunities[i].ev)
    }
  })

  it('returns meta with gamesScanned count', () => {
    const games = [
      makeGame([makeBookmaker('DK', -110, -110), makeBookmaker('FD', -110, -110), makeBookmaker('MGM', -110, -110)], { id: 'g1' }),
      makeGame([makeBookmaker('DK', -200, +170), makeBookmaker('FD', -200, +170), makeBookmaker('MGM', -200, +170)], { id: 'g2' }),
    ]
    const result = scanForEV(games)
    expect(result.gamesScanned).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 4. detectArbitrage
// ---------------------------------------------------------------------------

describe('detectArbitrage', () => {
  it('returns empty when no games', () => {
    expect(detectArbitrage([])).toHaveLength(0)
  })

  it('returns empty when no arb exists (typical case)', () => {
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -110, -110),
      makeBookmaker('MGM', -110, -110),
    ])
    // -110 on both sides: implied = 52.38% each, total = 104.76% > 100%
    const arbs = detectArbitrage([game])
    expect(arbs).toHaveLength(0)
  })

  it('detects arb when best odds on each side sum to < 100% implied', () => {
    // Home at +110 on one book, Away at +110 on another
    // +110 implied = 47.6%, total = 95.2% < 100% → arb exists
    const game = makeGame([
      makeBookmaker('DK', +110, -130),  // best home odds
      makeBookmaker('FD', -130, +110),  // best away odds
    ])
    const arbs = detectArbitrage([game])
    expect(arbs).toHaveLength(1)
    expect(arbs[0].profit).toBeGreaterThan(0)
    expect(arbs[0].totalImplied).toBeLessThan(1)
  })

  it('arb profit is calculated correctly', () => {
    const game = makeGame([
      makeBookmaker('DK', +110, -130),
      makeBookmaker('FD', -130, +110),
    ])
    const arbs = detectArbitrage([game])
    if (arbs.length > 0) {
      const expected = (1 / arbs[0].totalImplied - 1) * 100
      expect(arbs[0].profit).toBeCloseTo(expected, 1)
    }
  })

  it('sorts arbs by profit descending', () => {
    const games = [
      makeGame([
        makeBookmaker('DK', +110, -130),
        makeBookmaker('FD', -130, +110),
      ], { id: 'g1' }),
      makeGame([
        makeBookmaker('DK', +120, -130),
        makeBookmaker('FD', -130, +120),
      ], { id: 'g2' }),
    ]
    const arbs = detectArbitrage(games)
    for (let i = 1; i < arbs.length; i++) {
      expect(arbs[i - 1].profit).toBeGreaterThanOrEqual(arbs[i].profit)
    }
  })

  it('picks the best odds from each bookmaker', () => {
    const game = makeGame([
      makeBookmaker('DK', +100, -120),  // DK home is best
      makeBookmaker('FD', -150, +105),  // FD away is best
      makeBookmaker('MGM', -110, -110),
    ])
    const arbs = detectArbitrage([game])
    // Check the best home odds come from DK and best away from FD
    if (arbs.length > 0) {
      expect(arbs[0].homeBest.bookmaker).toBe('DK')
      expect(arbs[0].awayBest.bookmaker).toBe('FD')
    }
  })
})

// ---------------------------------------------------------------------------
// 5. Fair probability math
// ---------------------------------------------------------------------------

describe('Fair probability calculation', () => {
  it('americanToImplied converts -110 correctly', () => {
    const implied = americanToImplied(-110)
    expect(implied).toBeCloseTo(0.5238, 3)
  })

  it('americanToImplied converts +150 correctly', () => {
    const implied = americanToImplied(150)
    expect(implied).toBeCloseTo(0.4, 3)
  })

  it('vig removal normalizes probabilities to sum to 1', () => {
    // Three books at -110/-110: each side ~52.38%, sum ~104.76%
    // After vig removal: each side should be ~50%
    const homeImplied = americanToImplied(-110)
    const awayImplied = americanToImplied(-110)
    const overround = homeImplied + awayImplied
    const fairHome = homeImplied / overround
    const fairAway = awayImplied / overround
    expect(fairHome + fairAway).toBeCloseTo(1, 5)
  })

  it('americanToImplied converts +100 correctly (even money)', () => {
    const implied = americanToImplied(100)
    expect(implied).toBeCloseTo(0.5, 3)
  })

  it('americanToImplied converts -200 correctly (heavy favorite)', () => {
    const implied = americanToImplied(-200)
    expect(implied).toBeCloseTo(0.6667, 3)
  })

  it('americanToImplied converts +300 correctly (long shot)', () => {
    const implied = americanToImplied(300)
    expect(implied).toBeCloseTo(0.25, 3)
  })
})

// ---------------------------------------------------------------------------
// 6. Advanced EV edge cases
// ---------------------------------------------------------------------------

describe('scanForEV edge cases', () => {
  it('handles games where one bookmaker has null moneyline', () => {
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -110, -110),
      makeBookmaker('MGM', -110, -110),
      { bookmaker: 'NullBook', moneyline: null, spread: null, total: null, lastUpdated: '2026-03-17T08:00:00Z' },
    ])
    // Should not throw
    const result = scanForEV([game])
    expect(result.gamesScanned).toBe(1)
  })

  it('handles heavily lopsided odds without NaN or Infinity', () => {
    const game = makeGame([
      makeBookmaker('DK', -500, +400),
      makeBookmaker('FD', -500, +400),
      makeBookmaker('MGM', -500, +400),
      makeBookmaker('Sharp', -450, +420),
    ])
    const result = scanForEV([game])
    for (const opp of result.opportunities) {
      expect(isFinite(opp.ev)).toBe(true)
      expect(isNaN(opp.ev)).toBe(false)
      expect(isFinite(opp.fairOdds)).toBe(true)
    }
  })

  it('EV values are rounded to 1 decimal place', () => {
    const game = makeGame([
      makeBookmaker('DK', -115, -105),
      makeBookmaker('FD', -115, -105),
      makeBookmaker('MGM', -115, -105),
      makeBookmaker('Sharp', -100, -105),
    ])
    const result = scanForEV([game])
    for (const opp of result.opportunities) {
      const decimals = (opp.ev.toString().split('.')[1] || '').length
      expect(decimals).toBeLessThanOrEqual(1)
    }
  })

  it('fairProbability + bookImplied are rounded to 3 decimal places', () => {
    const game = makeGame([
      makeBookmaker('DK', -115, -105),
      makeBookmaker('FD', -115, -105),
      makeBookmaker('MGM', -115, -105),
      makeBookmaker('Sharp', -100, +110),
    ])
    const result = scanForEV([game])
    for (const opp of result.opportunities) {
      const fpDecimals = (opp.fairProbability.toString().split('.')[1] || '').length
      const biDecimals = (opp.bookImplied.toString().split('.')[1] || '').length
      expect(fpDecimals).toBeLessThanOrEqual(3)
      expect(biDecimals).toBeLessThanOrEqual(3)
    }
  })

  it('scans multiple games independently', () => {
    const game1 = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -110, -110),
      makeBookmaker('MGM', -110, -110),
    ], { id: 'g1', homeTeam: 'Lakers', awayTeam: 'Celtics' })

    const game2 = makeGame([
      makeBookmaker('DK', -120, +100),
      makeBookmaker('FD', -120, +100),
      makeBookmaker('MGM', -120, +100),
      makeBookmaker('Sharp', -120, +130), // away significantly better
    ], { id: 'g2', homeTeam: 'Warriors', awayTeam: 'Bucks' })

    const result = scanForEV([game1, game2])
    expect(result.gamesScanned).toBe(2)
    // Only game2 should have opportunities (if any)
    const game2Opps = result.opportunities.filter((o) => o.game.id === 'g2')
    // game1 is perfectly balanced, shouldn't have any
    const game1Opps = result.opportunities.filter((o) => o.game.id === 'g1')
    expect(game1Opps).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 7. Arbitrage edge cases
// ---------------------------------------------------------------------------

describe('detectArbitrage edge cases', () => {
  it('skips games with only one bookmaker', () => {
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
    ])
    expect(detectArbitrage([game])).toHaveLength(0)
  })

  it('no arb with standard vig lines', () => {
    // Standard US odds: -110/-110 = 52.38% + 52.38% = 104.76% > 100%
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -108, -112),
      makeBookmaker('MGM', -112, -108),
    ])
    expect(detectArbitrage([game])).toHaveLength(0)
  })

  it('arb totalImplied is always < 1 when arb found', () => {
    const game = makeGame([
      makeBookmaker('DK', +115, -130),
      makeBookmaker('FD', -130, +115),
    ])
    const arbs = detectArbitrage([game])
    for (const arb of arbs) {
      expect(arb.totalImplied).toBeLessThan(1)
    }
  })

  it('arb profit is positive when totalImplied < 1', () => {
    const game = makeGame([
      makeBookmaker('DK', +110, -130),
      makeBookmaker('FD', -130, +110),
    ])
    const arbs = detectArbitrage([game])
    for (const arb of arbs) {
      expect(arb.profit).toBeGreaterThan(0)
    }
  })
})
