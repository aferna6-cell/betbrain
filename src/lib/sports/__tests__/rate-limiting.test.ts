/**
 * Rate limiting + caching logic tests.
 *
 * Tests the pure business rules around The Odds API rate limiting,
 * cache TTL management, and stale-data fallback behavior.
 * No external API or Supabase calls — validates the decision logic only.
 */

import { describe, it, expect } from 'vitest'
import {
  ODDS_API_MONTHLY_LIMIT,
  ODDS_API_WARN_AT,
  CACHE_TTL_MS,
  SUPPORTED_SPORTS,
  ODDS_API_SPORT_KEYS,
  type NormalizedGame,
  type OddsResult,
} from '@/lib/sports/config'

// --- Rate limit thresholds ---

describe('Rate limit constants', () => {
  it('monthly limit is 500', () => {
    expect(ODDS_API_MONTHLY_LIMIT).toBe(500)
  })

  it('warning threshold is 80% of limit', () => {
    expect(ODDS_API_WARN_AT).toBe(400)
    expect(ODDS_API_WARN_AT).toBe(Math.floor(ODDS_API_MONTHLY_LIMIT * 0.8))
  })

  it('warning threshold is less than limit', () => {
    expect(ODDS_API_WARN_AT).toBeLessThan(ODDS_API_MONTHLY_LIMIT)
  })
})

// --- Cache TTL values ---

describe('Cache TTL configuration', () => {
  it('odds TTL is 5 minutes', () => {
    expect(CACHE_TTL_MS.ODDS).toBe(5 * 60 * 1000)
  })

  it('stats TTL is 1 hour', () => {
    expect(CACHE_TTL_MS.STATS).toBe(60 * 60 * 1000)
  })

  it('historical TTL is 24 hours', () => {
    expect(CACHE_TTL_MS.HISTORICAL).toBe(24 * 60 * 60 * 1000)
  })

  it('standings TTL is 6 hours', () => {
    expect(CACHE_TTL_MS.STANDINGS).toBe(6 * 60 * 60 * 1000)
  })

  it('odds TTL is shortest (most aggressive refresh)', () => {
    const allTTLs = Object.values(CACHE_TTL_MS)
    expect(Math.min(...allTTLs)).toBe(CACHE_TTL_MS.ODDS)
  })
})

// --- Usage warning decision logic ---

describe('Usage warning decision', () => {
  function shouldWarn(usageCount: number): boolean {
    return usageCount >= ODDS_API_WARN_AT
  }

  function isExhausted(usageCount: number): boolean {
    return usageCount >= ODDS_API_MONTHLY_LIMIT
  }

  it('no warning below 400', () => {
    expect(shouldWarn(0)).toBe(false)
    expect(shouldWarn(100)).toBe(false)
    expect(shouldWarn(399)).toBe(false)
  })

  it('warning at exactly 400', () => {
    expect(shouldWarn(400)).toBe(true)
  })

  it('warning between 400 and 499', () => {
    expect(shouldWarn(450)).toBe(true)
    expect(shouldWarn(499)).toBe(true)
  })

  it('not exhausted below 500', () => {
    expect(isExhausted(0)).toBe(false)
    expect(isExhausted(499)).toBe(false)
  })

  it('exhausted at exactly 500', () => {
    expect(isExhausted(500)).toBe(true)
  })

  it('exhausted above 500', () => {
    expect(isExhausted(501)).toBe(true)
    expect(isExhausted(1000)).toBe(true)
  })
})

// --- Cache freshness ---

describe('Cache freshness logic', () => {
  function isFresh(expiresAt: string): boolean {
    return new Date(expiresAt) > new Date()
  }

  it('future expiry is fresh', () => {
    const futureDate = new Date(Date.now() + 60_000).toISOString()
    expect(isFresh(futureDate)).toBe(true)
  })

  it('past expiry is stale', () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString()
    expect(isFresh(pastDate)).toBe(false)
  })

  it('TTL calculation produces future date', () => {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS.ODDS).toISOString()
    expect(isFresh(expiresAt)).toBe(true)
  })
})

// --- OddsResult shape validation ---

