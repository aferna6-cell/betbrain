/**
 * Custom Signal Builder tests.
 */

import { describe, it, expect } from 'vitest'
import {
  evaluateCondition,
  evaluateRule,
  evaluateAllRules,
  getPresetRules,
  validateRule,
  type CustomSignalRule,
  type SignalCondition,
  type CustomSignalMatch,
} from '@/lib/custom-signals'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBookmaker(overrides: Partial<NormalizedBookmakerOdds> = {}): NormalizedBookmakerOdds {
  return {
    bookmaker: 'fanduel',
    moneyline: { home: -150, away: 130 },
    spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
    total: { line: 220.5, overOdds: -110, underOdds: -110 },
    lastUpdated: '2026-03-25T00:00:00Z',
    ...overrides,
  }
}

function makeGame(overrides: Partial<NormalizedGame> = {}): NormalizedGame {
  return {
    id: 'game-1',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-25T02:00:00Z',
    fromCache: true,
    isFresh: true,
    bookmakers: [
      makeBookmaker({ bookmaker: 'fanduel', moneyline: { home: -150, away: 130 } }),
      makeBookmaker({ bookmaker: 'draftkings', moneyline: { home: -140, away: 120 } }),
      makeBookmaker({ bookmaker: 'betmgm', moneyline: { home: -160, away: 140 } }),
    ],
    ...overrides,
  }
}

function makeRule(overrides: Partial<CustomSignalRule> = {}): CustomSignalRule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    description: 'A test rule',
    sport: null,
    conditions: [{ type: 'book_count_gte', value: 3 }],
    logic: 'AND',
    enabled: true,
    createdAt: '2026-03-25T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

