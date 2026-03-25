import { describe, it, expect } from 'vitest'
import {
  classifyUrgency,
  getDynamicTtl,
  analyzeGameTimings,
  countByTier,
  calculateSportPriority,
  isSportCacheStale,
  calculateDailyBudget,
  generateRefreshPlan,
  getRecommendedInterval,
  estimateMonthlyUsage,
  URGENCY_TTLS,
} from '../odds-request-optimizer'
import type { Sport } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_MIN = 60 * 1000
const MS_HOUR = 60 * MS_MIN
const MS_DAY = 24 * MS_HOUR

function futureIso(now: Date, offsetMs: number): string {
  return new Date(now.getTime() + offsetMs).toISOString()
}

function pastIso(now: Date, offsetMs: number): string {
  return new Date(now.getTime() - offsetMs).toISOString()
}

// ---------------------------------------------------------------------------
// classifyUrgency
// ---------------------------------------------------------------------------

describe('classifyUrgency', () => {
  it('classifies games starting within 30 min as imminent', () => {
    expect(classifyUrgency(0)).toBe('imminent')
    expect(classifyUrgency(15 * MS_MIN)).toBe('imminent')
    expect(classifyUrgency(29 * MS_MIN)).toBe('imminent')
    expect(classifyUrgency(30 * MS_MIN)).toBe('imminent') // exactly at threshold
  })

  it('classifies games 30min-12h away as today', () => {
    expect(classifyUrgency(31 * MS_MIN)).toBe('today')
    expect(classifyUrgency(6 * MS_HOUR)).toBe('today')
    expect(classifyUrgency(11 * MS_HOUR)).toBe('today')
  })

  it('classifies games 12h-36h away as tomorrow', () => {
    expect(classifyUrgency(13 * MS_HOUR)).toBe('tomorrow')
    expect(classifyUrgency(24 * MS_HOUR)).toBe('tomorrow')
    expect(classifyUrgency(35 * MS_HOUR)).toBe('tomorrow')
  })

  it('classifies games 36h-5d away as upcoming', () => {
    expect(classifyUrgency(37 * MS_HOUR)).toBe('upcoming')
    expect(classifyUrgency(3 * MS_DAY)).toBe('upcoming')
    expect(classifyUrgency(4.9 * MS_DAY)).toBe('upcoming')
  })

  it('classifies games 5+ days away as distant', () => {
    expect(classifyUrgency(6 * MS_DAY)).toBe('distant')
    expect(classifyUrgency(14 * MS_DAY)).toBe('distant')
  })
})

// ---------------------------------------------------------------------------
// getDynamicTtl
// ---------------------------------------------------------------------------

describe('getDynamicTtl', () => {
  it('returns 2 min TTL for imminent games', () => {
    expect(getDynamicTtl('imminent')).toBe(2 * MS_MIN)
  })

  it('returns 5 min TTL for today games', () => {
    expect(getDynamicTtl('today')).toBe(5 * MS_MIN)
  })

  it('returns 30 min TTL for tomorrow games', () => {
    expect(getDynamicTtl('tomorrow')).toBe(30 * MS_MIN)
  })

  it('returns 2 hour TTL for upcoming games', () => {
    expect(getDynamicTtl('upcoming')).toBe(2 * MS_HOUR)
  })

  it('returns 6 hour TTL for distant games', () => {
    expect(getDynamicTtl('distant')).toBe(6 * MS_HOUR)
  })
})

// ---------------------------------------------------------------------------
// analyzeGameTimings
// ---------------------------------------------------------------------------

describe('analyzeGameTimings', () => {
  const now = new Date('2026-03-25T18:00:00Z')

  it('analyzes an empty game list', () => {
    expect(analyzeGameTimings([], now)).toEqual([])
  })

  it('calculates msUntilStart and assigns urgency', () => {
    const games = [
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 15 * MS_MIN) },
      { gameId: 'g2', sport: 'nba' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
      { gameId: 'g3', sport: 'nfl' as Sport, commenceTime: futureIso(now, 2 * MS_DAY) },
    ]

    const result = analyzeGameTimings(games, now)
    expect(result).toHaveLength(3)
    expect(result[0].urgency).toBe('imminent')
    expect(result[1].urgency).toBe('today')
    expect(result[2].urgency).toBe('upcoming')
    expect(result[0].dynamicTtl).toBe(URGENCY_TTLS.imminent)
  })

  it('handles games that have already started (negative msUntilStart)', () => {
    const games = [
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: pastIso(now, 30 * MS_MIN) },
    ]
    const result = analyzeGameTimings(games, now)
    expect(result[0].msUntilStart).toBeLessThan(0)
    // Urgency should be imminent (clamped to 0 internally)
    expect(result[0].urgency).toBe('imminent')
  })
})

