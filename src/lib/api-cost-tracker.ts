/**
 * Odds API Cost Per Insight Tracker
 *
 * Tracks the cost-effectiveness of Odds API calls by measuring how many
 * actionable insights (EV opportunities, signals, alerts) were generated
 * per API call. Helps optimize API usage and understand value.
 *
 * With a 500 call/month free limit, every call needs to count.
 *
 * Metrics:
 * - Cost per +EV opportunity found
 * - Cost per signal generated
 * - Calls per actionable game (games with any insight)
 * - Waste rate (calls that produced no insights)
 * - Optimal call frequency recommendation
 *
 * Pure functions, no side effects.
 * For informational purposes only. Not financial advice.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiCallRecord {
  /** ISO timestamp */
  timestamp: string
  /** Sport fetched */
  sport: string
  /** Number of games returned */
  gamesReturned: number
  /** Whether this was a cache hit (no API call) */
  wasCacheHit: boolean
  /** Number of +EV opportunities found from this data */
  evOppsFound: number
  /** Number of signals triggered */
  signalsTriggered: number
  /** Number of alerts fired */
  alertsFired: number
}

export interface CostMetrics {
  /** Total API calls made (non-cache) */
  totalCalls: number
  /** Total cache hits */
  totalCacheHits: number
  /** Cache hit rate percentage */
  cacheHitRate: number
  /** Total +EV opportunities found */
  totalEVOpps: number
  /** Total signals generated */
  totalSignals: number
  /** Total alerts fired */
  totalAlerts: number
  /** Total insights (EV + signals + alerts) */
  totalInsights: number
  /** Calls per EV opportunity (lower = better) */
  callsPerEVOpp: number | null
  /** Calls per insight (lower = better) */
  callsPerInsight: number | null
  /** Calls that produced zero insights */
  wasteCount: number
  /** Waste rate percentage */
  wasteRate: number
  /** Total games returned */
  totalGames: number
  /** Games with at least one insight */
  actionableGames: number
  /** Actionable game rate */
  actionableRate: number
}

export interface SportEfficiency {
  sport: string
  calls: number
  insights: number
  insightsPerCall: number
  wasteRate: number
  gamesPerCall: number
}

export type EfficiencyRating = 'excellent' | 'good' | 'average' | 'poor' | 'wasteful'

