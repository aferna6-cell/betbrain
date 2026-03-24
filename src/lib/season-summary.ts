/**
 * Season summary generator.
 * Auto-generates an end-of-season (or mid-season) performance report.
 */

export interface SeasonSummary {
  dateRange: { start: string; end: string }
  totalPicks: number
  record: { wins: number; losses: number; pushes: number }
  winRate: number | null
  profit: number
  roi: number
  bestSport: { sport: string; roi: number; record: string } | null
  worstSport: { sport: string; roi: number; record: string } | null
  bestMonth: { month: string; profit: number; picks: number } | null
  worstMonth: { month: string; profit: number; picks: number } | null
  longestWinStreak: number
  longestLossStreak: number
  avgOdds: number | null
  avgUnits: number | null
  bestPick: { description: string; profit: number } | null
  worstPick: { description: string; profit: number } | null
  betTypeBreakdown: { type: string; wins: number; losses: number; roi: number }[]
  totalUnitsWagered: number
  grade: string
  gradeDescription: string
}

interface PickForSummary {
  sport: string
  pick_type: string
  pick_team: string | null
  odds: number
  units: number
  outcome: string | null
  profit: number | null
  game_date: string
}

/**
 * Generate a season summary from picks.
 * Pure function for testability.
 */
export function generateSeasonSummary(
  picks: PickForSummary[],
  startDate?: string,
  endDate?: string
): SeasonSummary {
  // Filter by date range if provided
  let filtered = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  if (startDate) filtered = filtered.filter((p) => p.game_date >= startDate)
  if (endDate) filtered = filtered.filter((p) => p.game_date <= endDate)

  const sorted = [...filtered].sort((a, b) => a.game_date.localeCompare(b.game_date))

  const wins = sorted.filter((p) => p.outcome === 'win').length
  const losses = sorted.filter((p) => p.outcome === 'loss').length
  const pushes = sorted.filter((p) => p.outcome === 'push').length
  const totalPicks = sorted.length
  const decided = wins + losses
  const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null
  const totalProfit = sorted.reduce((s, p) => s + (p.profit ?? 0), 0)
  const totalUnits = sorted.reduce((s, p) => s + p.units, 0)
  const roi = totalUnits > 0 ? Math.round((totalProfit / totalUnits) * 10000) / 100 : 0

  const dateRange = {
    start: sorted[0]?.game_date?.split('T')[0] ?? '',
    end: sorted[sorted.length - 1]?.game_date?.split('T')[0] ?? '',
  }

  // Sport breakdown
  const sportMap = new Map<string, { wins: number; losses: number; profit: number; units: number }>()
  for (const p of sorted) {
    const e = sportMap.get(p.sport) ?? { wins: 0, losses: 0, profit: 0, units: 0 }
    if (p.outcome === 'win') e.wins++
    else if (p.outcome === 'loss') e.losses++
    e.profit += p.profit ?? 0
    e.units += p.units
    sportMap.set(p.sport, e)
  }

  const sportEntries = Array.from(sportMap.entries()).map(([sport, s]) => ({
    sport,
    roi: s.units > 0 ? Math.round((s.profit / s.units) * 10000) / 100 : 0,
    record: `${s.wins}-${s.losses}`,
    profit: s.profit,
  }))

  const bestSport = sportEntries.length > 0
    ? sportEntries.sort((a, b) => b.roi - a.roi)[0]
    : null

  const worstSport = sportEntries.length > 1
    ? sportEntries.sort((a, b) => a.roi - b.roi)[0]
    : null

  // Monthly breakdown
  const monthMap = new Map<string, { profit: number; picks: number }>()
  for (const p of sorted) {
    const month = p.game_date.slice(0, 7) // YYYY-MM
    const e = monthMap.get(month) ?? { profit: 0, picks: 0 }
    e.profit += p.profit ?? 0
    e.picks++
    monthMap.set(month, e)
  }

  const monthEntries = Array.from(monthMap.entries()).map(([month, m]) => ({
    month,
    profit: Math.round(m.profit * 100) / 100,
    picks: m.picks,
  }))

  const bestMonth = monthEntries.length > 0
    ? monthEntries.sort((a, b) => b.profit - a.profit)[0]
    : null

  const worstMonth = monthEntries.length > 1
    ? monthEntries.sort((a, b) => a.profit - b.profit)[0]
    : null

  // Streaks
  let curWin = 0, curLoss = 0, maxWin = 0, maxLoss = 0
  for (const p of sorted) {
    if (p.outcome === 'win') {
      curWin++
      curLoss = 0
      maxWin = Math.max(maxWin, curWin)
    } else if (p.outcome === 'loss') {
      curLoss++
      curWin = 0
      maxLoss = Math.max(maxLoss, curLoss)
    }
  }

  // Averages
  const avgOdds = sorted.length > 0
    ? Math.round(sorted.reduce((s, p) => s + p.odds, 0) / sorted.length)
    : null
  const avgUnits = sorted.length > 0
    ? Math.round((totalUnits / sorted.length) * 10) / 10
    : null

  // Best/worst individual picks
  const byProfit = [...sorted].sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
  const bestPick = byProfit.length > 0
    ? {
        description: `${byProfit[0].pick_team ?? byProfit[0].pick_type} (${byProfit[0].sport.toUpperCase()})`,
        profit: Math.round((byProfit[0].profit ?? 0) * 100) / 100,
      }
    : null
  const worstPick = byProfit.length > 0
    ? {
        description: `${byProfit[byProfit.length - 1].pick_team ?? byProfit[byProfit.length - 1].pick_type} (${byProfit[byProfit.length - 1].sport.toUpperCase()})`,
        profit: Math.round((byProfit[byProfit.length - 1].profit ?? 0) * 100) / 100,
      }
    : null

  // Bet type breakdown
  const typeMap = new Map<string, { wins: number; losses: number; profit: number; units: number }>()
  for (const p of sorted) {
    const e = typeMap.get(p.pick_type) ?? { wins: 0, losses: 0, profit: 0, units: 0 }
    if (p.outcome === 'win') e.wins++
    else if (p.outcome === 'loss') e.losses++
    e.profit += p.profit ?? 0
    e.units += p.units
    typeMap.set(p.pick_type, e)
  }

  const betTypeBreakdown = Array.from(typeMap.entries()).map(([type, t]) => ({
    type,
    wins: t.wins,
    losses: t.losses,
    roi: t.units > 0 ? Math.round((t.profit / t.units) * 10000) / 100 : 0,
  })).sort((a, b) => b.roi - a.roi)

  // Grade
  const { grade, gradeDescription } = calcSeasonGrade(winRate, roi, totalPicks)

  return {
    dateRange,
    totalPicks,
    record: { wins, losses, pushes },
    winRate,
    profit: Math.round(totalProfit * 100) / 100,
    roi,
    bestSport: bestSport ? { sport: bestSport.sport, roi: bestSport.roi, record: bestSport.record } : null,
    worstSport: worstSport ? { sport: worstSport.sport, roi: worstSport.roi, record: worstSport.record } : null,
    bestMonth,
    worstMonth,
    longestWinStreak: maxWin,
    longestLossStreak: maxLoss,
    avgOdds,
    avgUnits,
    bestPick,
    worstPick,
    betTypeBreakdown,
    totalUnitsWagered: Math.round(totalUnits * 100) / 100,
    grade,
    gradeDescription,
  }
}

