/**
 * Player prop odds API route tests.
 *
 * Tests parameter validation (gameId, sport, markets), auth enforcement,
 * and correct delegation to getPropOddsForGame.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeGetRequest,
} from '../../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockGetPropOddsForGame = vi.fn()
vi.mock('@/lib/sports/props', () => ({
  getPropOddsForGame: (...args: unknown[]) => mockGetPropOddsForGame(...args),
}))

vi.mock('@/lib/sports/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sports/config')>(
    '@/lib/sports/config'
  )
  return actual
})

const { GET } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/odds/props'

const FAKE_PROP_RESULT = {
  gameId: 'game-abc',
  sport: 'nba',
  homeTeam: 'Lakers',
  awayTeam: 'Celtics',
  commenceTime: '2026-03-25T00:00:00Z',
  props: [],
  fromCache: false,
  isFresh: true,
  apiUsageCount: 10,
  usageWarning: false,
}

// --- Tests ------------------------------------------------------------------

describe('GET /api/odds/props — parameter validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockGetPropOddsForGame.mockResolvedValue(FAKE_PROP_RESULT)
  })

  it('rejects request missing gameId', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?sport=nba`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('gameId')
  })

  it('rejects request missing sport', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('rejects invalid sport parameter', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc&sport=cricket`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('sport')
  })

  it('rejects sport with no configured prop markets (mlb)', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc&sport=mlb`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('No prop markets')
  })

  it('rejects sport with no configured prop markets (nhl)', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc&sport=nhl`))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('No prop markets')
  })

  it('accepts valid nba request', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc&sport=nba`))
    expect(res.status).toBe(200)
    expect(mockGetPropOddsForGame).toHaveBeenCalledWith('game-abc', 'nba', undefined)
  })

  it('accepts valid nfl request', async () => {
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc&sport=nfl`))
    expect(res.status).toBe(200)
    expect(mockGetPropOddsForGame).toHaveBeenCalledWith('game-abc', 'nfl', undefined)
  })
})

describe('GET /api/odds/props — markets param', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    mockGetPropOddsForGame.mockResolvedValue(FAKE_PROP_RESULT)
  })

  it('passes single market override to getPropOddsForGame', async () => {
    const url = `${BASE_URL}?gameId=game-abc&sport=nba&markets=player_points`
    const res = await GET(makeGetRequest(url))
    expect(res.status).toBe(200)
    expect(mockGetPropOddsForGame).toHaveBeenCalledWith(
      'game-abc',
      'nba',
      ['player_points']
    )
  })

  it('passes multiple markets override to getPropOddsForGame', async () => {
    const url = `${BASE_URL}?gameId=game-abc&sport=nba&markets=player_points,player_rebounds`
    const res = await GET(makeGetRequest(url))
    expect(res.status).toBe(200)
    expect(mockGetPropOddsForGame).toHaveBeenCalledWith(
      'game-abc',
      'nba',
      ['player_points', 'player_rebounds']
    )
  })

  it('rejects unknown market key', async () => {
    const url = `${BASE_URL}?gameId=game-abc&sport=nba&markets=player_touchdowns`
    const res = await GET(makeGetRequest(url))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('player_touchdowns')
  })

  it('rejects mixed valid and invalid market keys', async () => {
    const url = `${BASE_URL}?gameId=game-abc&sport=nba&markets=player_points,bad_market`
    const res = await GET(makeGetRequest(url))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('bad_market')
  })

  it('passes undefined markets when param is absent', async () => {
    const url = `${BASE_URL}?gameId=game-abc&sport=nba`
    await GET(makeGetRequest(url))
    expect(mockGetPropOddsForGame).toHaveBeenCalledWith('game-abc', 'nba', undefined)
  })
})

describe('GET /api/odds/props — response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns PropOddsResult from getPropOddsForGame', async () => {
    mockGetPropOddsForGame.mockResolvedValue(FAKE_PROP_RESULT)
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc&sport=nba`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.gameId).toBe('game-abc')
    expect(body.sport).toBe('nba')
    expect(body.homeTeam).toBe('Lakers')
    expect(body.props).toEqual([])
  })

  it('returns dataNotice from underlying result', async () => {
    mockGetPropOddsForGame.mockResolvedValue({
      ...FAKE_PROP_RESULT,
      dataNotice: 'Rate limit reached. Data may be outdated.',
    })
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc&sport=nba`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dataNotice).toContain('Rate limit')
  })
})

describe('GET /api/odds/props — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const res = await GET(makeGetRequest(`${BASE_URL}?gameId=game-abc&sport=nba`))
    expect(res.status).toBe(401)
  })
})
