/**
 * Odds API Request Optimizer — Stagger refreshes by game time proximity.
 *
 * Problem: With 500 req/month on The Odds API free tier, blindly refreshing
 * all 4 sports on every dashboard load wastes budget on games that are days
 * away. A game tipping off in 30 minutes needs fresh odds far more than one
 * 3 days from now.
 *
 * Strategy:
 *   1. Classify games into urgency tiers based on time until tip-off.
 *   2. Assign a dynamic cache TTL per tier (closer games = shorter TTL).
 *   3. Only refresh sports that actually have stale data for upcoming games.
 *   4. Prioritize sports by "soonest stale game" to minimize wasted calls.
 *   5. Respect a daily budget (monthly limit / days remaining) to pace usage.
 *
 * Pure functions — no side effects, no API calls, no Supabase.
 */

import type { Sport } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UrgencyTier = 'imminent' | 'today' | 'tomorrow' | 'upcoming' | 'distant'

export interface GameTimingInfo {
  gameId: string
  sport: Sport
  commenceTime: string
  /** Milliseconds until game starts (negative = already started) */
  msUntilStart: number
  urgency: UrgencyTier
  /** Dynamic TTL in ms for this game based on urgency */
  dynamicTtl: number
}

export interface SportRefreshPlan {
  sport: Sport
  shouldRefresh: boolean
  reason: string
  /** Soonest game start in ms from now */
  soonestGameMs: number | null
  /** Number of games in each urgency tier */
  tierCounts: Record<UrgencyTier, number>
  /** Effective TTL being used for the most urgent game */
  effectiveTtl: number
  /** Priority score (higher = more urgent to refresh) */
  priority: number
}

export interface RefreshPlan {
  /** Ordered list of sports to refresh (highest priority first) */
  sportsToRefresh: SportRefreshPlan[]
  /** Sports that don't need a refresh */
  sportsToSkip: SportRefreshPlan[]
  /** Total API calls this plan would consume */
  estimatedCalls: number
  /** Daily budget remaining */
  dailyBudgetRemaining: number
  /** Whether we're in budget-conservation mode */
  conservationMode: boolean
  /** Human-readable summary */
  summary: string
}

export interface CachedSportInfo {
  sport: Sport
  /** ISO timestamp of when cache was last refreshed */
  lastRefreshedAt: string | null
  /** Number of games currently cached */
  cachedGameCount: number
  /** Soonest game commence time in the cache (ISO string) */
  soonestGameTime: string | null
}

