/**
 * Custom Signal Builder — User-defined composite signal criteria.
 *
 * Allows users to create, save, and evaluate custom signal rules
 * with AND/OR logic. Rules are evaluated against cached odds data.
 *
 * For informational purposes only. Not financial advice.
 */

import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported condition types for signal rules */
export type ConditionType =
  | 'odds_variance'        // Moneyline variance > threshold
  | 'best_odds_above'      // Best available odds > value
  | 'best_odds_below'      // Best available odds < value
  | 'book_count_gte'       // Number of bookmakers >= N
  | 'spread_available'     // Spread market is offered
  | 'total_available'      // Total market is offered
  | 'home_favorite'        // Home team is favored (negative ML)
  | 'away_favorite'        // Away team is favored
  | 'spread_gte'           // Spread line >= value
  | 'spread_lte'           // Spread line <= value
  | 'total_gte'            // Game total >= value
  | 'total_lte'            // Game total <= value

export interface SignalCondition {
  type: ConditionType
  /** Numeric threshold value for the condition */
  value: number
  /** Which side (home/away) for directional conditions */
  side?: 'home' | 'away'
}

/** How multiple conditions combine: all must pass (AND) or any (OR) */
export type LogicOperator = 'AND' | 'OR'

export interface CustomSignalRule {
  id: string
  name: string
  description: string
  /** Sport filter — null means all sports */
  sport: string | null
  conditions: SignalCondition[]
  logic: LogicOperator
  /** Whether this rule is currently active */
  enabled: boolean
  createdAt: string
}

export interface CustomSignalMatch {
  rule: CustomSignalRule
  game: NormalizedGame
  /** Which conditions matched */
  matchedConditions: string[]
  /** How many conditions matched out of total */
  matchRatio: number
}

// ---------------------------------------------------------------------------
// Condition evaluators (pure functions)
// ---------------------------------------------------------------------------

function getMoneylineOdds(
  bookmakers: NormalizedBookmakerOdds[],
  side: 'home' | 'away'
): number[] {
  const odds: number[] = []
  for (const bk of bookmakers) {
    const val = side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (val != null) odds.push(val)
  }
  return odds
}

function getSpreadLines(bookmakers: NormalizedBookmakerOdds[]): number[] {
  const lines: number[] = []
  for (const bk of bookmakers) {
    if (bk.spread?.homeLine != null) lines.push(bk.spread.homeLine)
  }
  return lines
}

function getTotalLines(bookmakers: NormalizedBookmakerOdds[]): number[] {
  const lines: number[] = []
  for (const bk of bookmakers) {
    if (bk.total?.line != null) lines.push(bk.total.line)
  }
  return lines
}

/**
 * Evaluate a single condition against a game's data.
 * Returns a human-readable description if the condition matches, or null.
 */
