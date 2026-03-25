/**
 * Supabase error-handling tests for stats.ts.
 *
 * Covers:
 *   - getCacheEntries returning [] when game_cache errors (logs '[stats] Cache lookup error:')
 *   - trackApiUsage logging '[stats] trackApiUsage query failed:' without throwing
 *
 * Both exercised through getNBAGames().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Supabase before any dynamic imports
// ---------------------------------------------------------------------------

const mockCreateServiceClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => mockCreateServiceClient(...args),
  createServiceClient: (...args: unknown[]) => mockCreateServiceClient(...args),
}))

vi.mock('@/lib/env', () => ({
  getOddsApiKey: () => 'test-odds-key',
  getAnthropicApiKey: () => 'test-anth-key',
  getBalldontlieApiKey: () => 'test-bdl-key',
}))

// ---------------------------------------------------------------------------
// Chain mock helpers
// ---------------------------------------------------------------------------

const DB_ERROR = { message: 'connection refused' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChain(result: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.gt = vi.fn(self)
  chain.is = vi.fn(self)
  chain.order = vi.fn(self)
  chain.limit = vi.fn(self)
  chain.maybeSingle = vi.fn(() => Promise.resolve(result))
  chain.single = vi.fn(() => Promise.resolve(result))
  chain.upsert = vi.fn(() => Promise.resolve({ error: null }))
  chain.insert = vi.fn(() => Promise.resolve({ error: null }))
  // Make the chain thenable so `await supabase.from(...).select(...)` works
  chain.then = (resolve: (v: unknown) => void) => resolve(result)
  return chain
}

// ---------------------------------------------------------------------------
// Fake BDL API response
// ---------------------------------------------------------------------------

const FAKE_BDL_GAMES_RESPONSE = {
  data: [
    {
      id: 1,
      date: '2026-03-25',
      status: 'Final',
      period: 4,
      time: '',
      home_team: {
        id: 14,
        name: 'Lakers',
        full_name: 'Los Angeles Lakers',
        abbreviation: 'LAL',
        city: 'Los Angeles',
        conference: 'West',
        division: 'Pacific',
      },
      visitor_team: {
        id: 2,
        name: 'Celtics',
        full_name: 'Boston Celtics',
        abbreviation: 'BOS',
        city: 'Boston',
        conference: 'East',
        division: 'Atlantic',
      },
      home_team_score: 110,
      visitor_team_score: 105,
      season: 2025,
      postseason: false,
    },
  ],
}

// ---------------------------------------------------------------------------
// Dynamic module import (after mocks are registered)
// ---------------------------------------------------------------------------

const { getNBAGames } = await import('@/lib/sports/stats')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getNBAGames — getCacheEntries and trackApiUsage Supabase errors', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('logs cache error + usage-query error, but still returns live data from fetch', async () => {
    // game_cache errors → getCacheEntries returns [] (cache miss)
    // rpc increment_api_usage succeeds
    // api_usage select after rpc errors → trackApiUsage logs but does not throw
    // setCacheEntry upsert succeeds

    let callCount = 0
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'game_cache') {
          // All game_cache accesses error (getCacheEntries + stale-fallback + setCacheEntry upsert)
          return makeChain({ data: null, error: DB_ERROR })
        }
        if (table === 'api_usage') {
          // The post-rpc select for threshold check errors
          callCount++
          return makeChain({ data: null, error: DB_ERROR })
        }
        return makeChain({ data: null, error: null })
      }),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
      auth: { getUser: vi.fn() },
    }
    mockCreateServiceClient.mockResolvedValue(mockClient)

    // Successful fetch from balldontlie
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(FAKE_BDL_GAMES_RESPONSE),
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getNBAGames()

    // Should have returned the live data from fetch
    expect(result.fromCache).toBe(false)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].homeTeam.name).toBe('Lakers')

    // getCacheEntries error logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[stats] Cache lookup error:'),
      expect.any(String),
    )

    // trackApiUsage query error logged (non-fatal)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[stats] trackApiUsage query failed:'),
      expect.any(String),
    )

    // Overall result should still be valid
    expect(callCount).toBeGreaterThan(0)
  })
})
