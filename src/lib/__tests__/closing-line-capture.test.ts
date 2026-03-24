/**
 * Closing Line Capture tests.
 *
 * Tests consensus odds calculation, CLV math, team matching,
 * and pick-to-game matching. Pure logic — no Supabase.
 */

import { describe, it, expect } from 'vitest'
import {
  matchClosingLines,
  calculateCLV,
  normalizeTeamName,
  type PendingPickForCapture,
} from '@/lib/closing-line-capture'
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

function makeGame(id: string, bookmakers: NormalizedBookmakerOdds[]): NormalizedGame {
  return {
    id,
    sport: 'nba',
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Boston Celtics',
    commenceTime: '2026-03-24T23:00:00Z',
    fromCache: true,
    isFresh: true,
    bookmakers,
  }
}

function makePick(overrides: Partial<PendingPickForCapture> = {}): PendingPickForCapture {
  return {
    id: 'pick-1',
    external_game_id: 'g1',
    pick_type: 'moneyline',
    pick_team: 'Los Angeles Lakers',
    odds: -110,
    game_date: '2026-03-24',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. matchClosingLines — basic matching
// ---------------------------------------------------------------------------

describe('matchClosingLines', () => {
  it('matches moneyline pick to consensus closing odds', () => {
    const picks = [makePick({ pick_type: 'moneyline', pick_team: 'Los Angeles Lakers', odds: -110 })]
    const games = [makeGame('g1', [
      makeBk('DK', { ml: [-115, +105] }),
      makeBk('FD', { ml: [-120, +110] }),
      makeBk('MGM', { ml: [-110, +100] }),
    ])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(1)
    // Consensus home: avg(-115, -120, -110) = -115
    expect(matches[0].closingOdds).toBeCloseTo(-115, 0)
    expect(matches[0].pickId).toBe('pick-1')
  })

  it('matches away team moneyline pick', () => {
    const picks = [makePick({ pick_type: 'moneyline', pick_team: 'Boston Celtics', odds: +100 })]
    const games = [makeGame('g1', [
      makeBk('DK', { ml: [-115, +105] }),
      makeBk('FD', { ml: [-120, +110] }),
    ])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(1)
    // Consensus away: avg(105, 110) = 107.5 -> 108 rounded
    expect(matches[0].closingOdds).toBeCloseTo(108, 0)
  })

  it('matches over picks to total over odds', () => {
    const picks = [makePick({ pick_type: 'over', pick_team: null, odds: -110 })]
    const games = [makeGame('g1', [
      makeBk('DK', { total: [220, -108, -112] }),
      makeBk('FD', { total: [220, -112, -108] }),
    ])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(1)
    // Consensus over: avg(-108, -112) = -110
    expect(matches[0].closingOdds).toBe(-110)
  })

  it('matches under picks to total under odds', () => {
    const picks = [makePick({ pick_type: 'under', pick_team: null, odds: -110 })]
    const games = [makeGame('g1', [
      makeBk('DK', { total: [220, -108, -112] }),
      makeBk('FD', { total: [220, -112, -108] }),
    ])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(1)
    // Consensus under: avg(-112, -108) = -110
    expect(matches[0].closingOdds).toBe(-110)
  })

  it('matches spread picks to spread odds', () => {
    const picks = [makePick({ pick_type: 'spread', pick_team: 'Los Angeles Lakers', odds: -110 })]
    const games = [makeGame('g1', [
      makeBk('DK', { spread: [-3.5, -108, 3.5, -112] }),
      makeBk('FD', { spread: [-3.5, -112, 3.5, -108] }),
    ])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(1)
    // Consensus home spread odds: avg(-108, -112) = -110
    expect(matches[0].closingOdds).toBe(-110)
  })
})

// ---------------------------------------------------------------------------
// 2. Skip conditions
// ---------------------------------------------------------------------------

describe('matchClosingLines — skip conditions', () => {
  it('skips picks that already have closing odds', () => {
    const picks = [makePick({ closing_odds: -120 })]
    const games = [makeGame('g1', [makeBk('DK', { ml: [-115, +105] })])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(0)
  })

  it('skips picks with no matching game', () => {
    const picks = [makePick({ external_game_id: 'nonexistent' })]
    const games = [makeGame('g1', [makeBk('DK', { ml: [-115, +105] })])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(0)
  })

  it('skips picks when game has no bookmakers', () => {
    const picks = [makePick()]
    const games = [makeGame('g1', [])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(0)
  })

  it('skips prop picks (no closing line data available)', () => {
    const picks = [makePick({ pick_type: 'prop' })]
    const games = [makeGame('g1', [makeBk('DK', { ml: [-115, +105] })])]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 3. calculateCLV
// ---------------------------------------------------------------------------

describe('calculateCLV', () => {
  it('positive CLV when closing line moved toward bet', () => {
    // Bet at -110, closing at -120 (market thinks team is more likely to win)
    const clv = calculateCLV(-110, -120)
    expect(clv).toBeGreaterThan(0)
  })

  it('negative CLV when closing line moved away from bet', () => {
    // Bet at -110, closing at -105 (market thinks team is less likely)
    const clv = calculateCLV(-110, -105)
    expect(clv).toBeLessThan(0)
  })

  it('zero CLV when odds unchanged', () => {
    expect(calculateCLV(-110, -110)).toBe(0)
  })

  it('positive CLV on underdog when line shortens', () => {
    // Bet at +150, closing at +130 (market moved toward your underdog pick)
    const clv = calculateCLV(150, 130)
    expect(clv).toBeGreaterThan(0)
  })

  it('returns finite values for extreme odds', () => {
    expect(isFinite(calculateCLV(-500, -200))).toBe(true)
    expect(isFinite(calculateCLV(500, 200))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. normalizeTeamName
// ---------------------------------------------------------------------------

describe('normalizeTeamName', () => {
  it('lowercases and removes non-alphanumeric', () => {
    expect(normalizeTeamName('Los Angeles Lakers')).toBe('losangeleslakers')
  })

  it('handles hyphens and periods', () => {
    expect(normalizeTeamName('L.A. Lakers')).toBe('lalakers')
  })

  it('handles extra spaces', () => {
    expect(normalizeTeamName('  Boston  Celtics  ')).toBe('bostonceltics')
  })

  it('matches equivalent team names', () => {
    expect(normalizeTeamName('Los Angeles Lakers')).toBe(normalizeTeamName('losangeleslakers'))
  })
})

// ---------------------------------------------------------------------------
// 5. Multiple picks
// ---------------------------------------------------------------------------

describe('matchClosingLines — multiple picks', () => {
  it('matches multiple picks to different games', () => {
    const picks = [
      makePick({ id: 'p1', external_game_id: 'g1', pick_team: 'Los Angeles Lakers' }),
      makePick({ id: 'p2', external_game_id: 'g2', pick_team: 'Golden State Warriors' }),
    ]
    const games = [
      makeGame('g1', [makeBk('DK', { ml: [-115, +105] })]),
      {
        ...makeGame('g2', [makeBk('DK', { ml: [-200, +170] })]),
        homeTeam: 'Golden State Warriors',
        awayTeam: 'Phoenix Suns',
      },
    ]

    const matches = matchClosingLines(picks, games)
    expect(matches).toHaveLength(2)
    expect(matches[0].pickId).toBe('p1')
    expect(matches[1].pickId).toBe('p2')
  })

  it('includes CLV for each match', () => {
    const picks = [
      makePick({ id: 'p1', odds: -110 }),
      makePick({ id: 'p2', odds: -120 }),
    ]
    const games = [makeGame('g1', [
      makeBk('DK', { ml: [-115, +105] }),
      makeBk('FD', { ml: [-115, +105] }),
    ])]
    // Both picks match same game
    // p1: bet -110, close -115 = positive CLV
    // p2: bet -120, close -115 = negative CLV

    // But p2 already has same game_id as p1, second pick should also match
    const matches = matchClosingLines(picks, games)
    // Both match the same game
    expect(matches.length).toBeGreaterThanOrEqual(1)
    for (const m of matches) {
      expect(typeof m.clv).toBe('number')
      expect(isFinite(m.clv)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 6. Edge cases
// ---------------------------------------------------------------------------

describe('matchClosingLines — edge cases', () => {
  it('handles empty picks array', () => {
    expect(matchClosingLines([], [])).toHaveLength(0)
  })

  it('handles empty games array', () => {
    const picks = [makePick()]
    expect(matchClosingLines(picks, [])).toHaveLength(0)
  })

  it('handles null pick_team for moneyline (skips)', () => {
    const picks = [makePick({ pick_team: null })]
    const games = [makeGame('g1', [makeBk('DK', { ml: [-110, -110] })])]
    // Without pick_team, can't determine home/away for moneyline
    expect(matchClosingLines(picks, games)).toHaveLength(0)
  })

  it('handles bookmaker with null moneyline', () => {
    const picks = [makePick()]
    const games = [makeGame('g1', [
      { bookmaker: 'DK', moneyline: null, spread: null, total: null, lastUpdated: '2026-03-24T12:00:00Z' },
    ])]
    expect(matchClosingLines(picks, games)).toHaveLength(0)
  })
})
