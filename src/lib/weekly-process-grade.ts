/**
 * Weekly Process Grade Report — Track bet grading scores over time.
 *
 * Aggregates auto-grade or manual grade scores by week.
 * Shows trend (improving/declining), best/worst week, grade distribution.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface WeeklyGradeReport {
  weeks: WeekGradeSummary[]
  trend: 'improving' | 'declining' | 'stable' | 'insufficient'
  trendStrength: number // 0-100
  overallAvg: number
  bestWeek: WeekGradeSummary | null
  worstWeek: WeekGradeSummary | null
}

export interface WeekGradeSummary {
  weekStart: string // ISO date (Monday)
  weekEnd: string   // ISO date (Sunday)
  weekLabel: string  // e.g., "Mar 17-23"
  avgScore: number
  pickCount: number
  gradeDistribution: Record<string, number> // A: 3, B: 2, etc.
  chaseBets: number
  beatCLV: number  // Count of picks that beat closing line
  totalCLV: number // Count of picks with CLV data
}

export interface GradedPickForWeekly {
  game_date: string
  score: number
  grade: string
  isChaseBet: boolean
  beatClosingLine: boolean | null
}

/**
 * Build a weekly process grade report.
 */
export function buildWeeklyGradeReport(
  picks: GradedPickForWeekly[]
): WeeklyGradeReport {
  if (picks.length === 0) {
    return {
      weeks: [],
      trend: 'insufficient',
      trendStrength: 0,
      overallAvg: 0,
      bestWeek: null,
      worstWeek: null,
    }
  }

  // Group by week (Monday-Sunday)
  const weekMap = new Map<string, GradedPickForWeekly[]>()
  for (const pick of picks) {
    const weekStart = getWeekStart(pick.game_date)
    const existing = weekMap.get(weekStart) || []
    existing.push(pick)
    weekMap.set(weekStart, existing)
  }

  // Build summaries
  const weeks: WeekGradeSummary[] = Array.from(weekMap.entries())
    .map(([weekStart, weekPicks]) => {
      const weekEnd = getWeekEnd(weekStart)
      const avgScore = Math.round(
        weekPicks.reduce((sum, p) => sum + p.score, 0) / weekPicks.length
      )

      const gradeDistribution: Record<string, number> = {}
      for (const pick of weekPicks) {
        const simpleGrade = pick.grade.replace('+', '')
        gradeDistribution[simpleGrade] = (gradeDistribution[simpleGrade] || 0) + 1
      }

      const chaseBets = weekPicks.filter((p) => p.isChaseBet).length
      const clvPicks = weekPicks.filter((p) => p.beatClosingLine !== null)
      const beatCLV = clvPicks.filter((p) => p.beatClosingLine === true).length

      return {
        weekStart,
        weekEnd,
        weekLabel: formatWeekLabel(weekStart, weekEnd),
        avgScore,
        pickCount: weekPicks.length,
        gradeDistribution,
        chaseBets,
        beatCLV,
        totalCLV: clvPicks.length,
      }
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))

  const overallAvg = Math.round(
    picks.reduce((sum, p) => sum + p.score, 0) / picks.length
  )

  const bestWeek = weeks.length > 0
    ? weeks.reduce((best, w) => (w.avgScore > best.avgScore ? w : best))
    : null
  const worstWeek = weeks.length > 0
    ? weeks.reduce((worst, w) => (w.avgScore < worst.avgScore ? w : worst))
    : null

  const { trend, trendStrength } = calculateTrend(weeks)

  return { weeks, trend, trendStrength, overallAvg, bestWeek, worstWeek }
}

function calculateTrend(
  weeks: WeekGradeSummary[]
): { trend: WeeklyGradeReport['trend']; trendStrength: number } {
  if (weeks.length < 3) return { trend: 'insufficient', trendStrength: 0 }

  // Linear regression on weekly avg scores
  const n = weeks.length
  const xs = weeks.map((_, i) => i)
  const ys = weeks.map((w) => w.avgScore)

  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0)
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  // Normalize slope to a strength (0-100)
  const trendStrength = Math.min(100, Math.round(Math.abs(slope) * 10))

  if (Math.abs(slope) < 1) return { trend: 'stable', trendStrength }
  return {
    trend: slope > 0 ? 'improving' : 'declining',
    trendStrength,
  }
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z')
  const dayOfWeek = date.getUTCDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0
  date.setUTCDate(date.getUTCDate() - diff)
  return date.toISOString().slice(0, 10)
}

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + 6)
  return date.toISOString().slice(0, 10)
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T12:00:00Z')
  const end = new Date(weekEnd + 'T12:00:00Z')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const startMonth = months[start.getUTCMonth()]
  const endMonth = months[end.getUTCMonth()]

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getUTCDate()}-${end.getUTCDate()}`
  }
  return `${startMonth} ${start.getUTCDate()}-${endMonth} ${end.getUTCDate()}`
}
