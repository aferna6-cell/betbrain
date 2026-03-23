import { describe, it, expect } from 'vitest'
import { detectSituationalSpots, type ScheduleGame } from '../situational-spots'

function makeGame(overrides: Partial<ScheduleGame> = {}): ScheduleGame {
  return {
    gameId: 'g1',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    date: '2026-03-23',
    sport: 'nba',
    ...overrides,
  }
}

describe('situational-spots', () => {
  it('returns empty for no games', () => {
    const result = detectSituationalSpots([], [])
    expect(result.spots).toHaveLength(0)
    expect(result.gamesAnalyzed).toBe(0)
  })

  it('detects back-to-back for home team', () => {
    const today = makeGame({ date: '2026-03-23' })
    const yesterday = makeGame({
      gameId: 'g-prev',
      homeTeam: 'Lakers',
      awayTeam: 'Warriors',
      date: '2026-03-22',
    })
    const result = detectSituationalSpots([today], [today, yesterday])
    const b2b = result.spots.filter((s) => s.spotType === 'back_to_back')
    expect(b2b.length).toBeGreaterThan(0)
    expect(b2b[0].edgeSide).toBe('away')
    expect(b2b[0].edgeTeam).toBe('Celtics')
  })

  it('detects back-to-back for away team (stronger signal)', () => {
    const today = makeGame({ date: '2026-03-23' })
    const yesterday = makeGame({
      gameId: 'g-prev',
      homeTeam: 'Bulls',
      awayTeam: 'Celtics',
      date: '2026-03-22',
    })
    const result = detectSituationalSpots([today], [today, yesterday])
    const b2b = result.spots.filter((s) => s.spotType === 'back_to_back')
    expect(b2b.length).toBeGreaterThan(0)
    expect(b2b[0].edgeSide).toBe('home')
    expect(b2b[0].edgeTeam).toBe('Lakers')
    expect(b2b[0].impact).toBe(4) // Away B2B is higher impact
  })

  it('detects both teams on back-to-back', () => {
    const today = makeGame({ date: '2026-03-23' })
    const yesterdayHome = makeGame({
      gameId: 'g-prev1',
      homeTeam: 'Lakers',
      awayTeam: 'Suns',
      date: '2026-03-22',
    })
    const yesterdayAway = makeGame({
      gameId: 'g-prev2',
      homeTeam: 'Nets',
      awayTeam: 'Celtics',
      date: '2026-03-22',
    })
    const result = detectSituationalSpots([today], [today, yesterdayHome, yesterdayAway])
    const b2b = result.spots.filter((s) => s.spotType === 'back_to_back')
    expect(b2b.length).toBe(1) // Both on B2B = single spot
    expect(b2b[0].impact).toBe(2) // Lower impact when both tired
  })

  it('detects rest advantage (3+ days difference)', () => {
    const today = makeGame({ date: '2026-03-23' })
    // Home team played 5 days ago
    const homeRecent = makeGame({
      gameId: 'g-prev1',
      homeTeam: 'Lakers',
      awayTeam: 'Suns',
      date: '2026-03-18',
    })
    // Away team played yesterday
    const awayRecent = makeGame({
      gameId: 'g-prev2',
      homeTeam: 'Nets',
      awayTeam: 'Celtics',
      date: '2026-03-22',
    })
    const result = detectSituationalSpots([today], [today, homeRecent, awayRecent])
    const restSpots = result.spots.filter((s) => s.spotType === 'rest_advantage')
    expect(restSpots.length).toBeGreaterThan(0)
    expect(restSpots[0].edgeSide).toBe('home')
    expect(restSpots[0].edgeTeam).toBe('Lakers')
  })

  it('detects 3-in-4 nights', () => {
    const today = makeGame({ date: '2026-03-23' })
    // Away team played 3 of last 4 nights
    const games = [
      today,
      makeGame({ gameId: 'p1', homeTeam: 'Nets', awayTeam: 'Celtics', date: '2026-03-22' }),
      makeGame({ gameId: 'p2', homeTeam: 'Knicks', awayTeam: 'Celtics', date: '2026-03-21' }),
      makeGame({ gameId: 'p3', homeTeam: '76ers', awayTeam: 'Celtics', date: '2026-03-20' }),
    ]
    const result = detectSituationalSpots([today], games)
    const spot = result.spots.find((s) => s.spotType === 'three_in_four')
    expect(spot).toBeDefined()
    expect(spot!.edgeSide).toBe('home')
    expect(spot!.impact).toBe(5) // Road team 3-in-4 is highest impact
  })

  it('detects long road trip (4+ consecutive away games)', () => {
    const today = makeGame({ date: '2026-03-23' })
    const roadGames = [
      makeGame({ gameId: 'r1', homeTeam: 'Nets', awayTeam: 'Celtics', date: '2026-03-22' }),
      makeGame({ gameId: 'r2', homeTeam: 'Knicks', awayTeam: 'Celtics', date: '2026-03-20' }),
      makeGame({ gameId: 'r3', homeTeam: '76ers', awayTeam: 'Celtics', date: '2026-03-18' }),
      makeGame({ gameId: 'r4', homeTeam: 'Wizards', awayTeam: 'Celtics', date: '2026-03-16' }),
    ]
    const result = detectSituationalSpots([today], [today, ...roadGames])
    const trip = result.spots.find((s) => s.spotType === 'long_road_trip')
    expect(trip).toBeDefined()
    expect(trip!.edgeSide).toBe('home')
  })

  it('detects home stand advantage', () => {
    const today = makeGame({ date: '2026-03-23' })
    const homeGames = [
      makeGame({ gameId: 'h1', homeTeam: 'Lakers', awayTeam: 'Suns', date: '2026-03-22' }),
      makeGame({ gameId: 'h2', homeTeam: 'Lakers', awayTeam: 'Warriors', date: '2026-03-20' }),
      makeGame({ gameId: 'h3', homeTeam: 'Lakers', awayTeam: 'Clippers', date: '2026-03-18' }),
      makeGame({ gameId: 'h4', homeTeam: 'Lakers', awayTeam: 'Kings', date: '2026-03-16' }),
    ]
    const result = detectSituationalSpots([today], [today, ...homeGames])
    const stand = result.spots.find((s) => s.spotType === 'home_stand')
    expect(stand).toBeDefined()
    expect(stand!.edgeSide).toBe('home')
    expect(stand!.edgeTeam).toBe('Lakers')
  })

  it('does not detect B2B for NFL or MLB', () => {
    const nflGame = makeGame({ sport: 'nfl', date: '2026-03-23' })
    const yesterday = makeGame({
      gameId: 'p1',
      sport: 'nfl',
      homeTeam: 'Lakers',
      awayTeam: 'Warriors',
      date: '2026-03-22',
    })
    const result = detectSituationalSpots([nflGame], [nflGame, yesterday])
    const b2b = result.spots.filter((s) => s.spotType === 'back_to_back')
    expect(b2b).toHaveLength(0)
  })

  it('sorts by impact descending', () => {
    const today = makeGame({ date: '2026-03-23' })
    const games = [
      today,
      makeGame({ gameId: 'p1', homeTeam: 'Lakers', awayTeam: 'Suns', date: '2026-03-22' }),
      makeGame({ gameId: 'p2', homeTeam: 'Nets', awayTeam: 'Celtics', date: '2026-03-22' }),
      makeGame({ gameId: 'p3', homeTeam: 'Knicks', awayTeam: 'Celtics', date: '2026-03-21' }),
      makeGame({ gameId: 'p4', homeTeam: '76ers', awayTeam: 'Celtics', date: '2026-03-20' }),
    ]
    const result = detectSituationalSpots([today], games)
    for (let i = 1; i < result.spots.length; i++) {
      expect(result.spots[i - 1].impact).toBeGreaterThanOrEqual(result.spots[i].impact)
    }
  })

  it('includes descriptive text and historical edge', () => {
    const today = makeGame({ date: '2026-03-23' })
    const yesterday = makeGame({
      gameId: 'g-prev',
      homeTeam: 'Lakers',
      awayTeam: 'Warriors',
      date: '2026-03-22',
    })
    const result = detectSituationalSpots([today], [today, yesterday])
    for (const spot of result.spots) {
      expect(spot.description.length).toBeGreaterThan(10)
      expect(spot.historicalEdge.length).toBeGreaterThan(10)
    }
  })
})
