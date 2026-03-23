/**
 * Prop analysis API route tests.
 *
 * Tests POST validation for all 8 required fields,
 * cache hit/miss behavior, and daily limit enforcement.
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
const mockIncrementAnalysisCount = vi.fn()
vi.mock('@/lib/ai/analysis', () => ({
  checkAnalysisLimit: (...args: unknown[]) => mockCheckAnalysisLimit(...args),
  incrementAnalysisCount: (...args: unknown[]) => mockIncrementAnalysisCount(...args),
  AnalysisLimitError: class extends Error {
    used: number; limit: number
    constructor(used: number, limit: number) {
      super(`Limit: ${used}/${limit}`); this.used = used; this.limit = limit
    }
  },
}))

const mockAnalyzeProp = vi.fn()
const mockGetCachedPropAnalysis = vi.fn()
const mockCachePropAnalysis = vi.fn()
vi.mock('@/lib/ai/prop-analyzer', () => ({
  analyzeProp: (...args: unknown[]) => mockAnalyzeProp(...args),
  getCachedPropAnalysis: (...args: unknown[]) => mockGetCachedPropAnalysis(...args),
  cachePropAnalysis: (...args: unknown[]) => mockCachePropAnalysis(...args),
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
    mockIncrementAnalysisCount.mockResolvedValue(undefined)
    mockGetCachedPropAnalysis.mockResolvedValue(null)
    mockCachePropAnalysis.mockResolvedValue(undefined)
    mockAnalyzeProp.mockResolvedValue({ recommendation: 'over', confidence: 65, fromCache: false })
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

describe('POST /api/analysis/prop — caching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: true, used: 0, limit: 3 })
    mockIncrementAnalysisCount.mockResolvedValue(undefined)
    mockGetCachedPropAnalysis.mockResolvedValue(null)
    mockCachePropAnalysis.mockResolvedValue(undefined)
    mockAnalyzeProp.mockResolvedValue({ recommendation: 'over', confidence: 65, fromCache: false })
  })

  it('returns cached result without calling AI or checking limit', async () => {
    const cachedResult = {
      recommendation: 'under',
      confidence: 72,
      fromCache: true,
      playerName: 'LeBron James',
    }
    mockGetCachedPropAnalysis.mockResolvedValue(cachedResult)

    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.recommendation).toBe('under')
    expect(body.fromCache).toBe(true)

    // AI should not be called
    expect(mockAnalyzeProp).not.toHaveBeenCalled()
    // Limit check should not be called
    expect(mockCheckAnalysisLimit).not.toHaveBeenCalled()
    // Count should not be incremented
    expect(mockIncrementAnalysisCount).not.toHaveBeenCalled()
  })

  it('increments count and caches result on cache miss', async () => {
    mockGetCachedPropAnalysis.mockResolvedValue(null)

    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(200)

    expect(mockAnalyzeProp).toHaveBeenCalledTimes(1)
    expect(mockIncrementAnalysisCount).toHaveBeenCalledWith(FAKE_USER.id)
    expect(mockCachePropAnalysis).toHaveBeenCalledTimes(1)
  })

  it('does not call AI when limit reached and no cache', async () => {
    mockGetCachedPropAnalysis.mockResolvedValue(null)
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: false, used: 3, limit: 3 })

    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(429)
    expect(mockAnalyzeProp).not.toHaveBeenCalled()
  })

  it('returns cached result even when limit is exhausted', async () => {
    const cachedResult = {
      recommendation: 'pass',
      confidence: 50,
      fromCache: true,
    }
    mockGetCachedPropAnalysis.mockResolvedValue(cachedResult)
    // Even though limit is exhausted, cache hit should still work
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: false, used: 3, limit: 3 })

    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.fromCache).toBe(true)
    expect(mockAnalyzeProp).not.toHaveBeenCalled()
  })
})
