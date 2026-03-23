/**
 * Performance by Time of Day — analyze when picks are most/least profitable.
 *
 * Buckets picks into time periods to find optimal betting windows.
 */

export type TimePeriod = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night'

export interface TimePeriodStats {
  period: TimePeriod
  label: string
  hourRange: string
  picks: number
  wins: number
  losses: number
  pushes: number
  profit: number
  roi: number
  winRate: number
  avgOdds: number
}

export interface TimeAnalysis {
  periods: TimePeriodStats[]
  bestPeriod: TimePeriodStats | null
  worstPeriod: TimePeriodStats | null
  totalResolvedByTime: number
}

const TIME_PERIODS: Array<{ period: TimePeriod; label: string; hourRange: string; start: number; end: number }> = [
  { period: 'early_morning', label: 'Early Morning', hourRange: '5am - 9am', start: 5, end: 9 },
  { period: 'morning', label: 'Morning', hourRange: '9am - 12pm', start: 9, end: 12 },
  { period: 'afternoon', label: 'Afternoon', hourRange: '12pm - 5pm', start: 12, end: 17 },
  { period: 'evening', label: 'Evening', hourRange: '5pm - 10pm', start: 17, end: 22 },
  { period: 'late_night', label: 'Late Night', hourRange: '10pm - 5am', start: 22, end: 5 },
]

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 9) return 'early_morning'
  if (hour >= 9 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'late_night'
}

interface PickLike {
  outcome?: string | null
  profit?: number | null
  units: number
  odds: number
  created_at: string
}

export function analyzeByTimeOfDay<T extends PickLike>(picks: T[]): TimeAnalysis {
  const buckets = new Map<TimePeriod, { wins: number; losses: number; pushes: number; profit: number; units: number; odds: number[]; count: number }>()

  // Initialize all periods
  for (const tp of TIME_PERIODS) {
    buckets.set(tp.period, { wins: 0, losses: 0, pushes: 0, profit: 0, units: 0, odds: [], count: 0 })
  }

  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')

  for (const pick of resolved) {
    const hour = new Date(pick.created_at).getHours()
    const period = getTimePeriod(hour)
    const bucket = buckets.get(period)!

    bucket.count++
    bucket.profit += pick.profit ?? 0
    bucket.units += pick.units
    bucket.odds.push(pick.odds)

    if (pick.outcome === 'win') bucket.wins++
    else if (pick.outcome === 'loss') bucket.losses++
    else if (pick.outcome === 'push') bucket.pushes++
  }

  const periods: TimePeriodStats[] = TIME_PERIODS.map((tp) => {
    const b = buckets.get(tp.period)!
    const decided = b.wins + b.losses
    return {
      period: tp.period,
      label: tp.label,
      hourRange: tp.hourRange,
      picks: b.count,
      wins: b.wins,
      losses: b.losses,
      pushes: b.pushes,
      profit: Math.round(b.profit * 100) / 100,
      roi: b.units > 0 ? Math.round((b.profit / b.units) * 10000) / 100 : 0,
      winRate: decided > 0 ? Math.round((b.wins / decided) * 10000) / 100 : 0,
      avgOdds: b.odds.length > 0 ? Math.round(b.odds.reduce((s, o) => s + o, 0) / b.odds.length) : 0,
    }
  })

  const withPicks = periods.filter((p) => p.picks >= 3)
  const bestPeriod = withPicks.length > 0
    ? withPicks.reduce((best, p) => p.roi > best.roi ? p : best)
    : null
  const worstPeriod = withPicks.length > 0
    ? withPicks.reduce((worst, p) => p.roi < worst.roi ? p : worst)
    : null

  return {
    periods,
    bestPeriod,
    worstPeriod,
    totalResolvedByTime: resolved.length,
  }
}
