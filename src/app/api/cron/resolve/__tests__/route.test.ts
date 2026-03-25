/**
 * Cron resolve API route tests.
 *
 * Tests GET /api/cron/resolve:
 *   - CRON_SECRET header auth (401 when secret set and header wrong/missing)
 *   - Open access when CRON_SECRET not set
 *   - Nothing to resolve (empty picks + signals)
 *   - Picks DB error → 500
 *   - Pending picks resolved → correct count returned
 *   - Pending signals resolved → correct count returned
 *   - Signal skipped when value_side null, no matching game, or non-Final game
 *   - Unexpected error (createServiceClient throws) → 500
 *
 * Uses createServiceClient only (no user auth). Chain mock follows
 * picks/resolve test pattern: then is a vi.fn() sequenced with
 * mockImplementationOnce for picks query / signals query / update calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Module mocks -----------------------------------------------------------

const defaultResult = { data: [], error: null }

function makeCronChain() {
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
  // Make then a vi.fn so individual tests can use mockImplementationOnce
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResult))
  return chain
}

const chain = makeCronChain()
const mockServiceClient = { from: chain.from }

const mockCreateServiceClient = vi.fn().mockResolvedValue(mockServiceClient)

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: (...args: unknown[]) => mockCreateServiceClient(...args),
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
  resolvePicksBatch: (...args: Parameters<typeof mockResolvePicksBatch>) =>
    mockResolvePicksBatch(...args),
  nbaGameToResult: (...args: Parameters<typeof mockNbaGameToResult>) =>
    mockNbaGameToResult(...args),
  normalizeTeamName: (...args: Parameters<typeof mockNormalizeTeamName>) =>
    mockNormalizeTeamName(...args),
  resolveSignalOutcome: (...args: unknown[]) => mockResolveSignalOutcome(...args),
}))

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/cron/resolve'

function makeGetRequest(url: string = BASE_URL, authHeader?: string): Request {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new Request(url, { method: 'GET', headers })
}

/**
 * Restore chain.then to the default implementation after vi.clearAllMocks()
 * wipes the mock state.
 */
function resetChain() {
  ;(chain.then as ReturnType<typeof vi.fn>).mockImplementation(
    (resolve: (v: unknown) => void) => resolve(defaultResult)
  )
}

// --- Fixtures ---------------------------------------------------------------

const fakePick = {
  id: 'pick-1',
  external_game_id: 'game-abc',
  sport: 'nba',
  pick_type: 'moneyline',
  pick_team: 'Lakers',
  pick_line: null,
  odds: -110,
  units: 1,
  game_date: '2026-03-20T00:00:00Z',
}

const fakeGameResult = {
  homeTeam: 'Lakers',
  awayTeam: 'Celtics',
  homeScore: 110,
  awayScore: 105,
  date: '2026-03-20',
  status: 'Final',
}

const fakeSignal = {
  id: 'sig-1',
  external_game_id: 'game-abc',
  sport: 'nba',
  home_team: 'Lakers',
  away_team: 'Celtics',
  game_date: '2026-03-20T00:00:00Z',
  strength: 'strong',
  signal_count: 3,
  signals: ['line movement'],
  value_side: 'home',
  ai_confidence: 0.72,
  outcome: null,
  resolved_at: null,
  detected_at: '2026-03-19T12:00:00Z',
}

// --- CRON_SECRET auth -------------------------------------------------------

describe('GET /api/cron/resolve — CRON_SECRET auth', () => {
  const savedCronSecret = process.env.CRON_SECRET

  afterEach(() => {
    // Restore env
    if (savedCronSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = savedCronSecret
    }
    vi.clearAllMocks()
    resetChain()
    mockCreateServiceClient.mockResolvedValue(mockServiceClient)
  })

  it('returns 401 when CRON_SECRET is set and authorization header is missing', async () => {
    process.env.CRON_SECRET = 'super-secret'
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when CRON_SECRET is set and bearer token is wrong', async () => {
    process.env.CRON_SECRET = 'super-secret'
    const res = await GET(makeGetRequest(BASE_URL, 'Bearer wrong-token'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('passes through (200) when CRON_SECRET is set and header matches', async () => {
    process.env.CRON_SECRET = 'super-secret'
    // Both queries return empty → nothing to resolve
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
    const res = await GET(makeGetRequest(BASE_URL, 'Bearer super-secret'))
    expect(res.status).toBe(200)
  })

  it('passes through (200) when CRON_SECRET is not set (open endpoint)', async () => {
    delete process.env.CRON_SECRET
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
  })
})

// --- Nothing to resolve -----------------------------------------------------

describe('GET /api/cron/resolve — nothing to resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    mockCreateServiceClient.mockResolvedValue(mockServiceClient)
    resetChain()
  })

  it('returns 200 with "Nothing to resolve" when both queries return empty arrays', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Nothing to resolve')
    expect(body.picks).toBe(0)
    expect(body.signals).toBe(0)
  })

  it('returns 200 "Nothing to resolve" when both queries return null data', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Nothing to resolve')
  })

  it('does not call getNBAGames when there is nothing to resolve', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )

    await GET(makeGetRequest())
    expect(mockGetNBAGames).not.toHaveBeenCalled()
  })
})

// --- Picks DB error ---------------------------------------------------------

