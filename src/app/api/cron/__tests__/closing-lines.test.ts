/**
 * Cron closing-lines API route tests.
 *
 * Tests CRON_SECRET bearer token auth and closing line capture logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Module mocks -----------------------------------------------------------

function makeSupabaseMock(queryResult: { data: unknown; error: unknown } = { data: [], error: null }) {
  const updateResult = { data: null, error: null }
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.is = vi.fn(() => chain)
  chain.lte = vi.fn(() => chain)
  chain.gte = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.update = vi.fn(() => {
    // Return a new thenable for update calls
    return {
      eq: vi.fn().mockImplementation(() => ({
        then: (resolve: (v: unknown) => void) => resolve(updateResult),
      })),
    }
  })
  // Make the chain thenable for the select query
  chain.then = (resolve: (v: unknown) => void) => resolve(queryResult)
  return { from: chain.from, auth: { getUser: vi.fn() }, _chain: chain }
}

const mockCreateServiceClient = vi.fn()
const mockGetAllOdds = vi.fn()
const mockMatchClosingLines = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: (...args: unknown[]) => mockCreateServiceClient(...args),
}))

vi.mock('@/lib/sports/odds', () => ({
  getAllOdds: (...args: unknown[]) => mockGetAllOdds(...args),
}))

vi.mock('@/lib/closing-line-capture', () => ({
  matchClosingLines: (...args: unknown[]) => mockMatchClosingLines(...args),
}))

// --- Import route after mocks -----------------------------------------------

import { GET } from '../closing-lines/route'

// --- Helpers ----------------------------------------------------------------

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/cron/closing-lines', {
    headers: new Headers(headers),
  })
}

// --- Tests ------------------------------------------------------------------

describe('GET /api/cron/closing-lines', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    const defaultMock = makeSupabaseMock()
    mockCreateServiceClient.mockResolvedValue(defaultMock)
    mockGetAllOdds.mockResolvedValue(new Map())
    mockMatchClosingLines.mockReturnValue([])
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns 401 when CRON_SECRET is set but not provided', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when bearer token is wrong', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }))
    expect(res.status).toBe(401)
  })

  it('allows request when CRON_SECRET matches', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
  })

  it('allows request when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
  })

  it('returns captured=0 when no pending picks', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.captured).toBe(0)
    expect(body.message).toContain('No pending picks')
  })

  it('returns captured=0 when no cached odds available', async () => {
    delete process.env.CRON_SECRET

    const futureDate = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const picks = [
      {
        id: 'pick-1',
        external_game_id: 'game-1',
        sport: 'nba',
        pick_type: 'moneyline',
        pick_team: 'Lakers',
        odds: -110,
        closing_odds: null,
        game_date: futureDate,
      },
    ]
    mockCreateServiceClient.mockResolvedValue(
      makeSupabaseMock({ data: picks, error: null })
    )
    mockGetAllOdds.mockResolvedValue(new Map())

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.captured).toBe(0)
    expect(body.message).toContain('No cached odds')
  })

  it('captures closing lines when matches found', async () => {
    delete process.env.CRON_SECRET

    const futureDate = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const picks = [
      {
        id: 'pick-1',
        external_game_id: 'game-1',
        sport: 'nba',
        pick_type: 'moneyline',
        pick_team: 'Lakers',
        odds: -110,
        closing_odds: null,
        game_date: futureDate,
      },
    ]
    mockCreateServiceClient.mockResolvedValue(
      makeSupabaseMock({ data: picks, error: null })
    )

    const games = [
      {
        id: 'game-1',
        sport: 'nba',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Boston Celtics',
        commenceTime: futureDate,
        fromCache: true,
        isFresh: true,
        bookmakers: [],
      },
    ]
    const mockOddsMap = new Map()
    mockOddsMap.set('nba', { games, usage: 10, remaining: 490, fromCache: true })
    mockGetAllOdds.mockResolvedValue(mockOddsMap)

    mockMatchClosingLines.mockReturnValue([
      {
        pickId: 'pick-1',
        closingOdds: -115,
        bookmaker: 'fanduel',
        clv: 1.2,
      },
    ])

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.captured).toBe(1)
    expect(body.matched).toBe(1)
    expect(body.message).toContain('Captured closing lines for 1 picks')
  })

  it('calls matchClosingLines with correct arguments', async () => {
    delete process.env.CRON_SECRET

    const futureDate = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const picks = [
      {
        id: 'pick-2',
        external_game_id: 'game-2',
        sport: 'nfl',
        pick_type: 'spread',
        pick_team: 'Chiefs',
        odds: -110,
        closing_odds: null,
        game_date: futureDate,
      },
    ]
    mockCreateServiceClient.mockResolvedValue(
      makeSupabaseMock({ data: picks, error: null })
    )

    const games = [
      {
        id: 'game-2',
        sport: 'nfl',
        homeTeam: 'Kansas City Chiefs',
        awayTeam: 'Buffalo Bills',
        commenceTime: futureDate,
        fromCache: true,
        isFresh: true,
        bookmakers: [],
      },
    ]
    const mockOddsMap = new Map()
    mockOddsMap.set('nfl', { games, usage: 5, remaining: 495, fromCache: true })
    mockGetAllOdds.mockResolvedValue(mockOddsMap)

    mockMatchClosingLines.mockReturnValue([])

    await GET(makeRequest())

    expect(mockMatchClosingLines).toHaveBeenCalledWith(picks, games)
  })

  it('handles Supabase error when fetching picks', async () => {
    delete process.env.CRON_SECRET

    mockCreateServiceClient.mockResolvedValue(
      makeSupabaseMock({ data: null, error: { message: 'DB connection failed' } })
    )

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to fetch picks')
  })

  it('returns pending count and matched count in response', async () => {
    delete process.env.CRON_SECRET

    const futureDate = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const picks = [
      { id: 'p1', external_game_id: 'g1', sport: 'nba', pick_type: 'moneyline', pick_team: 'A', odds: -110, closing_odds: null, game_date: futureDate },
      { id: 'p2', external_game_id: 'g2', sport: 'nba', pick_type: 'moneyline', pick_team: 'B', odds: +150, closing_odds: null, game_date: futureDate },
    ]
    mockCreateServiceClient.mockResolvedValue(
      makeSupabaseMock({ data: picks, error: null })
    )

    const mockOddsMap = new Map()
    mockOddsMap.set('nba', {
      games: [{ id: 'g1', sport: 'nba', homeTeam: 'A', awayTeam: 'C', commenceTime: futureDate, fromCache: true, isFresh: true, bookmakers: [] }],
      usage: 5, remaining: 495, fromCache: true,
    })
    mockGetAllOdds.mockResolvedValue(mockOddsMap)

    // Only 1 of 2 picks matches
    mockMatchClosingLines.mockReturnValue([
      { pickId: 'p1', closingOdds: -115, bookmaker: 'fanduel', clv: 1.0 },
    ])

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.pending).toBe(2)
    expect(body.matched).toBe(1)
    expect(body.captured).toBe(1)
  })
})
