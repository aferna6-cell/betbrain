/**
 * Supabase error-handling tests for props.ts.
 *
 * Covers:
 *   - readPropCache returning null when Supabase errors
 *   - getApiUsageCount returning 0 when Supabase errors
 *
 * Both are exercised through the public getPropOddsForGame() function.
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

function buildMockClient(tableResults: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: vi.fn((table: string) =>
      makeChain(tableResults[table] ?? { data: null, error: null }),
    ),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    auth: { getUser: vi.fn() },
  }
}

// ---------------------------------------------------------------------------
// Dynamic module import (after mocks are registered)
// ---------------------------------------------------------------------------

const { getPropOddsForGame } = await import('@/lib/sports/props')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getPropOddsForGame — api_usage Supabase error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns apiUsageCount=0 and no-markets notice when api_usage query fails (mlb)', async () => {
    // Using sport='mlb' causes the no-markets early return path,
    // so only the api_usage query runs — no fetch mock needed.
    const client = buildMockClient({
      api_usage: { data: null, error: DB_ERROR },
    })
    mockCreateServiceClient.mockResolvedValue(client)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getPropOddsForGame('game-x', 'mlb')

    expect(result.apiUsageCount).toBe(0)
    expect(result.dataNotice).toContain('No prop markets configured')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[props] getApiUsageCount failed:'),
      expect.any(String),
    )
  })
})

describe('getPropOddsForGame — odds_cache Supabase error (readPropCache)', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('treats cache error as cache miss and returns API-error notice when fetch fails', async () => {
    // api_usage succeeds (count=5, under limit)
    // odds_cache errors → readPropCache returns null (cache miss)
    // fetch returns 503 → API error → 'temporarily unavailable'
    const client = buildMockClient({
      api_usage: { data: { call_count: 5 }, error: null },
      odds_cache: { data: null, error: DB_ERROR },
    })

    // Override .from() so api_usage uses maybeSingle correctly
    client.from.mockImplementation((table: string) => {
      if (table === 'api_usage') {
        return makeChain({ data: { call_count: 5 }, error: null })
      }
      return makeChain({ data: null, error: DB_ERROR })
    })

    mockCreateServiceClient.mockResolvedValue(client)

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getPropOddsForGame('game-x', 'nba', ['player_points'])

    expect(result.props).toEqual([])
    expect(result.apiUsageCount).toBe(5)
    expect(result.dataNotice).toContain('temporarily unavailable')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[props] readPropCache failed:'),
      expect.any(String),
    )
  })
})
