/**
 * Picks resolve API route tests.
 *
 * Tests POST (auto-resolve NBA picks) and GET (pending count check).
 * Uses custom mock chain (not shared helper) because this route uses
 * createServiceClient with complex await chains.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks -----------------------------------------------------------

const FAKE_USER = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}

const defaultResult = { data: [], error: null }

function makeResolveChain() {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.is = vi.fn(() => chain)
  chain.lt = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.single = vi.fn().mockResolvedValue(defaultResult)
  // Make then a vi.fn so we can use mockImplementationOnce
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResult))
  return chain
}

const chain = makeResolveChain()
const mockAuthClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    }),
  },
  from: chain.from,
}

const mockServiceClient = {
  from: chain.from,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockAuthClient),
  createServiceClient: vi.fn().mockResolvedValue(mockServiceClient),
}))

const mockGetNBAGames = vi.fn().mockResolvedValue({ data: [] })
vi.mock('@/lib/sports/stats', () => ({
  getNBAGames: (...args: unknown[]) => mockGetNBAGames(...args),
}))

const mockResolvePicksBatch = vi.fn().mockReturnValue({ resolved: [], skipped: [] })
const mockNbaGameToResult = vi.fn((g: unknown) => g)
const mockNormalizeTeamName = vi.fn((name: string) => name.toLowerCase().trim())
const mockResolveSignalOutcome = vi.fn().mockReturnValue('win')

vi.mock('@/lib/auto-resolve', () => ({
  resolvePicksBatch: (...args: Parameters<typeof mockResolvePicksBatch>) => mockResolvePicksBatch(...args),
  nbaGameToResult: (...args: Parameters<typeof mockNbaGameToResult>) => mockNbaGameToResult(...args),
  normalizeTeamName: (...args: Parameters<typeof mockNormalizeTeamName>) => mockNormalizeTeamName(...args),
  resolveSignalOutcome: (...args: unknown[]) => mockResolveSignalOutcome(...args),
}))

const { POST, GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/picks/resolve'

function makePostRequest(url: string = BASE_URL): Request {
  return new Request(url, { method: 'POST' })
}

function makeGetRequest(url: string = BASE_URL): Request {
  return new Request(url, { method: 'GET' })
}

function resetChain() {
  // Reset chain.then to default behavior
  ;(chain.then as ReturnType<typeof vi.fn>).mockImplementation(
    (resolve: (v: unknown) => void) => resolve(defaultResult)
  )
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/picks/resolve — auth', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const res = await POST(makePostRequest())
    expect(res.status).toBe(401)
  })
})

describe('POST /api/picks/resolve — no pending picks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetChain()
  })

  it('returns message when no pending NBA picks', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )

    const res = await POST(makePostRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toContain('No pending')
    expect(body.resolved).toEqual([])
  })
})

describe('POST /api/picks/resolve — with pending picks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetChain()
  })

  it('fetches game results and runs resolver when picks exist', async () => {
    const fakePicks = [
      {
        id: 'pick-1',
        external_game_id: 'game-1',
        sport: 'nba',
        pick_type: 'moneyline',
        pick_team: 'Lakers',
        pick_line: null,
        odds: -110,
        units: 1,
        game_date: '2026-03-20T00:00:00Z',
      },
    ]

    const fakeGameResult = {
      homeTeam: 'Los Angeles Lakers',
      awayTeam: 'Boston Celtics',
      homeScore: 110,
      awayScore: 105,
      date: '2026-03-20',
      status: 'Final',
    }

    // First await: pending picks query
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: fakePicks, error: null })
      )

    mockGetNBAGames.mockResolvedValueOnce({ data: [fakeGameResult] })
    mockNbaGameToResult.mockReturnValueOnce(fakeGameResult)

    mockResolvePicksBatch.mockReturnValueOnce({
      resolved: [{ pickId: 'pick-1', outcome: 'win', profit: 0.91 }],
      skipped: [],
    })

    // Subsequent awaits (update calls + signal query) return default
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )

    const res = await POST(makePostRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.resolved).toHaveLength(1)
    expect(body.resolved[0].pickId).toBe('pick-1')
    expect(body.resolved[0].outcome).toBe('win')
    expect(mockGetNBAGames).toHaveBeenCalled()
    expect(mockResolvePicksBatch).toHaveBeenCalled()
  })

  it('supports date filter via query param', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )

    const res = await POST(makePostRequest(`${BASE_URL}?date=2026-03-20`))
    expect(res.status).toBe(200)
    expect(chain.eq).toHaveBeenCalled()
  })

  it('returns 500 when Supabase query fails', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'DB error' } })
      )

    const res = await POST(makePostRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('pending picks')
  })

  it('skips all picks when no game results available', async () => {
    const fakePicks = [
      {
        id: 'pick-2',
        external_game_id: 'game-2',
        sport: 'nba',
        pick_type: 'moneyline',
        pick_team: 'Celtics',
        pick_line: null,
        odds: 150,
        units: 1,
        game_date: '2026-03-20T00:00:00Z',
      },
    ]

    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: fakePicks, error: null })
      )

    mockGetNBAGames.mockResolvedValueOnce({ data: [] })

    const res = await POST(makePostRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toContain('No NBA game results')
    expect(body.skipped).toHaveLength(1)
    expect(body.skipped[0].reason).toContain('no game results')
  })
})

describe('POST /api/picks/resolve — response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetChain()
  })

  it('response always has message, resolved, and skipped fields', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )

    const res = await POST(makePostRequest())
    const body = await res.json()
    expect(body).toHaveProperty('message')
    expect(body).toHaveProperty('resolved')
    expect(body).toHaveProperty('skipped')
  })
})

describe('GET /api/picks/resolve — pending count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetChain()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns pending count on success', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ count: 5, error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('pendingCount')
    expect(body).toHaveProperty('message')
  })

  it('returns 500 on database error', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ count: null, error: { message: 'DB down' } })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('pending picks')
  })

  it('returns 0 count when no pending picks', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ count: 0, error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pendingCount).toBe(0)
    expect(body.message).toContain('No pending')
  })
})
