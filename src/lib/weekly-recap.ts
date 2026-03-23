/**
 * Weekly Recap — auto-generated weekly performance summary.
 *
 * Analyzes the past 7 days of picks and generates a summary with
 * key stats, best/worst bets, and trends.
 */

export interface WeeklyRecap {
  weekStart: string // YYYY-MM-DD (Monday)
  weekEnd: string // YYYY-MM-DD (Sunday)
  totalPicks: number
  wins: number
  losses: number
  pushes: number
  pending: number
  profit: number
  roi: number
  winRate: number
  bestPick: { team: string; odds: number; profit: number } | null
  worstPick: { team: string; odds: number; profit: number } | null
  sportBreakdown: Array<{
    sport: string
    picks: number
    wins: number
    losses: number
    profit: number
  }>
  streak: { type: 'win' | 'loss'; count: number } | null
  avgOdds: number
  volumeChange: number // picks this week vs last week
  profitChange: number // profit this week vs last week
}

interface PickLike {
  sport: string
  pick_team: string | null
  odds: number
  units: number
  outcome?: string | null
  profit?: number | null
  game_date: string
  created_at: string
}

export function generateWeeklyRecap<T extends PickLike>(
  allPicks: T[],
  referenceDate?: Date
): WeeklyRecap {
  const ref = referenceDate ?? new Date()

  // Calculate week boundaries (Monday - Sunday)
  const dayOfWeek = ref.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisMonday = new Date(ref)
  thisMonday.setDate(ref.getDate() - mondayOffset)
  thisMonday.setHours(0, 0, 0, 0)

  const thisSunday = new Date(thisMonday)
  thisSunday.setDate(thisMonday.getDate() + 6)
  thisSunday.setHours(23, 59, 59, 999)

  // Last week
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  const lastSunday = new Date(thisMonday)
  lastSunday.setDate(thisMonday.getDate() - 1)
  lastSunday.setHours(23, 59, 59, 999)

  const weekStart = formatDate(thisMonday)
  const weekEnd = formatDate(thisSunday)

  // Filter picks for this week and last week
  const thisWeekPicks = allPicks.filter((p) => {
    const d = new Date(p.game_date)
    return d >= thisMonday && d <= thisSunday
  })

  const lastWeekPicks = allPicks.filter((p) => {
    const d = new Date(p.game_date)
    return d >= lastMonday && d <= lastSunday
  })

  const resolved = thisWeekPicks.filter((p) => p.outcome && p.outcome !== 'pending')
  const wins = resolved.filter((p) => p.outcome === 'win').length
  const losses = resolved.filter((p) => p.outcome === 'loss').length
  const pushes = resolved.filter((p) => p.outcome === 'push').length
  const pending = thisWeekPicks.length - resolved.length

  const profit = resolved.reduce((s, p) => s + (p.profit ?? 0), 0)
  const totalUnits = resolved.reduce((s, p) => s + p.units, 0)
  const roi = totalUnits > 0 ? (profit / totalUnits) * 100 : 0
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0

  // Best and worst picks
  let bestPick: WeeklyRecap['bestPick'] = null
  let worstPick: WeeklyRecap['worstPick'] = null

  if (resolved.length > 0) {
    const sorted = [...resolved].sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]

    if (best.profit && best.profit > 0) {
      bestPick = {
        team: best.pick_team ?? 'Unknown',
        odds: best.odds,
        profit: best.profit,
      }
    }
    if (worst.profit && worst.profit < 0) {
      worstPick = {
        team: worst.pick_team ?? 'Unknown',
        odds: worst.odds,
        profit: worst.profit,
      }
    }
  }

  // Sport breakdown
  const sportMap = new Map<string, { picks: number; wins: number; losses: number; profit: number }>()
  for (const p of resolved) {
    const entry = sportMap.get(p.sport) ?? { picks: 0, wins: 0, losses: 0, profit: 0 }
    entry.picks++
    if (p.outcome === 'win') entry.wins++
    if (p.outcome === 'loss') entry.losses++
    entry.profit += p.profit ?? 0
    sportMap.set(p.sport, entry)
  }
  const sportBreakdown = [...sportMap.entries()].map(([sport, data]) => ({ sport, ...data }))

  // Current streak
  let streak: WeeklyRecap['streak'] = null
  const sortedRecent = [...resolved].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  if (sortedRecent.length > 0) {
    const firstOutcome = sortedRecent[0].outcome as 'win' | 'loss'
    if (firstOutcome === 'win' || firstOutcome === 'loss') {
      let count = 0
      for (const p of sortedRecent) {
        if (p.outcome === firstOutcome) count++
        else break
      }
      if (count >= 2) {
        streak = { type: firstOutcome, count }
      }
    }
  }

  // Average odds
  const avgOdds = resolved.length > 0
    ? resolved.reduce((s, p) => s + p.odds, 0) / resolved.length
    : 0

  // Volume/profit change vs last week
  const lastWeekResolved = lastWeekPicks.filter((p) => p.outcome && p.outcome !== 'pending')
  const lastWeekProfit = lastWeekResolved.reduce((s, p) => s + (p.profit ?? 0), 0)
  const volumeChange = thisWeekPicks.length - lastWeekPicks.length
  const profitChange = profit - lastWeekProfit

  return {
    weekStart,
    weekEnd,
    totalPicks: thisWeekPicks.length,
    wins,
    losses,
    pushes,
    pending,
    profit: Math.round(profit * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    winRate: Math.round(winRate * 100) / 100,
    bestPick,
    worstPick,
    sportBreakdown,
    streak,
    avgOdds: Math.round(avgOdds),
    volumeChange,
    profitChange: Math.round(profitChange * 100) / 100,
  }
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
