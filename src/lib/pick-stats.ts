/**
 * Pick statistics breakdown utilities.
 * Pure functions for calculating per-type and per-sport breakdowns.
 */

export interface TypeBreakdown {
  type: string
  wins: number
  losses: number
  total: number
  winRate: number | null
  roi: number
}

export interface SportBreakdown {
  sport: string
  wins: number
  losses: number
  total: number
  roi: number
}

export interface DayOfWeekBreakdown {
  day: string
  dayIndex: number
  wins: number
  losses: number
  total: number
  winRate: number | null
  roi: number
}

interface PickForBreakdown {
  pick_type: string
  sport: string
  outcome: string | null
  profit: number | null
  units: number
  game_date?: string
}

/**
 * Calculate performance breakdown by pick type (moneyline, spread, etc.)
 */
export function calcTypeBreakdown(picks: PickForBreakdown[]): TypeBreakdown[] {
  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  const types = [...new Set(resolved.map((p) => p.pick_type))]

  return types.map((type) => {
    const typePicks = resolved.filter((p) => p.pick_type === type)
    const wins = typePicks.filter((p) => p.outcome === 'win').length
    const losses = typePicks.filter((p) => p.outcome === 'loss').length
    const totalProfit = typePicks.reduce((s, p) => s + (p.profit ?? 0), 0)
    const totalUnits = typePicks.reduce((s, p) => s + p.units, 0)
    const roi = totalUnits > 0 ? Math.round((totalProfit / totalUnits) * 10000) / 100 : 0
    const decided = wins + losses
    const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null

    return { type, wins, losses, total: typePicks.length, winRate, roi }
  }).sort((a, b) => b.total - a.total)
}

/**
 * Grade a resolved pick based on CLV and outcome.
 * Returns A/B/C/D/F grade with a short explanation.
 *
 * - A: Won with positive CLV (great timing + correct pick)
 * - B: Won with no CLV data, or lost with strong positive CLV (good process)
 * - C: Won with negative CLV, or push (mixed signal)
 * - D: Lost with no CLV data (unknown edge)
 * - F: Lost with negative CLV (bad timing + wrong pick)
 */
export function gradePick(
  outcome: string | null,
  clv: number | null
): { grade: string; label: string } {
  if (!outcome || outcome === 'pending') {
    return { grade: '--', label: 'Pending' }
  }

  if (outcome === 'push') {
    return { grade: 'C', label: 'Push — no edge tested' }
  }

  const won = outcome === 'win'
  const hasClv = clv !== null
  const posClv = hasClv && clv > 0

  if (won && posClv) return { grade: 'A', label: 'Won + beat the close' }
  if (won && hasClv && !posClv) return { grade: 'C', label: 'Won but line moved against you' }
  if (won) return { grade: 'B', label: 'Won — CLV not tracked' }

  // Lost
  if (posClv) return { grade: 'B', label: 'Lost but had +CLV — good process' }
  if (hasClv && !posClv) return { grade: 'F', label: 'Lost + negative CLV' }
  return { grade: 'D', label: 'Lost — CLV not tracked' }
}

/**
 * Calculate performance breakdown by sport.
 */
export function calcSportBreakdown(picks: PickForBreakdown[]): SportBreakdown[] {
  const sports = [...new Set(picks.map((p) => p.sport))]

  return sports.map((sport) => {
    const sportPicks = picks.filter((p) => p.sport === sport)
    const resolved = sportPicks.filter((p) => p.outcome && p.outcome !== 'pending')
    const wins = resolved.filter((p) => p.outcome === 'win').length
    const losses = resolved.filter((p) => p.outcome === 'loss').length
    const totalProfit = resolved.reduce((s, p) => s + (p.profit ?? 0), 0)
    const totalUnits = resolved.reduce((s, p) => s + p.units, 0)
    const roi = totalUnits > 0 ? Math.round((totalProfit / totalUnits) * 10000) / 100 : 0

    return { sport, wins, losses, total: sportPicks.length, roi }
  }).sort((a, b) => b.total - a.total)
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

/**
 * Calculate performance breakdown by day of week.
 * Helps identify which days the user performs best on.
 */
export function calcDayOfWeekBreakdown(picks: PickForBreakdown[]): DayOfWeekBreakdown[] {
  const resolved = picks.filter(
    (p) => p.outcome && p.outcome !== 'pending' && p.game_date
  )

  if (resolved.length === 0) return []

  const byDay = new Map<number, { wins: number; losses: number; profit: number; units: number }>()

  for (const pick of resolved) {
    const date = new Date(pick.game_date!)
    const dayIndex = date.getUTCDay()
    const entry = byDay.get(dayIndex) ?? { wins: 0, losses: 0, profit: 0, units: 0 }

    if (pick.outcome === 'win') entry.wins++
    else if (pick.outcome === 'loss') entry.losses++
    entry.profit += pick.profit ?? 0
    entry.units += pick.units

    byDay.set(dayIndex, entry)
  }

  return Array.from(byDay.entries())
    .map(([dayIndex, { wins, losses, profit, units }]) => {
      const decided = wins + losses
      const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null
      const roi = units > 0 ? Math.round((profit / units) * 10000) / 100 : 0
      return {
        day: DAY_NAMES[dayIndex],
        dayIndex,
        wins,
        losses,
        total: decided,
        winRate,
        roi,
      }
    })
    .sort((a, b) => a.dayIndex - b.dayIndex)
}
