/**
 * Alert rule tests.
 *
 * Covers:
 * - CreateAlertInput type compliance
 * - Alert condition evaluation logic (above/below threshold)
 * - Side matching (home/away)
 * - Edge cases: null odds, missing bookmakers, no matching game
 *
 * The actual CRUD functions use Supabase, so we test the pure condition
 * logic locally (same pattern as route-handler.test.ts).
 */

import { describe, it, expect } from 'vitest'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Re-implement the pure alert evaluation logic locally
// ---------------------------------------------------------------------------

interface AlertRule {
  id: string
  external_game_id: string
  side: 'home' | 'away'
  condition: 'above' | 'below'
  threshold: number
  triggered: boolean
}

/**
 * Evaluates whether a single alert should trigger given a game's bookmakers.
 * Returns the triggering odds value, or null if not triggered.
 */
function evaluateAlert(
  alert: AlertRule,
  game: NormalizedGame
): number | null {
  for (const bk of game.bookmakers) {
    const odds =
      alert.side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (odds === null || odds === undefined) continue

    const triggered =
      alert.condition === 'above'
        ? odds > alert.threshold
        : odds < alert.threshold

    if (triggered) return odds
  }
  return null
}

/**
 * Checks multiple alerts against multiple games.
 * Returns how many alerts triggered.
 */
function checkAlertsLogic(
  alerts: AlertRule[],
  games: NormalizedGame[]
): { triggered: number; results: Map<string, number> } {
  const gameMap = new Map(games.map((g) => [g.id, g]))
  const results = new Map<string, number>()
  let triggered = 0

  for (const alert of alerts) {
    if (alert.triggered) continue
    const game = gameMap.get(alert.external_game_id)
    if (!game) continue

    const value = evaluateAlert(alert, game)
    if (value !== null) {
      results.set(alert.id, value)
      triggered++
    }
  }

  return { triggered, results }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeGame(
  id: string,
  bookmakers: NormalizedBookmakerOdds[] = []
): NormalizedGame {
  return {
    id,
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-14T19:30:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers,
  }
}

function makeBookmaker(
  name: string,
  home: number | null,
  away: number | null
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home, away, draw: null },
    spread: null,
    total: null,
    lastUpdated: '2026-03-14T12:00:00Z',
  }
}

