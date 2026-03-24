/**
 * Seasonal Trend Detector — Identify recurring performance patterns by month/week.
 *
 * Analyzes pick history to find calendar-based trends: which months are best,
 * day-of-week patterns, seasonal hot/cold streaks, and volume patterns.
 *
 * Pure functions — no side effects.
 */

export interface MonthlyTrend {
  month: number // 1-12
  monthName: string
  wins: number
  losses: number
  pushes: number
  total: number
  winRate: number | null
  profit: number
  roi: number
  avgOdds: number | null
  units: number
}

export interface WeeklyTrend {
  /** ISO week number (1-53) */
  week: number
  /** Year */
  year: number
  /** Label like "2026-W12" */
  label: string
  wins: number
  losses: number
  total: number
  winRate: number | null
  profit: number
  roi: number
}

export interface DayOfWeekTrend {
  day: number // 0=Sun, 6=Sat
  dayName: string
  wins: number
  losses: number
  total: number
  winRate: number | null
  profit: number
  roi: number
}

export interface SeasonalPattern {
  type: 'monthly' | 'day-of-week'
  /** Human-readable description */
  description: string
  /** How strong the pattern is (0-100) */
  strength: number
  /** Supporting data */
  evidence: string
}

export interface SeasonalTrendsResult {
  monthly: MonthlyTrend[]
  weekly: WeeklyTrend[]
  dayOfWeek: DayOfWeekTrend[]
  patterns: SeasonalPattern[]
  /** Best month */
  bestMonth: MonthlyTrend | null
  /** Worst month */
  worstMonth: MonthlyTrend | null
  /** Best day of week */
  bestDay: DayOfWeekTrend | null
  /** Worst day of week */
  worstDay: DayOfWeekTrend | null
  /** Summary */
  summary: string
}

