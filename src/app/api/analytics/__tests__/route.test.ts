/**
 * Analytics API route tests.
 *
 * Tests auth and response passthrough.
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

const mockGetUserAnalytics = vi.fn()

vi.mock('@/lib/analytics', () => ({
  getUserAnalytics: (...args: unknown[]) => mockGetUserAnalytics(...args),
}))

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/analytics'

// --- Tests ------------------------------------------------------------------

describe('GET /api/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns analytics for authenticated user', async () => {
    const fakeAnalytics = {
      totalPicks: 50,
      winRate: 0.56,
      roi: 8.3,
      topSport: 'nba',
    }
    mockGetUserAnalytics.mockResolvedValue(fakeAnalytics)

    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.totalPicks).toBe(50)
    expect(body.roi).toBe(8.3)
  })

  it('passes user ID to getUserAnalytics', async () => {
    mockGetUserAnalytics.mockResolvedValue({})
    await GET(makeGetRequest(BASE_URL))
    expect(mockGetUserAnalytics).toHaveBeenCalledWith('user-123')
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
