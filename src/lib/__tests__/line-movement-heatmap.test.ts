/**
 * Line Movement Heatmap tests.
 */

import { describe, it, expect } from 'vitest'
import { generateHeatmap, type HeatmapGame } from '@/lib/line-movement-heatmap'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

function makeBookmaker(
  name: string,
  homeOdds: number,
  awayOdds: number,
  spreadLine = -3.5,
  totalLine = 220.5
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: homeOdds, away: awayOdds },
    spread: { homeLine: spreadLine, homeOdds: -110, awayLine: -spreadLine, awayOdds: -110 },
    total: { line: totalLine, overOdds: -110, underOdds: -110 },
    lastUpdated: new Date().toISOString(),
  }
}

function makeGame(
  id: string,
  bookmakers: NormalizedBookmakerOdds[],
  sport = 'nba' as const
): NormalizedGame {
  return {
    id,
    sport,
    homeTeam: `Home${id}`,
    awayTeam: `Away${id}`,
    commenceTime: new Date().toISOString(),
    fromCache: true,
    isFresh: true,
    bookmakers,
  }
}

describe('generateHeatmap', () => {
  it('returns empty result for no games', () => {
    const result = generateHeatmap([])
    expect(result.games).toHaveLength(0)
    expect(result.hottest).toBeNull()
    expect(result.avgIntensity).toBe(0)
  })

  it('returns cold heat for tight lines', () => {
    const game = makeGame('g1', [
      makeBookmaker('b1', -150, +130, -3.5, 220.5),
      makeBookmaker('b2', -148, +128, -3.5, 220.5),
    ])
    const result = generateHeatmap([game])
    expect(result.games).toHaveLength(1)
    expect(result.games[0].heat).toBe('cold')
    expect(result.games[0].intensity).toBeLessThanOrEqual(10)
  })

  it('detects high moneyline movement', () => {
    const game = makeGame('g1', [
      makeBookmaker('b1', -200, +180),
      makeBookmaker('b2', -130, +110),
      makeBookmaker('b3', -110, +100),
    ])
    const result = generateHeatmap([game])
    expect(result.games[0].intensity).toBeGreaterThan(0)
  })

  it('detects spread movement', () => {
    const game = makeGame('g1', [
      makeBookmaker('b1', -150, +130, -1.5),
      makeBookmaker('b2', -150, +130, -4.5),
      makeBookmaker('b3', -150, +130, -3.0),
    ])
    const result = generateHeatmap([game])
    expect(result.games[0].spreadRange).toBeGreaterThan(0)
  })

  it('detects total movement', () => {
    const game = makeGame('g1', [
      makeBookmaker('b1', -150, +130, -3.5, 218),
      makeBookmaker('b2', -150, +130, -3.5, 223),
      makeBookmaker('b3', -150, +130, -3.5, 220),
    ])
    const result = generateHeatmap([game])
    expect(result.games[0].totalRange).toBeGreaterThan(0)
  })

  it('sorts by intensity descending', () => {
    const cold = makeGame('cold', [
      makeBookmaker('b1', -150, +130, -3.5, 220),
      makeBookmaker('b2', -150, +130, -3.5, 220),
    ])
    const hot = makeGame('hot', [
      makeBookmaker('b1', -200, +180, -1, 215),
      makeBookmaker('b2', -110, +100, -5, 225),
    ])
    const result = generateHeatmap([cold, hot])
    expect(result.games[0].game.id).toBe('hot')
    expect(result.games[1].game.id).toBe('cold')
  })

  it('identifies the hottest game', () => {
    const games = [
      makeGame('g1', [
        makeBookmaker('b1', -150, +130),
        makeBookmaker('b2', -148, +128),
      ]),
      makeGame('g2', [
        makeBookmaker('b1', -200, +180),
        makeBookmaker('b2', -110, +100),
      ]),
    ]
    const result = generateHeatmap(games)
    expect(result.hottest?.game.id).toBe('g2')
  })

  it('assigns valid heat levels', () => {
    const game = makeGame('g1', [
      makeBookmaker('b1', -150, +130),
      makeBookmaker('b2', -145, +125),
    ])
    const result = generateHeatmap([game])
    expect(['cold', 'mild', 'warm', 'hot', 'fire']).toContain(result.games[0].heat)
  })

  it('produces non-empty summary', () => {
    const game = makeGame('g1', [
      makeBookmaker('b1', -150, +130),
      makeBookmaker('b2', -110, +100),
    ])
    const result = generateHeatmap([game])
    expect(result.games[0].summary).toBeTruthy()
  })

  it('calculates average intensity', () => {
    const games = [
      makeGame('g1', [
        makeBookmaker('b1', -150, +130),
        makeBookmaker('b2', -148, +128),
      ]),
      makeGame('g2', [
        makeBookmaker('b1', -200, +180),
        makeBookmaker('b2', -110, +100),
      ]),
    ]
    const result = generateHeatmap(games)
    expect(result.avgIntensity).toBeGreaterThanOrEqual(0)
    expect(result.avgIntensity).toBeLessThanOrEqual(100)
  })

  it('handles single bookmaker gracefully', () => {
    const game = makeGame('g1', [
      makeBookmaker('b1', -150, +130),
    ])
    const result = generateHeatmap([game])
    expect(result.games[0].intensity).toBe(0)
    expect(result.games[0].heat).toBe('cold')
  })
})