// ---------------------------------------------------------------------------
// countByTier
// ---------------------------------------------------------------------------

describe('countByTier', () => {
  it('counts empty timings', () => {
    const counts = countByTier([])
    expect(counts).toEqual({ imminent: 0, today: 0, tomorrow: 0, upcoming: 0, distant: 0 })
  })

  it('counts timings correctly across tiers', () => {
    const now = new Date('2026-03-25T18:00:00Z')
    const games = [
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 10 * MS_MIN) },
      { gameId: 'g2', sport: 'nba' as Sport, commenceTime: futureIso(now, 20 * MS_MIN) },
      { gameId: 'g3', sport: 'nba' as Sport, commenceTime: futureIso(now, 4 * MS_HOUR) },
      { gameId: 'g4', sport: 'nba' as Sport, commenceTime: futureIso(now, 7 * MS_DAY) },
    ]
    const timings = analyzeGameTimings(games, now)
    const counts = countByTier(timings)
    expect(counts.imminent).toBe(2)
    expect(counts.today).toBe(1)
    expect(counts.distant).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// calculateSportPriority
// ---------------------------------------------------------------------------

describe('calculateSportPriority', () => {
  const now = new Date('2026-03-25T18:00:00Z')

  it('returns 0 for no games', () => {
    expect(calculateSportPriority([])).toBe(0)
  })

  it('gives higher priority to sports with imminent games', () => {
    const imminentGames = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 10 * MS_MIN) },
    ], now)
    const distantGames = analyzeGameTimings([
      { gameId: 'g2', sport: 'nfl' as Sport, commenceTime: futureIso(now, 7 * MS_DAY) },
    ], now)

    expect(calculateSportPriority(imminentGames)).toBeGreaterThan(
      calculateSportPriority(distantGames)
    )
  })

  it('accumulates priority across multiple games', () => {
    const oneGame = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
    ], now)
    const twoGames = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
      { gameId: 'g2', sport: 'nba' as Sport, commenceTime: futureIso(now, 5 * MS_HOUR) },
    ], now)

    expect(calculateSportPriority(twoGames)).toBeGreaterThan(
      calculateSportPriority(oneGame)
    )
  })
})

// ---------------------------------------------------------------------------
// isSportCacheStale
// ---------------------------------------------------------------------------

describe('isSportCacheStale', () => {
  const now = new Date('2026-03-25T18:00:00Z')

  it('is stale when no cache exists', () => {
    const cached = {
      sport: 'nba' as Sport,
      lastRefreshedAt: null,
      cachedGameCount: 0,
      soonestGameTime: null,
    }
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
    ], now)

    const result = isSportCacheStale(cached, timings, now)
    expect(result.stale).toBe(true)
    expect(result.reason).toContain('No cached data')
  })

  it('is NOT stale when no upcoming games', () => {
    const cached = {
      sport: 'nfl' as Sport,
      lastRefreshedAt: pastIso(now, 10 * MS_HOUR),
      cachedGameCount: 0,
      soonestGameTime: null,
    }

    const result = isSportCacheStale(cached, [], now)
    expect(result.stale).toBe(false)
  })

  it('uses dynamic TTL based on most urgent game', () => {
    // Cache is 3 minutes old, imminent game has 2-min TTL => stale
    const cached = {
      sport: 'nba' as Sport,
      lastRefreshedAt: pastIso(now, 3 * MS_MIN),
      cachedGameCount: 5,
      soonestGameTime: futureIso(now, 10 * MS_MIN),
    }
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 10 * MS_MIN) },
    ], now)

    const result = isSportCacheStale(cached, timings, now)
    expect(result.stale).toBe(true)
    expect(result.effectiveTtl).toBe(URGENCY_TTLS.imminent)
  })

  it('is NOT stale when cache is within dynamic TTL', () => {
    // Cache is 1 minute old, today game has 5-min TTL => fresh
    const cached = {
      sport: 'nba' as Sport,
      lastRefreshedAt: pastIso(now, 1 * MS_MIN),
      cachedGameCount: 5,
      soonestGameTime: futureIso(now, 3 * MS_HOUR),
    }
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
    ], now)

    const result = isSportCacheStale(cached, timings, now)
    expect(result.stale).toBe(false)
  })

  it('uses shortest TTL when multiple urgency tiers exist', () => {
    // One imminent game (2-min TTL) and one distant game (6-hr TTL)
    // Cache 3 min old => stale because imminent game drives the TTL
    const cached = {
      sport: 'nba' as Sport,
      lastRefreshedAt: pastIso(now, 3 * MS_MIN),
      cachedGameCount: 2,
      soonestGameTime: futureIso(now, 10 * MS_MIN),
    }
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 10 * MS_MIN) },
      { gameId: 'g2', sport: 'nba' as Sport, commenceTime: futureIso(now, 7 * MS_DAY) },
    ], now)

    const result = isSportCacheStale(cached, timings, now)
    expect(result.stale).toBe(true)
    expect(result.effectiveTtl).toBe(URGENCY_TTLS.imminent)
  })
})