describe('GET /api/cron/resolve — picks DB error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    mockCreateServiceClient.mockResolvedValue(mockServiceClient)
    resetChain()
  })

  it('returns 500 when picks query returns an error', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      // picks query → error
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'DB connection failed' } })
      )
      // signals query → still fires, return null
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('fetch picks')
  })
})

// --- Picks resolved ---------------------------------------------------------

describe('GET /api/cron/resolve — picks resolved', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    mockCreateServiceClient.mockResolvedValue(mockServiceClient)
    resetChain()
    mockGetNBAGames.mockResolvedValue({ data: [fakeGameResult] })
    mockNbaGameToResult.mockImplementation((g: unknown) => g)
    mockResolvePicksBatch.mockReturnValue({
      resolved: [{ pickId: 'pick-1', outcome: 'win', profit: 0.91 }],
      skipped: [],
    })
  })

  it('resolves pending pick and returns picks count of 1', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      // picks query
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakePick], error: null })
      )
      // signals query
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      // pick update
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.picks).toBe(1)
    expect(body.signals).toBe(0)
    expect(body.message).toContain('1 picks')
  })

  it('calls resolvePicksBatch with picks and game results', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakePick], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )

    await GET(makeGetRequest())
    expect(mockResolvePicksBatch).toHaveBeenCalledWith([fakePick], [fakeGameResult])
  })

  it('calls nbaGameToResult for each game from getNBAGames', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakePick], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )

    await GET(makeGetRequest())
    expect(mockNbaGameToResult).toHaveBeenCalledWith(fakeGameResult)
  })

  it('returns picks = 0 when the update call itself errors', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakePick], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      // Update fails
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'Write failed' } })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.picks).toBe(0)
  })

  it('skips resolvePicksBatch when no game results are returned', async () => {
    mockGetNBAGames.mockResolvedValueOnce({ data: [] })

    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakePick], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    expect(mockResolvePicksBatch).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.picks).toBe(0)
  })
})

// --- Signals resolved -------------------------------------------------------

describe('GET /api/cron/resolve — signals resolved', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    mockCreateServiceClient.mockResolvedValue(mockServiceClient)
    resetChain()
    mockGetNBAGames.mockResolvedValue({ data: [fakeGameResult] })
    mockNbaGameToResult.mockImplementation((g: unknown) => g)
    // normalizeTeamName: lowercase+trim (mirrors real implementation)
    mockNormalizeTeamName.mockImplementation((name: string) => name.toLowerCase().trim())
    mockResolveSignalOutcome.mockReturnValue('win')
  })

  it('resolves pending signal and returns signals count of 1', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      // picks query (empty)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      // signals query
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakeSignal], error: null })
      )
      // signal update
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signals).toBe(1)
    expect(body.picks).toBe(0)
    expect(body.message).toContain('1 signals')
  })

  it('calls resolveSignalOutcome with the signal value_side and matched game', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakeSignal], error: null })
      )
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null })
      )

    await GET(makeGetRequest())
    expect(mockResolveSignalOutcome).toHaveBeenCalledWith('home', fakeGameResult)
  })

  it('skips signal when value_side is null', async () => {
    const signalNoSide = { ...fakeSignal, value_side: null }

    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [signalNoSide], error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signals).toBe(0)
    expect(mockResolveSignalOutcome).not.toHaveBeenCalled()
  })

  it('skips signal when no game matches (different teams)', async () => {
    const nonMatchingGame = {
      ...fakeGameResult,
      homeTeam: 'Warriors',
      awayTeam: 'Nuggets',
    }
    mockGetNBAGames.mockResolvedValueOnce({ data: [nonMatchingGame] })
    mockNbaGameToResult.mockReturnValueOnce(nonMatchingGame)

    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakeSignal], error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signals).toBe(0)
    expect(mockResolveSignalOutcome).not.toHaveBeenCalled()
  })

  it('skips signal when game status is not Final', async () => {
    const inProgressGame = { ...fakeGameResult, status: 'InProgress' }
    mockGetNBAGames.mockResolvedValueOnce({ data: [inProgressGame] })
    mockNbaGameToResult.mockReturnValueOnce(inProgressGame)

    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakeSignal], error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signals).toBe(0)
    expect(mockResolveSignalOutcome).not.toHaveBeenCalled()
  })

  it('counts only successfully-updated signals (no error in result)', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [fakeSignal], error: null })
      )
      // Signal update fails
      .mockImplementation((resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'Write failed' } })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signals).toBe(0)
  })
})

// --- Response shape ---------------------------------------------------------

describe('GET /api/cron/resolve — response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    mockCreateServiceClient.mockResolvedValue(mockServiceClient)
    resetChain()
  })

  it('always includes message, picks, and signals fields on success', async () => {
    ;(chain.then as ReturnType<typeof vi.fn>)
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )
      .mockImplementationOnce((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      )

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('message')
    expect(body).toHaveProperty('picks')
    expect(body).toHaveProperty('signals')
  })
})

// --- Unexpected error -------------------------------------------------------

describe('GET /api/cron/resolve — unexpected error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    resetChain()
  })

  afterEach(() => {
    mockCreateServiceClient.mockResolvedValue(mockServiceClient)
  })

  it('returns 500 when createServiceClient throws', async () => {
    mockCreateServiceClient.mockRejectedValueOnce(new Error('DB service unavailable'))

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Internal error')
  })
})
