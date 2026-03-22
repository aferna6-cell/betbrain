/**
 * Signal history API route tests.
 *
 * Tests GET param validation (sport, outcome, limit), PATCH validation, auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeGetRequest,
  makeRequest,
} from '../../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockGetSignalHistory = vi.fn()
const mockGetSignalStats = vi.fn()
const mockResolveSignal = vi.fn()

vi.mock('@/lib/signal-history', () => ({
  getSignalHistory: (...args: unknown[]) => mockGetSignalHistory(...args),
  getSignalStats: (...args: unknown[]) => mockGetSignalStats(...args),
  resolveSignal: (...args: unknown[]) => mockResolveSignal(...args),
}))

const { GET, PATCH } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/signals/history'

// --- Tests ------------------------------------------------------------------

describe('GET /api/signals/history — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockGetSignalHistory.mockResolvedValue([])
    mockGetSignalStats.mockResolvedValue({ total: 0, hitRate: 0 })
  })

  it('returns history and stats', async () => {
    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('history')
    expect(body).toHaveProperty('stats')
  })

  it('rejects invalid sport filter', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?sport=cricket`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('rejects invalid outcome filter', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?outcome=draw`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('outcome')
  })

  it('accepts valid sport and outcome filters', async () => {
    for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) {
      mockGetSignalHistory.mockResolvedValueOnce([])
      mockGetSignalStats.mockResolvedValueOnce({})
      const res = await GET(makeGetRequest(`${BASE_URL}?sport=${sport}`))
      expect(res.status).toBe(200)
    }
    for (const outcome of ['win', 'loss', 'push', 'pending']) {
      mockGetSignalHistory.mockResolvedValueOnce([])
      mockGetSignalStats.mockResolvedValueOnce({})
      const res = await GET(makeGetRequest(`${BASE_URL}?outcome=${outcome}`))
      expect(res.status).toBe(200)
    }
  })

  it('passes limit to getSignalHistory', async () => {
    mockGetSignalHistory.mockResolvedValue([])
    mockGetSignalStats.mockResolvedValue({})
    await GET(makeGetRequest(`${BASE_URL}?limit=10`))
    expect(mockGetSignalHistory).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    )
  })

  it('clamps limit to max 500', async () => {
    mockGetSignalHistory.mockResolvedValue([])
    mockGetSignalStats.mockResolvedValue({})

    await GET(makeGetRequest(`${BASE_URL}?limit=999`))
    expect(mockGetSignalHistory).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 500 })
    )
  })

  it('defaults limit to 50 for non-numeric input', async () => {
    mockGetSignalHistory.mockResolvedValue([])
    mockGetSignalStats.mockResolvedValue({})

    await GET(makeGetRequest(`${BASE_URL}?limit=abc`))
    expect(mockGetSignalHistory).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    )
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/signals/history — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('rejects missing externalGameId', async () => {
    const res = await PATCH(makeRequest(BASE_URL, 'PATCH', { outcome: 'win' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('externalGameId')
  })

  it('rejects invalid outcome', async () => {
    const res = await PATCH(makeRequest(BASE_URL, 'PATCH', {
      externalGameId: 'g1',
      outcome: 'draw',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('outcome')
  })

  it('rejects invalid JSON', async () => {
    const req = new Request(BASE_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'bad',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid JSON')
  })

  it('accepts valid outcome and calls resolveSignal', async () => {
    mockResolveSignal.mockResolvedValue(true)
    const res = await PATCH(makeRequest(BASE_URL, 'PATCH', {
      externalGameId: 'g1',
      outcome: 'win',
    }))
    expect(res.status).toBe(200)
    expect(mockResolveSignal).toHaveBeenCalledWith('g1', 'win')
  })

  it('returns 500 when resolveSignal fails', async () => {
    mockResolveSignal.mockResolvedValue(false)
    const res = await PATCH(makeRequest(BASE_URL, 'PATCH', {
      externalGameId: 'g1',
      outcome: 'loss',
    }))
    expect(res.status).toBe(500)
  })

  it('accepts all valid outcomes: win, loss, push', async () => {
    for (const outcome of ['win', 'loss', 'push']) {
      mockResolveSignal.mockResolvedValueOnce(true)
      const res = await PATCH(makeRequest(BASE_URL, 'PATCH', {
        externalGameId: 'g1',
        outcome,
      }))
      expect(res.status).toBe(200)
    }
  })
})
