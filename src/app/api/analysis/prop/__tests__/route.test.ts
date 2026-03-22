/**
 * Prop analysis API route tests.
 *
 * Tests POST validation for all 8 required fields.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeRequest,
} from '../../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockCheckAnalysisLimit = vi.fn()
vi.mock('@/lib/ai/analysis', () => ({
  checkAnalysisLimit: (...args: unknown[]) => mockCheckAnalysisLimit(...args),
  AnalysisLimitError: class extends Error {
    used: number; limit: number
    constructor(used: number, limit: number) {
      super(`Limit: ${used}/${limit}`); this.used = used; this.limit = limit
    }
  },
}))

const mockAnalyzeProp = vi.fn()
vi.mock('@/lib/ai/prop-analyzer', () => ({
  analyzeProp: (...args: unknown[]) => mockAnalyzeProp(...args),
}))

const { POST } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/analysis/prop'

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    playerName: 'LeBron James',
    sport: 'nba',
    team: 'Lakers',
    opponent: 'Celtics',
    propMarket: 'points',
    line: 25.5,
    overOdds: -110,
    underOdds: -110,
    ...overrides,
  }
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/analysis/prop — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: true, used: 0, limit: 3 })
    mockAnalyzeProp.mockResolvedValue({ recommendation: 'over', confidence: 0.65 })
  })

  it('rejects missing playerName', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ playerName: undefined })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('playerName')
  })

  it('rejects missing sport', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ sport: undefined })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('sport')
  })

  it('rejects missing team', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ team: undefined })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('team')
  })

  it('rejects missing opponent', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ opponent: undefined })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('opponent')
  })

  it('rejects missing propMarket', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ propMarket: undefined })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('propMarket')
  })

  it('rejects non-numeric line', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ line: 'high' })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('line')
  })

  it('rejects non-numeric overOdds', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ overOdds: 'bad' })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('overOdds')
  })

  it('rejects non-numeric underOdds', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ underOdds: 'bad' })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('underOdds')
  })

  it('rejects invalid JSON', async () => {
    const req = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'bad',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('accepts valid body and returns result', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.recommendation).toBe('over')
  })

  it('returns 429 when limit reached', async () => {
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: false, used: 3, limit: 3 })
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(429)
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(401)
  })
})
