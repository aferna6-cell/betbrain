/**
 * Smart Bankroll Alerts — Alert when bankroll conditions are triggered.
 *
 * Monitors daily loss limits, consecutive loss streaks, drawdown thresholds,
 * and win/loss ratio drops. Provides actionable cooldown recommendations.
 *
 * Pure functions — no side effects except localStorage read/write.
 */

export interface BankrollAlertConfig {
  /** Max daily loss as percentage of bankroll */
  maxDailyLossPercent: number
  /** Max consecutive losses before alert */
  maxConsecutiveLosses: number
  /** Drawdown threshold (%) to trigger alert */
  drawdownThreshold: number
  /** Win rate drop threshold (%) from rolling average */
  winRateDropThreshold: number
  /** Whether alerts are enabled */
  enabled: boolean
}

export interface BankrollAlert {
  id: string
  type: 'daily-loss' | 'consecutive-losses' | 'drawdown' | 'win-rate-drop' | 'tilt-warning'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  recommendation: string
  /** When this alert was triggered */
  triggeredAt: string
  /** Whether user dismissed it */
  dismissed: boolean
}

interface PickForAlerts {
  created_at?: string
  outcome?: string | null
  profit?: number | null
  units: number
}

const CONFIG_KEY = 'betbrain_bankroll_alert_config'
const ALERTS_KEY = 'betbrain_bankroll_alerts'

const DEFAULT_CONFIG: BankrollAlertConfig = {
  maxDailyLossPercent: 5,
  maxConsecutiveLosses: 5,
  drawdownThreshold: 15,
  winRateDropThreshold: 10,
  enabled: true,
}

export function loadConfig(): BankrollAlertConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: BankrollAlertConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function loadAlerts(): BankrollAlert[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    return raw ? (JSON.parse(raw) as BankrollAlert[]) : []
  } catch {
    return []
  }
}

function saveAlerts(alerts: BankrollAlert[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

export function dismissAlert(alertId: string): void {
  const alerts = loadAlerts()
  const idx = alerts.findIndex((a) => a.id === alertId)
  if (idx >= 0) {
    alerts[idx].dismissed = true
    saveAlerts(alerts)
  }
}

export function clearAlerts(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ALERTS_KEY)
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Check if today's losses exceed the daily limit.
 */
export function checkDailyLoss(
  picks: PickForAlerts[],
  bankroll: number,
  config: BankrollAlertConfig
): BankrollAlert | null {
  if (bankroll <= 0) return null

  const today = new Date().toISOString().split('T')[0]
  const todayPicks = picks.filter((p) => {
    if (!p.created_at) return false
    return p.created_at.startsWith(today) && p.outcome === 'loss'
  })

  const todayLoss = Math.abs(todayPicks.reduce((s, p) => s + (p.profit ?? 0), 0))
  const lossPercent = (todayLoss / bankroll) * 100

  if (lossPercent >= config.maxDailyLossPercent) {
    return {
      id: generateId(),
      type: 'daily-loss',
      severity: lossPercent >= config.maxDailyLossPercent * 2 ? 'critical' : 'warning',
      title: 'Daily Loss Limit Hit',
      message: `You have lost $${todayLoss.toFixed(0)} today (${lossPercent.toFixed(1)}% of bankroll). Your limit is ${config.maxDailyLossPercent}%.`,
      recommendation: 'Stop betting for today. Review your picks tomorrow with fresh eyes. Chasing losses is the #1 bankroll killer.',
      triggeredAt: new Date().toISOString(),
      dismissed: false,
    }
  }
  return null
}

/**
 * Check for consecutive losses.
 */
export function checkConsecutiveLosses(
  picks: PickForAlerts[],
  config: BankrollAlertConfig
): BankrollAlert | null {
  const resolved = picks
    .filter((p) => p.outcome === 'win' || p.outcome === 'loss')
    .sort((a, b) => {
      const da = a.created_at ?? ''
      const db = b.created_at ?? ''
      return db.localeCompare(da) // most recent first
    })

  let streak = 0
  for (const p of resolved) {
    if (p.outcome === 'loss') streak++
    else break
  }

  if (streak >= config.maxConsecutiveLosses) {
    const severity = streak >= config.maxConsecutiveLosses * 2 ? 'critical' : 'warning'
    return {
      id: generateId(),
      type: 'consecutive-losses',
      severity,
      title: `${streak}-Game Losing Streak`,
      message: `You have lost ${streak} consecutive bets. Your alert threshold is ${config.maxConsecutiveLosses}.`,
      recommendation: streak >= 7
        ? 'Extended losing streak detected. Take a full day off before placing any new bets. Review your recent process.'
        : 'Consider reducing unit size by 50% until the streak breaks. Review your last few picks for process errors.',
      triggeredAt: new Date().toISOString(),
      dismissed: false,
    }
  }
  return null
}

/**
 * Check for drawdown threshold.
 */
export function checkDrawdown(
  picks: PickForAlerts[],
  startingBankroll: number,
  config: BankrollAlertConfig
): BankrollAlert | null {
  if (startingBankroll <= 0) return null

  const resolved = picks
    .filter((p) => (p.outcome === 'win' || p.outcome === 'loss' || p.outcome === 'push') && p.profit != null)
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))

  let balance = startingBankroll
  let peak = startingBankroll

  for (const p of resolved) {
    balance += p.profit!
    if (balance > peak) peak = balance
  }

  const drawdown = peak > 0 ? ((peak - balance) / peak) * 100 : 0

  if (drawdown >= config.drawdownThreshold) {
    const severity = drawdown >= config.drawdownThreshold * 2 ? 'critical' : 'warning'
    return {
      id: generateId(),
      type: 'drawdown',
      severity,
      title: 'Drawdown Alert',
      message: `Your bankroll is ${drawdown.toFixed(1)}% below its peak ($${peak.toFixed(0)} → $${balance.toFixed(0)}). Threshold: ${config.drawdownThreshold}%.`,
      recommendation: drawdown >= 30
        ? 'Significant drawdown. Reduce unit sizing to 50% until you recover to within 10% of peak. Consider taking a break.'
        : 'Drawdown is within normal variance, but stay disciplined. Avoid increasing bet sizes to recover faster.',
      triggeredAt: new Date().toISOString(),
      dismissed: false,
    }
  }
  return null
}

