/**
 * Parlay analysis API route tests.
 *
 * Tests POST validation for legs array (min 2, max 10, required fields per leg).
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

const mockAnalyzeParlay = vi.fn()
vi.mock('@/lib/ai/parlay-analyzer', () => ({
  analyzeParlay: (...args: unknown[]) => mockAnalyzeParlay(...args),
}))

const { POST } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/analysis/parlay'

function validLeg(overrides: Record<string, unknown> = {}) {
  return {
    description: 'Lakers ML',
    odds: -150,
    sport: 'nba',
    ...overrides,
  }
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/analysis/parlay — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: true, used: 0, limit: 3 })
    mockAnalyzeParlay.mockResolvedValue({ combinedOdds: 400, ev: 1.5 })
  })

  it('rejects fewer than 2 legs', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', { legs: [validLeg()] }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('2 legs')
  })

  it('rejects more than 10 legs', async () => {
    const legs = Array(11).fill(null).map(() => validLeg())
    const res = await POST(makeRequest(BASE_URL, 'POST', { legs }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('10')
  })

  it('rejects missing legs', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', {}))
    expect(res.status).toBe(400)
  })

  it('rejects leg without description', async () => {
    const legs = [validLeg(), validLeg({ description: undefined })]
    const res = await POST(makeRequest(BASE_URL, 'POST', { legs }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Leg 2')
    expect(body.error).toContain('description')
  })

  it('rejects leg without odds', async () => {
    const legs = [validLeg(), validLeg({ odds: 'bad' })]
    const res = await POST(makeRequest(BASE_URL, 'POST', { legs }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Leg 2')
    expect(body.error).toContain('odds')
  })

  it('rejects leg without sport', async () => {
    const legs = [validLeg(), validLeg({ sport: undefined })]
    const res = await POST(makeRequest(BASE_URL, 'POST', { legs }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('accepts valid 2-leg parlay', async () => {
    const legs = [validLeg(), validLeg({ description: 'Celtics ML' })]
    const res = await POST(makeRequest(BASE_URL, 'POST', { legs }))
    expect(res.status).toBe(200)
  })

  it('accepts valid 10-leg parlay', async () => {
    const legs = Array(10).fill(null).map((_, i) => validLeg({ description: `Leg ${i + 1}` }))
    const res = await POST(makeRequest(BASE_URL, 'POST', { legs }))
    expect(res.status).toBe(200)
  })

  it('returns 429 when limit reached', async () => {
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: false, used: 3, limit: 3 })
    const legs = [validLeg(), validLeg()]
    const res = await POST(makeRequest(BASE_URL, 'POST', { legs }))
    expect(res.status).toBe(429)
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
})
