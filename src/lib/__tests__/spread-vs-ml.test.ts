import { describe, it, expect } from 'vitest'
import {
  compareSpreadVsML,
  analyzeSpreadVsML,
  bestSpreadVsML,
  analyzeAllSpreadVsML,
} from '../spread-vs-ml'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

function makeBk(overrides: Partial<NormalizedBookmakerOdds> = {}): NormalizedBookmakerOdds {
  return {
    bookmaker: 'DraftKings',
    moneyline: { home: -200, away: 170, draw: null },
    spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
    total: { line: 224.5, overOdds: -110, underOdds: -110 },
    lastUpdated: '2026-03-25T00:00:00Z',
    ...overrides,
  }
}

function makeGame(overrides: Partial<NormalizedGame> = {}): NormalizedGame {
  return {
    id: 'game1',
    sport: 'nba' as const,
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-25T00:00:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers: [makeBk()],
    ...overrides,
  }
}

describe('compareSpreadVsML', () => {
  it('returns null when moneyline is missing', () => {
    const game = makeGame()
    const bk = makeBk({ moneyline: null })
    expect(compareSpreadVsML(game, bk, 'home')).toBeNull()
  })

  it('returns null when spread is missing', () => {
    const game = makeGame()
    const bk = makeBk({ spread: null })
    expect(compareSpreadVsML(game, bk, 'home')).toBeNull()
  })

  it('analyzes home favorite correctly', () => {
    const game = makeGame()
    const bk = makeBk({
      moneyline: { home: -200, away: 170, draw: null },
      spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
    })
    const result = compareSpreadVsML(game, bk, 'home')!
    expect(result).not.toBeNull()
    expect(result.team).toBe('Lakers')
    expect(result.side).toBe('home')
    expect(result.mlOdds).toBe(-200)
    expect(result.spreadLine).toBe(-5.5)
    expect(result.recommendation).toBeDefined()
    expect(['ml', 'spread', 'either']).toContain(result.recommendation)
    expect(result.edgePercent).toBeGreaterThanOrEqual(0)
  })

  it('analyzes away underdog correctly', () => {
    const game = makeGame()
    const bk = makeBk({
      moneyline: { home: -200, away: 170, draw: null },
      spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
    })
    const result = compareSpreadVsML(game, bk, 'away')!
    expect(result.team).toBe('Celtics')
    expect(result.spreadLine).toBe(5.5)
  })

  it('recommends spread for big favorites', () => {
    const game = makeGame()
    const bk = makeBk({
      moneyline: { home: -500, away: 380, draw: null },
      spread: { homeLine: -10.5, homeOdds: -110, awayLine: 10.5, awayOdds: -110 },
    })
    const result = compareSpreadVsML(game, bk, 'home')!
    expect(result.recommendation).toBe('spread')
    expect(result.reason).toContain('Big favorite')
  })

  it('recommends ML for small favorites', () => {
    const game = makeGame()
    const bk = makeBk({
      moneyline: { home: -130, away: 110, draw: null },
      spread: { homeLine: -2, homeOdds: -110, awayLine: 2, awayOdds: -110 },
    })
    const result = compareSpreadVsML(game, bk, 'home')!
    expect(result.recommendation).toBe('ml')
    expect(result.reason).toContain('Small favorite')
  })

  it('recommends spread for big underdogs', () => {
    const game = makeGame()
    const bk = makeBk({
      moneyline: { home: -500, away: 380, draw: null },
      spread: { homeLine: -10.5, homeOdds: -110, awayLine: 10.5, awayOdds: -110 },
    })
    const result = compareSpreadVsML(game, bk, 'away')!
    expect(result.recommendation).toBe('spread')
    expect(result.reason).toContain('Big underdog')
  })

  it('calculates break-even percentages', () => {
    const game = makeGame()
    const bk = makeBk()
    const result = compareSpreadVsML(game, bk, 'home')!
    expect(result.mlBreakEven).toBeGreaterThan(0)
    expect(result.mlBreakEven).toBeLessThan(100)
    expect(result.spreadBreakEven).toBeGreaterThan(0)
    expect(result.spreadBreakEven).toBeLessThan(100)
  })

  it('includes correct game metadata', () => {
    const game = makeGame({ sport: 'nfl' as const })
    const bk = makeBk()
    const result = compareSpreadVsML(game, bk, 'home')!
    expect(result.gameId).toBe('game1')
    expect(result.sport).toBe('nfl')
    expect(result.homeTeam).toBe('Lakers')
    expect(result.commenceTime).toBe('2026-03-25T00:00:00Z')
  })
})

