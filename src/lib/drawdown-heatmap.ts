/**
 * Bankroll Drawdown Heatmap — Calendar view showing drawdown depth by day.
 *
 * Shows how deep the bankroll was below its peak on each day.
 * Darker colors = deeper drawdown. Helps identify when and how long
 * drawdowns persist.
 *
 * Pure functions — no side effects.
 */

export interface DrawdownDay {
  date: string
  /** Drawdown as percentage from peak (0 = at peak, 50 = 50% below peak) */
  drawdown: number
  /** Balance on this day */
  balance: number
  /** Peak balance up to this day */
  peak: number
  /** Daily P/L */
  dailyPL: number
  /** Heat level for visualization */
  heatLevel: 'none' | 'mild' | 'moderate' | 'significant' | 'severe' | 'critical'
}

export interface DrawdownMonth {
  year: number
  month: number // 1-12
  label: string // "January 2026"
  days: (DrawdownDay | null)[] // 1-indexed (index 0 = null)
  maxDrawdown: number
  avgDrawdown: number
  daysInDrawdown: number
}

export interface DrawdownHeatmapResult {
  months: DrawdownMonth[]
  /** Maximum drawdown across all time */
  maxDrawdown: number
  /** Average drawdown across all days */
  avgDrawdown: number
  /** Longest consecutive drawdown streak (days) */
  longestDrawdownStreak: number
  /** Current drawdown percentage */
  currentDrawdown: number
  /** Date of maximum drawdown */
  maxDrawdownDate: string | null
  /** Summary */
  summary: string
}

interface PickForDrawdown {
  created_at?: string
  profit?: number | null
  outcome?: string | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Classify drawdown into heat levels.
 */
export function getHeatLevel(drawdown: number): DrawdownDay['heatLevel'] {
  if (drawdown <= 0) return 'none'
  if (drawdown < 5) return 'mild'
  if (drawdown < 10) return 'moderate'
  if (drawdown < 20) return 'significant'
  if (drawdown < 40) return 'severe'
  return 'critical'
}

/**
 * Get the number of days in a month.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Build drawdown heatmap from pick data with a starting bankroll.
 */
export function buildDrawdownHeatmap(
  picks: PickForDrawdown[],
  startingBankroll: number
): DrawdownHeatmapResult {
  const dated = picks.filter(
    (p) => p.created_at && p.profit != null && (p.outcome === 'win' || p.outcome === 'loss' || p.outcome === 'push')
  )

  if (dated.length < 5 || startingBankroll <= 0) {
    return {
      months: [],
      maxDrawdown: 0,
      avgDrawdown: 0,
      longestDrawdownStreak: 0,
      currentDrawdown: 0,
      maxDrawdownDate: null,
      summary: dated.length < 5
        ? `Need at least 5 resolved picks with dates (have ${dated.length}).`
        : 'Starting bankroll must be positive.',
    }
  }

  // Sort by date
  const sorted = [...dated].sort(
    (a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
  )

  // Aggregate daily P/L
  const dailyPL = new Map<string, number>()
  for (const p of sorted) {
    const dateStr = new Date(p.created_at!).toISOString().split('T')[0]
    dailyPL.set(dateStr, (dailyPL.get(dateStr) ?? 0) + (p.profit ?? 0))
  }

  // Build day-by-day balance and drawdown
  const dayEntries = [...dailyPL.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  let balance = startingBankroll
  let peak = startingBankroll
  const drawdownDays = new Map<string, DrawdownDay>()

  for (const [date, pl] of dayEntries) {
    balance += pl
    if (balance > peak) peak = balance
    const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0

    drawdownDays.set(date, {
      date,
      drawdown: Math.max(0, dd),
      balance,
      peak,
      dailyPL: pl,
      heatLevel: getHeatLevel(dd),
    })
  }

  // Get date range
  const firstDate = new Date(dayEntries[0][0])
  const lastDate = new Date(dayEntries[dayEntries.length - 1][0])

  // Build months
  const months: DrawdownMonth[] = []
  const startMonth = firstDate.getFullYear() * 12 + firstDate.getMonth()
  const endMonth = lastDate.getFullYear() * 12 + lastDate.getMonth()

  for (let m = startMonth; m <= endMonth; m++) {
    const year = Math.floor(m / 12)
    const month = (m % 12) + 1
    const numDays = daysInMonth(year, month)
    const days: (DrawdownDay | null)[] = [null] // index 0

    let monthMaxDD = 0
    let monthTotalDD = 0
    let monthDaysInDD = 0
    let daysWithData = 0

    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const entry = drawdownDays.get(dateStr) ?? null
      days.push(entry)

      if (entry) {
        daysWithData++
        if (entry.drawdown > monthMaxDD) monthMaxDD = entry.drawdown
        monthTotalDD += entry.drawdown
        if (entry.drawdown > 0) monthDaysInDD++
      }
    }

    months.push({
      year,
      month,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      days,
      maxDrawdown: monthMaxDD,
      avgDrawdown: daysWithData > 0 ? monthTotalDD / daysWithData : 0,
      daysInDrawdown: monthDaysInDD,
    })
  }

  // Global stats
  const allDDs = [...drawdownDays.values()]
  const maxDD = allDDs.reduce((m, d) => Math.max(m, d.drawdown), 0)
  const avgDD = allDDs.length > 0 ? allDDs.reduce((s, d) => s + d.drawdown, 0) / allDDs.length : 0
  const maxDDEntry = allDDs.find((d) => d.drawdown === maxDD)

  // Longest streak
  let longest = 0
  let current = 0
  const sortedDays = [...drawdownDays.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  for (const [, day] of sortedDays) {
    if (day.drawdown > 0) {
      current++
      if (current > longest) longest = current
    } else {
      current = 0
    }
  }

  const currentDD = allDDs.length > 0 ? allDDs[allDDs.length - 1].drawdown : 0

  // Summary
  let summary = ''
  if (maxDD === 0) {
    summary = 'No drawdown detected — your bankroll has only grown.'
  } else if (maxDD < 10) {
    summary = `Shallow drawdowns (max ${maxDD.toFixed(1)}%). Your bankroll management is solid.`
  } else if (maxDD < 25) {
    summary = `Moderate drawdowns (max ${maxDD.toFixed(1)}%). ${longest > 14 ? `Longest drawdown lasted ${longest} days — patience required.` : ''}`
  } else {
    summary = `Deep drawdowns (max ${maxDD.toFixed(1)}%). Consider reducing unit sizing to smooth the ride. Longest drawdown: ${longest} days.`
  }

  return {
    months,
    maxDrawdown: maxDD,
    avgDrawdown: avgDD,
    longestDrawdownStreak: longest,
    currentDrawdown: currentDD,
    maxDrawdownDate: maxDDEntry?.date ?? null,
    summary,
  }
}