describe('OddsResult fallback behavior', () => {
  function buildResult(opts: {
    usageCount: number
    hasCache: boolean
    apiAvailable: boolean
  }): OddsResult {
    const usageWarning = opts.usageCount >= ODDS_API_WARN_AT
    const isExhausted = opts.usageCount >= ODDS_API_MONTHLY_LIMIT

    // Simulate the decision tree from getOddsForSport
    if (opts.hasCache) {
      return {
        games: [{ id: 'mock', fromCache: true } as NormalizedGame],
        apiUsageCount: opts.usageCount,
        usageWarning,
        dataNotice: usageWarning
          ? `API usage at ${opts.usageCount}/${ODDS_API_MONTHLY_LIMIT} calls. Displaying cached odds.`
          : undefined,
      }
    }

    if (isExhausted) {
      return {
        games: [],
        apiUsageCount: opts.usageCount,
        usageWarning: true,
        dataNotice: `Monthly API limit of ${ODDS_API_MONTHLY_LIMIT} calls reached. No cached data available.`,
      }
    }

    if (!opts.apiAvailable) {
      return {
        games: [],
        apiUsageCount: opts.usageCount,
        usageWarning,
        dataNotice: 'Sports data temporarily unavailable. Please try again shortly.',
      }
    }

    return {
      games: [{ id: 'live', fromCache: false } as NormalizedGame],
      apiUsageCount: opts.usageCount + 1,
      usageWarning: (opts.usageCount + 1) >= ODDS_API_WARN_AT,
    }
  }

  it('returns cached data when cache is available', () => {
    const result = buildResult({ usageCount: 100, hasCache: true, apiAvailable: true })
    expect(result.games).toHaveLength(1)
    expect(result.games[0].fromCache).toBe(true)
    expect(result.dataNotice).toBeUndefined()
  })

  it('returns cached data with warning when approaching limit', () => {
    const result = buildResult({ usageCount: 450, hasCache: true, apiAvailable: true })
    expect(result.games).toHaveLength(1)
    expect(result.usageWarning).toBe(true)
    expect(result.dataNotice).toContain('450/500')
  })

  it('returns empty when limit exhausted and no cache', () => {
    const result = buildResult({ usageCount: 500, hasCache: false, apiAvailable: true })
    expect(result.games).toHaveLength(0)
    expect(result.usageWarning).toBe(true)
    expect(result.dataNotice).toContain('limit')
  })

  it('returns live data when no cache and API available', () => {
    const result = buildResult({ usageCount: 10, hasCache: false, apiAvailable: true })
    expect(result.games).toHaveLength(1)
    expect(result.games[0].fromCache).toBe(false)
    expect(result.apiUsageCount).toBe(11)
  })

  it('returns empty with notice when API unavailable', () => {
    const result = buildResult({ usageCount: 10, hasCache: false, apiAvailable: false })
    expect(result.games).toHaveLength(0)
    expect(result.dataNotice).toContain('temporarily unavailable')
  })
})

// --- Cache-first prevents unnecessary API calls ---

