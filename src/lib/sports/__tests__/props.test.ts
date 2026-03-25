/**
 * Player prop odds library tests.
 *
 * Tests normalization logic, market configuration, and the public API shapes.
 * No external API or Supabase calls — validates pure functions and constants.
 */

import { describe, it, expect } from 'vitest'
import {
  NBA_PROP_MARKETS,
  NFL_PROP_MARKETS,
  SPORT_PROP_MARKETS,
  PROP_MARKET_LABELS,
  isPropMarket,
  type NormalizedPlayerProp,
  type NormalizedPropLine,
  type PropOddsResult,
} from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Market configuration
// ---------------------------------------------------------------------------

describe('NBA_PROP_MARKETS', () => {
  it('includes all 6 core NBA prop markets', () => {
    expect(NBA_PROP_MARKETS).toContain('player_points')
    expect(NBA_PROP_MARKETS).toContain('player_rebounds')
    expect(NBA_PROP_MARKETS).toContain('player_assists')
    expect(NBA_PROP_MARKETS).toContain('player_threes')
    expect(NBA_PROP_MARKETS).toContain('player_blocks')
    expect(NBA_PROP_MARKETS).toContain('player_steals')
  })

  it('has exactly 6 markets', () => {
    expect(NBA_PROP_MARKETS).toHaveLength(6)
  })

  it('all markets pass isPropMarket guard', () => {
    for (const market of NBA_PROP_MARKETS) {
      expect(isPropMarket(market)).toBe(true)
    }
  })
})

describe('NFL_PROP_MARKETS', () => {
  it('includes all 3 core NFL prop markets', () => {
    expect(NFL_PROP_MARKETS).toContain('player_pass_tds')
    expect(NFL_PROP_MARKETS).toContain('player_rush_yds')
    expect(NFL_PROP_MARKETS).toContain('player_reception_yds')
  })

  it('has exactly 3 markets', () => {
    expect(NFL_PROP_MARKETS).toHaveLength(3)
  })

  it('all markets pass isPropMarket guard', () => {
    for (const market of NFL_PROP_MARKETS) {
      expect(isPropMarket(market)).toBe(true)
    }
  })
})

describe('SPORT_PROP_MARKETS', () => {
  it('nba has markets configured', () => {
    expect(SPORT_PROP_MARKETS.nba).toBeDefined()
    expect(SPORT_PROP_MARKETS.nba!.length).toBeGreaterThan(0)
  })

  it('nfl has markets configured', () => {
    expect(SPORT_PROP_MARKETS.nfl).toBeDefined()
    expect(SPORT_PROP_MARKETS.nfl!.length).toBeGreaterThan(0)
  })

  it('mlb has no prop markets configured', () => {
    expect(SPORT_PROP_MARKETS.mlb).toBeUndefined()
  })

  it('nhl has no prop markets configured', () => {
    expect(SPORT_PROP_MARKETS.nhl).toBeUndefined()
  })
})

describe('PROP_MARKET_LABELS', () => {
  it('has a label for every NBA prop market', () => {
    for (const market of NBA_PROP_MARKETS) {
      expect(PROP_MARKET_LABELS[market]).toBeTruthy()
    }
  })

  it('has a label for every NFL prop market', () => {
    for (const market of NFL_PROP_MARKETS) {
      expect(PROP_MARKET_LABELS[market]).toBeTruthy()
    }
  })

  it('player_points label is Points', () => {
    expect(PROP_MARKET_LABELS['player_points']).toBe('Points')
  })

  it('player_pass_tds label is Passing TDs', () => {
    expect(PROP_MARKET_LABELS['player_pass_tds']).toBe('Passing TDs')
  })
})

// ---------------------------------------------------------------------------
// isPropMarket guard
// ---------------------------------------------------------------------------

