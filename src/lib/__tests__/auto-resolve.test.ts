import { describe, it, expect } from 'vitest'
import {
  computeProfit,
  normalizeTeamName,
  matchPickToGame,
  determineOutcome,
  resolvePicksBatch,
  resolveSignalOutcome,
  type GameResult,
  type PendingPick,
} from '@/lib/auto-resolve'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePick(overrides: Partial<PendingPick> = {}): PendingPick {
  return {
    id: 'pick-1',
    external_game_id: 'odds-api-game-123',
    sport: 'nba',
    pick_type: 'moneyline',
    pick_team: 'Los Angeles Lakers',
    pick_line: null,
    odds: -110,
    units: 1,
    game_date: '2026-03-18',
    ...overrides,
  }
}

function makeGame(overrides: Partial<GameResult> = {}): GameResult {
  return {
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Boston Celtics',
    homeScore: 112,
    awayScore: 105,
    date: '2026-03-18',
    status: 'Final',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// computeProfit
// ---------------------------------------------------------------------------

describe('computeProfit', () => {
  it('returns positive profit for win with negative (favorite) odds', () => {
    // -110 odds: risk $1 to win $0.909
    const profit = computeProfit('win', -110, 1)
    expect(profit).toBeCloseTo(0.909, 2)
  })

  it('returns positive profit for win with positive (underdog) odds', () => {
    // +150 odds: risk $1 to win $1.50
    const profit = computeProfit('win', 150, 1)
    expect(profit).toBe(1.5)
  })

  it('returns negative units for loss', () => {
    expect(computeProfit('loss', -110, 2)).toBe(-2)
    expect(computeProfit('loss', 150, 3)).toBe(-3)
  })

  it('returns 0 for push', () => {
    expect(computeProfit('push', -110, 1)).toBe(0)
  })

  it('returns 0 for pending', () => {
    expect(computeProfit('pending', -110, 1)).toBe(0)
  })

  it('scales profit with units', () => {
    const profit = computeProfit('win', 200, 5)
    expect(profit).toBe(10) // +200 odds * 5 units = 10
  })

  it('handles even odds (-100)', () => {
    const profit = computeProfit('win', -100, 1)
    expect(profit).toBe(1)
  })

  it('handles even odds (+100)', () => {
    const profit = computeProfit('win', 100, 1)
    expect(profit).toBe(1)
  })

  it('handles heavy favorite (-1000)', () => {
    const profit = computeProfit('win', -1000, 1)
    expect(profit).toBeCloseTo(0.1, 2) // risk $1 to win $0.10
  })

  it('handles big underdog (+1000)', () => {
    const profit = computeProfit('win', 1000, 1)
    expect(profit).toBe(10) // risk $1 to win $10
  })
})

// ---------------------------------------------------------------------------
// normalizeTeamName
// ---------------------------------------------------------------------------

describe('normalizeTeamName', () => {
  it('lowercases and trims', () => {
    expect(normalizeTeamName('  Los Angeles Lakers  ')).toBe('los angeles lakers')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeTeamName('Los  Angeles   Lakers')).toBe('los angeles lakers')
  })

  it('handles already-normalized names', () => {
    expect(normalizeTeamName('boston celtics')).toBe('boston celtics')
  })
})

// ---------------------------------------------------------------------------
// matchPickToGame
// ---------------------------------------------------------------------------

describe('matchPickToGame', () => {
  it('matches by team name and date', () => {
    const pick = makePick()
    const games = [makeGame()]
    expect(matchPickToGame(pick, games)).toEqual(games[0])
  })

  it('matches away team picks', () => {
    const pick = makePick({ pick_team: 'Boston Celtics' })
    const games = [makeGame()]
    expect(matchPickToGame(pick, games)).toEqual(games[0])
  })

  it('returns null for non-Final games', () => {
    const pick = makePick()
    const games = [makeGame({ status: 'In Progress' })]
    expect(matchPickToGame(pick, games)).toBeNull()
  })

  it('returns null when date does not match', () => {
    const pick = makePick({ game_date: '2026-03-20' })
    const games = [makeGame()]
    expect(matchPickToGame(pick, games)).toBeNull()
  })

  it('returns null when team name does not match', () => {
    const pick = makePick({ pick_team: 'Golden State Warriors' })
    const games = [makeGame()]
    expect(matchPickToGame(pick, games)).toBeNull()
  })

  it('matches over/under picks without pick_team when single game on date', () => {
    const pick = makePick({ pick_type: 'over', pick_team: null, pick_line: 215.5 })
    const games = [makeGame()]
    expect(matchPickToGame(pick, games)).toEqual(games[0])
  })

  it('returns null for over/under without pick_team when multiple games on same date', () => {
    const pick = makePick({ pick_type: 'over', pick_team: null, pick_line: 215.5 })
    const games = [
      makeGame(),
      makeGame({ homeTeam: 'Golden State Warriors', awayTeam: 'Miami Heat' }),
    ]
    expect(matchPickToGame(pick, games)).toBeNull()
  })

  it('matches over/under with pick_team even on multi-game days', () => {
    const pick = makePick({ pick_type: 'over', pick_team: 'Los Angeles Lakers', pick_line: 215.5 })
    const games = [
      makeGame(),
      makeGame({ homeTeam: 'Golden State Warriors', awayTeam: 'Miami Heat' }),
    ]
    expect(matchPickToGame(pick, games)).toEqual(games[0])
  })

  it('is case-insensitive', () => {
    const pick = makePick({ pick_team: 'LOS ANGELES LAKERS' })
    const games = [makeGame()]
    expect(matchPickToGame(pick, games)).toEqual(games[0])
  })
})

// ---------------------------------------------------------------------------
// determineOutcome — moneyline
// ---------------------------------------------------------------------------

describe('determineOutcome — moneyline', () => {
  it('returns win when picked team has higher score', () => {
    const pick = makePick({ pick_team: 'Los Angeles Lakers' })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('win')
  })

  it('returns loss when picked team has lower score', () => {
    const pick = makePick({ pick_team: 'Boston Celtics' })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('loss')
  })

  it('returns push on tied score', () => {
    const pick = makePick({ pick_team: 'Los Angeles Lakers' })
    const game = makeGame({ homeScore: 105, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('push')
  })

  it('returns null when pick_team is null', () => {
    const pick = makePick({ pick_team: null })
    const game = makeGame()
    expect(determineOutcome(pick, game)).toBeNull()
  })

  it('returns null when pick_team matches neither team', () => {
    const pick = makePick({ pick_team: 'Chicago Bulls' })
    const game = makeGame()
    expect(determineOutcome(pick, game)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// determineOutcome — spread
// ---------------------------------------------------------------------------

describe('determineOutcome — spread', () => {
  it('returns win when team covers the spread', () => {
    // Lakers -3.5: 112 + (-3.5) = 108.5 > 105 → win
    const pick = makePick({ pick_type: 'spread', pick_team: 'Los Angeles Lakers', pick_line: -3.5 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('win')
  })

  it('returns loss when team does not cover', () => {
    // Lakers -10.5: 112 + (-10.5) = 101.5 < 105 → loss
    const pick = makePick({ pick_type: 'spread', pick_team: 'Los Angeles Lakers', pick_line: -10.5 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('loss')
  })

  it('returns push on exact cover', () => {
    // Lakers -7: 112 + (-7) = 105 == 105 → push
    const pick = makePick({ pick_type: 'spread', pick_team: 'Los Angeles Lakers', pick_line: -7 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('push')
  })

  it('handles away team spread', () => {
    // Celtics +7: 105 + 7 = 112 == 112 → push
    const pick = makePick({ pick_type: 'spread', pick_team: 'Boston Celtics', pick_line: 7 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('push')
  })

  it('away underdog covers', () => {
    // Celtics +10.5: 105 + 10.5 = 115.5 > 112 → win
    const pick = makePick({ pick_type: 'spread', pick_team: 'Boston Celtics', pick_line: 10.5 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('win')
  })

  it('returns null when pick_line is missing', () => {
    const pick = makePick({ pick_type: 'spread', pick_line: null })
    const game = makeGame()
    expect(determineOutcome(pick, game)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// determineOutcome — over/under
// ---------------------------------------------------------------------------

describe('determineOutcome — over/under', () => {
  it('over wins when total exceeds line', () => {
    // Total = 112 + 105 = 217 > 215.5 → win
    const pick = makePick({ pick_type: 'over', pick_team: null, pick_line: 215.5 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('win')
  })

  it('over loses when total is under line', () => {
    const pick = makePick({ pick_type: 'over', pick_team: null, pick_line: 220.5 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('loss')
  })

  it('over pushes on exact total', () => {
    const pick = makePick({ pick_type: 'over', pick_team: null, pick_line: 217 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('push')
  })

  it('under wins when total is below line', () => {
    const pick = makePick({ pick_type: 'under', pick_team: null, pick_line: 220.5 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('win')
  })

  it('under loses when total exceeds line', () => {
    const pick = makePick({ pick_type: 'under', pick_team: null, pick_line: 215.5 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('loss')
  })

  it('under pushes on exact total', () => {
    const pick = makePick({ pick_type: 'under', pick_team: null, pick_line: 217 })
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(determineOutcome(pick, game)).toBe('push')
  })

  it('returns null when line is missing', () => {
    const pick = makePick({ pick_type: 'over', pick_line: null })
    const game = makeGame()
    expect(determineOutcome(pick, game)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// determineOutcome — prop
// ---------------------------------------------------------------------------

describe('determineOutcome — prop', () => {
  it('returns null for prop picks', () => {
    const pick = makePick({ pick_type: 'prop' })
    const game = makeGame()
    expect(determineOutcome(pick, game)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// resolvePicksBatch
// ---------------------------------------------------------------------------

describe('resolvePicksBatch', () => {
  const games = [makeGame()]

  it('resolves moneyline win', () => {
    const picks = [makePick()]
    const result = resolvePicksBatch(picks, games)
    expect(result.resolved).toHaveLength(1)
    expect(result.resolved[0].outcome).toBe('win')
    expect(result.resolved[0].profit).toBeCloseTo(0.91, 1)
    expect(result.skipped).toHaveLength(0)
  })

  it('skips non-NBA picks', () => {
    const picks = [makePick({ sport: 'nfl' })]
    const result = resolvePicksBatch(picks, games)
    expect(result.resolved).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].reason).toBe('non-nba sport')
  })

  it('skips prop picks', () => {
    const picks = [makePick({ pick_type: 'prop' })]
    const result = resolvePicksBatch(picks, games)
    expect(result.resolved).toHaveLength(0)
    expect(result.skipped[0].reason).toContain('prop')
  })

  it('skips picks with no matching game', () => {
    const picks = [makePick({ game_date: '2026-12-25' })]
    const result = resolvePicksBatch(picks, games)
    expect(result.resolved).toHaveLength(0)
    expect(result.skipped[0].reason).toContain('no matching')
  })

  it('handles mixed batch', () => {
    const picks = [
      makePick({ id: 'ml-win', pick_team: 'Los Angeles Lakers' }),
      makePick({ id: 'ml-loss', pick_team: 'Boston Celtics' }),
      makePick({ id: 'spread-win', pick_type: 'spread', pick_team: 'Los Angeles Lakers', pick_line: -3.5 }),
      makePick({ id: 'over-win', pick_type: 'over', pick_team: null, pick_line: 215.5 }),
      makePick({ id: 'prop-skip', pick_type: 'prop' }),
      makePick({ id: 'nfl-skip', sport: 'nfl' }),
    ]
    const result = resolvePicksBatch(picks, games)

    expect(result.resolved).toHaveLength(4)
    expect(result.skipped).toHaveLength(2)

    const byId = (id: string) => result.resolved.find((r) => r.pickId === id)
    expect(byId('ml-win')?.outcome).toBe('win')
    expect(byId('ml-loss')?.outcome).toBe('loss')
    expect(byId('spread-win')?.outcome).toBe('win')
    expect(byId('over-win')?.outcome).toBe('win')
  })

  it('rounds profit to 2 decimal places', () => {
    const picks = [makePick({ odds: -115, units: 1 })]
    const result = resolvePicksBatch(picks, games)
    const profit = result.resolved[0].profit
    // 100/115 = 0.86956... → round to 0.87
    expect(profit).toBe(0.87)
  })

  it('handles empty picks array', () => {
    const result = resolvePicksBatch([], games)
    expect(result.resolved).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })

  it('handles empty games array', () => {
    const picks = [makePick()]
    const result = resolvePicksBatch(picks, [])
    expect(result.resolved).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// resolveSignalOutcome
// ---------------------------------------------------------------------------

describe('resolveSignalOutcome', () => {
  it('returns win when value_side (home) team wins', () => {
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(resolveSignalOutcome('home', game)).toBe('win')
  })

  it('returns loss when value_side (home) team loses', () => {
    const game = makeGame({ homeScore: 100, awayScore: 110 })
    expect(resolveSignalOutcome('home', game)).toBe('loss')
  })

  it('returns win when value_side (away) team wins', () => {
    const game = makeGame({ homeScore: 100, awayScore: 110 })
    expect(resolveSignalOutcome('away', game)).toBe('win')
  })

  it('returns loss when value_side (away) team loses', () => {
    const game = makeGame({ homeScore: 112, awayScore: 105 })
    expect(resolveSignalOutcome('away', game)).toBe('loss')
  })

  it('returns push on tie', () => {
    const game = makeGame({ homeScore: 105, awayScore: 105 })
    expect(resolveSignalOutcome('home', game)).toBe('push')
    expect(resolveSignalOutcome('away', game)).toBe('push')
  })
})
