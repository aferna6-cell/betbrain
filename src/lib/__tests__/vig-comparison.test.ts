import { describe, it, expect } from 'vitest'
import {
  calculateTwoWayVig,
  calculateThreeWayVig,
  compareVig,
} from '../vig-comparison'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

function makeBk(name: string, homeML: number, awayML: number, spreadJuice = -110): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: homeML, away: awayML, draw: null },
    spread: { homeLine: -5.5, homeOdds: spreadJuice, awayLine: 5.5, awayOdds: spreadJuice },
    total: { line: 224.5, overOdds: spreadJuice, underOdds: spreadJuice },
    lastUpdated: '2026-03-25T00:00:00Z',
  }
}

function makeGame(id: string, sport: string, bks: NormalizedBookmakerOdds[]): NormalizedGame {
  return {
    id,
    sport: sport as 'nba',
    homeTeam: 'TeamA',
    awayTeam: 'TeamB',
    commenceTime: '2026-03-25T00:00:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers: bks,
  }
}

describe('calculateTwoWayVig', () => {
  it('calculates standard -110/-110 vig', () => {
    const vig = calculateTwoWayVig(-110, -110)
    // -110 implied = 110/210 = 0.5238
    // Total = 1.0476 → vig = 4.76%
    expect(vig).toBeCloseTo(4.76, 1)
  })

  it('calculates vig for heavy favorite', () => {
    const vig = calculateTwoWayVig(-300, 250)
    // -300: 300/400 = 0.75, +250: 100/350 = 0.2857
    // Total = 1.0357 → vig ~3.57%
    expect(vig).toBeCloseTo(3.57, 0)
  })

  it('zero vig means fair market', () => {
    // -100/+100 is a no-vig market
    const vig = calculateTwoWayVig(-100, 100)
    expect(vig).toBeCloseTo(0, 1)
  })

  it('calculates vig for pick em', () => {
    const vig = calculateTwoWayVig(-105, -105)
    // -105: 105/205 = 0.5122
    // Total = 1.0244 → vig ~2.44%
    expect(vig).toBeCloseTo(2.44, 0)
  })
})

describe('calculateThreeWayVig', () => {
  it('calculates three-way market vig', () => {
    const vig = calculateThreeWayVig(-150, 200, 300)
    expect(vig).toBeGreaterThan(0)
  })
})

describe('compareVig', () => {
  it('returns empty for no games', () => {
    const result = compareVig([])
    expect(result.profiles).toEqual([])
    expect(result.gamesAnalyzed).toBe(0)
  })

  it('profiles bookmakers by vig', () => {
    const game = makeGame('g1', 'nba', [
      makeBk('LowVig', -105, -105, -105),  // lower juice
      makeBk('HighVig', -110, -110, -110),  // standard juice
    ])
    const result = compareVig([game])
    expect(result.profiles).toHaveLength(2)
    // LowVig should come first (sorted ascending)
    expect(result.profiles[0].bookmaker).toBe('LowVig')
    expect(result.profiles[0].avgVig).toBeLessThan(result.profiles[1].avgVig)
  })

  it('identifies lowest and highest vig books', () => {
    const game = makeGame('g1', 'nba', [
      makeBk('Pinnacle', -104, -104, -104),
      makeBk('DraftKings', -110, -110, -110),
      makeBk('HighJuice', -115, -115, -115),
    ])
    const result = compareVig([game])
    expect(result.lowestVigBook).toBe('Pinnacle')
    expect(result.highestVigBook).toBe('HighJuice')
  })

  it('classifies books as low-vig, average, high-vig', () => {
    const game = makeGame('g1', 'nba', [
      makeBk('Pinnacle', -102, -102, -102), // very low vig
      makeBk('Standard', -110, -110, -110), // standard
      makeBk('Worst', -120, -120, -120), // high vig
    ])
    const result = compareVig([game])
    const pinnacle = result.profiles.find(p => p.bookmaker === 'Pinnacle')!
    const worst = result.profiles.find(p => p.bookmaker === 'Worst')!
    expect(pinnacle.classification).toBe('low-vig')
    expect(worst.classification).toBe('high-vig')
  })

  it('calculates per-market vig', () => {
    const game = makeGame('g1', 'nba', [
      makeBk('DK', -110, -110, -110),
    ])
    const result = compareVig([game])
    const dk = result.profiles[0]
    expect(dk.mlVig).toBeGreaterThan(0)
    expect(dk.spreadVig).toBeGreaterThan(0)
    expect(dk.totalVig).toBeGreaterThan(0)
  })

  it('tracks per-sport breakdown', () => {
    const nbaGame = makeGame('g1', 'nba', [makeBk('DK', -110, -110)])
    const nflGame = makeGame('g2', 'nfl', [makeBk('DK', -110, -110)])
    const result = compareVig([nbaGame, nflGame])
    const dk = result.profiles[0]
    expect(dk.bySport['nba']).toBeDefined()
    expect(dk.bySport['nfl']).toBeDefined()
    expect(dk.bySport['nba'].count).toBeGreaterThan(0)
  })

  it('tracks best and worst vig per book', () => {
    const games = [
      makeGame('g1', 'nba', [
        makeBk('DK', -105, -105, -105),
      ]),
      makeGame('g2', 'nba', [
        makeBk('DK', -115, -115, -115),
      ]),
    ]
    const result = compareVig(games)
    const dk = result.profiles[0]
    expect(dk.bestVig).toBeLessThan(dk.worstVig)
  })

  it('calculates market average vig', () => {
    const game = makeGame('g1', 'nba', [
      makeBk('A', -110, -110),
      makeBk('B', -110, -110),
    ])
    const result = compareVig([game])
    expect(result.marketAvgVig).toBeGreaterThan(0)
  })

  it('handles bookmakers with missing markets', () => {
    const game = makeGame('g1', 'nba', [{
      bookmaker: 'Partial',
      moneyline: { home: -110, away: -110, draw: null },
      spread: null,
      total: null,
      lastUpdated: '2026-03-25T00:00:00Z',
    }])
    const result = compareVig([game])
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].spreadVig).toBe(0)
    expect(result.profiles[0].totalVig).toBe(0)
  })
})
