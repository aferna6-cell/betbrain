/**
 * Injury impact analysis API route tests.
 *
 * Tests POST validation for gameId, sport, playerName, injuryStatus.
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

vi.mock('@/lib/sports/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sports/config')>(
    '@/lib/sports/config'
  )
  return actual
})

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

const mockGetOddsForSport = vi.fn()
vi.mock('@/lib/sports/odds', () => ({
  getOddsForSport: (...args: unknown[]) => mockGetOddsForSport(...args),
}))

const mockAnalyzeInjuryImpact = vi.fn()
vi.mock('@/lib/ai/injury-impact', () => ({
  analyzeInjuryImpact: (...args: unknown[]) => mockAnalyzeInjuryImpact(...args),
}))

const { POST } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/analysis/injury'

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    gameId: 'game-1',
    sport: 'nba',
    playerName: 'LeBron James',
    injuryStatus: 'Out — ankle sprain',
    ...overrides,
  }
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/analysis/injury — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: true, used: 0, limit: 3 })
    mockGetOddsForSport.mockResolvedValue({
      games: [{ id: 'game-1', sport: 'nba' }],
    })
    mockAnalyzeInjuryImpact.mockResolvedValue({ summary: 'Significant impact' })
  })

  it('rejects missing gameId', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ gameId: undefined })))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('gameId')
  })

  it('rejects invalid sport', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ sport: 'soccer' })))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('rejects missing playerName', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ playerName: undefined })))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('playerName')
  })

  it('rejects missing injuryStatus', async () => {
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody({ injuryStatus: undefined })))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('injuryStatus')
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

  it('returns 429 when analysis limit reached', async () => {
    mockCheckAnalysisLimit.mockResolvedValue({ allowed: false, used: 3, limit: 3 })
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.used).toBe(3)
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const res = await POST(makeRequest(BASE_URL, 'POST', validBody()))
    expect(res.status).toBe(401)
  })
})
