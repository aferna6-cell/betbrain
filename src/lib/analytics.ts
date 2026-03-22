import { createServiceClient } from '@/lib/supabase/server'
import { calcTypeBreakdown, calcSportBreakdown } from '@/lib/pick-stats'
import { calculateCLVStats } from '@/lib/clv'
import type { CLVStats } from '@/lib/clv'
import type { TypeBreakdown, SportBreakdown } from '@/lib/pick-stats'
import type { Sport, PickOutcome } from '@/lib/supabase/types'

export interface RollingDataPoint {
  date: string
  profit: number
  roi: number
}

export interface AnalyticsData {
  picks: {
    total: number
    wins: number
    losses: number
    pushes: number
    pending: number
    winRate: number | null
    totalProfit: number
    roi: number
    byType: TypeBreakdown[]
    bySport: SportBreakdown[]
    rollingROI: RollingDataPoint[]
  }
  clv: CLVStats
  apiUsage: {
    odds: number
    balldontlie: number
    claude: number
    month: string
  }
  activity: {
    recentPicks: number
    analysesGenerated: number
    signalsDetected: number
    signalsResolved: number
    signalHitRate: number | null
  }
}

/**
 * Aggregate analytics data for the current user.
 */
export async function getUserAnalytics(userId: string): Promise<AnalyticsData> {
  const supabase = await createServiceClient()
  const month = new Date().toISOString().slice(0, 7) // '2026-03'

  // Parallel fetch all data
  const [picksResult, apiUsageResult, signalResult, insightsResult] = await Promise.all([
    supabase
      .from('user_picks')
      .select('sport, pick_type, outcome, profit, units, odds, closing_odds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000),

    supabase
      .from('api_usage')
      .select('api_name, call_count')
      .eq('month', month)
      .is('user_id', null),

    supabase
      .from('signal_history')
      .select('outcome, strength'),

    supabase
      .from('ai_insights')
      .select('id')
      .limit(1000),
  ])

  const picks = (picksResult.data ?? []) as Array<{
    sport: Sport
    pick_type: string
    outcome: PickOutcome | null
    profit: number | null
    units: number
    odds: number
    closing_odds: number | null
    created_at: string
  }>

  // Pick stats
  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  const wins = resolved.filter((p) => p.outcome === 'win').length
  const losses = resolved.filter((p) => p.outcome === 'loss').length
  const pushes = resolved.filter((p) => p.outcome === 'push').length
  const pending = picks.filter((p) => !p.outcome || p.outcome === 'pending').length
  const totalProfit = resolved.reduce((s, p) => s + (p.profit ?? 0), 0)
  const totalUnits = resolved.reduce((s, p) => s + p.units, 0)
  const roi = totalUnits > 0 ? Math.round((totalProfit / totalUnits) * 10000) / 100 : 0
  const decided = wins + losses
  const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null

  // CLV
  const clvStats = calculateCLVStats(picks)

  // API usage
  const apiData = (apiUsageResult.data ?? []) as Array<{ api_name: string; call_count: number }>
  const apiUsage = {
    odds: apiData.find((a) => a.api_name === 'odds')?.call_count ?? 0,
    balldontlie: apiData.find((a) => a.api_name === 'balldontlie')?.call_count ?? 0,
    claude: apiData.find((a) => a.api_name === 'claude')?.call_count ?? 0,
    month,
  }

  // Signals
  const signals = (signalResult.data ?? []) as Array<{ outcome: string | null; strength: string }>
  const signalsResolved = signals.filter((s) => s.outcome && s.outcome !== 'pending')
  const signalWins = signalsResolved.filter((s) => s.outcome === 'win')
  const signalHitRate = signalsResolved.length > 0
    ? Math.round((signalWins.length / signalsResolved.length) * 1000) / 10
    : null

  // Recent activity (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const recentPicks = picks.filter((p) => new Date(p.created_at) >= weekAgo).length

  // Rolling cumulative ROI by date (resolved picks only)
  const rollingROI: RollingDataPoint[] = []
  const resolvedByDate = [...resolved]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  let cumProfit = 0
  let cumUnits = 0
  let lastDate = ''
  for (const p of resolvedByDate) {
    const date = p.created_at.slice(0, 10)
    cumProfit += p.profit ?? 0
    cumUnits += p.units
    if (date !== lastDate) {
      rollingROI.push({
        date,
        profit: Math.round(cumProfit * 100) / 100,
        roi: cumUnits > 0 ? Math.round((cumProfit / cumUnits) * 10000) / 100 : 0,
      })
      lastDate = date
    } else {
      // Update the latest point for same date
      const last = rollingROI[rollingROI.length - 1]
      last.profit = Math.round(cumProfit * 100) / 100
      last.roi = cumUnits > 0 ? Math.round((cumProfit / cumUnits) * 10000) / 100 : 0
    }
  }

  return {
    picks: {
      total: picks.length,
      wins,
      losses,
      pushes,
      pending,
      winRate,
      totalProfit: Math.round(totalProfit * 100) / 100,
      roi,
      byType: calcTypeBreakdown(picks),
      bySport: calcSportBreakdown(picks),
      rollingROI,
    },
    clv: clvStats,
    apiUsage,
    activity: {
      recentPicks,
      analysesGenerated: insightsResult.data?.length ?? 0,
      signalsDetected: signals.length,
      signalsResolved: signalsResolved.length,
      signalHitRate,
    },
  }
}
