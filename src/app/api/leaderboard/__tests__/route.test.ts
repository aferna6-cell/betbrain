/**
 * Leaderboard API route tests.
 *
 * Tests sort parameter validation, default sort, response shape.
 * Note: This is a public route (no auth) with edge runtime.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks -----------------------------------------------------------

const mockGetLeaderboard = vi.fn()

vi.mock('@/lib/leaderboard', () => ({
  getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
}))

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/leaderboard'

// --- Tests ------------------------------------------------------------------

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to ROI sort when no sort param', async () => {
    mockGetLeaderboard.mockReturnValue({ entries: [], total: 0 })
    await GET(new Request(BASE_URL))
    expect(mockGetLeaderboard).toHaveBeenCalledWith('roi')
  })

  it('accepts valid sort parameters', async () => {
    for (const sort of ['roi', 'profit', 'winRate', 'picks']) {
      mockGetLeaderboard.mockReturnValueOnce({ entries: [], total: 0 })
      await GET(new Request(`${BASE_URL}?sort=${sort}`))
      expect(mockGetLeaderboard).toHaveBeenCalledWith(sort)
    }
  })

  it('falls back to ROI for invalid sort parameter', async () => {
    mockGetLeaderboard.mockReturnValue({ entries: [], total: 0 })
    await GET(new Request(`${BASE_URL}?sort=invalid`))
    expect(mockGetLeaderboard).toHaveBeenCalledWith('roi')
  })

  it('returns leaderboard data as JSON', async () => {
    const fakeData = {
      entries: [{ userId: 'u1', wins: 10, roi: 5.5 }],
      total: 1,
    }
    mockGetLeaderboard.mockReturnValue(fakeData)

    const res = await GET(new Request(BASE_URL))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.entries).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it('returns 500 when getLeaderboard throws', async () => {
    mockGetLeaderboard.mockImplementation(() => {
      throw new Error('DB down')
    })

    const res = await GET(new Request(BASE_URL))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('leaderboard')
  })
})