// ---------------------------------------------------------------------------
// calculateDailyBudget
// ---------------------------------------------------------------------------

describe('calculateDailyBudget', () => {
  it('calculates budget for mid-month', () => {
    const now = new Date('2026-03-15T12:00:00Z') // Day 15 of 31-day month
    const result = calculateDailyBudget(500, 200, now)
    // 300 remaining / 16 days left = 18 calls/day
    expect(result.dailyBudget).toBe(18)
    expect(result.daysRemaining).toBe(16)
    expect(result.remaining).toBe(300)
    expect(result.conservationMode).toBe(false)
  })

  it('enters conservation mode when budget is tight', () => {
    const now = new Date('2026-03-28T12:00:00Z') // Day 28, 3 days left
    const result = calculateDailyBudget(500, 490, now)
    // 10 remaining / 3 days = 3 calls/day => conservation mode
    expect(result.dailyBudget).toBe(3)
    expect(result.conservationMode).toBe(true)
  })

  it('handles exhausted budget', () => {
    const now = new Date('2026-03-20T12:00:00Z')
    const result = calculateDailyBudget(500, 500, now)
    expect(result.remaining).toBe(0)
    expect(result.dailyBudget).toBe(0)
    expect(result.conservationMode).toBe(true)
  })

  it('handles last day of month', () => {
    const now = new Date('2026-03-31T12:00:00Z')
    const result = calculateDailyBudget(500, 480, now)
    // daysRemaining is 0 but clamped to 1
    expect(result.dailyBudget).toBe(20)
  })

  it('handles beginning of month with full budget', () => {
    const now = new Date('2026-03-01T12:00:00Z')
    const result = calculateDailyBudget(500, 0, now)
    expect(result.dailyBudget).toBe(16) // 500/30
    expect(result.remaining).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// generateRefreshPlan
// ---------------------------------------------------------------------------

describe('generateRefreshPlan', () => {
  const now = new Date('2026-03-25T18:00:00Z')

  it('skips all sports when cache is fresh', () => {
    const cached = [
      { sport: 'nba' as Sport, lastRefreshedAt: pastIso(now, 1 * MS_MIN), cachedGameCount: 5, soonestGameTime: futureIso(now, 3 * MS_HOUR) },
      { sport: 'nhl' as Sport, lastRefreshedAt: pastIso(now, 1 * MS_MIN), cachedGameCount: 3, soonestGameTime: futureIso(now, 5 * MS_HOUR) },
    ]
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
      { gameId: 'g2', sport: 'nhl' as Sport, commenceTime: futureIso(now, 5 * MS_HOUR) },
    ], now)

    const plan = generateRefreshPlan(cached, timings, {
      monthlyBudget: 500, usedThisMonth: 100, now,
    })

    expect(plan.sportsToRefresh).toHaveLength(0)
    expect(plan.sportsToSkip).toHaveLength(2)
    expect(plan.estimatedCalls).toBe(0)
    expect(plan.summary).toContain('No API calls needed')
  })

  it('refreshes stale sports in priority order', () => {
    const cached = [
      { sport: 'nba' as Sport, lastRefreshedAt: pastIso(now, 10 * MS_MIN), cachedGameCount: 5, soonestGameTime: futureIso(now, 15 * MS_MIN) },
      { sport: 'nhl' as Sport, lastRefreshedAt: pastIso(now, 3 * MS_HOUR), cachedGameCount: 3, soonestGameTime: futureIso(now, 3 * MS_HOUR) },
    ]
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 15 * MS_MIN) },
      { gameId: 'g2', sport: 'nhl' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
    ], now)

    const plan = generateRefreshPlan(cached, timings, {
      monthlyBudget: 500, usedThisMonth: 100, now,
    })

    expect(plan.sportsToRefresh).toHaveLength(2)
    // NBA should be first (imminent game has higher priority)
    expect(plan.sportsToRefresh[0].sport).toBe('nba')
    expect(plan.sportsToRefresh[1].sport).toBe('nhl')
  })

  it('respects daily budget limit', () => {
    const cached = [
      { sport: 'nba' as Sport, lastRefreshedAt: pastIso(now, 10 * MS_MIN), cachedGameCount: 5, soonestGameTime: futureIso(now, 15 * MS_MIN) },
      { sport: 'nhl' as Sport, lastRefreshedAt: pastIso(now, 10 * MS_MIN), cachedGameCount: 3, soonestGameTime: futureIso(now, 3 * MS_HOUR) },
      { sport: 'mlb' as Sport, lastRefreshedAt: pastIso(now, 10 * MS_MIN), cachedGameCount: 3, soonestGameTime: futureIso(now, 5 * MS_HOUR) },
    ]
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 15 * MS_MIN) },
      { gameId: 'g2', sport: 'nhl' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
      { gameId: 'g3', sport: 'mlb' as Sport, commenceTime: futureIso(now, 5 * MS_HOUR) },
    ], now)

    // Only 2 calls/day budget
    const plan = generateRefreshPlan(cached, timings, {
      monthlyBudget: 500, usedThisMonth: 488, now, // 12 remaining / 6 days = 2/day
    })

    expect(plan.sportsToRefresh).toHaveLength(2)
    expect(plan.sportsToSkip).toHaveLength(1)
    expect(plan.estimatedCalls).toBe(2)
  })

  it('enters conservation mode with very low budget', () => {
    const cached = [
      { sport: 'nba' as Sport, lastRefreshedAt: pastIso(now, 1 * MS_HOUR), cachedGameCount: 5, soonestGameTime: futureIso(now, 15 * MS_MIN) },
      { sport: 'nfl' as Sport, lastRefreshedAt: pastIso(now, 1 * MS_HOUR), cachedGameCount: 2, soonestGameTime: futureIso(now, 3 * MS_DAY) },
    ]
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 15 * MS_MIN) },
      { gameId: 'g2', sport: 'nfl' as Sport, commenceTime: futureIso(now, 3 * MS_DAY) },
    ], now)

    const plan = generateRefreshPlan(cached, timings, {
      monthlyBudget: 500, usedThisMonth: 496, now, // 4 remaining / 6 days < 1/day
    })

    expect(plan.conservationMode).toBe(true)
    // NBA (imminent) should still refresh, NFL (upcoming) should be skipped
    expect(plan.sportsToRefresh.map(s => s.sport)).toContain('nba')
    expect(plan.sportsToSkip.some(s => s.sport === 'nfl')).toBe(true)
    expect(plan.summary).toContain('Conservation mode')
  })

  it('handles no cached sports', () => {
    const plan = generateRefreshPlan([], [], {
      monthlyBudget: 500, usedThisMonth: 0, now,
    })
    expect(plan.sportsToRefresh).toHaveLength(0)
    expect(plan.sportsToSkip).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// getRecommendedInterval
// ---------------------------------------------------------------------------

describe('getRecommendedInterval', () => {
  const now = new Date('2026-03-25T18:00:00Z')

  it('returns distant TTL when no games', () => {
    expect(getRecommendedInterval([])).toBe(URGENCY_TTLS.distant)
  })

  it('returns shortest TTL across all games', () => {
    const timings = analyzeGameTimings([
      { gameId: 'g1', sport: 'nba' as Sport, commenceTime: futureIso(now, 10 * MS_MIN) },
      { gameId: 'g2', sport: 'nba' as Sport, commenceTime: futureIso(now, 3 * MS_HOUR) },
    ], now)

    expect(getRecommendedInterval(timings)).toBe(URGENCY_TTLS.imminent)
  })
})

// ---------------------------------------------------------------------------
// estimateMonthlyUsage
// ---------------------------------------------------------------------------

describe('estimateMonthlyUsage', () => {
  it('calculates projected monthly usage', () => {
    const gamesPerDay = { nba: 8, nfl: 0, mlb: 12, nhl: 6 } as Record<Sport, number>
    const refreshesPerDay = { nba: 6, nfl: 0, mlb: 4, nhl: 4 } as Record<Sport, number>

    const result = estimateMonthlyUsage(gamesPerDay, refreshesPerDay)
    expect(result.totalCallsPerDay).toBe(14)
    expect(result.projectedMonthly).toBe(420)
    expect(result.savingsVsNaive).toBeGreaterThan(0)
  })

  it('handles zero games', () => {
    const gamesPerDay = { nba: 0, nfl: 0, mlb: 0, nhl: 0 } as Record<Sport, number>
    const refreshesPerDay = { nba: 0, nfl: 0, mlb: 0, nhl: 0 } as Record<Sport, number>

    const result = estimateMonthlyUsage(gamesPerDay, refreshesPerDay)
    expect(result.totalCallsPerDay).toBe(0)
    expect(result.projectedMonthly).toBe(0)
    expect(result.savingsVsNaive).toBe(0)
  })
})