describe('Cache-first API call prevention', () => {
  function buildResult(opts: {
    usageCount: number
    hasCache: boolean
    apiAvailable: boolean
  }): OddsResult & { apiCallMade: boolean } {
    const usageWarning = opts.usageCount >= ODDS_API_WARN_AT
    const isExhausted = opts.usageCount >= ODDS_API_MONTHLY_LIMIT

    // Cache hit → no API call, regardless of usage count
    if (opts.hasCache) {
      return {
        games: [{ id: 'mock', fromCache: true } as NormalizedGame],
        apiUsageCount: opts.usageCount,
        usageWarning,
        dataNotice: usageWarning
          ? `API usage at ${opts.usageCount}/${ODDS_API_MONTHLY_LIMIT} calls. Displaying cached odds.`
          : undefined,
        apiCallMade: false,
      }
    }

    // Exhausted → no API call
    if (isExhausted) {
      return {
        games: [],
        apiUsageCount: opts.usageCount,
        usageWarning: true,
        dataNotice: `Monthly API limit of ${ODDS_API_MONTHLY_LIMIT} calls reached. No cached data available.`,
        apiCallMade: false,
      }
    }

    // Cache miss + under limit → API call needed
    if (opts.apiAvailable) {
      return {
        games: [{ id: 'live', fromCache: false } as NormalizedGame],
        apiUsageCount: opts.usageCount + 1,
        usageWarning: (opts.usageCount + 1) >= ODDS_API_WARN_AT,
        apiCallMade: true,
      }
    }

    return {
      games: [],
      apiUsageCount: opts.usageCount,
      usageWarning,
      dataNotice: 'Sports data temporarily unavailable. Please try again shortly.',
      apiCallMade: false,
    }
  }

  it('does not call API when cache is fresh, even at low usage', () => {
    const result = buildResult({ usageCount: 0, hasCache: true, apiAvailable: true })
    expect(result.apiCallMade).toBe(false)
    expect(result.apiUsageCount).toBe(0)
  })

  it('does not call API when cache is fresh and near limit', () => {
    const result = buildResult({ usageCount: 499, hasCache: true, apiAvailable: true })
    expect(result.apiCallMade).toBe(false)
    expect(result.apiUsageCount).toBe(499) // no increment
  })

  it('does not call API when exhausted and no cache', () => {
    const result = buildResult({ usageCount: 500, hasCache: false, apiAvailable: true })
    expect(result.apiCallMade).toBe(false)
    expect(result.games).toHaveLength(0)
  })

  it('only calls API on cache miss under limit', () => {
    const result = buildResult({ usageCount: 10, hasCache: false, apiAvailable: true })
    expect(result.apiCallMade).toBe(true)
    expect(result.apiUsageCount).toBe(11)
  })

  it('worst case is 4 API calls per refresh cycle (one per sport)', () => {
    // With 500 limit and 4 sports, 5-min cache means max 4 calls per 5 minutes
    // 500 / 4 = 125 refresh cycles → ~10+ hours of continuous polling
    expect(SUPPORTED_SPORTS).toHaveLength(4)
    const refreshCycles = Math.floor(ODDS_API_MONTHLY_LIMIT / SUPPORTED_SPORTS.length)
    expect(refreshCycles).toBeGreaterThanOrEqual(125)
  })

  it('5-min TTL with 4 sports allows ~10 hours of continuous polling', () => {
    const callsPerCycle = SUPPORTED_SPORTS.length // 4
    const totalCycles = Math.floor(ODDS_API_MONTHLY_LIMIT / callsPerCycle)
    const totalMinutes = totalCycles * (CACHE_TTL_MS.ODDS / 60_000)
    const totalHours = totalMinutes / 60
    expect(totalHours).toBeGreaterThanOrEqual(10)
  })
})

// --- Sport key mapping ---

describe('Sport key mapping for API calls', () => {
  it('all supported sports have API keys', () => {
    for (const sport of SUPPORTED_SPORTS) {
      expect(ODDS_API_SPORT_KEYS[sport]).toBeTruthy()
    }
  })

  it('NBA maps to basketball_nba', () => {
    expect(ODDS_API_SPORT_KEYS.nba).toBe('basketball_nba')
  })

  it('NFL maps to americanfootball_nfl', () => {
    expect(ODDS_API_SPORT_KEYS.nfl).toBe('americanfootball_nfl')
  })

  it('MLB maps to baseball_mlb', () => {
    expect(ODDS_API_SPORT_KEYS.mlb).toBe('baseball_mlb')
  })

  it('NHL maps to icehockey_nhl', () => {
    expect(ODDS_API_SPORT_KEYS.nhl).toBe('icehockey_nhl')
  })

  it('supports exactly 4 sports', () => {
    expect(SUPPORTED_SPORTS).toHaveLength(4)
    expect(Object.keys(ODDS_API_SPORT_KEYS)).toHaveLength(4)
  })
})

// --- Month key format ---

describe('Monthly usage key format', () => {
  function currentMonth(): string {
    return new Date().toISOString().slice(0, 7)
  }

  it('returns YYYY-MM format', () => {
    const month = currentMonth()
    expect(month).toMatch(/^\d{4}-\d{2}$/)
  })

  it('is 7 characters long', () => {
    expect(currentMonth()).toHaveLength(7)
  })
})
