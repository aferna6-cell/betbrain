/**
 * Analysis API route tests.
 *
 * Tests POST validation (gameId, sport), limit error handling (429),
 * game-not-found, GET limit check, and auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeRequest,
  makeGetRequest,
} from '../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockGetOddsForSport = vi.fn()
vi.mock('@/lib/sports/odds', () => ({
  getOddsForSport: (...args: unknown[]) => mockGetOddsForSport(...args),
}))

const mockAnalyzeGame = vi.fn()
const mockCheckAnalysisLimit = vi.fn()

// AnalysisLimitError needs to be a real class for instanceof checks
class MockAnalysisLimitError extends Error {
  used: number
  limit: number
  constructor(used: number, limit: number) {
    super(`Analysis limit reached: ${used}/${limit}`)
    this.name = 'AnalysisLimitError'
    this.used = used
    this.limit = limit
  }
}

vi.mock('@/lib/ai/analysis', () => ({
  analyzeGame: (...args: unknown[]) => mockAnalyzeGame(...args),
  checkAnalysisLimit: (...args: unknown[]) => mockCheckAnalysisLimit(...args),
  AnalysisLimitError: MockAnalysisLimitError,
}))

vi.mock('@/lib/sports/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sports/config')>(
    '@/lib/sports/config'
  )
  return actual
})

const { POST, GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/analysis'

const fakeGame = {
  id: 'game-abc',
  sport: 'nba',
  homeTeam: 'Lakers',
  awayTeam: 'Celtics',
  commenceTime: '2026-03-22T20:00:00Z',
  bookmakers: [],
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/analysis — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockGetOddsForSport.mockResolvedValue({ games: [fakeGame], fromCache: true })
  })

  it('rejects missing gameId', async () => {
    const req = makeRequest(BASE_URL, 'POST', { sport: 'nba' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('gameId')
  })

  it('rejects non-string gameId', async () => {
    const req = makeRequest(BASE_URL, 'POST', { gameId: 123, sport: 'nba' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects missing sport', async () => {
    const req = makeRequest(BASE_URL, 'POST', { gameId: 'game-abc' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('rejects invalid sport', async () => {
    const req = makeRequest(BASE_URL, 'POST', { gameId: 'game-abc', sport: 'soccer' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('rejects invalid JSON body', async () => {
    const req = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid JSON')
  })

  it('returns 400 when game is not found', async () => {
    mockGetOddsForSport.mockResolvedValue({ games: [], fromCache: true })
    const req = makeRequest(BASE_URL, 'POST', { gameId: 'nonexistent', sport: 'nba' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('not found')
  })

  it('accepts all valid sports', async () => {
    for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) {
      const game = { ...fakeGame, id: `game-${sport}`, sport }
      mockGetOddsForSport.mockResolvedValueOnce({ games: [game], fromCache: true })
      mockAnalyzeGame.mockResolvedValueOnce({ summary: 'test' })

      const req = makeRequest(BASE_URL, 'POST', { gameId: `game-${sport}`, sport })
      const res = await POST(req)
      // Should not be 400 — validation passes
      expect(res.status).not.toBe(400)
    }
  })
})

describe('POST /api/analysis — limit handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockGetOddsForSport.mockResolvedValue({ games: [fakeGame], fromCache: true })
  })

  it('returns 429 with used/limit when analysis limit hit', async () => {
    mockAnalyzeGame.mockRejectedValue(new MockAnalysisLimitError(3, 3))

    const req = makeRequest(BASE_URL, 'POST', { gameId: 'game-abc', sport: 'nba' })
    const res = await POST(req)
    expect(res.status).toBe(429)

    const body = await res.json()
    expect(body.used).toBe(3)
    expect(body.limit).toBe(3)
    expect(body.error).toContain('limit')
  })

  it('returns analysis result on success', async () => {
    const fakeAnalysis = {
      summary: 'Lakers favored',
      key_factors: ['Home court'],
      value_assessment: { side: 'home', edge: 2.5 },
      risk_level: 'medium',
      confidence: 0.72,
      disclaimer: 'For informational purposes only',
    }
    mockAnalyzeGame.mockResolvedValue(fakeAnalysis)

    const req = makeRequest(BASE_URL, 'POST', { gameId: 'game-abc', sport: 'nba' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.summary).toBe('Lakers favored')
    expect(body.disclaimer).toContain('informational')
  })
})

describe('POST /api/analysis — auth', () => {
  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const req = makeRequest(BASE_URL, 'POST', { gameId: 'game-abc', sport: 'nba' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/analysis — limit check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns limit info', async () => {
    mockCheckAnalysisLimit.mockResolvedValue({ used: 1, limit: 3, remaining: 2 })

    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.used).toBe(1)
    expect(body.limit).toBe(3)
    expect(body.remaining).toBe(2)
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(401)
  })
})
