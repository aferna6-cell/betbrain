/**
 * Alerts API route tests.
 *
 * Tests POST validation, GET response shape, DELETE flow.
 * Supabase + alert lib functions are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeRequest,
  makeGetRequest,
  makeDeleteRequest,
} from '../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockGetUserAlerts = vi.fn()
const mockCreateAlert = vi.fn()
const mockDeleteAlert = vi.fn()

vi.mock('@/lib/alerts', () => ({
  getUserAlerts: (...args: unknown[]) => mockGetUserAlerts(...args),
  createAlert: (...args: unknown[]) => mockCreateAlert(...args),
  deleteAlert: (...args: unknown[]) => mockDeleteAlert(...args),
}))

const { GET, POST, DELETE: DELETE_HANDLER } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/alerts'

function validAlertBody(overrides: Record<string, unknown> = {}) {
  return {
    externalGameId: 'game-abc',
    sport: 'nba',
    team: 'Lakers',
    side: 'home',
    market: 'moneyline',
    condition: 'above',
    threshold: -110,
    ...overrides,
  }
}

// --- Tests ------------------------------------------------------------------

describe('GET /api/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns alerts with active/triggered counts', async () => {
    mockGetUserAlerts.mockResolvedValue([
      { id: '1', triggered: false },
      { id: '2', triggered: true },
      { id: '3', triggered: false },
    ])

    const req = makeGetRequest(BASE_URL)
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.alerts).toHaveLength(3)
    expect(body.active).toBe(2)
    expect(body.triggered).toBe(1)
  })

  it('returns empty state correctly', async () => {
    mockGetUserAlerts.mockResolvedValue([])
    const req = makeGetRequest(BASE_URL)
    const res = await GET(req)
    const body = await res.json()
    expect(body.alerts).toHaveLength(0)
    expect(body.active).toBe(0)
    expect(body.triggered).toBe(0)
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const req = makeGetRequest(BASE_URL)
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/alerts — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockCreateAlert.mockResolvedValue({ id: 'alert-1' })
  })

  it('rejects missing externalGameId', async () => {
    const req = makeRequest(BASE_URL, 'POST', validAlertBody({ externalGameId: undefined }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('externalGameId')
  })

  it('rejects missing sport', async () => {
    const req = makeRequest(BASE_URL, 'POST', validAlertBody({ sport: undefined }))
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects missing team', async () => {
    const req = makeRequest(BASE_URL, 'POST', validAlertBody({ team: undefined }))
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects invalid side (must be home/away)', async () => {
    const req = makeRequest(BASE_URL, 'POST', validAlertBody({ side: 'neutral' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('side')
  })

  it('rejects invalid condition (must be above/below)', async () => {
    const req = makeRequest(BASE_URL, 'POST', validAlertBody({ condition: 'equals' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('condition')
  })

  it('rejects non-numeric threshold', async () => {
    const req = makeRequest(BASE_URL, 'POST', validAlertBody({ threshold: 'high' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('threshold')
  })

  it('rejects invalid market', async () => {
    const req = makeRequest(BASE_URL, 'POST', validAlertBody({ market: 'props' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('market')
  })

  it('accepts valid markets: moneyline, spreads, totals', async () => {
    for (const market of ['moneyline', 'spreads', 'totals']) {
      mockCreateAlert.mockResolvedValueOnce({ id: `alert-${market}` })
      const req = makeRequest(BASE_URL, 'POST', validAlertBody({ market }))
      const res = await POST(req)
      expect(res.status).toBe(201)
    }
  })

  it('rejects invalid JSON body', async () => {
    const req = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 201 with valid body', async () => {
    mockCreateAlert.mockResolvedValueOnce({ id: 'alert-new', triggered: false })
    const req = makeRequest(BASE_URL, 'POST', validAlertBody())
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 500 when createAlert fails', async () => {
    mockCreateAlert.mockResolvedValueOnce(null)
    const req = makeRequest(BASE_URL, 'POST', validAlertBody())
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/alerts — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('rejects missing id parameter', async () => {
    const req = makeDeleteRequest(BASE_URL)
    const res = await DELETE_HANDLER(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('id')
  })

  it('returns success when delete succeeds', async () => {
    mockDeleteAlert.mockResolvedValueOnce(true)
    const req = makeDeleteRequest(`${BASE_URL}?id=alert-1`)
    const res = await DELETE_HANDLER(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
  })

  it('returns 500 when delete fails', async () => {
    mockDeleteAlert.mockResolvedValueOnce(false)
    const req = makeDeleteRequest(`${BASE_URL}?id=alert-1`)
    const res = await DELETE_HANDLER(req)
    expect(res.status).toBe(500)
  })
})
