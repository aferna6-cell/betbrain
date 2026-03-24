/**
 * Bankroll Milestone Alerts — Notify when bankroll crosses key thresholds.
 *
 * Tracks bankroll growth and detects when key milestones are reached:
 * - Percentage milestones (25%, 50%, 100%, 200% growth)
 * - Absolute milestones (custom thresholds)
 * - Drawdown alerts (25%, 50% from peak)
 * - New all-time high
 *
 * Pure functions — no side effects, no API calls.
 */

export interface BankrollMilestone {
  type: 'growth' | 'drawdown' | 'ath' | 'custom'
  label: string
  threshold: number
  reached: boolean
  reachedDate: string | null
  currentValue: number
  progress: number // 0-100 toward next unreached milestone
}

export interface MilestoneCheckResult {
  milestones: BankrollMilestone[]
  newlyReached: BankrollMilestone[]
  nextMilestone: BankrollMilestone | null
  allTimeHigh: number
  currentBankroll: number
  startingBankroll: number
  growthPct: number
  drawdownFromATH: number
}

export interface BankrollSnapshot {
  date: string
  balance: number
}

const DEFAULT_GROWTH_MILESTONES = [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0]
const DEFAULT_DRAWDOWN_ALERTS = [0.1, 0.25, 0.5]

/**
 * Check bankroll milestones against history.
 *
 * @param snapshots - Bankroll snapshots sorted by date (oldest first)
 * @param startingBankroll - Initial bankroll amount
 * @param previouslyReached - Set of milestone labels already acknowledged
 */
export function checkMilestones(
  snapshots: BankrollSnapshot[],
  startingBankroll: number,
  previouslyReached: Set<string> = new Set()
): MilestoneCheckResult {
  if (snapshots.length === 0 || startingBankroll <= 0) {
    return {
      milestones: [],
      newlyReached: [],
      nextMilestone: null,
      allTimeHigh: startingBankroll,
      currentBankroll: startingBankroll,
      startingBankroll,
      growthPct: 0,
      drawdownFromATH: 0,
    }
  }

  const currentBankroll = snapshots[snapshots.length - 1].balance
  const allTimeHigh = Math.max(startingBankroll, ...snapshots.map((s) => s.balance))
  const growthPct = Math.round(((currentBankroll - startingBankroll) / startingBankroll) * 10000) / 100
  const drawdownFromATH = allTimeHigh > 0
    ? Math.round(((allTimeHigh - currentBankroll) / allTimeHigh) * 10000) / 100
    : 0

  const milestones: BankrollMilestone[] = []

  // Growth milestones
  for (const pct of DEFAULT_GROWTH_MILESTONES) {
    const target = startingBankroll * (1 + pct)
    const label = `${Math.round(pct * 100)}% Growth`
    const reached = currentBankroll >= target
    const reachedDate = reached
      ? snapshots.find((s) => s.balance >= target)?.date || null
      : null
    const progress = reached
      ? 100
      : Math.min(100, Math.max(0, Math.round(
          ((currentBankroll - startingBankroll) / (target - startingBankroll)) * 100
        )))

    milestones.push({
      type: 'growth',
      label,
      threshold: Math.round(target * 100) / 100,
      reached,
      reachedDate,
      currentValue: currentBankroll,
      progress,
    })
  }

  // Drawdown alerts
  for (const pct of DEFAULT_DRAWDOWN_ALERTS) {
    const threshold = allTimeHigh * (1 - pct)
    const label = `${Math.round(pct * 100)}% Drawdown`
    const reached = currentBankroll <= threshold && allTimeHigh > startingBankroll
    const reachedDate = reached
      ? snapshots.slice().reverse().find((s) => s.balance <= threshold)?.date || null
      : null

    milestones.push({
      type: 'drawdown',
      label,
      threshold: Math.round(threshold * 100) / 100,
      reached,
      reachedDate,
      currentValue: currentBankroll,
      progress: reached ? 100 : Math.round((drawdownFromATH / (pct * 100)) * 100),
    })
  }

  // All-time high
  const isATH = currentBankroll >= allTimeHigh && currentBankroll > startingBankroll
  milestones.push({
    type: 'ath',
    label: 'All-Time High',
    threshold: allTimeHigh,
    reached: isATH,
    reachedDate: isATH ? snapshots[snapshots.length - 1].date : null,
    currentValue: currentBankroll,
    progress: allTimeHigh > 0 ? Math.min(100, Math.round((currentBankroll / allTimeHigh) * 100)) : 0,
  })

  // Find newly reached milestones
  const newlyReached = milestones.filter(
    (m) => m.reached && !previouslyReached.has(m.label)
  )

  // Find next unreached growth milestone
  const nextMilestone = milestones.find(
    (m) => !m.reached && m.type === 'growth'
  ) || null

  return {
    milestones,
    newlyReached,
    nextMilestone,
    allTimeHigh,
    currentBankroll,
    startingBankroll,
    growthPct,
    drawdownFromATH,
  }
}

/**
 * Generate milestone alert messages for notification system.
 */
export function generateMilestoneAlerts(
  result: MilestoneCheckResult
): Array<{ title: string; message: string; type: 'success' | 'warning' }> {
  return result.newlyReached.map((milestone) => {
    if (milestone.type === 'drawdown') {
      return {
        title: `Drawdown Alert: ${milestone.label}`,
        message: `Bankroll has dropped to $${milestone.currentValue.toFixed(2)}, a ${milestone.label.toLowerCase()} from the all-time high of $${result.allTimeHigh.toFixed(2)}.`,
        type: 'warning' as const,
      }
    }
    if (milestone.type === 'ath') {
      return {
        title: 'New All-Time High!',
        message: `Bankroll reached $${milestone.currentValue.toFixed(2)}, a new all-time high.`,
        type: 'success' as const,
      }
    }
    return {
      title: `Milestone: ${milestone.label}`,
      message: `Bankroll reached $${milestone.currentValue.toFixed(2)} (${milestone.label} from starting $${result.startingBankroll.toFixed(2)}).`,
      type: 'success' as const,
    }
  })
}
