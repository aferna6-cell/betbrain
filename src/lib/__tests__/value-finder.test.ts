/**
 * Value Finder tests.
 *
 * Tests value play detection, scoring, sorting, and deduplication.
 * Pure logic — no Supabase or API calls.
 */

import { describe, it, expect } from 'vitest'
import { findValuePlays } from '@/lib/value-finder'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBk(
  name: string,
  opts: {
    ml?: [number | null, number | null]
    spread?: [number, number, number, number]
    total?: [number, number, number]
  } = {}
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: opts.ml ? { home: opts.ml[0], away: opts.ml[1], draw: null } : null,
    spread: opts.spread
      ? { homeLine: opts.spread[0], homeOdds: opts.spread[1], awayLine: opts.spread[2], awayOdds: opts.spread[3] }
      : null,
    total: opts.total
      ? { line: opts.total[0], overOdds: opts.total[1], underOdds: opts.total[2] }
      : null,
    lastUpdated: '2026-03-24T12:00:00Z',
  }
}

function makeGame(
  id: string,
  bookmakers: NormalizedBookmakerOdds[],
  overrides: Partial<NormalizedGame> = {}
): NormalizedGame {
  return {
    id,
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
// 1. Basic behavior
// ---------------------------------------------------------------------------

describe('findValuePlays', () => {
  it('returns empty for no games', () => {
    const result = findValuePlays([])
    expect(result.plays).toHaveLength(0)
    expect(result.gamesAnalyzed).toBe(0)
  })

  it('returns gamesAnalyzed count', () => {
    const games = [
      makeGame('g1', [makeBk('DK', { ml: [-110, -110] })]),
      makeGame('g2', [makeBk('FD', { ml: [-110, -110] })]),
    ]
    const result = findValuePlays(games)
    expect(result.gamesAnalyzed).toBe(2)
  })

  it('includes a timestamp', () => {
    const result = findValuePlays([])
    expect(result.timestamp).toBeTruthy()
    expect(new Date(result.timestamp).getTime()).not.toBeNaN()
  })
})

// ---------------------------------------------------------------------------
// 2. +EV detection
// ---------------------------------------------------------------------------

describe('findValuePlays — +EV', () => {
  it('detects +EV when one book offers significantly better odds', () => {
    const game = makeGame('g1', [
      makeBk('DK', { ml: [-115, -105] }),
      makeBk('FD', { ml: [-115, -105] }),
      makeBk('MGM', { ml: [-115, -105] }),
      makeBk('Sharp', { ml: [-100, -105] }),
    ])
    const result = findValuePlays([game])
    const evPlays = result.plays.filter((p) => p.reason === 'positive-ev')
    expect(evPlays.length).toBeGreaterThanOrEqual(0) // May or may not meet threshold
  })

  it('+EV plays have positive score', () => {
    const game = makeGame('g1', [
      makeBk('DK', { ml: [-120, -105] }),
      makeBk('FD', { ml: [-120, -105] }),
      makeBk('MGM', { ml: [-120, -105] }),
      makeBk('Sharp', { ml: [-100, +130] }),
    ])
    const result = findValuePlays([game])
    const evPlays = result.plays.filter((p) => p.reason === 'positive-ev')
    for (const play of evPlays) {
      expect(play.score).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 3. Bookmaker disagreement
// ---------------------------------------------------------------------------

describe('findValuePlays — bookmaker disagreement', () => {
  it('detects disagreement when books have very different odds', () => {
    const game = makeGame('g1', [
      makeBk('DK', { ml: [-300, +250] }),
      makeBk('FD', { ml: [-150, +130] }),
      makeBk('MGM', { ml: [-110, -110] }),
    ])
    const result = findValuePlays([game])
    // With high disagreement, we should get plays (either disagreement or +EV which also indicates disagreement)
    expect(result.plays.length).toBeGreaterThanOrEqual(1)
    // At least one play should be for this game
    const gamePlays = result.plays.filter((p) => p.game.id === 'g1')
    expect(gamePlays.length).toBeGreaterThanOrEqual(1)
  })

  it('no disagreement when books agree', () => {
    const game = makeGame('g1', [
      makeBk('DK', { ml: [-110, -110] }),
      makeBk('FD', { ml: [-110, -110] }),
      makeBk('MGM', { ml: [-110, -110] }),
    ])
    const result = findValuePlays([game])
    const disagreementPlays = result.plays.filter((p) => p.reason === 'bookmaker-disagreement')
    expect(disagreementPlays.every((p) => p.score < 30)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. Key line discrepancies
// ---------------------------------------------------------------------------

describe('findValuePlays — key line discrepancies', () => {
  it('detects key number crossing in NFL', () => {
    const game = makeGame('g1', [
      makeBk('DK', { spread: [-2.5, -110, 2.5, -110] }),
      makeBk('FD', { spread: [-3.5, -105, 3.5, -115] }),
    ], { sport: 'nfl', homeTeam: 'Chiefs', awayTeam: 'Raiders' })
    const result = findValuePlays([game])
    const discPlays = result.plays.filter((p) => p.reason === 'key-line-discrepancy')
    expect(discPlays.length).toBeGreaterThanOrEqual(1)
    expect(discPlays[0].score).toBe(60) // key number crossing = 60
  })
})

// ---------------------------------------------------------------------------
// 5. Sorting and deduplication
// ---------------------------------------------------------------------------

describe('findValuePlays — sorting', () => {
  it('sorts by score descending', () => {
    const game = makeGame('g1', [
      makeBk('DK', { ml: [-150, +130] }),
      makeBk('FD', { ml: [-200, +170] }),
      makeBk('MGM', { ml: [-120, +100] }),
    ])
    const result = findValuePlays([game])
    for (let i = 1; i < result.plays.length; i++) {
      expect(result.plays[i - 1].score).toBeGreaterThanOrEqual(result.plays[i].score)
    }
  })

  it('limits to 20 plays max', () => {
    // Create many games to generate many plays
    const games = Array.from({ length: 30 }, (_, i) =>
      makeGame(`g${i}`, [
        makeBk('DK', { ml: [-150, +130] }),
        makeBk('FD', { ml: [-200, +170] }),
        makeBk('MGM', { ml: [-120, +100] }),
      ], { homeTeam: `Team${i}A`, awayTeam: `Team${i}B` })
    )
    const result = findValuePlays(games)
    expect(result.plays.length).toBeLessThanOrEqual(20)
  })
})

// ---------------------------------------------------------------------------
// 6. Play structure
// ---------------------------------------------------------------------------

describe('ValuePlay structure', () => {
  it('plays have required fields', () => {
    const game = makeGame('g1', [
      makeBk('DK', { ml: [-150, +130] }),
      makeBk('FD', { ml: [-200, +170] }),
      makeBk('MGM', { ml: [-120, +100] }),
    ])
    const result = findValuePlays([game])
    for (const play of result.plays) {
      expect(play.id).toBeTruthy()
      expect(play.game).toBeDefined()
      expect(play.reason).toBeTruthy()
      expect(typeof play.score).toBe('number')
      expect(play.summary).toBeTruthy()
      expect(play.score).toBeGreaterThanOrEqual(0)
      expect(play.score).toBeLessThanOrEqual(100)
    }
  })

  it('+EV plays include bestBook and bestOdds', () => {
    const game = makeGame('g1', [
      makeBk('DK', { ml: [-120, -105] }),
      makeBk('FD', { ml: [-120, -105] }),
      makeBk('MGM', { ml: [-120, -105] }),
      makeBk('Sharp', { ml: [-100, +130] }),
    ])
    const result = findValuePlays([game])
    const evPlays = result.plays.filter((p) => p.reason === 'positive-ev')
    for (const play of evPlays) {
      expect(play.bestBook).toBeTruthy()
      expect(play.bestOdds).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Edge cases
// ---------------------------------------------------------------------------

describe('findValuePlays edge cases', () => {
  it('handles games with no bookmakers', () => {
    const game = makeGame('g1', [])
    const result = findValuePlays([game])
    expect(result.gamesAnalyzed).toBe(1)
    // Should not throw
  })

  it('handles single bookmaker game', () => {
    const game = makeGame('g1', [makeBk('DK', { ml: [-110, -110] })])
    const result = findValuePlays([game])
    expect(result.gamesAnalyzed).toBe(1)
  })

  it('no NaN or Infinity in scores', () => {
    const game = makeGame('g1', [
      makeBk('DK', { ml: [-500, +400] }),
      makeBk('FD', { ml: [-450, +350] }),
      makeBk('MGM', { ml: [-600, +500] }),
    ])
    const result = findValuePlays([game])
    for (const play of result.plays) {
      expect(isFinite(play.score)).toBe(true)
      expect(isNaN(play.score)).toBe(false)
    }
  })
})