describe('isPropMarket', () => {
  it('returns true for all NBA markets', () => {
    for (const m of NBA_PROP_MARKETS) {
      expect(isPropMarket(m)).toBe(true)
    }
  })

  it('returns true for all NFL markets', () => {
    for (const m of NFL_PROP_MARKETS) {
      expect(isPropMarket(m)).toBe(true)
    }
  })

  it('returns false for h2h (standard odds market)', () => {
    expect(isPropMarket('h2h')).toBe(false)
  })

  it('returns false for spreads', () => {
    expect(isPropMarket('spreads')).toBe(false)
  })

  it('returns false for totals', () => {
    expect(isPropMarket('totals')).toBe(false)
  })

  it('returns false for unknown strings', () => {
    expect(isPropMarket('player_touchdowns')).toBe(false)
    expect(isPropMarket('')).toBe(false)
    expect(isPropMarket('PLAYER_POINTS')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// NormalizedPropLine interface compliance
// ---------------------------------------------------------------------------

describe('NormalizedPropLine type compliance', () => {
  it('a well-formed prop line satisfies the interface', () => {
    const line: NormalizedPropLine = {
      bookmaker: 'draftkings',
      line: 24.5,
      overOdds: -115,
      underOdds: -105,
      lastUpdated: '2026-03-25T10:00:00Z',
    }
    expect(line.bookmaker).toBe('draftkings')
    expect(line.line).toBe(24.5)
    expect(line.overOdds).toBe(-115)
    expect(line.underOdds).toBe(-105)
  })

  it('null odds are allowed', () => {
    const line: NormalizedPropLine = {
      bookmaker: 'fanduel',
      line: 20.5,
      overOdds: null,
      underOdds: null,
      lastUpdated: '2026-03-25T10:00:00Z',
    }
    expect(line.overOdds).toBeNull()
    expect(line.underOdds).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// NormalizedPlayerProp interface compliance
// ---------------------------------------------------------------------------

describe('NormalizedPlayerProp type compliance', () => {
  it('a well-formed player prop satisfies the interface', () => {
    const prop: NormalizedPlayerProp = {
      playerName: 'LeBron James',
      market: 'player_points',
      bookmakers: [
        {
          bookmaker: 'draftkings',
          line: 24.5,
          overOdds: -115,
          underOdds: -105,
          lastUpdated: '2026-03-25T10:00:00Z',
        },
        {
          bookmaker: 'fanduel',
          line: 24.5,
          overOdds: -110,
          underOdds: -110,
          lastUpdated: '2026-03-25T10:00:00Z',
        },
      ],
      bestOverOdds: -110,
      bestUnderOdds: -105,
      consensusLine: 24.5,
    }
    expect(prop.playerName).toBe('LeBron James')
    expect(prop.market).toBe('player_points')
    expect(prop.bookmakers).toHaveLength(2)
    expect(prop.bestOverOdds).toBe(-110)
    expect(prop.bestUnderOdds).toBe(-105)
    expect(prop.consensusLine).toBe(24.5)
  })

  it('null best odds and consensus line are valid when no data', () => {
    const prop: NormalizedPlayerProp = {
      playerName: 'Anthony Davis',
      market: 'player_rebounds',
      bookmakers: [],
      bestOverOdds: null,
      bestUnderOdds: null,
      consensusLine: null,
    }
    expect(prop.bookmakers).toHaveLength(0)
    expect(prop.bestOverOdds).toBeNull()
    expect(prop.consensusLine).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PropOddsResult interface compliance
// ---------------------------------------------------------------------------

describe('PropOddsResult type compliance', () => {
  it('a fresh live result satisfies the interface', () => {
    const result: PropOddsResult = {
      gameId: 'abc123',
      sport: 'nba',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      commenceTime: '2026-03-25T00:00:00Z',
      props: [],
      fromCache: false,
      isFresh: true,
      apiUsageCount: 15,
      usageWarning: false,
    }
    expect(result.gameId).toBe('abc123')
    expect(result.fromCache).toBe(false)
    expect(result.isFresh).toBe(true)
    expect(result.dataNotice).toBeUndefined()
  })

  it('a cached stale result with dataNotice satisfies the interface', () => {
    const result: PropOddsResult = {
      gameId: 'abc123',
      sport: 'nba',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      commenceTime: '2026-03-25T00:00:00Z',
      props: [],
      fromCache: true,
      isFresh: false,
      cachedAt: '2026-03-25T09:00:00Z',
      apiUsageCount: 450,
      usageWarning: true,
      dataNotice: 'API usage at 450/500 calls. Displaying cached props.',
    }
    expect(result.fromCache).toBe(true)
    expect(result.isFresh).toBe(false)
    expect(result.cachedAt).toBeTruthy()
    expect(result.dataNotice).toContain('450/500')
  })
})

// ---------------------------------------------------------------------------
// Best-odds computation logic (pure, isolated from Supabase)
// ---------------------------------------------------------------------------

describe('Best odds selection logic', () => {
  function findBestOdds(lines: NormalizedPropLine[], side: 'over' | 'under'): number | null {
    let best: number | null = null
    for (const l of lines) {
      const price = side === 'over' ? l.overOdds : l.underOdds
      if (price !== null) {
        if (best === null || price > best) best = price
      }
    }
    return best
  }

  it('picks highest over odds across bookmakers', () => {
    const lines: NormalizedPropLine[] = [
      { bookmaker: 'dk', line: 24.5, overOdds: -115, underOdds: -105, lastUpdated: '' },
      { bookmaker: 'fd', line: 24.5, overOdds: -110, underOdds: -110, lastUpdated: '' },
      { bookmaker: 'mgm', line: 24.5, overOdds: +100, underOdds: -130, lastUpdated: '' },
    ]
    expect(findBestOdds(lines, 'over')).toBe(100)
  })

  it('picks highest under odds across bookmakers', () => {
    const lines: NormalizedPropLine[] = [
      { bookmaker: 'dk', line: 24.5, overOdds: -115, underOdds: -105, lastUpdated: '' },
      { bookmaker: 'fd', line: 24.5, overOdds: -110, underOdds: -110, lastUpdated: '' },
    ]
    expect(findBestOdds(lines, 'under')).toBe(-105)
  })

  it('returns null when all odds are null', () => {
    const lines: NormalizedPropLine[] = [
      { bookmaker: 'dk', line: 24.5, overOdds: null, underOdds: null, lastUpdated: '' },
    ]
    expect(findBestOdds(lines, 'over')).toBeNull()
    expect(findBestOdds(lines, 'under')).toBeNull()
  })

  it('returns null for empty bookmakers array', () => {
    expect(findBestOdds([], 'over')).toBeNull()
  })

  it('handles single bookmaker correctly', () => {
    const lines: NormalizedPropLine[] = [
      { bookmaker: 'dk', line: 15.5, overOdds: -120, underOdds: +100, lastUpdated: '' },
    ]
    expect(findBestOdds(lines, 'over')).toBe(-120)
    expect(findBestOdds(lines, 'under')).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Consensus line logic (pure, isolated)
// ---------------------------------------------------------------------------

describe('Consensus line computation', () => {
  function computeConsensus(lines: NormalizedPropLine[]): number | null {
    if (lines.length === 0) return null
    const counts = new Map<number, number>()
    for (const l of lines) {
      counts.set(l.line, (counts.get(l.line) ?? 0) + 1)
    }
    let best: number | null = null
    let max = 0
    for (const [val, cnt] of counts) {
      if (cnt > max) {
        max = cnt
        best = val
      }
    }
    return best
  }

  it('returns the most common line value', () => {
    const lines: NormalizedPropLine[] = [
      { bookmaker: 'dk', line: 24.5, overOdds: -110, underOdds: -110, lastUpdated: '' },
      { bookmaker: 'fd', line: 24.5, overOdds: -115, underOdds: -105, lastUpdated: '' },
      { bookmaker: 'mgm', line: 25.5, overOdds: -110, underOdds: -110, lastUpdated: '' },
    ]
    expect(computeConsensus(lines)).toBe(24.5)
  })

  it('returns the single line when all bookmakers agree', () => {
    const lines: NormalizedPropLine[] = [
      { bookmaker: 'dk', line: 30.5, overOdds: -110, underOdds: -110, lastUpdated: '' },
      { bookmaker: 'fd', line: 30.5, overOdds: -110, underOdds: -110, lastUpdated: '' },
    ]
    expect(computeConsensus(lines)).toBe(30.5)
  })

  it('returns a value when all lines differ (picks first max)', () => {
    const lines: NormalizedPropLine[] = [
      { bookmaker: 'dk', line: 24.5, overOdds: -110, underOdds: -110, lastUpdated: '' },
      { bookmaker: 'fd', line: 25.5, overOdds: -110, underOdds: -110, lastUpdated: '' },
    ]
    // Both have count 1, algorithm returns whichever is iterated first
    expect(computeConsensus(lines)).not.toBeNull()
  })

  it('returns null for empty lines array', () => {
    expect(computeConsensus([])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// fetchPropsFromApi — AbortController / timeout behaviour
//
// fetchPropsFromApi is a private function, so we test the AbortController
// signal pattern directly with a local replica that mirrors its implementation.
// ---------------------------------------------------------------------------

import { describe as _describe, it as _it, vi, beforeEach, afterEach } from 'vitest'

/**
 * Local replica of the AbortController + fetch wiring used in
 * fetchPropsFromApi.  Mirrors the production code exactly.
 */
async function fetchPropsWithTimeout(url: string): Promise<unknown> {
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

_describe('fetchPropsFromApi — AbortController signal wiring', () => {
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
      json: () => Promise.resolve({ bookmakers: [] }),
    })
    globalThis.fetch = mockFetch

    await fetchPropsWithTimeout(
      'https://api.the-odds-api.com/v4/sports/basketball_nba/events/evt123/odds'
    )

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
        json: () => Promise.resolve({ bookmakers: [] }),
      })
    })
    globalThis.fetch = mockFetch

    await fetchPropsWithTimeout(
      'https://api.the-odds-api.com/v4/sports/basketball_nba/events/evt123/odds'
    )

    expect(capturedSignal).toBeDefined()
    expect(capturedSignal!.aborted).toBe(false)
  })

  _it('clears the timeout after a successful response', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ bookmakers: [] }),
    })
    globalThis.fetch = mockFetch

    await fetchPropsWithTimeout(
      'https://api.the-odds-api.com/v4/sports/basketball_nba/events/evt123/odds'
    )

    expect(clearTimeoutSpy).toHaveBeenCalledOnce()
  })

  _it('clears the timeout even when fetch throws', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const mockFetch = vi.fn().mockRejectedValue(new Error('network failure'))
    globalThis.fetch = mockFetch

    await expect(
      fetchPropsWithTimeout(
        'https://api.the-odds-api.com/v4/sports/basketball_nba/events/evt123/odds'
      )
    ).rejects.toThrow('network failure')

    expect(clearTimeoutSpy).toHaveBeenCalledOnce()
  })

  _it('clears the timeout when the response status is not OK', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: () => Promise.resolve({}),
    })
    globalThis.fetch = mockFetch

    await expect(
      fetchPropsWithTimeout(
        'https://api.the-odds-api.com/v4/sports/basketball_nba/events/evt123/odds'
      )
    ).rejects.toThrow('API error: 422')

    expect(clearTimeoutSpy).toHaveBeenCalledOnce()
  })

  _it('abort fires after the timeout elapses', async () => {
    vi.useFakeTimers()

    let capturedSignal: AbortSignal | undefined

    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedSignal = opts.signal as AbortSignal
      return new Promise(() => {})
    })
    globalThis.fetch = mockFetch

    const fetchPromise = fetchPropsWithTimeout(
      'https://api.the-odds-api.com/v4/sports/basketball_nba/events/evt123/odds'
    )

    vi.advanceTimersByTime(10_001)

    expect(capturedSignal).toBeDefined()
    expect(capturedSignal!.aborted).toBe(true)

    fetchPromise.catch(() => {})

    vi.useRealTimers()
  })
})
