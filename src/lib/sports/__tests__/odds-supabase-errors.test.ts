/**
 * Supabase error-handling tests for odds.ts.
 *
 * Covers the three private functions that silently handle DB errors:
 *   - readOddsCache (returns [])
 *   - getApiUsageCount (returns 0)
 *   - getGameById (returns null)
 *
 * Private functions are exercised through the public API:
 *   getOddsApiUsage(), getOddsForSport(), getGameById()
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

vi.mock('@/lib/alerts', () => ({
  checkAlerts: vi.fn().mockResolvedValue(undefined),
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

const { getOddsApiUsage, getOddsForSport, getGameById } = await import('@/lib/sports/odds')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getOddsApiUsage — api_usage Supabase error', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns count=0 and no warnings when api_usage query fails', async () => {
    const client = buildMockClient({
      api_usage: { data: null, error: DB_ERROR },
    })
    mockCreateServiceClient.mockResolvedValue(client)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getOddsApiUsage()

    expect(result.count).toBe(0)
    expect(result.isWarning).toBe(false)
    expect(result.isExhausted).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[odds] getApiUsageCount failed:'),
      expect.any(String),
    )
  })
})

describe('getGameById — odds_cache Supabase error', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns null when odds_cache query fails', async () => {
    const client = buildMockClient({
      odds_cache: { data: null, error: DB_ERROR },
    })
    mockCreateServiceClient.mockResolvedValue(client)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getGameById('game-xyz')

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[odds] getGameById failed:'),
      expect.any(String),
    )
  })
})

describe('getOddsForSport — odds_cache Supabase error triggers live fetch', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('treats cache error as a cache miss and returns API-error notice when fetch fails', async () => {
    // api_usage succeeds (count=0, well under limit)
    // odds_cache errors → readOddsCache returns [] (cache miss)
    // fetch returns 503 → API error → 'temporarily unavailable'
    const client = buildMockClient({
      api_usage: { data: { call_count: 0 }, error: null },
      odds_cache: { data: null, error: DB_ERROR },
    })
    mockCreateServiceClient.mockResolvedValue(client)

    // api_usage uses .maybeSingle() so override that chain's maybeSingle
    client.from.mockImplementation((table: string) => {
      if (table === 'api_usage') {
        return makeChain({ data: { call_count: 0 }, error: null })
      }
      return makeChain({ data: null, error: DB_ERROR })
    })

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getOddsForSport('nba')

    expect(result.games).toEqual([])
    expect(result.dataNotice).toContain('temporarily unavailable')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[odds] readOddsCache failed:'),
      expect.any(String),
    )
  })
})
