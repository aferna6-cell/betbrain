/**
 * Line Movement Velocity Alerts
 *
 * Configurable alert rules that fire when line movement exceeds user-defined
 * thresholds within a time window. Built on top of the odds velocity detection
 * system.
 *
 * Features:
 * - Configurable thresholds per market type (ML, spread, total)
 * - Sport-specific sensitivity (NFL key numbers are bigger moves)
 * - Time window selection (5min, 15min, 30min, 1hr)
 * - Alert cooldown to prevent spam
 * - Priority levels based on magnitude
 *
 * Pure functions, no side effects. Storage via localStorage.
 * For informational purposes only. Not financial advice.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MarketType = 'moneyline' | 'spread' | 'total'
export type TimeWindow = 5 | 15 | 30 | 60 // minutes
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

export interface VelocityAlertRule {
  id: string
  /** Human-readable name */
  name: string
  /** Which sports this rule applies to (empty = all) */
  sports: string[]
  /** Market type to watch */
  market: MarketType
  /** Minimum odds movement to trigger (in American odds points for ML, line points for spread/total) */
  threshold: number
  /** Time window in minutes */
  window: TimeWindow
  /** Minimum number of books that must move */
  minBooks: number
  /** Is this rule active? */
  enabled: boolean
  /** Created timestamp */
  createdAt: string
}

export interface VelocityAlertEvent {
  id: string
  ruleId: string
  ruleName: string
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: string
  market: MarketType
  /** Direction of the move */
  direction: 'up' | 'down'
  /** How much it moved */
  movement: number
  /** How many books moved */
  booksMoved: number
  /** The time window over which the move happened */
  windowMinutes: number
  /** Movement per hour */
  velocityPerHour: number
  /** Priority based on how far above threshold */
  priority: AlertPriority
  /** When the alert fired */
  firedAt: string
  /** Has the user dismissed this? */
  dismissed: boolean
}

