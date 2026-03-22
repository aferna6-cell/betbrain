/**
 * Odds API route tests.
 *
 * Tests sport validation, single-sport vs all-sports response, auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeGetRequest,
} from '../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockGetOddsForSport = vi.fn()
const mockGetAllOdds = vi.fn()

vi.mock('@/lib/sports/odds', () => ({
  getOddsForSport: (...args: unknown[]) => mockGetOddsForSport(...args),
  getAllOdds: (...args: unknown[]) => mockGetAllOdds(...args),
}))

vi.mock('@/lib/sports/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sports/config')>(
    '@/lib/sports/config'
  )
  return actual
})

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/odds'

// --- Tests ------------------------------------------------------------------

describe('GET /api/odds — sport filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns single sport data when sport param provided', async () => {
    const fakeResult = { games: [{ id: 'g1' }], fromCache: true }
    mockGetOddsForSport.mockResolvedValue(fakeResult)

    const res = await GET(makeGetRequest(`${BASE_URL}?sport=nba`))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.games).toHaveLength(1)
    expect(mockGetOddsForSport).toHaveBeenCalledWith('nba')
    expect(mockGetAllOdds).not.toHaveBeenCalled()
  })

  it('returns all sports when no sport param', async () => {
    mockGetAllOdds.mockResolvedValue(
      new Map([
        ['nba', { games: [{ id: 'g1' }] }],
        ['nfl', { games: [{ id: 'g2' }] }],
      ])
    )

    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(200)
    expect(mockGetAllOdds).toHaveBeenCalled()
    expect(mockGetOddsForSport).not.toHaveBeenCalled()
  })

  it('rejects invalid sport parameter', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?sport=cricket`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('accepts all valid sports', async () => {
    for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) {
      mockGetOddsForSport.mockResolvedValueOnce({ games: [], fromCache: false })
      const res = await GET(makeGetRequest(`${BASE_URL}?sport=${sport}`))
      expect(res.status).toBe(200)
    }
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