export interface OptimizerConfig {
  /** Monthly API budget (default 500) */
  monthlyBudget: number
  /** API calls used this month so far */
  usedThisMonth: number
  /** Current date (for testing) */
  now?: Date
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Dynamic TTL per urgency tier (in milliseconds) */
export const URGENCY_TTLS: Record<UrgencyTier, number> = {
  imminent: 2 * 60 * 1000,        // 2 min — game starting within 30 min
  today:    5 * 60 * 1000,        // 5 min — game today but > 30 min away
  tomorrow: 30 * 60 * 1000,       // 30 min — game tomorrow
  upcoming: 2 * 60 * 60 * 1000,   // 2 hours — game 2-5 days away
  distant:  6 * 60 * 60 * 1000,   // 6 hours — game 5+ days away
}

/** Urgency tier thresholds in milliseconds */
const TIER_THRESHOLDS = {
  imminent: 30 * 60 * 1000,          // < 30 minutes
  today:    12 * 60 * 60 * 1000,     // < 12 hours
  tomorrow: 36 * 60 * 60 * 1000,     // < 36 hours
  upcoming: 5 * 24 * 60 * 60 * 1000, // < 5 days
  // anything beyond is "distant"
}

/** Priority weights for urgency tiers (used in sport priority scoring) */
const TIER_PRIORITY_WEIGHTS: Record<UrgencyTier, number> = {
  imminent: 100,
  today:    60,
  tomorrow: 25,
  upcoming: 10,
  distant:  2,
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Classify a game's urgency based on time until tip-off.
 */
export function classifyUrgency(msUntilStart: number): UrgencyTier {
  if (msUntilStart <= TIER_THRESHOLDS.imminent) return 'imminent'
  if (msUntilStart <= TIER_THRESHOLDS.today) return 'today'
  if (msUntilStart <= TIER_THRESHOLDS.tomorrow) return 'tomorrow'
  if (msUntilStart <= TIER_THRESHOLDS.upcoming) return 'upcoming'
  return 'distant'
}

/**
 * Get the dynamic cache TTL for a game based on its urgency.
 */
export function getDynamicTtl(urgency: UrgencyTier): number {
  return URGENCY_TTLS[urgency]
}

/**
 * Analyze timing for a list of game commence times.
 */
export function analyzeGameTimings(
  games: Array<{ gameId: string; sport: Sport; commenceTime: string }>,
  now: Date = new Date()
): GameTimingInfo[] {
  const nowMs = now.getTime()

  return games.map((game) => {
    const startMs = new Date(game.commenceTime).getTime()
    const msUntilStart = startMs - nowMs
    const urgency = classifyUrgency(Math.max(msUntilStart, 0))
    const dynamicTtl = getDynamicTtl(urgency)

    return {
      gameId: game.gameId,
      sport: game.sport,
      commenceTime: game.commenceTime,
      msUntilStart,
      urgency,
      dynamicTtl,
    }
  })
}

/**
 * Count games in each urgency tier for a set of timings.
 */
export function countByTier(timings: GameTimingInfo[]): Record<UrgencyTier, number> {
  const counts: Record<UrgencyTier, number> = {
    imminent: 0,
    today: 0,
    tomorrow: 0,
    upcoming: 0,
    distant: 0,
  }

  for (const t of timings) {
    counts[t.urgency]++
  }

  return counts
}

/**
 * Calculate a priority score for a sport based on its game timings.
 * Higher score = more urgent to refresh.
 */
export function calculateSportPriority(timings: GameTimingInfo[]): number {
  if (timings.length === 0) return 0

  let score = 0
  for (const t of timings) {
    score += TIER_PRIORITY_WEIGHTS[t.urgency]
  }

  return score
}

/**
 * Determine whether a sport's cache is stale given game urgency.
 * Instead of a flat 5-min TTL for all sports, use the most urgent
 * game's dynamic TTL.
 */
export function isSportCacheStale(
  cachedInfo: CachedSportInfo,
  gameTimings: GameTimingInfo[],
  now: Date = new Date()
): { stale: boolean; reason: string; effectiveTtl: number } {
  // No cache at all = definitely stale
  if (!cachedInfo.lastRefreshedAt) {
    return { stale: true, reason: 'No cached data', effectiveTtl: 0 }
  }

  // No upcoming games = not stale (nothing to refresh)
  if (gameTimings.length === 0) {
    return { stale: false, reason: 'No upcoming games for this sport', effectiveTtl: Infinity }
  }

  // Find the most urgent game's TTL
  const mostUrgent = gameTimings.reduce((best, t) =>
    t.dynamicTtl < best.dynamicTtl ? t : best
  )

  const cacheAge = now.getTime() - new Date(cachedInfo.lastRefreshedAt).getTime()
  const effectiveTtl = mostUrgent.dynamicTtl

  if (cacheAge > effectiveTtl) {
    return {
      stale: true,
      reason: `Cache age (${formatMs(cacheAge)}) exceeds ${mostUrgent.urgency} TTL (${formatMs(effectiveTtl)})`,
      effectiveTtl,
    }
  }

  return {
    stale: false,
    reason: `Cache fresh — ${formatMs(effectiveTtl - cacheAge)} until stale`,
    effectiveTtl,
  }
}

/**
 * Calculate the daily budget given monthly usage and current date.
 */
export function calculateDailyBudget(
  monthlyBudget: number,
  usedThisMonth: number,
  now: Date = new Date()
): { dailyBudget: number; daysRemaining: number; remaining: number; conservationMode: boolean } {
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysRemaining = Math.max(daysInMonth - dayOfMonth, 1)
  const remaining = Math.max(monthlyBudget - usedThisMonth, 0)
  const dailyBudget = Math.floor(remaining / daysRemaining)

  // Conservation mode: fewer than 5 calls/day remaining
  const conservationMode = dailyBudget < 5

  return { dailyBudget, daysRemaining, remaining, conservationMode }
}

/**
 * Generate a complete refresh plan for all sports.
 *
 * This is the main entry point. Given current cache state and game timings,
 * it produces an ordered plan of which sports to refresh, respecting the
 * daily budget.
 */
export function generateRefreshPlan(
  cachedSports: CachedSportInfo[],
  allGameTimings: GameTimingInfo[],
  config: OptimizerConfig
): RefreshPlan {
  const now = config.now ?? new Date()
  const budget = calculateDailyBudget(config.monthlyBudget, config.usedThisMonth, now)

  // Group timings by sport
  const timingsBySport = new Map<Sport, GameTimingInfo[]>()
  for (const t of allGameTimings) {
    const existing = timingsBySport.get(t.sport) ?? []
    existing.push(t)
    timingsBySport.set(t.sport, existing)
  }

  // Evaluate each sport
  const sportPlans: SportRefreshPlan[] = cachedSports.map((cached) => {
    const timings = timingsBySport.get(cached.sport) ?? []
    const { stale, reason, effectiveTtl } = isSportCacheStale(cached, timings, now)
    const priority = calculateSportPriority(timings)
    const tierCounts = countByTier(timings)

    // Find soonest game
    const soonestTiming = timings.length > 0
      ? timings.reduce((best, t) => t.msUntilStart < best.msUntilStart ? t : best)
      : null

    return {
      sport: cached.sport,
      shouldRefresh: stale,
      reason,
      soonestGameMs: soonestTiming?.msUntilStart ?? null,
      tierCounts,
      effectiveTtl,
      priority,
    }
  })

  // Sort by priority (highest first)
  sportPlans.sort((a, b) => b.priority - a.priority)

  // In conservation mode, only refresh imminent/today games
  const sportsToRefresh: SportRefreshPlan[] = []
  const sportsToSkip: SportRefreshPlan[] = []

  let callsPlanned = 0
  for (const plan of sportPlans) {
    if (!plan.shouldRefresh) {
      sportsToSkip.push(plan)
      continue
    }

    // In conservation mode, skip sports with no imminent/today games
    if (budget.conservationMode) {
      const hasUrgent = plan.tierCounts.imminent > 0 || plan.tierCounts.today > 0
      if (!hasUrgent) {
        sportsToSkip.push({
          ...plan,
          shouldRefresh: false,
          reason: `Skipped — conservation mode (${budget.dailyBudget} calls/day budget), no imminent games`,
        })
        continue
      }
    }

    // Check if we have daily budget for this call
    if (callsPlanned >= budget.dailyBudget && budget.dailyBudget > 0) {
      sportsToSkip.push({
        ...plan,
        shouldRefresh: false,
        reason: `Skipped — daily budget exhausted (${budget.dailyBudget} calls/day)`,
      })
      continue
    }

    sportsToRefresh.push(plan)
    callsPlanned++
  }

  // Generate summary
  const refreshNames = sportsToRefresh.map((s) => s.sport.toUpperCase()).join(', ')
  const skipNames = sportsToSkip.map((s) => s.sport.toUpperCase()).join(', ')

  let summary: string
  if (sportsToRefresh.length === 0) {
    summary = 'All sports have fresh cache data. No API calls needed.'
  } else if (budget.conservationMode) {
    summary = `Conservation mode: refreshing ${refreshNames} (urgent games only). Skipping ${skipNames}. Budget: ${budget.remaining} calls remaining.`
  } else {
    summary = `Refreshing ${refreshNames}${skipNames ? ` (skipping ${skipNames})` : ''}. Daily budget: ${budget.dailyBudget} calls/day, ${budget.remaining} remaining this month.`
  }

  return {
    sportsToRefresh,
    sportsToSkip,
    estimatedCalls: callsPlanned,
    dailyBudgetRemaining: Math.max(budget.dailyBudget - callsPlanned, 0),
    conservationMode: budget.conservationMode,
    summary,
  }
}

/**
 * Get recommended refresh interval for a sport based on its most urgent game.
 * Returns milliseconds until next recommended check.
 */
export function getRecommendedInterval(timings: GameTimingInfo[]): number {
  if (timings.length === 0) return URGENCY_TTLS.distant

  const mostUrgent = timings.reduce((best, t) =>
    t.dynamicTtl < best.dynamicTtl ? t : best
  )

  return mostUrgent.dynamicTtl
}

/**
 * Estimate monthly API calls under this optimization strategy.
 * Useful for showing users projected savings.
 */
export function estimateMonthlyUsage(
  gamesPerDay: Record<Sport, number>,
  refreshesPerDay: Record<Sport, number>
): { totalCallsPerDay: number; projectedMonthly: number; savingsVsNaive: number } {
  let totalCallsPerDay = 0
  let naiveCallsPerDay = 0

  const sports: Sport[] = ['nba', 'nfl', 'mlb', 'nhl']
  for (const sport of sports) {
    totalCallsPerDay += refreshesPerDay[sport] ?? 0
    // Naive approach: refresh every 5 min for 16 active hours = 192 per sport
    naiveCallsPerDay += (gamesPerDay[sport] ?? 0) > 0 ? 192 : 0
  }

  const projectedMonthly = Math.round(totalCallsPerDay * 30)
  const naiveMonthly = Math.round(naiveCallsPerDay * 30)
  const savingsVsNaive = naiveMonthly > 0
    ? Math.round(((naiveMonthly - projectedMonthly) / naiveMonthly) * 100)
    : 0

  return { totalCallsPerDay, projectedMonthly, savingsVsNaive }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`
  return `${(ms / 86_400_000).toFixed(1)}d`
}
