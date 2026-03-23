import { describe, it, expect } from 'vitest'
import {
  detectSteamMoves,
  formatSteamMoveSummary,
  type OddsSnapshot,
  type SteamMove,
} from '../steam-moves'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(
  overrides: Partial<OddsSnapshot> & { fetched_at: string }
): OddsSnapshot {
  return {
    external_game_id: 'game-1',
    bookmaker: 'fanduel',
    market: 'h2h',
    home_odds: null,
    away_odds: null,
    spread_home: null,
    spread_away: null,
    spread_line: null,
    total_over: null,
    total_under: null,
    total_line: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// detectSteamMoves
// ---------------------------------------------------------------------------

describe('detectSteamMoves', () => {
  it('returns empty array for empty input', () => {
    expect(detectSteamMoves([])).toEqual([])
  })

  it('returns empty array for single snapshot', () => {
    const snaps = [makeSnapshot({ fetched_at: '2026-03-23T12:00:00Z', home_odds: -150 })]
    expect(detectSteamMoves(snaps)).toEqual([])
  })

  it('detects a significant moneyline move', () => {
    // -150 implied = 60%, -200 implied = 66.7%, diff = 6.7pp
    const snaps = [
      makeSnapshot({ fetched_at: '2026-03-23T12:00:00Z', home_odds: -150 }),
      makeSnapshot({ fetched_at: '2026-03-23T12:30:00Z', home_odds: -200 }),
    ]
    const moves = detectSteamMoves(snaps)
    expect(moves.length).toBeGreaterThanOrEqual(1)
    expect(moves[0].market).toBe('moneyline')
    expect(moves[0].side).toBe('home')
    expect(moves[0].magnitudePP).toBeGreaterThanOrEqual(3)
    expect(moves[0].fromValue).toBe(-150)
    expect(moves[0].toValue).toBe(-200)
  })

  it('ignores small moneyline moves', () => {
    // -150 to -155 is tiny
    const snaps = [
      makeSnapshot({ fetched_at: '2026-03-23T12:00:00Z', home_odds: -150 }),
      makeSnapshot({ fetched_at: '2026-03-23T12:30:00Z', home_odds: -155 }),
    ]
    const moves = detectSteamMoves(snaps)
    expect(moves).toEqual([])
  })

  it('ignores moves outside the time window', () => {
    // 2 hours apart — too slow to be steam
    const snaps = [
      makeSnapshot({ fetched_at: '2026-03-23T10:00:00Z', home_odds: -150 }),
      makeSnapshot({ fetched_at: '2026-03-23T12:00:00Z', home_odds: -250 }),
    ]
    const moves = detectSteamMoves(snaps)
    expect(moves).toEqual([])
  })

  it('detects spread line movement', () => {
    const snaps = [
      makeSnapshot({ fetched_at: '2026-03-23T12:00:00Z', spread_line: -3.5 }),
      makeSnapshot({ fetched_at: '2026-03-23T12:20:00Z', spread_line: -5.5 }),
    ]
    const moves = detectSteamMoves(snaps)
    expect(moves.length).toBe(1)
    expect(moves[0].market).toBe('spread')
    expect(moves[0].fromValue).toBe(-3.5)
    expect(moves[0].toValue).toBe(-5.5)
  })

  it('ignores small spread moves', () => {
    const snaps = [
      makeSnapshot({ fetched_at: '2026-03-23T12:00:00Z', spread_line: -3.5 }),
      makeSnapshot({ fetched_at: '2026-03-23T12:20:00Z', spread_line: -4.0 }),
    ]
    const moves = detectSteamMoves(snaps)
    expect(moves).toEqual([])
  })

  it('detects total line movement', () => {
    const snaps = [
      makeSnapshot({ fetched_at: '2026-03-23T12:00:00Z', total_line: 220.5 }),
      makeSnapshot({ fetched_at: '2026-03-23T12:30:00Z', total_line: 223.0 }),
    ]
    const moves = detectSteamMoves(snaps)
    expect(moves.length).toBe(1)
    expect(moves[0].market).toBe('total')
    expect(moves[0].side).toBe('over')
  })

  it('handles multiple bookmakers independently', () => {
    const snaps = [
      makeSnapshot({ bookmaker: 'fanduel', fetched_at: '2026-03-23T12:00:00Z', home_odds: -150 }),
      makeSnapshot({ bookmaker: 'fanduel', fetched_at: '2026-03-23T12:30:00Z', home_odds: -200 }),
      makeSnapshot({ bookmaker: 'draftkings', fetched_at: '2026-03-23T12:00:00Z', home_odds: -150 }),
      makeSnapshot({ bookmaker: 'draftkings', fetched_at: '2026-03-23T12:30:00Z', home_odds: -155 }),
    ]
    const moves = detectSteamMoves(snaps)
    // FanDuel has big move, DraftKings doesn't
    const fanDuelMove = moves.find((m) => m.bookmaker === 'fanduel')
    const dkMove = moves.find((m) => m.bookmaker === 'draftkings')
    expect(fanDuelMove).toBeDefined()
    expect(dkMove).toBeUndefined()
  })

  it('deduplicates moves per game+market+side, keeping highest magnitude', () => {
    // Three snapshots from same book — should only get one move for home ML
    const snaps = [
      makeSnapshot({ fetched_at: '2026-03-23T12:00:00Z', home_odds: -150 }),
      makeSnapshot({ fetched_at: '2026-03-23T12:15:00Z', home_odds: -175 }),
      makeSnapshot({ fetched_at: '2026-03-23T12:30:00Z', home_odds: -220 }),
    ]
    const moves = detectSteamMoves(snaps)
    const homeMlMoves = moves.filter((m) => m.market === 'moneyline' && m.side === 'home')
    expect(homeMlMoves.length).toBe(1)
  })

  it('sorts moves by magnitude descending', () => {
    const snaps = [
      // Big ML move
      makeSnapshot({
        external_game_id: 'game-1',
        fetched_at: '2026-03-23T12:00:00Z',
        home_odds: -150,
        spread_line: -3.5,
      }),
      makeSnapshot({
        external_game_id: 'game-1',
        fetched_at: '2026-03-23T12:20:00Z',
        home_odds: -250,
        spread_line: -5.5,
      }),
    ]
    const moves = detectSteamMoves(snaps)
    if (moves.length >= 2) {
      expect(moves[0].magnitudePP).toBeGreaterThanOrEqual(moves[1].magnitudePP)
    }
  })
})

// ---------------------------------------------------------------------------
// formatSteamMoveSummary
// ---------------------------------------------------------------------------

describe('formatSteamMoveSummary', () => {
  it('includes bookmaker name without underscores', () => {
    const move: SteamMove = {
      gameId: 'game-1',
      market: 'moneyline',
      direction: 'Home ML moved from -150 to -200',
      side: 'home',
      bookmaker: 'fan_duel',
      magnitudePP: 6.7,
      windowMinutes: 30,
      velocityPPH: 13.4,
      fromValue: -150,
      toValue: -200,
      detectedAt: '2026-03-23T12:30:00Z',
    }
    const summary = formatSteamMoveSummary(move)
    expect(summary).toContain('fan duel')
    expect(summary).not.toContain('_')
  })

  it('labels very fast moves', () => {
    const move: SteamMove = {
      gameId: 'game-1',
      market: 'moneyline',
      direction: 'Home ML moved from -150 to -200',
      side: 'home',
      bookmaker: 'fanduel',
      magnitudePP: 6.7,
      windowMinutes: 15,
      velocityPPH: 26.8,
      fromValue: -150,
      toValue: -200,
      detectedAt: '2026-03-23T12:30:00Z',
    }
    expect(formatSteamMoveSummary(move)).toContain('Very fast')
  })

  it('labels moderate speed moves', () => {
    const move: SteamMove = {
      gameId: 'game-1',
      market: 'spread',
      direction: 'Spread moved from -3.5 to -5.5',
      side: 'home',
      bookmaker: 'fanduel',
      magnitudePP: 2.0,
      windowMinutes: 30,
      velocityPPH: 7.0,
      fromValue: -3.5,
      toValue: -5.5,
      detectedAt: '2026-03-23T12:30:00Z',
    }
    expect(formatSteamMoveSummary(move)).toContain('Moderate')
  })
})
