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

interface PickForBreakdown {
  pick_type: string
  sport: string
  outcome: string | null
  profit: number | null
  units: number
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
