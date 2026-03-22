/**
 * Stats API route tests.
 *
 * Tests type validation, unsupported sport handling, auth.
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

const mockGetNBAGames = vi.fn()
const mockGetNBATeams = vi.fn()

vi.mock('@/lib/sports/stats', () => ({
  getNBAGames: (...args: unknown[]) => mockGetNBAGames(...args),
  getNBATeams: (...args: unknown[]) => mockGetNBATeams(...args),
  isSupportedSport: (s: string) => s === 'nba',
  UNSUPPORTED_SPORT_NOTE: 'Only NBA stats available via balldontlie',
}))

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/stats'

// --- Tests ------------------------------------------------------------------

describe('GET /api/stats — type validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('rejects invalid type parameter', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?type=players`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('type')
  })

  it('defaults to games when no type specified', async () => {
    mockGetNBAGames.mockResolvedValue({ data: [] })
    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(200)
    expect(mockGetNBAGames).toHaveBeenCalled()
  })

  it('fetches teams when type=teams', async () => {
    mockGetNBATeams.mockResolvedValue({ data: [] })
    const res = await GET(makeGetRequest(`${BASE_URL}?type=teams`))
    expect(res.status).toBe(200)
    expect(mockGetNBATeams).toHaveBeenCalled()
  })

  it('returns note for unsupported sports', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?sport=nfl`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
    expect(body.note).toContain('NBA')
  })

  it('passes date parameter to getNBAGames', async () => {
    mockGetNBAGames.mockResolvedValue({ data: [] })
    await GET(makeGetRequest(`${BASE_URL}?date=2026-03-22`))
    expect(mockGetNBAGames).toHaveBeenCalledWith({ dates: ['2026-03-22'] })
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
