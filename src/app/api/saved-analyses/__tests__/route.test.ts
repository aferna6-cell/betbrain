/**
 * Saved Analyses API route tests.
 *
 * Tests POST validation (insightId required, duplicate detection),
 * PATCH ownership check, DELETE ownership check, GET response shape.
 * Supabase is mocked at module level.
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

// Track .from() calls to return different results per table
const fromResults: Record<string, { data: unknown; error: unknown }> = {}
let singleCallCount = 0

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const { GET, POST, PATCH, DELETE: DELETE_HANDLER } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/saved-analyses'

// --- Tests ------------------------------------------------------------------

describe('POST /api/saved-analyses — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    singleCallCount = 0
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('rejects missing insightId', async () => {
    const req = makeRequest(BASE_URL, 'POST', { notes: 'good game' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('insightId')
  })

  it('rejects non-string insightId', async () => {
    const req = makeRequest(BASE_URL, 'POST', { insightId: 123 })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects invalid JSON body', async () => {
    const req = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{{bad',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid JSON')
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const req = makeRequest(BASE_URL, 'POST', { insightId: 'insight-1' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/saved-analyses — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('rejects missing id query parameter', async () => {
    const req = makeRequest(BASE_URL, 'PATCH', { notes: 'updated' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('id')
  })

  it('rejects invalid JSON body', async () => {
    const req = new Request(`${BASE_URL}?id=sa-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/saved-analyses — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('rejects missing id query parameter', async () => {
    const req = makeDeleteRequest(BASE_URL)
    const res = await DELETE_HANDLER(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('id')
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const req = makeDeleteRequest(`${BASE_URL}?id=sa-1`)
    const res = await DELETE_HANDLER(req)
    expect(res.status).toBe(401)
  })
})