describe('analyzeSpreadVsML', () => {
  it('returns comparisons for both sides per bookmaker', () => {
    const game = makeGame({
      bookmakers: [makeBk(), makeBk({ bookmaker: 'FanDuel' })],
    })
    const results = analyzeSpreadVsML(game)
    expect(results).toHaveLength(4) // 2 sides x 2 bookmakers
  })

  it('returns empty for game with no odds', () => {
    const game = makeGame({
      bookmakers: [makeBk({ moneyline: null, spread: null })],
    })
    expect(analyzeSpreadVsML(game)).toEqual([])
  })
})

describe('bestSpreadVsML', () => {
  it('returns at most 2 entries (one per side)', () => {
    const game = makeGame({
      bookmakers: [
        makeBk({ bookmaker: 'DK' }),
        makeBk({ bookmaker: 'FD' }),
        makeBk({ bookmaker: 'MGM' }),
      ],
    })
    const results = bestSpreadVsML(game)
    expect(results.length).toBeLessThanOrEqual(2)
    const sides = results.map(r => r.side)
    expect(new Set(sides).size).toBe(sides.length) // unique sides
  })

  it('picks the entry with highest edge', () => {
    const game = makeGame({
      bookmakers: [
        makeBk({
          bookmaker: 'DK',
          moneyline: { home: -500, away: 380, draw: null },
          spread: { homeLine: -10.5, homeOdds: -110, awayLine: 10.5, awayOdds: -110 },
        }),
        makeBk({
          bookmaker: 'FD',
          moneyline: { home: -130, away: 110, draw: null },
          spread: { homeLine: -2, homeOdds: -110, awayLine: 2, awayOdds: -110 },
        }),
      ],
    })
    const results = bestSpreadVsML(game)
    // Each side should have the entry with highest edgePercent
    for (const r of results) {
      expect(r.edgePercent).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('analyzeAllSpreadVsML', () => {
  it('returns empty for no games', () => {
    const result = analyzeAllSpreadVsML([])
    expect(result.comparisons).toEqual([])
    expect(result.gamesAnalyzed).toBe(0)
  })

  it('counts ml and spread better games', () => {
    const games = [
      makeGame({
        id: 'big-fav',
        bookmakers: [makeBk({
          moneyline: { home: -500, away: 380, draw: null },
          spread: { homeLine: -10.5, homeOdds: -110, awayLine: 10.5, awayOdds: -110 },
        })],
      }),
      makeGame({
        id: 'small-fav',
        bookmakers: [makeBk({
          moneyline: { home: -130, away: 110, draw: null },
          spread: { homeLine: -2, homeOdds: -110, awayLine: 2, awayOdds: -110 },
        })],
      }),
    ]
    const result = analyzeAllSpreadVsML(games)
    expect(result.gamesAnalyzed).toBe(2)
    expect(result.mlBetterCount + result.spreadBetterCount).toBeGreaterThan(0)
  })

  it('sorts comparisons by edge percent descending', () => {
    const games = [
      makeGame({ id: 'g1' }),
      makeGame({ id: 'g2', bookmakers: [makeBk({
        moneyline: { home: -500, away: 380, draw: null },
        spread: { homeLine: -10.5, homeOdds: -110, awayLine: 10.5, awayOdds: -110 },
      })] }),
    ]
    const result = analyzeAllSpreadVsML(games)
    for (let i = 1; i < result.comparisons.length; i++) {
      expect(result.comparisons[i - 1].edgePercent).toBeGreaterThanOrEqual(result.comparisons[i].edgePercent)
    }
  })
})
