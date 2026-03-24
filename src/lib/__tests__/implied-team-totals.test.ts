import { describe, it, expect } from 'vitest'
import {
  calcImpliedTeamTotals,
  analyzeImpliedTeamTotals,
  analyzeAllImpliedTotals,
  classifyScoringEnvironment,
  SCORING_BENCHMARKS,
} from '../implied-team-totals'
import type { NormalizedGame } from '@/lib/sports/config'

function makeGame(overrides: Partial<NormalizedGame> = {}): NormalizedGame {
  return {
    id: 'game1',
    sport: 'nba' as const,
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-25T00:00:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers: [
      {
        bookmaker: 'DraftKings',
        moneyline: { home: -150, away: 130, draw: null },
        spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
        total: { line: 224.5, overOdds: -110, underOdds: -110 },
        lastUpdated: '2026-03-25T00:00:00Z',
      },
      {
        bookmaker: 'FanDuel',
        moneyline: { home: -145, away: 125, draw: null },
        spread: { homeLine: -6, homeOdds: -110, awayLine: 6, awayOdds: -110 },
        total: { line: 225, overOdds: -110, underOdds: -110 },
        lastUpdated: '2026-03-25T00:00:00Z',
      },
      {
        bookmaker: 'BetMGM',
        moneyline: { home: -155, away: 135, draw: null },
        spread: { homeLine: -5.5, homeOdds: -115, awayLine: 5.5, awayOdds: -105 },
        total: { line: 224, overOdds: -110, underOdds: -110 },
        lastUpdated: '2026-03-25T00:00:00Z',
      },
    ],
    ...overrides,
  }
}

describe('calcImpliedTeamTotals', () => {
  it('calculates basic implied totals from spread and total', () => {
    // Home favored by 5.5, total 224.5
    // home = (224.5 - (-5.5)) / 2 = 230/2 = 115
    // away = (224.5 + (-5.5)) / 2 = 219/2 = 109.5
    const result = calcImpliedTeamTotals(-5.5, 224.5)
    expect(result.home).toBe(115)
    expect(result.away).toBe(109.5)
  })

  it('handles even spread (pick em)', () => {
    const result = calcImpliedTeamTotals(0, 44)
    expect(result.home).toBe(22)
    expect(result.away).toBe(22)
  })

  it('handles home as underdog (positive spread)', () => {
    // Home +3 means away favored
    // home = (200 - 3) / 2 = 98.5
    // away = (200 + 3) / 2 = 101.5
    const result = calcImpliedTeamTotals(3, 200)
    expect(result.home).toBe(98.5)
    expect(result.away).toBe(101.5)
  })

  it('handles large NFL-style spreads', () => {
    const result = calcImpliedTeamTotals(-14, 48)
    // home = (48 + 14) / 2 = 31
    // away = (48 - 14) / 2 = 17
    expect(result.home).toBe(31)
    expect(result.away).toBe(17)
  })

  it('handles fractional totals', () => {
    const result = calcImpliedTeamTotals(-3.5, 8.5)
    // home = (8.5 + 3.5) / 2 = 6
    // away = (8.5 - 3.5) / 2 = 2.5
    expect(result.home).toBe(6)
    expect(result.away).toBe(2.5)
  })
})

describe('analyzeImpliedTeamTotals', () => {
  it('analyzes a game with multiple bookmakers', () => {
    const game = makeGame()
    const result = analyzeImpliedTeamTotals(game)
    expect(result).not.toBeNull()
    expect(result!.homeTeam).toBe('Lakers')
    expect(result!.awayTeam).toBe('Celtics')
    expect(result!.byBookmaker).toHaveLength(3)
    expect(result!.consensus.bookCount).toBe(3)
  })

  it('calculates consensus averages', () => {
    const game = makeGame()
    const result = analyzeImpliedTeamTotals(game)!
    // DK: home=115, away=109.5
    // FD: home=115.5, away=109.5
    // BetMGM: home=114.75, away=109.25
    expect(result.consensus.avgHomeTotal).toBeGreaterThan(114)
    expect(result.consensus.avgHomeTotal).toBeLessThan(116)
    expect(result.consensus.avgAwayTotal).toBeGreaterThan(109)
    expect(result.consensus.avgAwayTotal).toBeLessThan(110)
  })

  it('identifies highest and lowest team totals', () => {
    const game = makeGame()
    const result = analyzeImpliedTeamTotals(game)!
    expect(result.highestTeamTotal.team).toBe('Lakers')
    expect(result.lowestTeamTotal.team).toBe('Celtics')
    expect(result.highestTeamTotal.impliedTotal).toBeGreaterThan(result.lowestTeamTotal.impliedTotal)
  })

  it('returns null when no bookmakers have spread+total', () => {
    const game = makeGame({
      bookmakers: [
        {
          bookmaker: 'DraftKings',
          moneyline: { home: -150, away: 130, draw: null },
          spread: null,
          total: null,
          lastUpdated: '2026-03-25T00:00:00Z',
        },
      ],
    })
    expect(analyzeImpliedTeamTotals(game)).toBeNull()
  })

  it('skips bookmakers missing spread', () => {
    const game = makeGame({
      bookmakers: [
        {
          bookmaker: 'DraftKings',
          moneyline: { home: -150, away: 130, draw: null },
          spread: null,
          total: { line: 224.5, overOdds: -110, underOdds: -110 },
          lastUpdated: '2026-03-25T00:00:00Z',
        },
        {
          bookmaker: 'FanDuel',
          moneyline: { home: -145, away: 125, draw: null },
          spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
          total: { line: 224.5, overOdds: -110, underOdds: -110 },
          lastUpdated: '2026-03-25T00:00:00Z',
        },
      ],
    })
    const result = analyzeImpliedTeamTotals(game)!
    expect(result.byBookmaker).toHaveLength(1)
    expect(result.byBookmaker[0].bookmaker).toBe('FanDuel')
  })

  it('calculates max disagreement across bookmakers', () => {
    const game = makeGame()
    const result = analyzeImpliedTeamTotals(game)!
    expect(result.maxDisagreement).toBeGreaterThanOrEqual(0)
  })
})

