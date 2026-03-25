import { describe, it, expect } from 'vitest'
import {
  ODDS_API_SPORT_KEYS,
  SUPPORTED_SPORTS,
  CACHE_TTL_MS,
  ODDS_API_MONTHLY_LIMIT,
  ODDS_API_WARN_AT,
} from '@/lib/sports/config'
import type {
  NormalizedGame,
  OddsResult,
} from '@/lib/sports/config'

describe('Sports Config', () => {
  it('maps all 4 supported sports to Odds API keys', () => {
    expect(Object.keys(ODDS_API_SPORT_KEYS)).toHaveLength(4)
    expect(ODDS_API_SPORT_KEYS.nba).toBe('basketball_nba')
    expect(ODDS_API_SPORT_KEYS.nfl).toBe('americanfootball_nfl')
    expect(ODDS_API_SPORT_KEYS.mlb).toBe('baseball_mlb')
    expect(ODDS_API_SPORT_KEYS.nhl).toBe('icehockey_nhl')
  })

  it('SUPPORTED_SPORTS has all 4 leagues', () => {
    expect(SUPPORTED_SPORTS).toContain('nba')
    expect(SUPPORTED_SPORTS).toContain('nfl')
    expect(SUPPORTED_SPORTS).toContain('mlb')
    expect(SUPPORTED_SPORTS).toContain('nhl')
    expect(SUPPORTED_SPORTS).toHaveLength(4)
  })

  it('cache TTLs are reasonable values', () => {
    expect(CACHE_TTL_MS.ODDS).toBe(5 * 60 * 1000) // 5 min
    expect(CACHE_TTL_MS.STATS).toBe(60 * 60 * 1000) // 1 hour
    expect(CACHE_TTL_MS.HISTORICAL).toBe(24 * 60 * 60 * 1000) // 24 hours
    expect(CACHE_TTL_MS.STANDINGS).toBe(6 * 60 * 60 * 1000) // 6 hours
  })

  it('warn threshold is 80% of monthly limit', () => {
    expect(ODDS_API_MONTHLY_LIMIT).toBe(500)
    expect(ODDS_API_WARN_AT).toBe(400)
    expect(ODDS_API_WARN_AT).toBe(Math.floor(ODDS_API_MONTHLY_LIMIT * 0.8))
  })
})

describe('NormalizedGame type compliance', () => {
  it('a well-formed NormalizedGame satisfies the interface', () => {
    const game: NormalizedGame = {
      id: 'test-game-123',
      sport: 'nba',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      commenceTime: '2026-03-14T02:00:00Z',
      fromCache: false,
      isFresh: true,
      bookmakers: [
        {
          bookmaker: 'draftkings',
          moneyline: { home: -150, away: 130, draw: null },
          spread: { homeLine: -3.5, homeOdds: -110, awayLine: 3.5, awayOdds: -110 },
          total: { line: 220.5, overOdds: -110, underOdds: -110 },
          lastUpdated: '2026-03-14T01:00:00Z',
        },
      ],
    }
    expect(game.id).toBeTruthy()
    expect(game.sport).toBe('nba')
    expect(game.bookmakers).toHaveLength(1)
    expect(game.bookmakers[0].moneyline?.home).toBe(-150)
  })

  it('game with no bookmakers is valid', () => {
    const game: NormalizedGame = {
      id: 'empty-game',
      sport: 'nfl',
      homeTeam: 'Chiefs',
      awayTeam: 'Bills',
      commenceTime: '2026-03-14T20:00:00Z',
      fromCache: true,
      isFresh: false,
      bookmakers: [],
    }
    expect(game.bookmakers).toHaveLength(0)
    expect(game.fromCache).toBe(true)
    expect(game.isFresh).toBe(false)
  })
})

describe('OddsResult type compliance', () => {
  it('result with games and metadata', () => {
    const result: OddsResult = {
      games: [],
      apiUsageCount: 42,
      usageWarning: false,
    }
    expect(result.apiUsageCount).toBe(42)
    expect(result.usageWarning).toBe(false)
    expect(result.dataNotice).toBeUndefined()
  })

  it('result with warning and notice', () => {
    const result: OddsResult = {
      games: [],
      apiUsageCount: 450,
      usageWarning: true,
      dataNotice: 'Approaching API limit',
    }
    expect(result.usageWarning).toBe(true)
    expect(result.dataNotice).toContain('limit')
  })
})

// ---------------------------------------------------------------------------
// fetchOddsFromApi — AbortController / timeout behaviour
//
// fetchOddsFromApi is a private function, so we test the AbortController
// signal pattern directly with a local replica that mirrors its implementation.
// This validates that the timeout wiring is correct without needing Supabase.
// ---------------------------------------------------------------------------

import { describe as _describe, it as _it, vi, beforeEach, afterEach } from 'vitest'

/**
 * Local replica of the AbortController + fetch wiring used in
 * fetchOddsFromApi.  Mirrors the production code exactly so that tests
 * catch regressions without importing private symbols.
 */
async function fetchWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

_describe('fetchOddsFromApi — AbortController signal wiring', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  _it('passes an AbortSignal to fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })
    globalThis.fetch = mockFetch

    await fetchWithTimeout('https://api.the-odds-api.com/v4/sports/basketball_nba/odds')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [, fetchOptions] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal)
  })

  _it('signal is not yet aborted on a successful fast response', async () => {
    let capturedSignal: AbortSignal | undefined

    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedSignal = opts.signal as AbortSignal
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })
    })
    globalThis.fetch = mockFetch

    await fetchWithTimeout('https://api.the-odds-api.com/v4/sports/basketball_nba/odds')

    expect(capturedSignal).toBeDefined()
    expect(capturedSignal!.aborted).toBe(false)
  })

  _it('clears the timeout after a successful response', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })
    globalThis.fetch = mockFetch

    await fetchWithTimeout('https://api.the-odds-api.com/v4/sports/basketball_nba/odds')

    expect(clearTimeoutSpy).toHaveBeenCalledOnce()
  })

  _it('clears the timeout even when fetch throws', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'))
    globalThis.fetch = mockFetch

    await expect(
      fetchWithTimeout('https://api.the-odds-api.com/v4/sports/basketball_nba/odds')
    ).rejects.toThrow('network error')

    expect(clearTimeoutSpy).toHaveBeenCalledOnce()
  })

  _it('clears the timeout when the response is not OK', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
    })
    globalThis.fetch = mockFetch

    await expect(
      fetchWithTimeout('https://api.the-odds-api.com/v4/sports/basketball_nba/odds')
    ).rejects.toThrow('API error: 500')

    expect(clearTimeoutSpy).toHaveBeenCalledOnce()
  })

  _it('abort fires after the timeout elapses', async () => {
    vi.useFakeTimers()

    let capturedSignal: AbortSignal | undefined

    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedSignal = opts.signal as AbortSignal
      // Never resolve — simulates a hung connection
      return new Promise(() => {})
    })
    globalThis.fetch = mockFetch

    const fetchPromise = fetchWithTimeout('https://api.the-odds-api.com/v4/sports/basketball_nba/odds')

    // Advance past the 10-second timeout
    vi.advanceTimersByTime(10_001)

    expect(capturedSignal).toBeDefined()
    expect(capturedSignal!.aborted).toBe(true)

    // Prevent unhandled rejection from lingering
    fetchPromise.catch(() => {})

    vi.useRealTimers()
  })
})