function calcSeasonGrade(
  winRate: number | null,
  roi: number,
  totalPicks: number
): { grade: string; gradeDescription: string } {
  if (totalPicks < 10) return { grade: '--', gradeDescription: 'Not enough picks to grade' }

  if (roi > 15 && (winRate ?? 0) > 55) return { grade: 'A+', gradeDescription: 'Elite performance. Crushing it.' }
  if (roi > 10) return { grade: 'A', gradeDescription: 'Excellent season. Strong ROI.' }
  if (roi > 5) return { grade: 'B+', gradeDescription: 'Good season. Solidly profitable.' }
  if (roi > 0) return { grade: 'B', gradeDescription: 'Positive season. In the green.' }
  if (roi > -5) return { grade: 'C', gradeDescription: 'Near breakeven. Room for improvement.' }
  if (roi > -10) return { grade: 'D', gradeDescription: 'Below breakeven. Review your process.' }
  return { grade: 'F', gradeDescription: 'Tough season. Time to reassess strategy.' }
}

/**
 * Format the season summary as shareable text.
 */
export function formatSummaryText(summary: SeasonSummary): string {
  const lines = [
    `Season Summary (${summary.dateRange.start} to ${summary.dateRange.end})`,
    ``,
    `Grade: ${summary.grade} — ${summary.gradeDescription}`,
    `Record: ${summary.record.wins}-${summary.record.losses}${summary.record.pushes > 0 ? `-${summary.record.pushes}` : ''}`,
    `Win Rate: ${summary.winRate !== null ? `${summary.winRate}%` : 'N/A'}`,
    `ROI: ${summary.roi >= 0 ? '+' : ''}${summary.roi}%`,
    `Profit: ${summary.profit >= 0 ? '+' : ''}${summary.profit.toFixed(2)}u`,
    `Total Wagered: ${summary.totalUnitsWagered.toFixed(1)}u`,
    ``,
    `Streaks: W${summary.longestWinStreak} / L${summary.longestLossStreak}`,
  ]

  if (summary.bestSport) {
    lines.push(`Best Sport: ${summary.bestSport.sport.toUpperCase()} (${summary.bestSport.record}, ${summary.bestSport.roi}% ROI)`)
  }
  if (summary.bestMonth) {
    lines.push(`Best Month: ${summary.bestMonth.month} (+${summary.bestMonth.profit.toFixed(2)}u, ${summary.bestMonth.picks} picks)`)
  }

  lines.push(``, `For informational purposes only. Not financial advice.`)
  return lines.join('\n')
}
