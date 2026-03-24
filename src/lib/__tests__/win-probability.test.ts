/**
 * Win Probability Calculator unit tests.
 */

import { describe, it, expect } from 'vitest'
import {
  calcBookProbability,
  calculateWinProbability,
  calculateAllWinProbabilities,
  formatProb,
} from '@/lib/win-probability'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Fixtures
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
// 1. Book probability calculation
// ---------------------------------------------------------------------------

describe('calcBookProbability', () => {
  it('calculates implied probabilities for standard -110/-110 line', () => {
    const bk = makeBookmaker('DK', -110, -110)
    const prob = calcBookProbability(bk)
    expect(prob).not.toBeNull()
    expect(prob!.homeProb).toBeCloseTo(0.5238, 3)
    expect(prob!.awayProb).toBeCloseTo(0.5238, 3)
    expect(prob!.vig).toBeGreaterThan(0)
  })

  it('no-vig probabilities sum to ~1', () => {
    const bk = makeBookmaker('DK', -150, 130)
    const prob = calcBookProbability(bk)
    expect(prob).not.toBeNull()
    expect(prob!.noVigHome + prob!.noVigAway).toBeCloseTo(1, 3)
  })

  it('returns null for missing odds', () => {
    const bk = makeBookmaker('DK', null, -110)
    expect(calcBookProbability(bk)).toBeNull()
  })

  it('heavy favorite has higher no-vig probability', () => {
    const bk = makeBookmaker('DK', -300, 250)
    const prob = calcBookProbability(bk)
    expect(prob!.noVigHome).toBeGreaterThan(prob!.noVigAway)
  })
})

// ---------------------------------------------------------------------------
// 2. Full win probability calculation
// ---------------------------------------------------------------------------

describe('calculateWinProbability', () => {
  it('consensus probabilities sum to 1', () => {
    const game = makeGame([
      makeBookmaker('DK', -150, 130),
      makeBookmaker('FD', -145, 125),
      makeBookmaker('MGM', -155, 135),
    ])
    const wp = calculateWinProbability(game)
    expect(wp.homeProb + wp.awayProb).toBeCloseTo(1, 3)
  })

  it('even odds produce ~50/50', () => {
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -110, -110),
      makeBookmaker('MGM', -110, -110),
    ])
    const wp = calculateWinProbability(game)
    expect(wp.homeProb).toBeCloseTo(0.5, 1)
    expect(wp.awayProb).toBeCloseTo(0.5, 1)
  })

  it('identifies most and least bullish books', () => {
    const game = makeGame([
      makeBookmaker('DK', -200, 170),    // Most bullish on home
      makeBookmaker('FD', -150, 130),
      makeBookmaker('MGM', -130, 110),   // Least bullish on home
    ])
    const wp = calculateWinProbability(game)
    expect(wp.mostBullishHome?.bookmaker).toBe('DK')
    expect(wp.leastBullishHome?.bookmaker).toBe('MGM')
  })

  it('disagreement is low when books agree', () => {
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -110, -110),
      makeBookmaker('MGM', -110, -110),
    ])
    const wp = calculateWinProbability(game)
    expect(wp.disagreement).toBeLessThan(0.01)
  })

  it('disagreement is high when books disagree', () => {
    const game = makeGame([
      makeBookmaker('DK', -200, 170),
      makeBookmaker('FD', -110, -110),
      makeBookmaker('MGM', 150, -170),
    ])
    const wp = calculateWinProbability(game)
    expect(wp.disagreement).toBeGreaterThan(0.01)
  })

  it('higher confidence with more agreeing books', () => {
    const agreeGame = makeGame([
      makeBookmaker('DK', -150, 130),
      makeBookmaker('FD', -150, 130),
      makeBookmaker('MGM', -150, 130),
      makeBookmaker('BR', -150, 130),
      makeBookmaker('PP', -150, 130),
    ])
    const disagreeGame = makeGame([
      makeBookmaker('DK', -200, 170),
      makeBookmaker('FD', -110, -110),
    ])
    const wp1 = calculateWinProbability(agreeGame)
    const wp2 = calculateWinProbability(disagreeGame)
    expect(wp1.confidence).toBeGreaterThan(wp2.confidence)
  })

  it('handles game with no bookmakers', () => {
    const game = makeGame([])
    const wp = calculateWinProbability(game)
    expect(wp.homeProb).toBe(0.5)
    expect(wp.awayProb).toBe(0.5)
    expect(wp.confidence).toBe(0)
  })

  it('handles game with null moneyline bookmakers', () => {
    const game = makeGame([
      { bookmaker: 'NullBook', moneyline: null, spread: null, total: null, lastUpdated: '2026-03-24T08:00:00Z' },
    ])
    const wp = calculateWinProbability(game)
    expect(wp.byBook).toHaveLength(0)
  })

  it('avgVig is positive for standard lines', () => {
    const game = makeGame([
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -110, -110),
    ])
    const wp = calculateWinProbability(game)
    expect(wp.avgVig).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Batch calculation
// ---------------------------------------------------------------------------

describe('calculateAllWinProbabilities', () => {
  it('filters out games with no book data', () => {
    const games = [
      makeGame([makeBookmaker('DK', -110, -110)], { id: 'g1' }),
      makeGame([], { id: 'g2' }),
    ]
    const results = calculateAllWinProbabilities(games)
    expect(results).toHaveLength(1)
    expect(results[0].game.id).toBe('g1')
  })

  it('sorts by confidence descending', () => {
    const games = [
      makeGame([makeBookmaker('DK', -110, -110)], { id: 'g1' }),
      makeGame([
        makeBookmaker('DK', -110, -110),
        makeBookmaker('FD', -110, -110),
        makeBookmaker('MGM', -110, -110),
        makeBookmaker('BR', -110, -110),
        makeBookmaker('PP', -110, -110),
      ], { id: 'g2' }),
    ]
    const results = calculateAllWinProbabilities(games)
    expect(results[0].game.id).toBe('g2')
  })
})

// ---------------------------------------------------------------------------
// 4. Format helper
// ---------------------------------------------------------------------------

describe('formatProb', () => {
  it('formats 0.5 as 50.0%', () => {
    expect(formatProb(0.5)).toBe('50.0%')
  })

  it('formats 0.6523 as 65.2%', () => {
    expect(formatProb(0.6523)).toBe('65.2%')
  })
})