interface PickForTrends {
  created_at?: string
  outcome?: string | null
  profit?: number | null
  units: number
  odds: number
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Get ISO week number for a date.
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function calcROI(profit: number, units: number): number {
  return units > 0 ? (profit / units) * 100 : 0
}

/**
 * Build seasonal trends from pick data.
 */
export function buildSeasonalTrends(picks: PickForTrends[]): SeasonalTrendsResult {
  const dated = picks.filter((p) => p.created_at)

  if (dated.length < 10) {
    return {
      monthly: [],
      weekly: [],
      dayOfWeek: [],
      patterns: [],
      bestMonth: null,
      worstMonth: null,
      bestDay: null,
      worstDay: null,
      summary: `Need at least 10 dated picks for seasonal analysis (have ${dated.length}).`,
    }
  }

  // Monthly trends
  const monthMap = new Map<number, { wins: number; losses: number; pushes: number; profit: number; units: number; odds: number[] }>()
  for (let m = 1; m <= 12; m++) {
    monthMap.set(m, { wins: 0, losses: 0, pushes: 0, profit: 0, units: 0, odds: [] })
  }

  // Weekly trends
  const weekMap = new Map<string, { week: number; year: number; wins: number; losses: number; profit: number; units: number }>()

  // Day of week trends
  const dayMap = new Map<number, { wins: number; losses: number; profit: number; units: number }>()
  for (let d = 0; d <= 6; d++) {
    dayMap.set(d, { wins: 0, losses: 0, profit: 0, units: 0 })
  }

  for (const p of dated) {
    const date = new Date(p.created_at!)
    const month = date.getMonth() + 1
    const day = date.getDay()
    const week = getISOWeek(date)
    const year = date.getFullYear()
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`

    // Monthly
    const mEntry = monthMap.get(month)!
    if (p.outcome === 'win') mEntry.wins++
    else if (p.outcome === 'loss') mEntry.losses++
    else if (p.outcome === 'push') mEntry.pushes++
    mEntry.profit += p.profit ?? 0
    mEntry.units += p.units
    mEntry.odds.push(p.odds)

    // Weekly
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { week, year, wins: 0, losses: 0, profit: 0, units: 0 })
    }
    const wEntry = weekMap.get(weekKey)!
    if (p.outcome === 'win') wEntry.wins++
    else if (p.outcome === 'loss') wEntry.losses++
    wEntry.profit += p.profit ?? 0
    wEntry.units += p.units

    // Day of week
    const dEntry = dayMap.get(day)!
    if (p.outcome === 'win') dEntry.wins++
    else if (p.outcome === 'loss') dEntry.losses++
    dEntry.profit += p.profit ?? 0
    dEntry.units += p.units
  }

  // Build monthly results
  const monthly: MonthlyTrend[] = [...monthMap.entries()]
    .map(([month, data]) => {
      const resolved = data.wins + data.losses + data.pushes
      const total = data.wins + data.losses + data.pushes
      return {
        month,
        monthName: MONTH_NAMES[month - 1],
        wins: data.wins,
        losses: data.losses,
        pushes: data.pushes,
        total,
        winRate: resolved > 0 ? (data.wins / (data.wins + data.losses || 1)) * 100 : null,
        profit: data.profit,
        roi: calcROI(data.profit, data.units),
        avgOdds: data.odds.length > 0 ? data.odds.reduce((s, o) => s + o, 0) / data.odds.length : null,
        units: data.units,
      }
    })
    .filter((m) => m.total > 0)

  // Build weekly results
  const weekly: WeeklyTrend[] = [...weekMap.entries()]
    .map(([label, data]) => ({
      week: data.week,
      year: data.year,
      label,
      wins: data.wins,
      losses: data.losses,
      total: data.wins + data.losses,
      winRate: (data.wins + data.losses) > 0 ? (data.wins / (data.wins + data.losses)) * 100 : null,
      profit: data.profit,
      roi: calcROI(data.profit, data.units),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Build day-of-week results
  const dayOfWeek: DayOfWeekTrend[] = [...dayMap.entries()]
    .map(([day, data]) => ({
      day,
      dayName: DAY_NAMES[day],
      wins: data.wins,
      losses: data.losses,
      total: data.wins + data.losses,
      winRate: (data.wins + data.losses) > 0 ? (data.wins / (data.wins + data.losses)) * 100 : null,
      profit: data.profit,
      roi: calcROI(data.profit, data.units),
    }))
    .filter((d) => d.total > 0)

  // Find best/worst
  const monthsWithData = monthly.filter((m) => m.wins + m.losses >= 3)
  const bestMonth = monthsWithData.length > 0
    ? monthsWithData.reduce((b, m) => (m.roi > b.roi ? m : b))
    : null
  const worstMonth = monthsWithData.length > 0
    ? monthsWithData.reduce((w, m) => (m.roi < w.roi ? m : w))
    : null

  const daysWithData = dayOfWeek.filter((d) => d.total >= 5)
  const bestDay = daysWithData.length > 0
    ? daysWithData.reduce((b, d) => (d.roi > b.roi ? d : b))
    : null
  const worstDay = daysWithData.length > 0
    ? daysWithData.reduce((w, d) => (d.roi < w.roi ? d : w))
    : null

  // Detect patterns
  const patterns: SeasonalPattern[] = []

  // Monthly pattern
  if (bestMonth && worstMonth && bestMonth.month !== worstMonth.month) {
    const spread = bestMonth.roi - worstMonth.roi
    if (spread > 20) {
      patterns.push({
        type: 'monthly',
        description: `${bestMonth.monthName} is your best month (+${bestMonth.roi.toFixed(1)}% ROI) while ${worstMonth.monthName} is your worst (${worstMonth.roi.toFixed(1)}% ROI).`,
        strength: Math.min(100, spread),
        evidence: `${bestMonth.monthName}: ${bestMonth.wins}W-${bestMonth.losses}L, ${worstMonth.monthName}: ${worstMonth.wins}W-${worstMonth.losses}L`,
      })
    }
  }

  // Day of week pattern
  if (bestDay && worstDay && bestDay.day !== worstDay.day) {
    const spread = bestDay.roi - worstDay.roi
    if (spread > 15) {
      patterns.push({
        type: 'day-of-week',
        description: `${bestDay.dayName}s are your best day (+${bestDay.roi.toFixed(1)}% ROI) while ${worstDay.dayName}s are weakest (${worstDay.roi.toFixed(1)}% ROI).`,
        strength: Math.min(100, spread),
        evidence: `${bestDay.dayName}: ${bestDay.wins}W-${bestDay.losses}L, ${worstDay.dayName}: ${worstDay.wins}W-${worstDay.losses}L`,
      })
    }
  }

  // Volume pattern — which months have most action
  const maxVolume = Math.max(...monthly.map((m) => m.total))
  const lowVolMonths = monthly.filter((m) => m.total < maxVolume * 0.3 && m.total > 0)
  if (lowVolMonths.length > 0) {
    patterns.push({
      type: 'monthly',
      description: `Low action months: ${lowVolMonths.map((m) => m.monthName).join(', ')}. Consider whether reduced volume is intentional.`,
      strength: 30,
      evidence: `Peak volume: ${maxVolume} picks/month, low months: ${lowVolMonths.map((m) => `${m.monthName}(${m.total})`).join(', ')}`,
    })
  }

  // Build summary
  const parts: string[] = []
  if (bestMonth) parts.push(`Best month: ${bestMonth.monthName} (${bestMonth.roi.toFixed(1)}% ROI)`)
  if (bestDay) parts.push(`Best day: ${bestDay.dayName}s (${bestDay.roi.toFixed(1)}% ROI)`)
  if (patterns.length === 0) parts.push('No strong seasonal patterns detected yet')
  const summary = parts.join('. ') + '.'

  return {
    monthly,
    weekly,
    dayOfWeek,
    patterns,
    bestMonth,
    worstMonth,
    bestDay,
    worstDay,
    summary,
  }
}

/**
 * Get the trend direction for a weekly series.
 */
export function getWeeklyTrendDirection(weeks: WeeklyTrend[]): 'improving' | 'declining' | 'stable' | 'insufficient' {
  const withROI = weeks.filter((w) => w.total >= 3)
  if (withROI.length < 4) return 'insufficient'

  // Simple linear regression on ROI
  const n = withROI.length
  const xs = withROI.map((_, i) => i)
  const ys = withROI.map((w) => w.roi)
  const xMean = xs.reduce((s, x) => s + x, 0) / n
  const yMean = ys.reduce((s, y) => s + y, 0) / n
  const slope =
    xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0) /
    (xs.reduce((s, x) => s + (x - xMean) ** 2, 0) || 1)

  if (slope > 2) return 'improving'
  if (slope < -2) return 'declining'
  return 'stable'
}
