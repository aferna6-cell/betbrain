/**
 * Cron resolve API route tests.
 *
 * Tests CRON_SECRET bearer token auth (the cron-specific auth mechanism).
 * This route uses bearer token auth, not Supabase session auth.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Module mocks -----------------------------------------------------------

// Build a mock Supabase client that returns empty results for all queries
function makeEmptyChain() {
  const emptyResult = { data: [], error: null }
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.is = vi.fn(() => chain)
  chain.lt = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.single = vi.fn().mockResolvedValue(emptyResult)
  // Make the chain thenable so `await supabase.from(...).select(...)...` resolves
  chain.then = (resolve: (v: unknown) => void) => resolve(emptyResult)
  return { from: chain.from, auth: { getUser: vi.fn() } }
}

const mockSupabase = makeEmptyChain()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/sports/stats', () => ({
  getNBAGames: vi.fn().mockResolvedValue({ data: [] }),
}))

vi.mock('@/lib/auto-resolve', () => ({
  resolvePicksBatch: vi.fn().mockReturnValue({ resolved: [], skipped: [] }),
  normalizeTeamName: vi.fn((name: string) => name.toLowerCase()),
  resolveSignalOutcome: vi.fn().mockReturnValue('win'),
  nbaGameToResult: vi.fn((g: unknown) => g),
}))

const { GET } = await import('../resolve/route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/cron/resolve'

function makeRequestWithAuth(secret?: string): Request {
  const headers: Record<string, string> = {}
  if (secret) {
    headers.authorization = `Bearer ${secret}`
  }
  return new Request(BASE_URL, { method: 'GET', headers })
}

// --- Tests ------------------------------------------------------------------

describe('GET /api/cron/resolve — auth', () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  afterEach(() => {
    if (ORIGINAL_SECRET !== undefined) {
      process.env.CRON_SECRET = ORIGINAL_SECRET
    } else {
      delete process.env.CRON_SECRET
    }
  })

  it('rejects requests with wrong cron secret', async () => {
    const res = await GET(makeRequestWithAuth('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('rejects requests with no auth header when secret is set', async () => {
    const res = await GET(makeRequestWithAuth())
    expect(res.status).toBe(401)
  })

  it('accepts requests with correct cron secret', async () => {
    const res = await GET(makeRequestWithAuth('test-cron-secret'))
    expect(res.status).not.toBe(401)
  })
})

describe('GET /api/cron/resolve — empty state', () => {
  beforeEach(() => {
    delete process.env.CRON_SECRET
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns nothing-to-resolve when no pending picks', async () => {
    const res = await GET(makeRequestWithAuth())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.message).toContain('Nothing to resolve')
  })

  it('response includes picks and signals counts', async () => {
    const res = await GET(makeRequestWithAuth())
    const body = await res.json()
    expect(body).toHaveProperty('picks')
    expect(body).toHaveProperty('signals')
  })
})