export interface OddsMovement {
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: string
  market: MarketType
  side: string
  /** Movement amount (positive = line went up, negative = down) */
  movement: number
  /** Number of books that moved in this direction */
  booksMoved: number
  /** Time window this movement was measured over */
  windowMinutes: number
  /** Velocity (movement per hour) */
  velocityPerHour: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCLAIMER = 'For informational purposes only. Not financial advice.'

/** Default thresholds by market type */
export const DEFAULT_THRESHOLDS: Record<MarketType, number> = {
  moneyline: 15,  // 15 cents of movement (e.g., -110 -> -125)
  spread: 1.0,    // 1 point of spread movement
  total: 1.5,     // 1.5 points of total movement
}

/** Sport-specific threshold multipliers (some sports have naturally larger moves) */
export const SPORT_MULTIPLIERS: Record<string, number> = {
  nfl: 0.7,  // NFL has smaller moves — lower threshold to catch them
  nba: 1.0,
  mlb: 1.2,  // MLB moneyline moves are larger
  nhl: 0.8,
}

/** Built-in preset rules */
export const PRESET_RULES: Omit<VelocityAlertRule, 'id' | 'createdAt'>[] = [
  {
    name: 'Sharp ML Move (any sport)',
    sports: [],
    market: 'moneyline',
    threshold: 20,
    window: 15,
    minBooks: 2,
    enabled: true,
  },
  {
    name: 'NFL Key Number Spread Shift',
    sports: ['nfl'],
    market: 'spread',
    threshold: 0.5,
    window: 30,
    minBooks: 3,
    enabled: true,
  },
  {
    name: 'NBA Total Swing',
    sports: ['nba'],
    market: 'total',
    threshold: 2.0,
    window: 30,
    minBooks: 2,
    enabled: true,
  },
  {
    name: 'Rapid Any-Market Move',
    sports: [],
    market: 'moneyline',
    threshold: 10,
    window: 5,
    minBooks: 2,
    enabled: true,
  },
]

// ---------------------------------------------------------------------------
// Rule management
// ---------------------------------------------------------------------------

let ruleIdCounter = 0

export function createRule(
  partial: Omit<VelocityAlertRule, 'id' | 'createdAt'>
): VelocityAlertRule {
  ruleIdCounter++
  return {
    ...partial,
    id: `vr_${Date.now()}_${ruleIdCounter}`,
    createdAt: new Date().toISOString(),
  }
}

export function createPresetRules(): VelocityAlertRule[] {
  return PRESET_RULES.map(p => createRule(p))
}

// ---------------------------------------------------------------------------
// Alert evaluation
// ---------------------------------------------------------------------------

/**
 * Determine alert priority based on how far the movement exceeds the threshold.
 */
export function getAlertPriority(movement: number, threshold: number): AlertPriority {
  const ratio = Math.abs(movement) / threshold
  if (ratio >= 3) return 'critical'
  if (ratio >= 2) return 'high'
  if (ratio >= 1.5) return 'medium'
  return 'low'
}

/**
 * Check if a movement triggers a specific rule.
 */
export function doesMovementTriggerRule(
  movement: OddsMovement,
  rule: VelocityAlertRule
): boolean {
  if (!rule.enabled) return false

  // Market must match
  if (movement.market !== rule.market) return false

  // Sport filter
  if (rule.sports.length > 0 && !rule.sports.includes(movement.sport)) return false

  // Time window must be <= rule window
  if (movement.windowMinutes > rule.window) return false

  // Minimum books
  if (movement.booksMoved < rule.minBooks) return false

  // Apply sport multiplier to threshold
  const multiplier = SPORT_MULTIPLIERS[movement.sport] ?? 1.0
  const adjustedThreshold = rule.threshold * multiplier

  // Movement must exceed threshold
  return Math.abs(movement.movement) >= adjustedThreshold
}

/**
 * Evaluate all movements against all rules. Return triggered alerts.
 */
export function evaluateMovements(
  movements: OddsMovement[],
  rules: VelocityAlertRule[],
  existingAlerts: VelocityAlertEvent[] = [],
  cooldownMinutes: number = 30
): VelocityAlertEvent[] {
  const now = new Date()
  const alerts: VelocityAlertEvent[] = []
  let alertCounter = 0

  for (const movement of movements) {
    for (const rule of rules) {
      if (!doesMovementTriggerRule(movement, rule)) continue

      // Check cooldown: don't fire again for same game+rule within cooldown
      const recentExisting = existingAlerts.find(a =>
        a.ruleId === rule.id &&
        a.gameId === movement.gameId &&
        !a.dismissed &&
        (now.getTime() - new Date(a.firedAt).getTime()) < cooldownMinutes * 60 * 1000
      )
      if (recentExisting) continue

      alertCounter++
      alerts.push({
        id: `va_${Date.now()}_${alertCounter}`,
        ruleId: rule.id,
        ruleName: rule.name,
        gameId: movement.gameId,
        homeTeam: movement.homeTeam,
        awayTeam: movement.awayTeam,
        sport: movement.sport,
        market: movement.market,
        direction: movement.movement > 0 ? 'up' : 'down',
        movement: movement.movement,
        booksMoved: movement.booksMoved,
        windowMinutes: movement.windowMinutes,
        velocityPerHour: movement.velocityPerHour,
        priority: getAlertPriority(movement.movement, rule.threshold),
        firedAt: now.toISOString(),
        dismissed: false,
      })
    }
  }

  return alerts
}

// ---------------------------------------------------------------------------
// Summary helpers
// ---------------------------------------------------------------------------

export function formatAlertMessage(alert: VelocityAlertEvent): string {
  const dir = alert.direction === 'up' ? 'up' : 'down'
  const marketLabel = alert.market === 'moneyline' ? 'ML' :
    alert.market === 'spread' ? 'Spread' : 'Total'

  return `${alert.awayTeam} @ ${alert.homeTeam}: ${marketLabel} moved ${dir} ${Math.abs(alert.movement).toFixed(1)} pts across ${alert.booksMoved} book${alert.booksMoved !== 1 ? 's' : ''} in ${alert.windowMinutes}min`
}

export function getPriorityColor(priority: AlertPriority): string {
  switch (priority) {
    case 'critical': return 'text-red-500'
    case 'high': return 'text-orange-500'
    case 'medium': return 'text-yellow-500'
    case 'low': return 'text-blue-400'
  }
}

export function getPriorityBadgeClass(priority: AlertPriority): string {
  switch (priority) {
    case 'critical': return 'bg-red-500/20 text-red-500'
    case 'high': return 'bg-orange-500/20 text-orange-500'
    case 'medium': return 'bg-yellow-500/20 text-yellow-500'
    case 'low': return 'bg-blue-500/20 text-blue-400'
  }
}
