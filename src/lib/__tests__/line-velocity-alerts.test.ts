/**
 * Line Velocity Alerts unit tests.
 *
 * Tests rule creation, movement triggering, alert evaluation,
 * cooldowns, and formatting.
 */

import { describe, it, expect } from 'vitest'
import {
  createRule,
  createPresetRules,
  doesMovementTriggerRule,
  evaluateMovements,
  getAlertPriority,
  formatAlertMessage,
  getPriorityColor,
  DEFAULT_THRESHOLDS,
  type VelocityAlertRule,
  type OddsMovement,
  type VelocityAlertEvent,
} from '@/lib/line-velocity-alerts'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<VelocityAlertRule> = {}): VelocityAlertRule {
  return createRule({
    name: 'Test Rule',
    sports: [],
    market: 'moneyline',
    threshold: 15,
    window: 15,
    minBooks: 2,
    enabled: true,
    ...overrides,
  })
}

function makeMovement(overrides: Partial<OddsMovement> = {}): OddsMovement {
  return {
    gameId: 'g1',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    sport: 'nba',
    market: 'moneyline',
    side: 'home',
    movement: 20,
    booksMoved: 3,
    windowMinutes: 10,
    velocityPerHour: 120,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// createRule / createPresetRules
// ---------------------------------------------------------------------------

describe('createRule', () => {
  it('creates a rule with unique id', () => {
    const r1 = makeRule()
    const r2 = makeRule()
    expect(r1.id).not.toBe(r2.id)
    expect(r1.createdAt).toBeTruthy()
  })
})

describe('createPresetRules', () => {
  it('creates 4 preset rules', () => {
    const presets = createPresetRules()
    expect(presets.length).toBe(4)
    expect(presets.every(r => r.enabled)).toBe(true)
    expect(presets.every(r => r.id.startsWith('vr_'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// doesMovementTriggerRule
// ---------------------------------------------------------------------------

describe('doesMovementTriggerRule', () => {
  it('triggers when movement exceeds threshold', () => {
    const rule = makeRule({ threshold: 15 })
    const movement = makeMovement({ movement: 20 })
    expect(doesMovementTriggerRule(movement, rule)).toBe(true)
  })

  it('does not trigger when movement below threshold', () => {
    const rule = makeRule({ threshold: 25 })
    const movement = makeMovement({ movement: 20 })
    expect(doesMovementTriggerRule(movement, rule)).toBe(false)
  })

  it('does not trigger for disabled rule', () => {
    const rule = makeRule({ enabled: false })
    const movement = makeMovement({ movement: 100 })
    expect(doesMovementTriggerRule(movement, rule)).toBe(false)
  })

  it('filters by sport when sports array is non-empty', () => {
    const rule = makeRule({ sports: ['nfl'] })
    const nbaMove = makeMovement({ sport: 'nba' })
    const nflMove = makeMovement({ sport: 'nfl' })

    expect(doesMovementTriggerRule(nbaMove, rule)).toBe(false)
    expect(doesMovementTriggerRule(nflMove, rule)).toBe(true)
  })

  it('applies to all sports when sports array is empty', () => {
    const rule = makeRule({ sports: [] })
    expect(doesMovementTriggerRule(makeMovement({ sport: 'nba' }), rule)).toBe(true)
    expect(doesMovementTriggerRule(makeMovement({ sport: 'nfl' }), rule)).toBe(true)
  })

  it('rejects when market does not match', () => {
    const rule = makeRule({ market: 'spread' })
    const movement = makeMovement({ market: 'moneyline' })
    expect(doesMovementTriggerRule(movement, rule)).toBe(false)
  })

  it('rejects when time window exceeds rule window', () => {
    const rule = makeRule({ window: 15 })
    const movement = makeMovement({ windowMinutes: 30 })
    expect(doesMovementTriggerRule(movement, rule)).toBe(false)
  })

  it('rejects when booksMoved below minBooks', () => {
    const rule = makeRule({ minBooks: 3 })
    const movement = makeMovement({ booksMoved: 2 })
    expect(doesMovementTriggerRule(movement, rule)).toBe(false)
  })

  it('applies sport multiplier to threshold', () => {
    const rule = makeRule({ sports: ['nfl'], threshold: 15 })
    // NFL multiplier is 0.7, so effective threshold is 10.5
    const movement = makeMovement({ sport: 'nfl', movement: 11 })
    expect(doesMovementTriggerRule(movement, rule)).toBe(true)

    const smallMove = makeMovement({ sport: 'nfl', movement: 9 })
    expect(doesMovementTriggerRule(smallMove, rule)).toBe(false)
  })

  it('handles negative movement (absolute value)', () => {
    const rule = makeRule({ threshold: 15 })
    const movement = makeMovement({ movement: -20 })
    expect(doesMovementTriggerRule(movement, rule)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getAlertPriority
// ---------------------------------------------------------------------------

describe('getAlertPriority', () => {
  it('returns critical for 3x+ threshold', () => {
    expect(getAlertPriority(45, 15)).toBe('critical')
  })

  it('returns high for 2x+ threshold', () => {
    expect(getAlertPriority(30, 15)).toBe('high')
  })

  it('returns medium for 1.5x+ threshold', () => {
    expect(getAlertPriority(23, 15)).toBe('medium')
  })

  it('returns low for 1x+ threshold', () => {
    expect(getAlertPriority(16, 15)).toBe('low')
  })
})

// ---------------------------------------------------------------------------
// evaluateMovements
// ---------------------------------------------------------------------------

describe('evaluateMovements', () => {
  it('generates alerts for matching movements', () => {
    const rules = [makeRule()]
    const movements = [makeMovement()]
    const alerts = evaluateMovements(movements, rules)

    expect(alerts.length).toBe(1)
    expect(alerts[0].gameId).toBe('g1')
    expect(alerts[0].dismissed).toBe(false)
  })

  it('respects cooldown — no duplicate alerts', () => {
    const rule = makeRule()
    const movements = [makeMovement()]
    const existing: VelocityAlertEvent[] = [{
      id: 'existing',
      ruleId: rule.id,
      ruleName: rule.name,
      gameId: 'g1',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      sport: 'nba',
      market: 'moneyline',
      direction: 'up',
      movement: 20,
      booksMoved: 3,
      windowMinutes: 10,
      velocityPerHour: 120,
      priority: 'low',
      firedAt: new Date().toISOString(), // just now
      dismissed: false,
    }]

    const alerts = evaluateMovements(movements, [rule], existing, 30)
    expect(alerts.length).toBe(0) // Cooldown prevents firing
  })

  it('allows alert after cooldown expires', () => {
    const rule = makeRule()
    const movements = [makeMovement()]
    const existing: VelocityAlertEvent[] = [{
      id: 'existing',
      ruleId: rule.id,
      ruleName: rule.name,
      gameId: 'g1',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      sport: 'nba',
      market: 'moneyline',
      direction: 'up',
      movement: 20,
      booksMoved: 3,
      windowMinutes: 10,
      velocityPerHour: 120,
      priority: 'low',
      firedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      dismissed: false,
    }]

    const alerts = evaluateMovements(movements, [rule], existing, 30)
    expect(alerts.length).toBe(1) // Cooldown expired
  })

  it('skips non-matching movements', () => {
    const rules = [makeRule({ market: 'spread' })]
    const movements = [makeMovement({ market: 'moneyline' })]
    const alerts = evaluateMovements(movements, rules)

    expect(alerts.length).toBe(0)
  })

  it('handles multiple rules and movements', () => {
    const rules = [
      makeRule({ market: 'moneyline', threshold: 15 }),
      makeRule({ market: 'spread', threshold: 1.0 }),
    ]
    const movements = [
      makeMovement({ market: 'moneyline', movement: 20 }),
      makeMovement({ gameId: 'g2', market: 'spread', movement: 1.5 }),
    ]
    const alerts = evaluateMovements(movements, rules)

    expect(alerts.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// formatAlertMessage
// ---------------------------------------------------------------------------

describe('formatAlertMessage', () => {
  it('formats a readable alert message', () => {
    const alert: VelocityAlertEvent = {
      id: 'va1',
      ruleId: 'r1',
      ruleName: 'Test',
      gameId: 'g1',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      sport: 'nba',
      market: 'moneyline',
      direction: 'down',
      movement: -20,
      booksMoved: 3,
      windowMinutes: 10,
      velocityPerHour: 120,
      priority: 'high',
      firedAt: new Date().toISOString(),
      dismissed: false,
    }

    const msg = formatAlertMessage(alert)
    expect(msg).toContain('Celtics @ Lakers')
    expect(msg).toContain('ML')
    expect(msg).toContain('20.0')
    expect(msg).toContain('3 books')
    expect(msg).toContain('10min')
  })
})

// ---------------------------------------------------------------------------
// getPriorityColor
// ---------------------------------------------------------------------------

describe('getPriorityColor', () => {
  it('returns different colors for each priority', () => {
    const colors = ['low', 'medium', 'high', 'critical'].map(
      p => getPriorityColor(p as any)
    )
    expect(new Set(colors).size).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// DEFAULT_THRESHOLDS
// ---------------------------------------------------------------------------

describe('DEFAULT_THRESHOLDS', () => {
  it('has thresholds for all three markets', () => {
    expect(DEFAULT_THRESHOLDS.moneyline).toBeGreaterThan(0)
    expect(DEFAULT_THRESHOLDS.spread).toBeGreaterThan(0)
    expect(DEFAULT_THRESHOLDS.total).toBeGreaterThan(0)
  })
})