describe('evaluateCondition', () => {
  const game = makeGame()

  it('odds_variance: matches when variance exceeds threshold', () => {
    const result = evaluateCondition(
      { type: 'odds_variance', value: 15 },
      game
    )
    expect(result).not.toBeNull()
    expect(result).toContain('Odds variance')
  })

  it('odds_variance: null when variance below threshold', () => {
    const result = evaluateCondition(
      { type: 'odds_variance', value: 100 },
      game
    )
    expect(result).toBeNull()
  })

  it('odds_variance: null with fewer than 2 bookmakers', () => {
    const oneBook = makeGame({ bookmakers: [makeBookmaker()] })
    const result = evaluateCondition(
      { type: 'odds_variance', value: 1 },
      oneBook
    )
    expect(result).toBeNull()
  })

  it('best_odds_above: matches when best home odds exceed threshold', () => {
    const result = evaluateCondition(
      { type: 'best_odds_above', value: -145, side: 'home' },
      game
    )
    expect(result).not.toBeNull()
  })

  it('best_odds_above: null when below threshold', () => {
    const result = evaluateCondition(
      { type: 'best_odds_above', value: -100, side: 'home' },
      game
    )
    expect(result).toBeNull()
  })

  it('best_odds_below: matches when odds below threshold', () => {
    const result = evaluateCondition(
      { type: 'best_odds_below', value: -130, side: 'home' },
      game
    )
    expect(result).not.toBeNull()
  })

  it('book_count_gte: matches with enough books', () => {
    const result = evaluateCondition(
      { type: 'book_count_gte', value: 3 },
      game
    )
    expect(result).not.toBeNull()
    expect(result).toContain('3 bookmakers')
  })

  it('book_count_gte: null with too few books', () => {
    const result = evaluateCondition(
      { type: 'book_count_gte', value: 5 },
      game
    )
    expect(result).toBeNull()
  })

  it('spread_available: matches when spread offered', () => {
    const result = evaluateCondition(
      { type: 'spread_available', value: 0 },
      game
    )
    expect(result).not.toBeNull()
    expect(result).toBe('Spread market available')
  })

  it('spread_available: null when no spread', () => {
    const noSpread = makeGame({
      bookmakers: [makeBookmaker({ spread: undefined })],
    })
    const result = evaluateCondition(
      { type: 'spread_available', value: 0 },
      noSpread
    )
    expect(result).toBeNull()
  })

  it('total_available: matches when total offered', () => {
    const result = evaluateCondition(
      { type: 'total_available', value: 0 },
      game
    )
    expect(result).not.toBeNull()
  })

  it('home_favorite: matches when home team favored', () => {
    const result = evaluateCondition(
      { type: 'home_favorite', value: 0 },
      game
    )
    expect(result).not.toBeNull()
    expect(result).toContain('Home team favored')
  })

  it('home_favorite: null when home is underdog', () => {
    const awayFav = makeGame({
      bookmakers: [
        makeBookmaker({ moneyline: { home: 150, away: -170 } }),
      ],
    })
    const result = evaluateCondition(
      { type: 'home_favorite', value: 0 },
      awayFav
    )
    expect(result).toBeNull()
  })

  it('away_favorite: matches when away team favored', () => {
    const awayFav = makeGame({
      bookmakers: [
        makeBookmaker({ moneyline: { home: 150, away: -170 } }),
      ],
    })
    const result = evaluateCondition(
      { type: 'away_favorite', value: 0 },
      awayFav
    )
    expect(result).not.toBeNull()
  })

  it('spread_gte: matches when spread >= threshold', () => {
    const result = evaluateCondition(
      { type: 'spread_gte', value: -6 },
      game
    )
    expect(result).not.toBeNull()
  })

  it('spread_lte: matches when spread <= threshold', () => {
    const result = evaluateCondition(
      { type: 'spread_lte', value: -5 },
      game
    )
    expect(result).not.toBeNull()
  })

  it('total_gte: matches when total >= threshold', () => {
    const result = evaluateCondition(
      { type: 'total_gte', value: 220 },
      game
    )
    expect(result).not.toBeNull()
  })

  it('total_lte: matches when total <= threshold', () => {
    const result = evaluateCondition(
      { type: 'total_lte', value: 221 },
      game
    )
    expect(result).not.toBeNull()
  })

  it('total_lte: null when total above threshold', () => {
    const result = evaluateCondition(
      { type: 'total_lte', value: 210 },
      game
    )
    expect(result).toBeNull()
  })

  it('returns null for unknown condition type', () => {
    const result = evaluateCondition(
      { type: 'unknown_type' as never, value: 0 },
      game
    )
    expect(result).toBeNull()
  })

  it('handles empty bookmakers array', () => {
    const empty = makeGame({ bookmakers: [] })
    const result = evaluateCondition(
      { type: 'home_favorite', value: 0 },
      empty
    )
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// evaluateRule
// ---------------------------------------------------------------------------

describe('evaluateRule', () => {
  it('returns null for disabled rules', () => {
    const rule = makeRule({ enabled: false })
    const result = evaluateRule(rule, makeGame())
    expect(result).toBeNull()
  })

  it('returns null when sport does not match', () => {
    const rule = makeRule({ sport: 'nfl' })
    const result = evaluateRule(rule, makeGame({ sport: 'nba' }))
    expect(result).toBeNull()
  })

  it('matches when sport is null (all sports)', () => {
    const rule = makeRule({ sport: null })
    const result = evaluateRule(rule, makeGame())
    expect(result).not.toBeNull()
  })

  it('AND logic: requires all conditions to match', () => {
    const rule = makeRule({
      logic: 'AND',
      conditions: [
        { type: 'book_count_gte', value: 3 },
        { type: 'book_count_gte', value: 100 }, // Won't match
      ],
    })
    const result = evaluateRule(rule, makeGame())
    expect(result).toBeNull()
  })

  it('AND logic: matches when all conditions pass', () => {
    const rule = makeRule({
      logic: 'AND',
      conditions: [
        { type: 'book_count_gte', value: 3 },
        { type: 'home_favorite', value: 0 },
      ],
    })
    const result = evaluateRule(rule, makeGame())
    expect(result).not.toBeNull()
    expect(result!.matchRatio).toBe(1)
    expect(result!.matchedConditions.length).toBe(2)
  })

  it('OR logic: matches when at least one condition passes', () => {
    const rule = makeRule({
      logic: 'OR',
      conditions: [
        { type: 'book_count_gte', value: 100 }, // Won't match
        { type: 'home_favorite', value: 0 },      // Will match
      ],
    })
    const result = evaluateRule(rule, makeGame())
    expect(result).not.toBeNull()
    expect(result!.matchRatio).toBe(0.5)
    expect(result!.matchedConditions.length).toBe(1)
  })

  it('OR logic: null when no conditions match', () => {
    const rule = makeRule({
      logic: 'OR',
      conditions: [
        { type: 'book_count_gte', value: 100 },
        { type: 'book_count_gte', value: 200 },
      ],
    })
    const result = evaluateRule(rule, makeGame())
    expect(result).toBeNull()
  })

  it('returns null for rules with no conditions', () => {
    const rule = makeRule({ conditions: [] })
    const result = evaluateRule(rule, makeGame())
    expect(result).toBeNull()
  })

  it('includes rule and game in match result', () => {
    const rule = makeRule()
    const game = makeGame()
    const result = evaluateRule(rule, game)
    expect(result).not.toBeNull()
    expect(result!.rule.id).toBe('rule-1')
    expect(result!.game.id).toBe('game-1')
  })
})

// ---------------------------------------------------------------------------
// evaluateAllRules
// ---------------------------------------------------------------------------

describe('evaluateAllRules', () => {
  it('evaluates multiple rules against multiple games', () => {
    const rules = [
      makeRule({ id: 'r1', conditions: [{ type: 'book_count_gte', value: 3 }] }),
      makeRule({ id: 'r2', conditions: [{ type: 'book_count_gte', value: 100 }] }),
    ]
    const games = [makeGame({ id: 'g1' }), makeGame({ id: 'g2' })]
    const matches = evaluateAllRules(rules, games)
    // r1 matches both games, r2 matches none
    expect(matches.length).toBe(2)
    expect(matches[0].rule.id).toBe('r1')
    expect(matches[1].rule.id).toBe('r1')
  })

  it('sorts by match ratio descending', () => {
    const rules = [
      makeRule({
        id: 'r1',
        logic: 'OR',
        conditions: [
          { type: 'book_count_gte', value: 3 },
          { type: 'book_count_gte', value: 100 },
        ],
      }),
      makeRule({
        id: 'r2',
        logic: 'OR',
        conditions: [
          { type: 'book_count_gte', value: 3 },
          { type: 'home_favorite', value: 0 },
        ],
      }),
    ]
    const games = [makeGame()]
    const matches = evaluateAllRules(rules, games)
    // r2 has ratio 1.0, r1 has ratio 0.5
    expect(matches[0].rule.id).toBe('r2')
    expect(matches[0].matchRatio).toBe(1)
    expect(matches[1].rule.id).toBe('r1')
    expect(matches[1].matchRatio).toBe(0.5)
  })

  it('returns empty array when no matches', () => {
    const rules = [makeRule({ enabled: false })]
    const games = [makeGame()]
    expect(evaluateAllRules(rules, games)).toEqual([])
  })

  it('returns empty for empty inputs', () => {
    expect(evaluateAllRules([], [])).toEqual([])
    expect(evaluateAllRules([], [makeGame()])).toEqual([])
    expect(evaluateAllRules([makeRule()], [])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getPresetRules
// ---------------------------------------------------------------------------

describe('getPresetRules', () => {
  it('returns at least 3 preset rules', () => {
    const presets = getPresetRules()
    expect(presets.length).toBeGreaterThanOrEqual(3)
  })

  it('all presets are enabled', () => {
    const presets = getPresetRules()
    for (const p of presets) {
      expect(p.enabled).toBe(true)
    }
  })

  it('all presets have unique IDs', () => {
    const presets = getPresetRules()
    const ids = presets.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all presets have at least one condition', () => {
    const presets = getPresetRules()
    for (const p of presets) {
      expect(p.conditions.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('all presets have a name and description', () => {
    const presets = getPresetRules()
    for (const p of presets) {
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// validateRule
// ---------------------------------------------------------------------------

describe('validateRule', () => {
  it('returns no errors for a valid rule', () => {
    const rule = makeRule()
    expect(validateRule(rule)).toEqual([])
  })

  it('requires a name', () => {
    const errors = validateRule({ ...makeRule(), name: '' })
    expect(errors).toContain('Rule name is required')
  })

  it('rejects names over 100 chars', () => {
    const errors = validateRule({ ...makeRule(), name: 'x'.repeat(101) })
    expect(errors).toContain('Rule name must be 100 characters or less')
  })

  it('requires at least one condition', () => {
    const errors = validateRule({ ...makeRule(), conditions: [] })
    expect(errors).toContain('At least one condition is required')
  })

  it('rejects more than 10 conditions', () => {
    const conditions = Array.from({ length: 11 }, () => ({
      type: 'book_count_gte' as const,
      value: 3,
    }))
    const errors = validateRule({ ...makeRule(), conditions })
    expect(errors).toContain('Maximum 10 conditions per rule')
  })

  it('validates condition types', () => {
    const errors = validateRule({
      ...makeRule(),
      conditions: [{ type: 'invalid' as never, value: 0 }],
    })
    expect(errors.some((e) => e.includes('invalid type'))).toBe(true)
  })

  it('validates condition values are numbers', () => {
    const errors = validateRule({
      ...makeRule(),
      conditions: [{ type: 'book_count_gte', value: NaN }],
    })
    expect(errors.some((e) => e.includes('value must be a number'))).toBe(true)
  })

  it('validates side values', () => {
    const errors = validateRule({
      ...makeRule(),
      conditions: [{ type: 'best_odds_above', value: 100, side: 'middle' as never }],
    })
    expect(errors.some((e) => e.includes('side must be'))).toBe(true)
  })

  it('validates logic operator', () => {
    const errors = validateRule({ ...makeRule(), logic: 'XOR' as never })
    expect(errors).toContain('Logic must be "AND" or "OR"')
  })
})
