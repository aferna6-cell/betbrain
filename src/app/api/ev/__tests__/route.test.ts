/**
 * EV Scanner API route tests.
 *
 * Tests response shape, auth, and meta calculation.
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
const mockScanForEV = vi.fn()
const mockDetectArbitrage = vi.fn()

vi.mock('@/lib/sports/odds', () => ({
  getAllOdds: (...args: unknown[]) => mockGetAllOdds(...args),
}))

vi.mock('@/lib/ev-scanner', () => ({
  scanForEV: (...args: unknown[]) => mockScanForEV(...args),
  detectArbitrage: (...args: unknown[]) => mockDetectArbitrage(...args),
}))

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/ev'

const fakeGame = {
  id: 'game-1',
  sport: 'nba',
  homeTeam: 'Lakers',
  awayTeam: 'Celtics',
  commenceTime: '2026-03-22T20:00:00Z',
  bookmakers: [],
}

// --- Tests ------------------------------------------------------------------

describe('GET /api/ev — response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns opportunities, arbitrage, and meta fields', async () => {
    mockGetAllOdds.mockResolvedValue(
      new Map([['nba', { games: [fakeGame], fromCache: true }]])
    )
    mockScanForEV.mockReturnValue({
      opportunities: [],
      gamesScanned: 1,
      totalBooks: 5,
    })
    mockDetectArbitrage.mockReturnValue([])

    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('opportunities')
    expect(body).toHaveProperty('arbitrage')
    expect(body).toHaveProperty('meta')
    expect(body.meta.gamesScanned).toBe(1)
    expect(body.meta.totalBooks).toBe(5)
    expect(body.meta.evCount).toBe(0)
    expect(body.meta.arbCount).toBe(0)
  })

  it('maps EV opportunities to serializable shape', async () => {
    mockGetAllOdds.mockResolvedValue(new Map([['nba', { games: [fakeGame] }]]))
    mockScanForEV.mockReturnValue({
      opportunities: [
        {
          game: fakeGame,
          market: 'moneyline',
          side: 'home',
          team: 'Lakers',
          bookmaker: 'FanDuel',
          bookOdds: -105,
          fairOdds: -110,
          ev: 2.3,
          fairProbability: 0.524,
          bookImplied: 0.512,
        },
      ],
      gamesScanned: 1,
      totalBooks: 6,
    })
    mockDetectArbitrage.mockReturnValue([])

    const res = await GET(makeGetRequest(BASE_URL))
    const body = await res.json()

    expect(body.opportunities).toHaveLength(1)
    const opp = body.opportunities[0]
    expect(opp.gameId).toBe('game-1')
    expect(opp.market).toBe('moneyline')
    expect(opp.bookmaker).toBe('FanDuel')
    expect(opp.ev).toBe(2.3)
    // Should NOT contain the full game object
    expect(opp.game).toBeUndefined()
  })

  it('maps arbitrage opportunities to serializable shape', async () => {
    mockGetAllOdds.mockResolvedValue(new Map([['nba', { games: [fakeGame] }]]))
    mockScanForEV.mockReturnValue({ opportunities: [], gamesScanned: 1, totalBooks: 4 })
    mockDetectArbitrage.mockReturnValue([
      {
        game: fakeGame,
        homeBest: { bookmaker: 'DraftKings', odds: 120 },
        awayBest: { bookmaker: 'FanDuel', odds: -105 },
        totalImplied: 0.99,
        profit: 1.01,
      },
    ])

    const res = await GET(makeGetRequest(BASE_URL))
    const body = await res.json()

    expect(body.arbitrage).toHaveLength(1)
    expect(body.arbitrage[0].gameId).toBe('game-1')
    expect(body.arbitrage[0].profit).toBe(1.01)
    expect(body.meta.arbCount).toBe(1)
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
