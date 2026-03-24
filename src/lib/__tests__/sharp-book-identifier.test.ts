import { describe, it, expect } from 'vitest'
import { identifySharpBooks } from '../sharp-book-identifier'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

function makeBk(name: string, homeML: number, awayML: number, homeSpreadOdds = -110, totalOverOdds = -110): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: homeML, away: awayML, draw: null },
    spread: { homeLine: -5.5, homeOdds: homeSpreadOdds, awayLine: 5.5, awayOdds: homeSpreadOdds === -110 ? -110 : -110 },
    total: { line: 224.5, overOdds: totalOverOdds, underOdds: totalOverOdds === -110 ? -110 : -110 },
    lastUpdated: '2026-03-25T00:00:00Z',
  }
}

function makeGame(id: string, bookmakers: NormalizedBookmakerOdds[]): NormalizedGame {
  return {
    id,
    sport: 'nba' as const,
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-25T00:00:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers,
  }
}

describe('identifySharpBooks', () => {
  it('returns empty for no games', () => {
    const result = identifySharpBooks([])
    expect(result.scores).toEqual([])
    expect(result.gamesAnalyzed).toBe(0)
    expect(result.sharpestBook).toBeNull()
    expect(result.softestBook).toBeNull()
  })

  it('requires at least 3 bookmakers per game', () => {
    const game = makeGame('g1', [
      makeBk('DK', -150, 130),
      makeBk('FD', -145, 125),
    ])
    const result = identifySharpBooks([game])
    expect(result.gamesAnalyzed).toBe(0)
    expect(result.scores).toEqual([])
  })

  it('scores bookmakers with similar lines', () => {
    const game = makeGame('g1', [
      makeBk('DK', -150, 130),
      makeBk('FD', -150, 130),
      makeBk('MGM', -150, 130),
    ])
    const result = identifySharpBooks([game])
    expect(result.scores).toHaveLength(3)
    expect(result.gamesAnalyzed).toBe(1)
  })

  it('identifies outlier book as sharper', () => {
    const games = Array.from({ length: 5 }, (_, i) => makeGame(`g${i}`, [
      makeBk('Pinnacle', -160, 140), // consistently different
      makeBk('DraftKings', -150, 130),
      makeBk('FanDuel', -150, 130),
      makeBk('BetMGM', -150, 130),
    ]))
    const result = identifySharpBooks(games)
    // Pinnacle deviates the most — should have higher sharpness score
    const pinnacle = result.scores.find(s => s.bookmaker === 'Pinnacle')!
    const dk = result.scores.find(s => s.bookmaker === 'DraftKings')!
    expect(pinnacle.outlierRate).toBeGreaterThanOrEqual(dk.outlierRate)
  })

  it('classifies books into sharp/moderate/soft', () => {
    const games = Array.from({ length: 10 }, (_, i) => makeGame(`g${i}`, [
      makeBk('Pinnacle', -170 - i, 150 + i, -105, -105), // extreme outlier
      makeBk('DraftKings', -150, 130),
      makeBk('FanDuel', -150, 130),
      makeBk('BetMGM', -150, 130),
    ]))
    const result = identifySharpBooks(games)
    for (const score of result.scores) {
      expect(['sharp', 'moderate', 'soft']).toContain(score.classification)
    }
  })

  it('identifies sharpest and softest books', () => {
    const games = Array.from({ length: 5 }, (_, i) => makeGame(`g${i}`, [
      makeBk('Sharp', -180, 160, -105, -105),
      makeBk('Medium', -155, 135),
      makeBk('Soft', -150, 130),
    ]))
    const result = identifySharpBooks(games)
    expect(result.sharpestBook).toBeDefined()
    expect(result.softestBook).toBeDefined()
    expect(result.sharpestBook).not.toBe(result.softestBook)
  })

  it('provides per-market breakdown', () => {
    const game = makeGame('g1', [
      makeBk('DK', -150, 130, -115, -105),
      makeBk('FD', -155, 135, -110, -110),
      makeBk('MGM', -145, 125, -110, -115),
    ])
    const result = identifySharpBooks([game])
    for (const score of result.scores) {
      expect(score.byMarket.moneyline).toBeDefined()
      expect(score.byMarket.spread).toBeDefined()
      expect(score.byMarket.total).toBeDefined()
      expect(score.byMarket.moneyline.outlierRate).toBeGreaterThanOrEqual(0)
      expect(score.byMarket.moneyline.bestLineRate).toBeGreaterThanOrEqual(0)
    }
  })

  it('calculates bestLineRate and worstLineRate', () => {
    const games = Array.from({ length: 5 }, (_, i) => makeGame(`g${i}`, [
      makeBk('BestBook', -140, 120), // best away price (lowest implied)
      makeBk('WorstBook', -160, 140), // worst away price
      makeBk('Middle', -150, 130),
    ]))
    const result = identifySharpBooks(games)
    const best = result.scores.find(s => s.bookmaker === 'BestBook')!
    const worst = result.scores.find(s => s.bookmaker === 'WorstBook')!
    expect(best.bestLineRate).toBeGreaterThan(0)
    expect(worst.worstLineRate).toBeGreaterThanOrEqual(0)
  })

  it('handles single game with many books', () => {
    const game = makeGame('g1', [
      makeBk('A', -150, 130),
      makeBk('B', -155, 135),
      makeBk('C', -145, 125),
      makeBk('D', -160, 140),
      makeBk('E', -150, 130),
      makeBk('F', -148, 128),
    ])
    const result = identifySharpBooks([game])
    expect(result.scores).toHaveLength(6)
    // Scores are sorted descending by sharpnessScore
    for (let i = 1; i < result.scores.length; i++) {
      expect(result.scores[i - 1].sharpnessScore).toBeGreaterThanOrEqual(result.scores[i].sharpnessScore)
    }
  })

  it('scores are 0-100', () => {
    const games = Array.from({ length: 3 }, (_, i) => makeGame(`g${i}`, [
      makeBk('DK', -150, 130),
      makeBk('FD', -155, 135),
      makeBk('MGM', -145, 125),
    ]))
    const result = identifySharpBooks(games)
    for (const score of result.scores) {
      expect(score.sharpnessScore).toBeGreaterThanOrEqual(0)
      expect(score.sharpnessScore).toBeLessThanOrEqual(100)
    }
  })

  it('tracks gamesAnalyzed per bookmaker', () => {
    const g1 = makeGame('g1', [
      makeBk('DK', -150, 130),
      makeBk('FD', -155, 135),
      makeBk('MGM', -145, 125),
    ])
    const g2 = makeGame('g2', [
      makeBk('DK', -140, 120),
      makeBk('FD', -145, 125),
      makeBk('Pinnacle', -150, 130),
    ])
    const result = identifySharpBooks([g1, g2])
    const dk = result.scores.find(s => s.bookmaker === 'DK')!
    const mgm = result.scores.find(s => s.bookmaker === 'MGM')!
    expect(dk.gamesAnalyzed).toBe(2)
    expect(mgm.gamesAnalyzed).toBe(1)
  })
})
