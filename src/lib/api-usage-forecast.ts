/**
 * Odds API Usage Forecast — Predict when monthly budget will be exhausted.
 *
 * Analyzes current usage patterns to forecast remaining budget,
 * daily burn rate, and estimated exhaustion date.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface UsageForecast {
  /** Total monthly budget */
  monthlyBudget: number
  /** Requests used so far this month */
  usedRequests: number
  /** Remaining requests */
  remainingRequests: number
  /** Percentage of budget used */
  usedPercentage: number
  /** Days elapsed in current month */
  daysElapsed: number
  /** Days remaining in current month */
  daysRemaining: number
  /** Average daily burn rate */
  dailyBurnRate: number
  /** Projected total usage by end of month */
  projectedMonthEnd: number
  /** Will the budget be exhausted before month end? */
  willExhaust: boolean
  /** Estimated date of exhaustion (null if won't exhaust) */
  exhaustionDate: string | null
  /** Days until exhaustion (null if won't exhaust) */
  daysUntilExhaustion: number | null
  /** Recommended daily budget to last the month */
  recommendedDailyBudget: number
  /** Budget status: safe, warning, danger, exhausted */
  status: 'safe' | 'warning' | 'danger' | 'exhausted'
  /** Suggested actions based on status */
  suggestions: string[]
}

export interface DailyUsage {
  date: string
  requests: number
}

/**
 * Calculate usage forecast given current usage and budget.
 */
export function calculateUsageForecast(
  usedRequests: number,
  monthlyBudget: number,
  currentDate: Date = new Date(),
  dailyHistory: DailyUsage[] = []
): UsageForecast {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dayOfMonth = currentDate.getDate()
  const daysElapsed = Math.max(dayOfMonth, 1)
  const daysRemaining = daysInMonth - dayOfMonth

  const remainingRequests = Math.max(monthlyBudget - usedRequests, 0)
  const usedPercentage = monthlyBudget > 0
    ? Math.round((usedRequests / monthlyBudget) * 1000) / 10
    : 0

  // Calculate daily burn rate
  // Use history if available, otherwise use average
  let dailyBurnRate: number
  if (dailyHistory.length >= 3) {
    // Use weighted recent average (more recent days weigh more)
    const recentDays = dailyHistory.slice(-7)
    let weightedSum = 0
    let weightTotal = 0
    recentDays.forEach((day, idx) => {
      const weight = idx + 1 // More recent = higher weight
      weightedSum += day.requests * weight
      weightTotal += weight
    })
    dailyBurnRate = weightTotal > 0 ? weightedSum / weightTotal : 0
  } else {
    dailyBurnRate = daysElapsed > 0 ? usedRequests / daysElapsed : 0
  }
  dailyBurnRate = Math.round(dailyBurnRate * 100) / 100

  // Project total usage by month end
  const projectedMonthEnd = Math.round(usedRequests + dailyBurnRate * daysRemaining)

  // Exhaustion calculation
  let willExhaust = false
  let exhaustionDate: string | null = null
  let daysUntilExhaustion: number | null = null

  if (usedRequests >= monthlyBudget) {
    willExhaust = true
    exhaustionDate = formatDate(currentDate)
    daysUntilExhaustion = 0
  } else if (dailyBurnRate > 0) {
    const daysToExhaust = remainingRequests / dailyBurnRate
    if (daysToExhaust <= daysRemaining) {
      willExhaust = true
      daysUntilExhaustion = Math.ceil(daysToExhaust)
      const exhaustDate = new Date(currentDate)
      exhaustDate.setDate(exhaustDate.getDate() + daysUntilExhaustion)
      exhaustionDate = formatDate(exhaustDate)
    }
  }

  // Recommended daily budget to last the month
  const recommendedDailyBudget = daysRemaining > 0
    ? Math.floor(remainingRequests / daysRemaining)
    : 0

  // Status determination
  let status: 'safe' | 'warning' | 'danger' | 'exhausted'
  if (usedRequests >= monthlyBudget) {
    status = 'exhausted'
  } else if (usedPercentage > 80 || (willExhaust && daysUntilExhaustion !== null && daysUntilExhaustion < 5)) {
    status = 'danger'
  } else if (usedPercentage > 60 || projectedMonthEnd > monthlyBudget * 0.9) {
    status = 'warning'
  } else {
    status = 'safe'
  }

  // Generate suggestions
  const suggestions = generateSuggestions(status, dailyBurnRate, recommendedDailyBudget, remainingRequests, daysRemaining)

  return {
    monthlyBudget,
    usedRequests,
    remainingRequests,
    usedPercentage,
    daysElapsed,
    daysRemaining,
    dailyBurnRate,
    projectedMonthEnd,
    willExhaust,
    exhaustionDate,
    daysUntilExhaustion,
    recommendedDailyBudget,
    status,
    suggestions,
  }
}

function generateSuggestions(
  status: string,
  dailyBurnRate: number,
  recommendedBudget: number,
  remaining: number,
  daysRemaining: number
): string[] {
  const suggestions: string[] = []

  if (status === 'exhausted') {
    suggestions.push('Budget exhausted. All data served from cache until next month.')
    suggestions.push('Consider upgrading your Odds API plan for more requests.')
  } else if (status === 'danger') {
    suggestions.push(`Reduce usage to ${recommendedBudget} requests/day to last the month.`)
    suggestions.push('Focus on fewer sports or less frequent refreshes.')
    if (dailyBurnRate > recommendedBudget * 1.5) {
      suggestions.push(`Current burn rate (${dailyBurnRate}/day) is ${Math.round(dailyBurnRate / recommendedBudget)}x the sustainable rate.`)
    }
  } else if (status === 'warning') {
    suggestions.push(`Target ${recommendedBudget} requests/day for comfortable pacing.`)
    if (dailyBurnRate > recommendedBudget) {
      suggestions.push('Consider reducing refresh frequency for non-critical sports.')
    }
  } else {
    suggestions.push(`Budget is healthy. ${remaining} requests remaining for ${daysRemaining} days.`)
  }

  return suggestions
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Get status color classes.
 */
export function getStatusColor(status: 'safe' | 'warning' | 'danger' | 'exhausted'): string {
  switch (status) {
    case 'safe': return 'text-green-400'
    case 'warning': return 'text-amber-400'
    case 'danger': return 'text-red-400'
    case 'exhausted': return 'text-red-500'
  }
}

export function getStatusBg(status: 'safe' | 'warning' | 'danger' | 'exhausted'): string {
  switch (status) {
    case 'safe': return 'bg-green-500/10 border-green-500/30'
    case 'warning': return 'bg-amber-500/10 border-amber-500/30'
    case 'danger': return 'bg-red-500/10 border-red-500/30'
    case 'exhausted': return 'bg-red-500/20 border-red-500/50'
  }
}