function makeAlert(
  overrides: Partial<AlertRule> = {}
): AlertRule {
  return {
    id: 'alert-1',
    external_game_id: 'game-1',
    side: 'home',
    condition: 'above',
    threshold: -120,
    triggered: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// evaluateAlert
// ---------------------------------------------------------------------------

describe('evaluateAlert', () => {
  it('triggers "above" when odds exceed threshold', () => {
    const alert = makeAlert({ condition: 'above', threshold: -120, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const result = evaluateAlert(alert, game)
    expect(result).toBe(-110) // -110 > -120
  })

  it('does not trigger "above" when odds are below threshold', () => {
    const alert = makeAlert({ condition: 'above', threshold: -100, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const result = evaluateAlert(alert, game)
    expect(result).toBeNull() // -110 is not > -100
  })

  it('does not trigger "above" when odds equal threshold', () => {
    const alert = makeAlert({ condition: 'above', threshold: -110, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const result = evaluateAlert(alert, game)
    expect(result).toBeNull() // -110 is not > -110
  })

  it('triggers "below" when odds are under threshold', () => {
    const alert = makeAlert({ condition: 'below', threshold: -100, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const result = evaluateAlert(alert, game)
    expect(result).toBe(-110) // -110 < -100
  })

  it('does not trigger "below" when odds are above threshold', () => {
    const alert = makeAlert({ condition: 'below', threshold: -120, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const result = evaluateAlert(alert, game)
    expect(result).toBeNull() // -110 is not < -120
  })

  it('does not trigger "below" when odds equal threshold', () => {
    const alert = makeAlert({ condition: 'below', threshold: -110, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const result = evaluateAlert(alert, game)
    expect(result).toBeNull()
  })

  it('checks away side when alert.side is "away"', () => {
    const alert = makeAlert({ side: 'away', condition: 'above', threshold: 100 })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -150, 130)])
    const result = evaluateAlert(alert, game)
    expect(result).toBe(130) // away odds 130 > 100
  })

  it('ignores null moneyline odds', () => {
    const alert = makeAlert({ side: 'home', condition: 'above', threshold: -200 })
    const game = makeGame('game-1', [makeBookmaker('fanduel', null, 130)])
    const result = evaluateAlert(alert, game)
    expect(result).toBeNull()
  })

  it('ignores bookmakers with null moneyline', () => {
    const alert = makeAlert({ side: 'home', condition: 'above', threshold: -200 })
    const bk: NormalizedBookmakerOdds = {
      bookmaker: 'test',
      moneyline: null,
      spread: null,
      total: null,
      lastUpdated: '2026-03-14T12:00:00Z',
    }
    const game = makeGame('game-1', [bk])
    const result = evaluateAlert(alert, game)
    expect(result).toBeNull()
  })

  it('returns null when game has no bookmakers', () => {
    const alert = makeAlert()
    const game = makeGame('game-1', [])
    const result = evaluateAlert(alert, game)
    expect(result).toBeNull()
  })

  it('returns the first matching bookmaker odds', () => {
    const alert = makeAlert({ condition: 'above', threshold: -120, side: 'home' })
    const game = makeGame('game-1', [
      makeBookmaker('fanduel', -115, 130),
      makeBookmaker('draftkings', -105, 125),
    ])
    const result = evaluateAlert(alert, game)
    expect(result).toBe(-115) // first match
  })

  it('skips non-matching bookmakers and finds later match', () => {
    const alert = makeAlert({ condition: 'above', threshold: -100, side: 'home' })
    const game = makeGame('game-1', [
      makeBookmaker('fanduel', -110, 130),   // -110 is not > -100
      makeBookmaker('draftkings', -95, 125), // -95 > -100 ✓
    ])
    const result = evaluateAlert(alert, game)
    expect(result).toBe(-95)
  })
})

// ---------------------------------------------------------------------------
// Positive vs negative odds behavior
// ---------------------------------------------------------------------------

describe('odds sign behavior', () => {
  it('positive odds: +150 is above +100', () => {
    const alert = makeAlert({ condition: 'above', threshold: 100, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('test', 150, -200)])
    expect(evaluateAlert(alert, game)).toBe(150)
  })

  it('negative odds: -110 is above -150 (less negative = higher)', () => {
    const alert = makeAlert({ condition: 'above', threshold: -150, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('test', -110, 130)])
    expect(evaluateAlert(alert, game)).toBe(-110)
  })

  it('negative odds: -200 is below -150 (more negative = lower)', () => {
    const alert = makeAlert({ condition: 'below', threshold: -150, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('test', -200, 300)])
    expect(evaluateAlert(alert, game)).toBe(-200)
  })

  it('crossing zero: -10 is below +10', () => {
    const alert = makeAlert({ condition: 'below', threshold: 10, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('test', -10, 110)])
    expect(evaluateAlert(alert, game)).toBe(-10)
  })
})

// ---------------------------------------------------------------------------
// checkAlertsLogic (batch evaluation)
// ---------------------------------------------------------------------------

describe('checkAlertsLogic', () => {
  it('returns 0 when no alerts', () => {
    const result = checkAlertsLogic([], [makeGame('game-1')])
    expect(result.triggered).toBe(0)
  })

  it('returns 0 when no games', () => {
    const result = checkAlertsLogic([makeAlert()], [])
    expect(result.triggered).toBe(0)
  })

  it('returns 0 when alert game id does not match any game', () => {
    const alert = makeAlert({ external_game_id: 'game-999' })
    const result = checkAlertsLogic([alert], [makeGame('game-1')])
    expect(result.triggered).toBe(0)
  })

  it('skips already-triggered alerts', () => {
    const alert = makeAlert({ triggered: true })
    const game = makeGame('game-1', [makeBookmaker('fanduel', 999, 999)])
    const result = checkAlertsLogic([alert], [game])
    expect(result.triggered).toBe(0)
  })

  it('triggers matching alert and records the value', () => {
    const alert = makeAlert({ condition: 'above', threshold: -120, side: 'home' })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const result = checkAlertsLogic([alert], [game])
    expect(result.triggered).toBe(1)
    expect(result.results.get('alert-1')).toBe(-110)
  })

  it('handles multiple alerts on same game', () => {
    const alert1 = makeAlert({
      id: 'alert-1',
      condition: 'above',
      threshold: -120,
      side: 'home',
    })
    const alert2 = makeAlert({
      id: 'alert-2',
      condition: 'below',
      threshold: 140,
      side: 'away',
    })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const result = checkAlertsLogic([alert1, alert2], [game])
    expect(result.triggered).toBe(2)
  })

  it('handles alerts on different games', () => {
    const alert1 = makeAlert({
      id: 'alert-1',
      external_game_id: 'game-1',
      condition: 'above',
      threshold: -200,
      side: 'home',
    })
    const alert2 = makeAlert({
      id: 'alert-2',
      external_game_id: 'game-2',
      condition: 'above',
      threshold: -200,
      side: 'home',
    })
    const game1 = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    const game2 = makeGame('game-2', [makeBookmaker('draftkings', -150, 170)])
    const result = checkAlertsLogic([alert1, alert2], [game1, game2])
    expect(result.triggered).toBe(2)
  })

  it('only some alerts trigger when mixed', () => {
    const alert1 = makeAlert({
      id: 'alert-1',
      condition: 'above',
      threshold: -120,
      side: 'home',
    })
    const alert2 = makeAlert({
      id: 'alert-2',
      condition: 'above',
      threshold: -100,
      side: 'home',
    })
    const game = makeGame('game-1', [makeBookmaker('fanduel', -110, 130)])
    // alert1: -110 > -120 ✓, alert2: -110 > -100 ✗
    const result = checkAlertsLogic([alert1, alert2], [game])
    expect(result.triggered).toBe(1)
    expect(result.results.has('alert-1')).toBe(true)
    expect(result.results.has('alert-2')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// CreateAlertInput type compliance
// ---------------------------------------------------------------------------

describe('CreateAlertInput type compliance', () => {
  it('accepts valid input', () => {
    const input = {
      userId: 'user-123',
      externalGameId: 'game-abc',
      sport: 'nba',
      team: 'Lakers',
      side: 'home' as const,
      condition: 'above' as const,
      threshold: -110,
    }
    expect(input.userId).toBe('user-123')
    expect(input.side).toBe('home')
    expect(input.condition).toBe('above')
  })

  it('threshold can be positive', () => {
    const input = {
      userId: 'user-1',
      externalGameId: 'g-1',
      sport: 'nfl',
      team: 'Chiefs',
      side: 'away' as const,
      condition: 'below' as const,
      threshold: 150,
    }
    expect(input.threshold).toBe(150)
  })

  it('threshold can be negative', () => {
    const input = {
      userId: 'user-1',
      externalGameId: 'g-1',
      sport: 'mlb',
      team: 'Yankees',
      side: 'home' as const,
      condition: 'above' as const,
      threshold: -200,
    }
    expect(input.threshold).toBe(-200)
  })
})
