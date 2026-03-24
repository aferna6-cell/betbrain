/**
 * Profit Calendar — Monthly calendar data colored by daily P/L.
 *
 * Aggregates resolved picks by date, calculates daily P/L,
 * and provides color/intensity data for calendar rendering.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface DailyPnL {
  date: string // YYYY-MM-DD
  profit: number
  units: number
  wins: number
  losses: number
  pushes: number
  totalPicks: number
  roi: number // profit / units wagered
}

export interface CalendarMonth {
  year: number
  month: number // 0-indexed (0 = January)
  days: (DailyPnL | null)[] // 42 slots (6 weeks x 7 days), null for empty cells
  totalProfit: number
  totalUnits: number
  bestDay: DailyPnL | null
  worstDay: DailyPnL | null
  winningDays: number
  losingDays: number
  breakEvenDays: number
  activeDays: number
}

export type HeatLevel = 'big-win' | 'win' | 'small-win' | 'break-even' | 'small-loss' | 'loss' | 'big-loss' | 'no-activity'

interface PickForCalendar {
  game_date: string
  outcome: string | null
  profit: number | null
  units: number
}

/**
 * Aggregate picks into daily P/L entries.
 */
export function aggregateDailyPnL(picks: PickForCalendar[]): Map<string, DailyPnL> {
  const resolved = picks.filter(
    (p) => p.outcome && p.outcome !== 'pending' && p.profit != null
  )

  const dailyMap = new Map<string, DailyPnL>()

  for (const pick of resolved) {
    const date = pick.game_date.slice(0, 10) // YYYY-MM-DD
    const existing = dailyMap.get(date) || {
      date,
      profit: 0,
      units: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalPicks: 0,
      roi: 0,
    }

    existing.profit += pick.profit!
    existing.units += pick.units
    existing.totalPicks += 1

    if (pick.outcome === 'win') existing.wins += 1
    else if (pick.outcome === 'loss') existing.losses += 1
    else if (pick.outcome === 'push') existing.pushes += 1

    dailyMap.set(date, existing)
  }

  // Calculate ROI for each day
  for (const [, day] of dailyMap) {
    day.roi = day.units > 0 ? (day.profit / day.units) * 100 : 0
    // Round for display
    day.profit = Math.round(day.profit * 100) / 100
    day.roi = Math.round(day.roi * 100) / 100
  }

  return dailyMap
}

/**
 * Build a calendar month grid (6 weeks x 7 days = 42 slots).
 * Sunday = 0, Saturday = 6.
 */
export function buildCalendarMonth(
  year: number,
  month: number,
  dailyPnL: Map<string, DailyPnL>
): CalendarMonth {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay() // 0 = Sunday
  const daysInMonth = lastDay.getDate()

  const days: (DailyPnL | null)[] = new Array(42).fill(null)

  let totalProfit = 0
  let totalUnits = 0
  let bestDay: DailyPnL | null = null
  let worstDay: DailyPnL | null = null
  let winningDays = 0
  let losingDays = 0
  let breakEvenDays = 0
  let activeDays = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const pnl = dailyPnL.get(dateStr) || null
    const slotIndex = startDayOfWeek + d - 1
    days[slotIndex] = pnl

    if (pnl) {
      activeDays++
      totalProfit += pnl.profit
      totalUnits += pnl.units

      if (pnl.profit > 0) winningDays++
      else if (pnl.profit < 0) losingDays++
      else breakEvenDays++

      if (!bestDay || pnl.profit > bestDay.profit) bestDay = pnl
      if (!worstDay || pnl.profit < worstDay.profit) worstDay = pnl
    }
  }

  return {
    year,
    month,
    days,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalUnits: Math.round(totalUnits * 100) / 100,
    bestDay,
    worstDay,
    winningDays,
    losingDays,
    breakEvenDays,
    activeDays,
  }
}

/**
 * Get heat level for a daily P/L value.
 * Thresholds based on unit size.
 */
export function getHeatLevel(profit: number, unitSize: number): HeatLevel {
  if (unitSize <= 0) return 'no-activity'

  const unitsProfit = profit / unitSize

  if (unitsProfit >= 3) return 'big-win'
  if (unitsProfit >= 1.5) return 'win'
  if (unitsProfit > 0) return 'small-win'
  if (unitsProfit === 0) return 'break-even'
  if (unitsProfit > -1.5) return 'small-loss'
  if (unitsProfit > -3) return 'loss'
  return 'big-loss'
}

/**
 * Get CSS color class for a heat level.
 */
export function getHeatColor(level: HeatLevel): string {
  switch (level) {
    case 'big-win':
      return 'bg-green-500/80 text-white'
    case 'win':
      return 'bg-green-500/50 text-green-100'
    case 'small-win':
      return 'bg-green-500/25 text-green-200'
    case 'break-even':
      return 'bg-zinc-700/50 text-zinc-300'
    case 'small-loss':
      return 'bg-red-500/25 text-red-200'
    case 'loss':
      return 'bg-red-500/50 text-red-100'
    case 'big-loss':
      return 'bg-red-500/80 text-white'
    case 'no-activity':
      return 'bg-transparent text-zinc-600'
  }
}

/**
 * Get month/year label.
 */
export function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Get streak info: consecutive winning/losing days.
 */
export function getStreakInfo(dailyPnL: Map<string, DailyPnL>): {
  currentStreak: number // positive = winning days, negative = losing days
  longestWinStreak: number
  longestLoseStreak: number
} {
  const sorted = [...dailyPnL.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  let currentStreak = 0
  let longestWinStreak = 0
  let longestLoseStreak = 0
  let winRun = 0
  let loseRun = 0

  for (const day of sorted) {
    if (day.profit > 0) {
      winRun++
      loseRun = 0
      longestWinStreak = Math.max(longestWinStreak, winRun)
    } else if (day.profit < 0) {
      loseRun++
      winRun = 0
      longestLoseStreak = Math.max(longestLoseStreak, loseRun)
    } else {
      winRun = 0
      loseRun = 0
    }
  }

  // Current streak from the last day
  if (sorted.length > 0) {
    const last = sorted[sorted.length - 1]
    if (last.profit > 0) currentStreak = winRun
    else if (last.profit < 0) currentStreak = -loseRun
  }

  return { currentStreak, longestWinStreak, longestLoseStreak }
}
