/**
 * Backtesting API route tests.
 *
 * Tests POST validation for all 5 fields: sport, season, strategy, unitSize, bankroll.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeRequest,
} from '../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockRunBacktest = vi.fn()

vi.mock('@/lib/backtesting', () => ({
  runBacktest: (...args: unknown[]) => mockRunBacktest(...args),
}))

const { POST } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/backtesting'

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    sport: 'nba',
    season: '2024-25',
    strategy: 'smart-signals',
    unitSize: 25,
    startingBankroll: 1000,
    ...overrides,
  }
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/backtesting — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockRunBacktest.mockReturnValue({ results: [], totalProfit: 0, roi: 0 })
  })

  it('rejects invalid sport', async () => {
    const req = makeRequest(BASE_URL, 'POST', validBody({ sport: 'cricket' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('rejects invalid season', async () => {
    const req = makeRequest(BASE_URL, 'POST', validBody({ season: '2020-21' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('season')
  })

  it('rejects invalid strategy', async () => {
    const req = makeRequest(BASE_URL, 'POST', validBody({ strategy: 'coin-flip' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('strategy')
  })

  it('rejects unit size below $1', async () => {
    const req = makeRequest(BASE_URL, 'POST', validBody({ unitSize: 0 }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Unit size')
  })

  it('rejects unit size above $10,000', async () => {
    const req = makeRequest(BASE_URL, 'POST', validBody({ unitSize: 50000 }))
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects bankroll below $100', async () => {
    const req = makeRequest(BASE_URL, 'POST', validBody({ startingBankroll: 50 }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('bankroll')
  })

  it('rejects bankroll above $1,000,000', async () => {
    const req = makeRequest(BASE_URL, 'POST', validBody({ startingBankroll: 2000000 }))
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects invalid JSON body', async () => {
    const req = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'bad',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('accepts valid body and returns result', async () => {
    const fakeResult = { results: [{ date: '2025-01-01', profit: 2.5 }], totalProfit: 2.5, roi: 10 }
    mockRunBacktest.mockReturnValue(fakeResult)

    const req = makeRequest(BASE_URL, 'POST', validBody())
    const res = await POST(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.totalProfit).toBe(2.5)
    expect(body.roi).toBe(10)
  })

  it('accepts all valid strategies', async () => {
    for (const strategy of ['smart-signals', 'high-confidence', 'value-plays']) {
      mockRunBacktest.mockReturnValueOnce({ results: [] })
      const req = makeRequest(BASE_URL, 'POST', validBody({ strategy }))
      const res = await POST(req)
      expect(res.status).toBe(200)
    }
  })

  it('accepts all valid seasons', async () => {
    for (const season of ['2023-24', '2024-25']) {
      mockRunBacktest.mockReturnValueOnce({ results: [] })
      const req = makeRequest(BASE_URL, 'POST', validBody({ season }))
      const res = await POST(req)
      expect(res.status).toBe(200)
    }
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const req = makeRequest(BASE_URL, 'POST', validBody())
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
