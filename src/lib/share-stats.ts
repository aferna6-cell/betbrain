import { createServiceClient } from '@/lib/supabase/server'
import { calculateCLVStats } from '@/lib/clv'
import { calcSportBreakdown } from '@/lib/pick-stats'
import type { Sport, PickOutcome } from '@/lib/supabase/types'

export interface ShareableStats {
  displayName: string
  memberSince: string
  record: { wins: number; losses: number; pushes: number }
  total: number
  winRate: number | null
  roi: number
  totalProfit: number
  favoriteSport: Sport | null
  clv: { averageCLV: number; positiveCLVRate: number } | null
  topSport: { sport: string; wins: number; losses: number; roi: number } | null
}

/**
 * Fetch shareable stats for a user by ID.
 * Returns null if user not found.
 */
export async function getShareableStats(userId: string): Promise<ShareableStats | null> {
  const supabase = await createServiceClient()

  const [{ data: profile }, { data: picksData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_picks')
      .select('sport, pick_type, outcome, profit, units, odds, closing_odds')
      .eq('user_id', userId)
      .limit(1000),
  ])

  if (!profile) return null

  const picks = (picksData ?? []) as Array<{
    sport: Sport
    pick_type: string
    outcome: PickOutcome | null
    profit: number | null
    units: number
    odds: number
    closing_odds: number | null
  }>

  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  const wins = resolved.filter((p) => p.outcome === 'win').length
  const losses = resolved.filter((p) => p.outcome === 'loss').length
  const pushes = resolved.filter((p) => p.outcome === 'push').length
  const totalProfit = resolved.reduce((s, p) => s + (p.profit ?? 0), 0)
  const totalUnits = resolved.reduce((s, p) => s + p.units, 0)
  const roi = totalUnits > 0 ? Math.round((totalProfit / totalUnits) * 10000) / 100 : 0
  const decided = wins + losses
  const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null

  // Favorite sport
  const sportCounts: Partial<Record<Sport, number>> = {}
  for (const p of picks) {
    sportCounts[p.sport] = (sportCounts[p.sport] ?? 0) + 1
  }
  const favoriteSport = picks.length > 0
    ? (Object.entries(sportCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as Sport)
    : null

  // CLV
  const clvStats = calculateCLVStats(picks)
  const clv = clvStats.totalPicks >= 3
    ? { averageCLV: clvStats.averageCLV, positiveCLVRate: clvStats.positiveCLVRate }
    : null

  // Top performing sport
  const sportBreakdowns = calcSportBreakdown(picks)
  const topSport = sportBreakdowns.length > 0
    ? sportBreakdowns.sort((a, b) => b.roi - a.roi)[0]
    : null

  return {
    displayName: (profile as { display_name: string | null; created_at: string }).display_name || 'Anonymous',
    memberSince: new Date((profile as { created_at: string }).created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    record: { wins, losses, pushes },
    total: picks.length,
    winRate,
    roi,
    totalProfit: Math.round(totalProfit * 100) / 100,
    favoriteSport,
    clv,
    topSport,
  }
}