/**
 * Check for win rate drop.
 */
export function checkWinRateDrop(
  picks: PickForAlerts[],
  config: BankrollAlertConfig
): BankrollAlert | null {
  const resolved = picks
    .filter((p) => p.outcome === 'win' || p.outcome === 'loss')
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))

  if (resolved.length < 20) return null

  // Overall win rate
  const totalWins = resolved.filter((p) => p.outcome === 'win').length
  const overallWinRate = (totalWins / resolved.length) * 100

  // Recent win rate (last 10)
  const recent = resolved.slice(-10)
  const recentWins = recent.filter((p) => p.outcome === 'win').length
  const recentWinRate = (recentWins / recent.length) * 100

  const drop = overallWinRate - recentWinRate

  if (drop >= config.winRateDropThreshold) {
    return {
      id: generateId(),
      type: 'win-rate-drop',
      severity: drop >= config.winRateDropThreshold * 2 ? 'critical' : 'warning',
      title: 'Win Rate Declining',
      message: `Your recent win rate (${recentWinRate.toFixed(0)}% last 10) is ${drop.toFixed(1)}pp below your average (${overallWinRate.toFixed(0)}%).`,
      recommendation: 'Win rate regression may be variance or a signal to review your process. Check if you are deviating from your system.',
      triggeredAt: new Date().toISOString(),
      dismissed: false,
    }
  }
  return null
}

/**
 * Detect potential tilt — rapid betting after losses.
 */
export function checkTilt(picks: PickForAlerts[]): BankrollAlert | null {
  const recent = picks
    .filter((p) => p.created_at && (p.outcome === 'win' || p.outcome === 'loss'))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 10)

  if (recent.length < 4) return null

  // Check for rapid loss + high unit escalation
  let recentLosses = 0
  let maxUnits = 0
  let firstUnits = recent[recent.length - 1]?.units ?? 1

  for (const p of recent.slice(0, 5)) {
    if (p.outcome === 'loss') recentLosses++
    if (p.units > maxUnits) maxUnits = p.units
  }

  const unitEscalation = firstUnits > 0 ? maxUnits / firstUnits : 1

  if (recentLosses >= 3 && unitEscalation >= 2) {
    return {
      id: generateId(),
      type: 'tilt-warning',
      severity: 'critical',
      title: 'Tilt Warning',
      message: `${recentLosses} losses in your last 5 bets with unit escalation (${firstUnits}u → ${maxUnits}u). This pattern suggests chasing losses.`,
      recommendation: 'STOP betting immediately. Close all sportsbook apps. The best bet you can make right now is no bet at all. Come back tomorrow.',
      triggeredAt: new Date().toISOString(),
      dismissed: false,
    }
  }
  return null
}

/**
 * Run all bankroll alert checks.
 */
export function checkAllBankrollAlerts(
  picks: PickForAlerts[],
  bankroll: number,
  config?: BankrollAlertConfig
): BankrollAlert[] {
  const cfg = config ?? loadConfig()
  if (!cfg.enabled) return []

  const alerts: BankrollAlert[] = []

  const dailyLoss = checkDailyLoss(picks, bankroll, cfg)
  if (dailyLoss) alerts.push(dailyLoss)

  const consec = checkConsecutiveLosses(picks, cfg)
  if (consec) alerts.push(consec)

  const dd = checkDrawdown(picks, bankroll, cfg)
  if (dd) alerts.push(dd)

  const wrDrop = checkWinRateDrop(picks, cfg)
  if (wrDrop) alerts.push(wrDrop)

  const tilt = checkTilt(picks)
  if (tilt) alerts.push(tilt)

  // Save new alerts
  if (alerts.length > 0) {
    const existing = loadAlerts()
    // Dedup by type (keep most recent per type)
    const typesSeen = new Set(alerts.map((a) => a.type))
    const filtered = existing.filter((a) => !typesSeen.has(a.type))
    saveAlerts([...filtered, ...alerts])
  }

  return alerts
}
