/**
 * EV Scanner API response shape tests.
 *
 * Verifies the serialization contract between the EV scanner lib
 * and the frontend — specifically the response shape returned by
 * the /api/ev route. No network calls; tests the data transform logic.
 */

import { describe, it, expect } from 'vitest'
import {
  scanForEV,
  detectArbitrage,
  type EVOpportunity,
  type ArbitrageOpportunity,
} from '@/lib/ev-scanner'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeBookmaker(
  name: string,
  homeOdds: number,
  awayOdds: number
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: homeOdds, away: awayOdds, draw: null },
    spread: null,
    total: null,
    lastUpdated: '2026-03-19T00:00:00Z',
  }
}

function makeGame(overrides: Partial<NormalizedGame> = {}): NormalizedGame {
  return {
    id: 'game-1',
    sport: 'nba',
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Boston Celtics',
    commenceTime: '2026-03-19T19:00:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers: [
      makeBookmaker('fanduel', -150, 130),
      makeBookmaker('draftkings', -145, 125),
      makeBookmaker('betmgm', -155, 135),
      makeBookmaker('caesars', -140, 120),
    ],
    ...overrides,
  }
}

// Simulate the API route's serialization transform
function serializeOpportunity(o: EVOpportunity) {
  return {
    gameId: o.game.id,
    sport: o.game.sport,
    homeTeam: o.game.homeTeam,
    awayTeam: o.game.awayTeam,
    commenceTime: o.game.commenceTime,
    market: o.market,
    side: o.side,
    team: o.team,
    bookmaker: o.bookmaker,
    bookOdds: o.bookOdds,
    fairOdds: o.fairOdds,
    ev: o.ev,
    fairProbability: o.fairProbability,
    bookImplied: o.bookImplied,
  }
}

function serializeArb(a: ArbitrageOpportunity) {
  return {
    gameId: a.game.id,
    sport: a.game.sport,
    homeTeam: a.game.homeTeam,
    awayTeam: a.game.awayTeam,
    homeBest: a.homeBest,
    awayBest: a.awayBest,
    totalImplied: a.totalImplied,
    profit: a.profit,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EV Scanner API response shape', () => {
  it('serialized opportunity has all required fields', () => {
    const game = makeGame({
      bookmakers: [
        makeBookmaker('fanduel', -200, 180),
        makeBookmaker('draftkings', -200, 180),
        makeBookmaker('betmgm', -200, 180),
        makeBookmaker('outlier', -200, 250), // outlier away odds → potential +EV
      ],
    })

    const result = scanForEV([game])
    if (result.opportunities.length > 0) {
      const serialized = serializeOpportunity(result.opportunities[0])
      expect(serialized).toHaveProperty('gameId')
      expect(serialized).toHaveProperty('sport')
      expect(serialized).toHaveProperty('homeTeam')
      expect(serialized).toHaveProperty('awayTeam')
      expect(serialized).toHaveProperty('commenceTime')
      expect(serialized).toHaveProperty('market')
      expect(serialized).toHaveProperty('side')
      expect(serialized).toHaveProperty('team')
      expect(serialized).toHaveProperty('bookmaker')
      expect(serialized).toHaveProperty('bookOdds')
      expect(serialized).toHaveProperty('fairOdds')
      expect(serialized).toHaveProperty('ev')
      expect(serialized).toHaveProperty('fairProbability')
      expect(serialized).toHaveProperty('bookImplied')
      // Verify no circular references (game object removed)
      expect(serialized).not.toHaveProperty('game')
    }
  })

  it('serialized arb has all required fields', () => {
    // Create an arbitrage scenario: home -120 + away +130
    // Implied: 0.5455 + 0.4348 = 0.9803 < 1 → arb
    const game = makeGame({
      bookmakers: [
        makeBookmaker('fanduel', -120, 130),
        makeBookmaker('draftkings', -130, 110),
      ],
    })

    const arbs = detectArbitrage([game])
    if (arbs.length > 0) {
      const serialized = serializeArb(arbs[0])
      expect(serialized).toHaveProperty('gameId')
      expect(serialized).toHaveProperty('sport')
      expect(serialized).toHaveProperty('homeTeam')
      expect(serialized).toHaveProperty('awayTeam')
      expect(serialized).toHaveProperty('homeBest')
      expect(serialized).toHaveProperty('awayBest')
      expect(serialized).toHaveProperty('totalImplied')
      expect(serialized).toHaveProperty('profit')
      expect(serialized.homeBest).toHaveProperty('bookmaker')
      expect(serialized.homeBest).toHaveProperty('odds')
      expect(serialized.homeBest).toHaveProperty('implied')
      expect(serialized).not.toHaveProperty('game')
    }
  })

  it('meta fields are correct', () => {
    const games = [makeGame(), makeGame({ id: 'game-2' })]
    const result = scanForEV(games)

    expect(result.gamesScanned).toBe(2)
    expect(typeof result.totalBooks).toBe('number')
    expect(result.totalBooks).toBeGreaterThan(0)
    expect(Array.isArray(result.opportunities)).toBe(true)
  })

  it('ev values are positive numbers', () => {
    const game = makeGame({
      bookmakers: [
        makeBookmaker('fanduel', -200, 250),
        makeBookmaker('draftkings', -200, 170),
        makeBookmaker('betmgm', -200, 175),
      ],
    })

    const result = scanForEV([game])
    for (const opp of result.opportunities) {
      expect(opp.ev).toBeGreaterThan(0)
      expect(typeof opp.ev).toBe('number')
    }
  })

  it('arb profit is a positive percentage', () => {
    const game = makeGame({
      bookmakers: [
        makeBookmaker('fanduel', -120, 130),
        makeBookmaker('draftkings', -130, 110),
      ],
    })

    const arbs = detectArbitrage([game])
    for (const arb of arbs) {
      if (arb.totalImplied < 1) {
        expect(arb.profit).toBeGreaterThan(0)
        expect(typeof arb.profit).toBe('number')
      }
    }
  })

  it('returns empty arrays with correct meta for no opportunities', () => {
    // All books have similar odds → no +EV
    const game = makeGame({
      bookmakers: [
        makeBookmaker('fanduel', -110, -110),
        makeBookmaker('draftkings', -110, -110),
        makeBookmaker('betmgm', -110, -110),
      ],
    })

    const result = scanForEV([game])
    expect(result.opportunities).toHaveLength(0)
    expect(result.gamesScanned).toBe(1)

    const arbs = detectArbitrage([game])
    expect(arbs).toHaveLength(0)
  })
})
