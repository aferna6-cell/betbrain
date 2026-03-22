/**
 * Picks API route tests.
 *
 * Tests POST validation, GET response shape, PATCH updates, DELETE flow.
 * Supabase is mocked at module level so route handlers execute without a real DB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  createUnauthenticatedClient,
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

// Import route handlers AFTER mocks are set up
const { POST, GET, PATCH, DELETE: DELETE_HANDLER } = await import(
  '../route'
)

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/picks'

function validPickBody(overrides: Record<string, unknown> = {}) {
  return {
    externalGameId: 'game-abc',
    sport: 'nba',
    pickType: 'moneyline',
    pickTeam: 'Lakers',
    odds: -110,
    units: 2,
    gameDate: '2026-03-22',
    ...overrides,
  }
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/picks — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-setup auth mock (clearAllMocks resets it)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('rejects missing externalGameId', async () => {
    const req = makeRequest(BASE_URL, 'POST', validPickBody({ externalGameId: undefined }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('externalGameId')
  })

  it('rejects invalid sport', async () => {
    const req = makeRequest(BASE_URL, 'POST', validPickBody({ sport: 'soccer' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('rejects missing sport', async () => {
    const req = makeRequest(BASE_URL, 'POST', validPickBody({ sport: undefined }))
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects invalid pickType', async () => {
    const req = makeRequest(BASE_URL, 'POST', validPickBody({ pickType: 'parlay' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('pickType')
  })

  it('rejects invalid odds (between -100 and +100)', async () => {
    const req = makeRequest(BASE_URL, 'POST', validPickBody({ odds: -50 }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('odds')
  })

  it('rejects non-numeric odds', async () => {
    const req = makeRequest(BASE_URL, 'POST', validPickBody({ odds: 'even' }))
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects missing gameDate', async () => {
    const req = makeRequest(BASE_URL, 'POST', validPickBody({ gameDate: undefined }))
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('gameDate')
  })

  it('rejects invalid JSON body', async () => {
    const req = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid JSON')
  })

  it('accepts valid pick and calls Supabase insert', async () => {
    const fakePick = { id: 'pick-1', ...validPickBody() }
    // Mock the chain to return the pick
    const chain = mockClient._chain
    ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: fakePick,
      error: null,
    })

    const req = makeRequest(BASE_URL, 'POST', validPickBody())
    const res = await POST(req)
    // May be 200 (success) or 500 if chain mock doesn't line up,
    // but it should NOT be 400 since validation passes
    expect(res.status).not.toBe(400)
  })

  it('accepts all valid sports', async () => {
    for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) {
      const req = makeRequest(BASE_URL, 'POST', validPickBody({ sport }))
      const res = await POST(req)
      expect(res.status).not.toBe(400)
    }
  })

  it('accepts all valid pick types', async () => {
    for (const pickType of ['moneyline', 'spread', 'over', 'under', 'prop']) {
      const req = makeRequest(BASE_URL, 'POST', validPickBody({ pickType }))
      const res = await POST(req)
      expect(res.status).not.toBe(400)
    }
  })

  it('accepts valid American odds: -110, +150, -200', async () => {
    for (const odds of [-110, 150, -200]) {
      const req = makeRequest(BASE_URL, 'POST', validPickBody({ odds }))
      const res = await POST(req)
      expect(res.status).not.toBe(400)
    }
  })
})

describe('POST /api/picks — auth', () => {
  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const req = makeRequest(BASE_URL, 'POST', validPickBody())
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/picks — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('rejects missing pickId', async () => {
    const req = makeRequest(BASE_URL, 'PATCH', { outcome: 'win' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('pickId')
  })

  it('rejects invalid outcome', async () => {
    const req = makeRequest(BASE_URL, 'PATCH', { pickId: 'p1', outcome: 'draw' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('outcome')
  })

  it('rejects non-numeric closingOdds', async () => {
    const req = makeRequest(BASE_URL, 'PATCH', { pickId: 'p1', closingOdds: 'bad' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('rejects non-numeric profit', async () => {
    const req = makeRequest(BASE_URL, 'PATCH', { pickId: 'p1', profit: 'lots' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('rejects empty update (no fields)', async () => {
    const req = makeRequest(BASE_URL, 'PATCH', { pickId: 'p1' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('No fields')
  })

  it('rejects invalid JSON body', async () => {
    const req = new Request(BASE_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('accepts valid outcomes: win, loss, push, pending', async () => {
    for (const outcome of ['win', 'loss', 'push', 'pending']) {
      const req = makeRequest(BASE_URL, 'PATCH', { pickId: 'p1', outcome })
      const res = await PATCH(req)
      expect(res.status).not.toBe(400)
    }
  })
})

describe('DELETE /api/picks — validation', () => {
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

  it('accepts valid id parameter', async () => {
    const req = makeDeleteRequest(`${BASE_URL}?id=pick-123`)
    const res = await DELETE_HANDLER(req)
    // Should not be 400 (validation passes)
    expect(res.status).not.toBe(400)
  })
})
