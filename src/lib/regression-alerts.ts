/**
 * Regression Alerts — detect when performance is declining.
 *
 * Monitors ROI drops and losing streaks, creates notifications when thresholds are exceeded.
 * Pure functions operating on pick data — no side effects.
 */

export interface RegressionAlert {
  type: 'roi_drop' | 'losing_streak' | 'cold_sport' | 'unit_drain'
  severity: 'warning' | 'critical'
  title: string
  message: string
  detail: string
  timestamp: string
}

export interface RegressionConfig {
  /** Alert when ROI drops below this % over trailing window */
  roiFloor: number
  /** Trailing window size (number of picks) for ROI check */
  roiWindow: number
  /** Alert when losing streak >= this many picks */
  losingStreakThreshold: number
  /** Alert when a sport has negative ROI over last N picks */
  sportWindow: number
  /** Alert when total units lost exceeds this in trailing window */
  unitDrainThreshold: number
  /** Trailing window size for unit drain */
  unitDrainWindow: number
}

export const DEFAULT_CONFIG: RegressionConfig = {
  roiFloor: -10,
  roiWindow: 20,
  losingStreakThreshold: 5,
  sportWindow: 10,
  unitDrainThreshold: -8,
  unitDrainWindow: 15,
}

interface PickLike {
  outcome?: string | null
  profit?: number | null
  units: number
  sport: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

export function detectRegressions<T extends PickLike>(
  picks: T[],
  config: RegressionConfig = DEFAULT_CONFIG
): RegressionAlert[] {
  const alerts: RegressionAlert[] = []
  const now = new Date().toISOString()

  // Sort newest first
  const sorted = [...picks]
    .filter((p) => p.outcome && p.outcome !== 'pending')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (sorted.length === 0) return alerts

  // 1. Trailing ROI check
  const roiWindow = sorted.slice(0, config.roiWindow)
  if (roiWindow.length >= 5) {
    const totalProfit = roiWindow.reduce((s, p) => s + (p.profit ?? 0), 0)
    const totalUnits = roiWindow.reduce((s, p) => s + p.units, 0)
    const roi = totalUnits > 0 ? (totalProfit / totalUnits) * 100 : 0

    if (roi <= config.roiFloor) {
      const severity = roi <= config.roiFloor * 2 ? 'critical' : 'warning'
      alerts.push({
        type: 'roi_drop',
        severity,
        title: 'ROI Below Threshold',
        message: `Your trailing ${roiWindow.length}-pick ROI is ${roi.toFixed(1)}%.`,
        detail: `${totalProfit.toFixed(2)}u P/L over ${roiWindow.length} resolved picks. Consider reducing unit sizes or taking a break.`,
        timestamp: now,
      })
    }
  }

  // 2. Current losing streak
  let currentLosses = 0
  for (const p of sorted) {
    if (p.outcome === 'loss') {
      currentLosses++
    } else {
      break
    }
  }
  if (currentLosses >= config.losingStreakThreshold) {
    const severity = currentLosses >= config.losingStreakThreshold * 2 ? 'critical' : 'warning'
    alerts.push({
      type: 'losing_streak',
      severity,
      title: 'Losing Streak Active',
      message: `You have lost ${currentLosses} picks in a row.`,
      detail: `Last ${currentLosses} resolved picks were all losses. Consider stepping back and reviewing your approach.`,
      timestamp: now,
    })
  }

  // 3. Cold sport detection
  const sportPicks = new Map<string, PickLike[]>()
  for (const p of sorted) {
    const arr = sportPicks.get(p.sport) ?? []
    arr.push(p)
    sportPicks.set(p.sport, arr)
  }

  for (const [sport, picks] of sportPicks) {
    const window = picks.slice(0, config.sportWindow)
    if (window.length >= 5) {
      const wins = window.filter((p) => p.outcome === 'win').length
      const losses = window.filter((p) => p.outcome === 'loss').length
      const winRate = wins / (wins + losses)
      const profit = window.reduce((s, p) => s + (p.profit ?? 0), 0)

      if (winRate < 0.35 && profit < 0) {
        alerts.push({
          type: 'cold_sport',
          severity: 'warning',
          title: `Cold in ${sport.toUpperCase()}`,
          message: `${wins}W-${losses}L (${(winRate * 100).toFixed(0)}%) over last ${window.length} ${sport.toUpperCase()} picks.`,
          detail: `${profit.toFixed(2)}u P/L. Consider pausing ${sport.toUpperCase()} bets until you identify the issue.`,
          timestamp: now,
        })
      }
    }
  }

  // 4. Unit drain
  const unitWindow = sorted.slice(0, config.unitDrainWindow)
  if (unitWindow.length >= 5) {
    const totalLost = unitWindow.reduce((s, p) => s + (p.profit ?? 0), 0)
    if (totalLost <= config.unitDrainThreshold) {
      alerts.push({
        type: 'unit_drain',
        severity: totalLost <= config.unitDrainThreshold * 2 ? 'critical' : 'warning',
        title: 'Heavy Unit Loss',
        message: `${totalLost.toFixed(1)}u lost over last ${unitWindow.length} picks.`,
        detail: `Your bankroll is taking significant damage. Consider dropping to minimum unit sizes.`,
        timestamp: now,
      })
    }
  }

  return alerts
}

// ---------------------------------------------------------------------------
// Persistence (config stored in localStorage)
// ---------------------------------------------------------------------------

const CONFIG_KEY = 'betbrain_regression_config'

export function loadRegressionConfig(): RegressionConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveRegressionConfig(config: RegressionConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}
