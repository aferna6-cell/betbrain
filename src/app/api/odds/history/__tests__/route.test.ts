/**
 * Odds history API route tests.
 *
 * Tests gameId validation, market param, auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeGetRequest,
} from '../../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockGetOddsHistory = vi.fn()
vi.mock('@/lib/sports/odds', () => ({
  getOddsHistory: (...args: unknown[]) => mockGetOddsHistory(...args),
}))

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/odds/history'

// --- Tests ------------------------------------------------------------------

describe('GET /api/odds/history — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockGetOddsHistory.mockResolvedValue([])
  })

  it('rejects missing gameId', async () => {
    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('gameId')
  })

  it('returns snapshots for valid gameId', async () => {
    mockGetOddsHistory.mockResolvedValue([
      { timestamp: '2026-03-22T10:00:00Z', odds: -110 },
    ])
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-1`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.snapshots).toHaveLength(1)
  })

  it('defaults market to h2h when not specified', async () => {
    await GET(makeGetRequest(`${BASE_URL}?gameId=game-1`))
    expect(mockGetOddsHistory).toHaveBeenCalledWith('game-1', 'h2h')
  })

  it('passes custom market parameter', async () => {
    await GET(makeGetRequest(`${BASE_URL}?gameId=game-1&market=spreads`))
    expect(mockGetOddsHistory).toHaveBeenCalledWith('game-1', 'spreads')
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-1`))
    expect(res.status).toBe(401)
  })
})
