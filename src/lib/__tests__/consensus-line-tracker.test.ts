import { describe, it, expect } from 'vitest'
import { analyzeGameConsensus, trackConsensus } from '../consensus-line-tracker'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

function makeBk(name: string, homeML: number, awayML: number, homeLine = -5.5, totalLine = 224.5): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: homeML, away: awayML, draw: null },
    spread: { homeLine, homeOdds: -110, awayLine: -homeLine, awayOdds: -110 },
    total: { line: totalLine, overOdds: -110, underOdds: -110 },
    lastUpdated: '2026-03-25T00:00:00Z',
  }
}

function makeGame(bks: NormalizedBookmakerOdds[], id = 'g1'): NormalizedGame {
  return {
    id,
    sport: 'nba' as const,
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-25T00:00:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers: bks,
  }
}

describe('analyzeGameConsensus', () => {
  it('calculates consensus with identical books', () => {
    const game = makeGame([
      makeBk('DK', -150, 130, -5.5, 224.5),
      makeBk('FD', -150, 130, -5.5, 224.5),
      makeBk('MGM', -150, 130, -5.5, 224.5),
    ])
    const result = analyzeGameConsensus(game)
    expect(result.markets.moneyline!.consensusHome).toBe(-150)
    expect(result.markets.moneyline!.consensusAway).toBe(130)
    expect(result.markets.moneyline!.deviations).toHaveLength(0)
    expect(result.totalDeviations).toBe(0)
  })

  it('detects moneyline deviations', () => {
    const game = makeGame([
      makeBk('DK', -150, 130),
      makeBk('FD', -150, 130),
      makeBk('Outlier', -170, 150), // 20 points off
    ])
    const result = analyzeGameConsensus(game)
    expect(result.markets.moneyline!.deviations.length).toBeGreaterThan(0)
    expect(result.markets.moneyline!.deviations[0].bookmaker).toBe('Outlier')
  })

  it('detects spread line deviations', () => {
    const game = makeGame([
      makeBk('DK', -150, 130, -5.5),
      makeBk('FD', -150, 130, -5.5),
      makeBk('Outlier', -150, 130, -6.5), // 1 point off
    ])
    const result = analyzeGameConsensus(game)
    expect(result.markets.spread!.deviations.length).toBeGreaterThan(0)
  })

  it('detects total line deviations', () => {
    const game = makeGame([
      makeBk('DK', -150, 130, -5.5, 224.5),
      makeBk('FD', -150, 130, -5.5, 224.5),
      makeBk('Outlier', -150, 130, -5.5, 226), // 1.5 off
    ])
    const result = analyzeGameConsensus(game)
    expect(result.markets.total!.deviations.length).toBeGreaterThan(0)
  })

  it('handles games with only moneyline', () => {
    const game = makeGame([
      { bookmaker: 'DK', moneyline: { home: -150, away: 130, draw: null }, spread: null, total: null, lastUpdated: '' },
      { bookmaker: 'FD', moneyline: { home: -155, away: 135, draw: null }, spread: null, total: null, lastUpdated: '' },
    ])
    const result = analyzeGameConsensus(game)
    expect(result.markets.moneyline).toBeDefined()
    expect(result.markets.spread).toBeUndefined()
    expect(result.markets.total).toBeUndefined()
  })

  it('needs at least 2 bookmakers for consensus', () => {
    const game = makeGame([makeBk('DK', -150, 130)])
    const result = analyzeGameConsensus(game)
    expect(result.markets.moneyline).toBeUndefined()
  })

  it('calculates median correctly for even number of books', () => {
    const game = makeGame([
      makeBk('A', -140, 120),
      makeBk('B', -150, 130),
      makeBk('C', -160, 140),
      makeBk('D', -170, 150),
    ])
    const result = analyzeGameConsensus(game)
    // Median of [-140, -150, -160, -170] = (-150 + -160) / 2 = -155
    expect(result.markets.moneyline!.consensusHome).toBe(-155)
  })
})

describe('trackConsensus', () => {
  it('returns empty for no games', () => {
    const result = trackConsensus([])
    expect(result.games).toEqual([])
    expect(result.totalGames).toBe(0)
  })

  it('tracks multiple games', () => {
    const games = [
      makeGame([makeBk('DK', -150, 130), makeBk('FD', -150, 130)], 'g1'),
      makeGame([makeBk('DK', -200, 170), makeBk('FD', -200, 170)], 'g2'),
    ]
    const result = trackConsensus(games)
    expect(result.totalGames).toBe(2)
    expect(result.games).toHaveLength(2)
  })

  it('sorts by deviation count descending', () => {
    const games = [
      makeGame([
        makeBk('DK', -150, 130),
        makeBk('FD', -150, 130),
      ], 'no-dev'),
      makeGame([
        makeBk('DK', -150, 130),
        makeBk('FD', -150, 130),
        makeBk('Outlier', -180, 160),
      ], 'has-dev'),
    ]
    const result = trackConsensus(games)
    expect(result.games[0].gameId).toBe('has-dev')
  })

  it('counts games with deviations', () => {
    const games = [
      makeGame([makeBk('DK', -150, 130), makeBk('FD', -150, 130)], 'g1'),
      makeGame([makeBk('DK', -150, 130), makeBk('FD', -150, 130), makeBk('X', -180, 160)], 'g2'),
    ]
    const result = trackConsensus(games)
    expect(result.gamesWithDeviations).toBe(1)
  })
})
