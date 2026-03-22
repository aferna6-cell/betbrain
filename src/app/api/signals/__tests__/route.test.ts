/**
 * Smart Signals API route tests.
 *
 * Tests response shape, strength counting, auth.
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

const mockGetAllOdds = vi.fn()
const mockDetectSmartSignals = vi.fn()

vi.mock('@/lib/sports/odds', () => ({
  getAllOdds: (...args: unknown[]) => mockGetAllOdds(...args),
}))

vi.mock('@/lib/signals', () => ({
  detectSmartSignals: (...args: unknown[]) => mockDetectSmartSignals(...args),
}))

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/signals'

// --- Tests ------------------------------------------------------------------

describe('GET /api/signals — response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns signals array with counts', async () => {
    mockGetAllOdds.mockResolvedValue(new Map())
    mockDetectSmartSignals.mockResolvedValue([])

    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('signals')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('strong')
    expect(body).toHaveProperty('moderate')
    expect(body.total).toBe(0)
    expect(body.strong).toBe(0)
    expect(body.moderate).toBe(0)
  })

  it('counts strong and moderate signals correctly', async () => {
    mockGetAllOdds.mockResolvedValue(new Map())
    mockDetectSmartSignals.mockResolvedValue([
      { id: '1', strength: 'strong' },
      { id: '2', strength: 'moderate' },
      { id: '3', strength: 'strong' },
      { id: '4', strength: 'moderate' },
      { id: '5', strength: 'strong' },
    ])

    const res = await GET(makeGetRequest(BASE_URL))
    const body = await res.json()

    expect(body.total).toBe(5)
    expect(body.strong).toBe(3)
    expect(body.moderate).toBe(2)
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