export function evaluateCondition(
  condition: SignalCondition,
  game: NormalizedGame
): string | null {
  const { bookmakers } = game
  const side = condition.side ?? 'home'

  switch (condition.type) {
    case 'odds_variance': {
      const homeOdds = getMoneylineOdds(bookmakers, 'home')
      const awayOdds = getMoneylineOdds(bookmakers, 'away')
      const homeVar = homeOdds.length >= 2 ? Math.max(...homeOdds) - Math.min(...homeOdds) : 0
      const awayVar = awayOdds.length >= 2 ? Math.max(...awayOdds) - Math.min(...awayOdds) : 0
      const maxVar = Math.max(homeVar, awayVar)
      if (maxVar >= condition.value) {
        return `Odds variance ${maxVar.toFixed(0)} pts >= ${condition.value} threshold`
      }
      return null
    }

    case 'best_odds_above': {
      const odds = getMoneylineOdds(bookmakers, side)
      if (odds.length === 0) return null
      const best = Math.max(...odds)
      if (best > condition.value) {
        return `Best ${side} odds ${best > 0 ? '+' : ''}${best} > ${condition.value > 0 ? '+' : ''}${condition.value}`
      }
      return null
    }

    case 'best_odds_below': {
      const odds = getMoneylineOdds(bookmakers, side)
      if (odds.length === 0) return null
      const best = side === 'home'
        ? Math.min(...odds) // Best for favorite = most negative
        : Math.max(...odds) // Best for underdog = most positive
      // For "below" we check if the minimum (most negative) is below threshold
      const minOdds = Math.min(...odds)
      if (minOdds < condition.value) {
        return `${side} odds ${minOdds > 0 ? '+' : ''}${minOdds} < ${condition.value > 0 ? '+' : ''}${condition.value}`
      }
      return null
    }

    case 'book_count_gte': {
      if (bookmakers.length >= condition.value) {
        return `${bookmakers.length} bookmakers >= ${condition.value} minimum`
      }
      return null
    }

    case 'spread_available': {
      const hasSpread = bookmakers.some((bk) => bk.spread?.homeLine != null)
      if (hasSpread) return 'Spread market available'
      return null
    }

    case 'total_available': {
      const hasTotal = bookmakers.some((bk) => bk.total?.line != null)
      if (hasTotal) return 'Total market available'
      return null
    }

    case 'home_favorite': {
      const homeOdds = getMoneylineOdds(bookmakers, 'home')
      if (homeOdds.length === 0) return null
      const avg = homeOdds.reduce((s, v) => s + v, 0) / homeOdds.length
      if (avg < 0) return `Home team favored (avg ML: ${avg.toFixed(0)})`
      return null
    }

    case 'away_favorite': {
      const awayOdds = getMoneylineOdds(bookmakers, 'away')
      if (awayOdds.length === 0) return null
      const avg = awayOdds.reduce((s, v) => s + v, 0) / awayOdds.length
      if (avg < 0) return `Away team favored (avg ML: ${avg.toFixed(0)})`
      return null
    }

    case 'spread_gte': {
      const lines = getSpreadLines(bookmakers)
      if (lines.length === 0) return null
      const avg = lines.reduce((s, v) => s + v, 0) / lines.length
      if (avg >= condition.value) {
        return `Spread ${avg.toFixed(1)} >= ${condition.value}`
      }
      return null
    }

    case 'spread_lte': {
      const lines = getSpreadLines(bookmakers)
      if (lines.length === 0) return null
      const avg = lines.reduce((s, v) => s + v, 0) / lines.length
      if (avg <= condition.value) {
        return `Spread ${avg.toFixed(1)} <= ${condition.value}`
      }
      return null
    }

    case 'total_gte': {
      const lines = getTotalLines(bookmakers)
      if (lines.length === 0) return null
      const avg = lines.reduce((s, v) => s + v, 0) / lines.length
      if (avg >= condition.value) {
        return `Total ${avg.toFixed(1)} >= ${condition.value}`
      }
      return null
    }

    case 'total_lte': {
      const lines = getTotalLines(bookmakers)
      if (lines.length === 0) return null
      const avg = lines.reduce((s, v) => s + v, 0) / lines.length
      if (avg <= condition.value) {
        return `Total ${avg.toFixed(1)} <= ${condition.value}`
      }
      return null
    }

    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a custom signal rule against a single game.
 * Returns a match object if the game satisfies the rule, or null.
 */
export function evaluateRule(
  rule: CustomSignalRule,
  game: NormalizedGame
): CustomSignalMatch | null {
  if (!rule.enabled) return null

  // Sport filter
  if (rule.sport && game.sport !== rule.sport) return null

  const matched: string[] = []

  for (const condition of rule.conditions) {
    const result = evaluateCondition(condition, game)
    if (result) matched.push(result)
  }

  const total = rule.conditions.length
  if (total === 0) return null

  const matchRatio = matched.length / total

  // Apply logic operator
  if (rule.logic === 'AND' && matched.length < total) return null
  if (rule.logic === 'OR' && matched.length === 0) return null

  return {
    rule,
    game,
    matchedConditions: matched,
    matchRatio,
  }
}

/**
 * Evaluate all rules against all games. Returns matches sorted by
 * match ratio (strongest matches first).
 */
export function evaluateAllRules(
  rules: CustomSignalRule[],
  games: NormalizedGame[]
): CustomSignalMatch[] {
  const matches: CustomSignalMatch[] = []

  for (const rule of rules) {
    for (const game of games) {
      const match = evaluateRule(rule, game)
      if (match) matches.push(match)
    }
  }

  return matches.sort((a, b) => b.matchRatio - a.matchRatio)
}

// ---------------------------------------------------------------------------
// Preset rules (common patterns)
// ---------------------------------------------------------------------------

let presetCounter = 0
function presetId(): string {
  return `preset-${++presetCounter}`
}

export function getPresetRules(): CustomSignalRule[] {
  presetCounter = 0
  return [
    {
      id: presetId(),
      name: 'Line Shopping Opportunity',
      description: 'Games with high odds variance across books (30+ pts)',
      sport: null,
      conditions: [
        { type: 'odds_variance', value: 30 },
        { type: 'book_count_gte', value: 3 },
      ],
      logic: 'AND',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: presetId(),
      name: 'Big Underdog Value',
      description: 'Home underdog with odds above +200 and spread available',
      sport: null,
      conditions: [
        { type: 'best_odds_above', value: 200, side: 'home' },
        { type: 'away_favorite', value: 0 },
        { type: 'spread_available', value: 0 },
      ],
      logic: 'AND',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: presetId(),
      name: 'Low Total Game',
      description: 'Games with total under 200 — potential defensive matchup',
      sport: 'nba',
      conditions: [
        { type: 'total_lte', value: 200 },
        { type: 'total_available', value: 0 },
      ],
      logic: 'AND',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: presetId(),
      name: 'High Total Game',
      description: 'Games with total 230+ — potential high-scoring affair',
      sport: 'nba',
      conditions: [
        { type: 'total_gte', value: 230 },
        { type: 'total_available', value: 0 },
      ],
      logic: 'AND',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: presetId(),
      name: 'Large Spread Game',
      description: 'Games with spread >= 10 — potential blowout',
      sport: null,
      conditions: [
        { type: 'spread_gte', value: 10 },
        { type: 'book_count_gte', value: 3 },
      ],
      logic: 'AND',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
  ]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_CONDITION_TYPES: ConditionType[] = [
  'odds_variance', 'best_odds_above', 'best_odds_below',
  'book_count_gte', 'spread_available', 'total_available',
  'home_favorite', 'away_favorite',
  'spread_gte', 'spread_lte', 'total_gte', 'total_lte',
]

export function validateRule(rule: Partial<CustomSignalRule>): string[] {
  const errors: string[] = []

  if (!rule.name || rule.name.trim().length === 0) {
    errors.push('Rule name is required')
  }
  if (rule.name && rule.name.length > 100) {
    errors.push('Rule name must be 100 characters or less')
  }

  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push('At least one condition is required')
  }
  if (rule.conditions && rule.conditions.length > 10) {
    errors.push('Maximum 10 conditions per rule')
  }

  if (rule.conditions) {
    for (let i = 0; i < rule.conditions.length; i++) {
      const c = rule.conditions[i]
      if (!VALID_CONDITION_TYPES.includes(c.type)) {
        errors.push(`Condition ${i + 1}: invalid type "${c.type}"`)
      }
      if (typeof c.value !== 'number' || isNaN(c.value)) {
        errors.push(`Condition ${i + 1}: value must be a number`)
      }
      if (c.side && c.side !== 'home' && c.side !== 'away') {
        errors.push(`Condition ${i + 1}: side must be "home" or "away"`)
      }
    }
  }

  if (rule.logic && rule.logic !== 'AND' && rule.logic !== 'OR') {
    errors.push('Logic must be "AND" or "OR"')
  }

  return errors
}