describe('analyzeAllImpliedTotals', () => {
  it('returns empty for no games', () => {
    expect(analyzeAllImpliedTotals([])).toEqual([])
  })

  it('sorts by highest team total descending', () => {
    const highScoring = makeGame({ id: 'high', sport: 'nba' })
    const lowScoring = makeGame({
      id: 'low',
      sport: 'nhl',
      homeTeam: 'Rangers',
      awayTeam: 'Bruins',
      bookmakers: [
        {
          bookmaker: 'DraftKings',
          moneyline: { home: -130, away: 110, draw: null },
          spread: { homeLine: -1.5, homeOdds: -150, awayLine: 1.5, awayOdds: 130 },
          total: { line: 6, overOdds: -110, underOdds: -110 },
          lastUpdated: '2026-03-25T00:00:00Z',
        },
      ],
    })
    const results = analyzeAllImpliedTotals([lowScoring, highScoring])
    expect(results).toHaveLength(2)
    expect(results[0].gameId).toBe('high')
    expect(results[1].gameId).toBe('low')
  })

  it('filters out games without spread/total data', () => {
    const withData = makeGame()
    const noData = makeGame({
      id: 'nodata',
      bookmakers: [
        {
          bookmaker: 'DK',
          moneyline: { home: -110, away: -110, draw: null },
          spread: null,
          total: null,
          lastUpdated: '2026-03-25T00:00:00Z',
        },
      ],
    })
    const results = analyzeAllImpliedTotals([withData, noData])
    expect(results).toHaveLength(1)
  })
})

describe('classifyScoringEnvironment', () => {
  it('classifies high-scoring NBA game', () => {
    expect(classifyScoringEnvironment('nba', 240)).toBe('high')
  })

  it('classifies average-scoring NBA game', () => {
    expect(classifyScoringEnvironment('nba', 224)).toBe('average')
  })

  it('classifies low-scoring NBA game', () => {
    expect(classifyScoringEnvironment('nba', 205)).toBe('low')
  })

  it('classifies high-scoring NFL game', () => {
    expect(classifyScoringEnvironment('nfl', 52)).toBe('high')
  })

  it('classifies low-scoring NFL game', () => {
    expect(classifyScoringEnvironment('nfl', 36)).toBe('low')
  })

  it('classifies MLB games', () => {
    expect(classifyScoringEnvironment('mlb', 11)).toBe('high')
    expect(classifyScoringEnvironment('mlb', 6.5)).toBe('low')
  })

  it('classifies NHL games', () => {
    expect(classifyScoringEnvironment('nhl', 7)).toBe('high')
    expect(classifyScoringEnvironment('nhl', 5)).toBe('low')
  })

  it('returns average for unknown sport', () => {
    expect(classifyScoringEnvironment('soccer', 2.5)).toBe('average')
  })
})

describe('SCORING_BENCHMARKS', () => {
  it('has benchmarks for all 4 sports', () => {
    expect(Object.keys(SCORING_BENCHMARKS)).toEqual(['nba', 'nfl', 'mlb', 'nhl'])
  })

  it('highScoring > avgTotal > lowScoring for all sports', () => {
    for (const [, b] of Object.entries(SCORING_BENCHMARKS)) {
      expect(b.highScoring).toBeGreaterThan(b.avgTotal)
      expect(b.avgTotal).toBeGreaterThan(b.lowScoring)
    }
  })
})