export interface OptimizationRecommendation {
  rating: EfficiencyRating
  summary: string
  suggestions: string[]
  /** Estimated optimal calls per day to stay within budget */
  optimalDailyRate: number
  /** Calls remaining this month */
  callsRemaining: number
  /** Days remaining in month */
  daysRemaining: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHLY_LIMIT = 500

// ---------------------------------------------------------------------------
// Core metrics
// ---------------------------------------------------------------------------

/**
 * Calculate cost-per-insight metrics from API call records.
 */
export function calculateCostMetrics(records: ApiCallRecord[]): CostMetrics {
  const calls = records.filter(r => !r.wasCacheHit)
  const cacheHits = records.filter(r => r.wasCacheHit)

  const totalCalls = calls.length
  const totalCacheHits = cacheHits.length
  const total = records.length
  const cacheHitRate = total > 0 ? Math.round((totalCacheHits / total) * 100) : 0

  const totalEVOpps = records.reduce((s, r) => s + r.evOppsFound, 0)
  const totalSignals = records.reduce((s, r) => s + r.signalsTriggered, 0)
  const totalAlerts = records.reduce((s, r) => s + r.alertsFired, 0)
  const totalInsights = totalEVOpps + totalSignals + totalAlerts

  const wasteCount = calls.filter(r =>
    r.evOppsFound === 0 && r.signalsTriggered === 0 && r.alertsFired === 0
  ).length

  const totalGames = records.reduce((s, r) => s + r.gamesReturned, 0)
  const actionableGames = records.filter(r =>
    r.evOppsFound > 0 || r.signalsTriggered > 0 || r.alertsFired > 0
  ).length

  return {
    totalCalls,
    totalCacheHits,
    cacheHitRate,
    totalEVOpps,
    totalSignals,
    totalAlerts,
    totalInsights,
    callsPerEVOpp: totalEVOpps > 0 ? Math.round((totalCalls / totalEVOpps) * 10) / 10 : null,
    callsPerInsight: totalInsights > 0 ? Math.round((totalCalls / totalInsights) * 10) / 10 : null,
    wasteCount,
    wasteRate: totalCalls > 0 ? Math.round((wasteCount / totalCalls) * 100) : 0,
    totalGames,
    actionableGames,
    actionableRate: total > 0 ? Math.round((actionableGames / total) * 100) : 0,
  }
}

// ---------------------------------------------------------------------------
// Per-sport efficiency
// ---------------------------------------------------------------------------

/**
 * Break down efficiency by sport.
 */
export function calculateSportEfficiency(records: ApiCallRecord[]): SportEfficiency[] {
  const bySport = new Map<string, ApiCallRecord[]>()
  for (const r of records) {
    if (!bySport.has(r.sport)) bySport.set(r.sport, [])
    bySport.get(r.sport)!.push(r)
  }

  return Array.from(bySport.entries())
    .map(([sport, sportRecords]) => {
      const calls = sportRecords.filter(r => !r.wasCacheHit).length
      const insights = sportRecords.reduce((s, r) =>
        s + r.evOppsFound + r.signalsTriggered + r.alertsFired, 0
      )
      const waste = sportRecords.filter(r =>
        !r.wasCacheHit && r.evOppsFound === 0 && r.signalsTriggered === 0 && r.alertsFired === 0
      ).length
      const games = sportRecords.reduce((s, r) => s + r.gamesReturned, 0)

      return {
        sport,
        calls,
        insights,
        insightsPerCall: calls > 0 ? Math.round((insights / calls) * 10) / 10 : 0,
        wasteRate: calls > 0 ? Math.round((waste / calls) * 100) : 0,
        gamesPerCall: calls > 0 ? Math.round((games / calls) * 10) / 10 : 0,
      }
    })
    .sort((a, b) => b.insightsPerCall - a.insightsPerCall)
}

// ---------------------------------------------------------------------------
// Efficiency rating
// ---------------------------------------------------------------------------

/**
 * Rate overall API usage efficiency.
 */
export function getEfficiencyRating(metrics: CostMetrics): EfficiencyRating {
  if (metrics.totalCalls === 0) return 'average'

  // Score based on multiple factors
  let score = 50 // Start at average

  // Cache hit rate (higher = better)
  if (metrics.cacheHitRate >= 80) score += 20
  else if (metrics.cacheHitRate >= 60) score += 10

  // Waste rate (lower = better)
  if (metrics.wasteRate <= 10) score += 15
  else if (metrics.wasteRate <= 25) score += 5
  else if (metrics.wasteRate >= 50) score -= 15

  // Calls per insight (lower = better)
  if (metrics.callsPerInsight !== null) {
    if (metrics.callsPerInsight <= 1) score += 15
    else if (metrics.callsPerInsight <= 3) score += 5
    else if (metrics.callsPerInsight >= 10) score -= 10
  }

  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'average'
  if (score >= 25) return 'poor'
  return 'wasteful'
}

// ---------------------------------------------------------------------------
// Optimization recommendation
// ---------------------------------------------------------------------------

/**
 * Generate optimization recommendations based on usage patterns.
 */
export function generateRecommendation(
  metrics: CostMetrics,
  sportEfficiency: SportEfficiency[],
  callsUsedThisMonth: number,
  currentDayOfMonth: number,
  daysInMonth: number
): OptimizationRecommendation {
  const callsRemaining = Math.max(0, MONTHLY_LIMIT - callsUsedThisMonth)
  const daysRemaining = Math.max(1, daysInMonth - currentDayOfMonth + 1)
  const optimalDailyRate = Math.floor(callsRemaining / daysRemaining)

  const rating = getEfficiencyRating(metrics)

  const suggestions: string[] = []

  // Cache optimization
  if (metrics.cacheHitRate < 50) {
    suggestions.push('Cache hit rate is low — avoid refreshing odds too frequently. The 5-minute TTL is designed to minimize redundant calls.')
  }

  // Waste reduction
  if (metrics.wasteRate > 30) {
    suggestions.push('Over 30% of API calls produce no actionable insights. Consider fetching only during peak betting windows (late afternoon/evening).')
  }

  // Sport optimization
  const worstSport = sportEfficiency.find(s => s.wasteRate > 50 && s.calls > 2)
  if (worstSport) {
    suggestions.push(`${worstSport.sport.toUpperCase()} has a ${worstSport.wasteRate}% waste rate. Consider reducing fetch frequency for this sport.`)
  }

  const bestSport = sportEfficiency[0]
  if (bestSport && bestSport.insightsPerCall > 0) {
    suggestions.push(`${bestSport.sport.toUpperCase()} generates ${bestSport.insightsPerCall} insights per call — most efficient sport to monitor.`)
  }

  // Budget pacing
  if (optimalDailyRate <= 5) {
    suggestions.push(`Budget is tight: ${callsRemaining} calls left for ${daysRemaining} days. Limit to ${optimalDailyRate} calls/day.`)
  }

  if (suggestions.length === 0) {
    suggestions.push('API usage is efficient. Keep current patterns.')
  }

  const summary = `API efficiency: ${rating}. ${metrics.totalInsights} insights from ${metrics.totalCalls} calls (${metrics.cacheHitRate}% cache hit rate).`

  return {
    rating,
    summary,
    suggestions,
    optimalDailyRate,
    callsRemaining,
    daysRemaining,
  }
}
