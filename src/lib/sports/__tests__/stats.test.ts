import { describe, it, expect } from 'vitest'
import {
  isSupportedSport,
  UNSUPPORTED_SPORT_NOTE,
} from '@/lib/sports/stats'
import type {
  NBAGame,
  NBATeam,
  NBAPlayer,
  NBASeasonAverages,
  StatsResult,
} from '@/lib/sports/stats'

describe('isSupportedSport', () => {
  it('returns true for NBA', () => {
    expect(isSupportedSport('nba')).toBe(true)
  })

  it('returns false for NFL, MLB, NHL', () => {
    expect(isSupportedSport('nfl')).toBe(false)
    expect(isSupportedSport('mlb')).toBe(false)
    expect(isSupportedSport('nhl')).toBe(false)
  })

  it('returns false for unknown sports', () => {
    expect(isSupportedSport('soccer')).toBe(false)
    expect(isSupportedSport('')).toBe(false)
  })
})

describe('UNSUPPORTED_SPORT_NOTE', () => {
  it('mentions balldontlie and NBA', () => {
    expect(UNSUPPORTED_SPORT_NOTE).toContain('balldontlie')
    expect(UNSUPPORTED_SPORT_NOTE).toContain('NBA')
  })

  it('mentions unsupported sports', () => {
    expect(UNSUPPORTED_SPORT_NOTE).toContain('NFL')
    expect(UNSUPPORTED_SPORT_NOTE).toContain('MLB')
    expect(UNSUPPORTED_SPORT_NOTE).toContain('NHL')
  })
})

describe('NBATeam type compliance', () => {
  it('a well-formed team has all fields', () => {
    const team: NBATeam = {
      id: 14,
      name: 'Lakers',
      fullName: 'Los Angeles Lakers',
      abbreviation: 'LAL',
      city: 'Los Angeles',
      conference: 'West',
      division: 'Pacific',
    }
    expect(team.id).toBe(14)
    expect(team.fullName).toBe('Los Angeles Lakers')
    expect(team.conference).toBe('West')
  })
})

describe('NBAGame type compliance', () => {
  const makeTeam = (name: string): NBATeam => ({
    id: 1,
    name,
    fullName: `${name} Team`,
    abbreviation: name.slice(0, 3).toUpperCase(),
    city: 'Test City',
    conference: 'East',
    division: 'Atlantic',
  })

  it('a well-formed game has all required fields', () => {
    const game: NBAGame = {
      id: '12345',
      date: '2026-03-14',
      status: 'Final',
      period: 4,
      time: '',
      homeTeam: makeTeam('Lakers'),
      awayTeam: makeTeam('Celtics'),
      homeTeamScore: 110,
      awayTeamScore: 105,
      season: 2025,
      postseason: false,
    }
    expect(game.id).toBe('12345')
    expect(game.homeTeam.name).toBe('Lakers')
    expect(game.awayTeam.name).toBe('Celtics')
    expect(game.homeTeamScore).toBeGreaterThan(game.awayTeamScore)
  })

  it('game id is a string (converted from balldontlie integer)', () => {
    const game: NBAGame = {
      id: String(99999),
      date: '2026-01-01',
      status: 'Scheduled',
      period: 0,
      time: '',
      homeTeam: makeTeam('Home'),
      awayTeam: makeTeam('Away'),
      homeTeamScore: 0,
      awayTeamScore: 0,
      season: 2025,
      postseason: false,
    }
    expect(typeof game.id).toBe('string')
  })
})

describe('NBAPlayer type compliance', () => {
  it('player with full data', () => {
    const player: NBAPlayer = {
      id: 237,
      firstName: 'LeBron',
      lastName: 'James',
      position: 'F',
      heightFeet: 6,
      heightInches: 9,
      weightPounds: 250,
      jerseyNumber: '23',
      college: 'None',
      country: 'USA',
      draftYear: 2003,
      draftRound: 1,
      draftNumber: 1,
      team: {
        id: 14,
        name: 'Lakers',
        fullName: 'Los Angeles Lakers',
        abbreviation: 'LAL',
        city: 'Los Angeles',
        conference: 'West',
        division: 'Pacific',
      },
    }
    expect(player.firstName).toBe('LeBron')
    expect(player.team?.name).toBe('Lakers')
  })

  it('player with nullable fields', () => {
    const player: NBAPlayer = {
      id: 1,
      firstName: 'Test',
      lastName: 'Player',
      position: 'G',
      heightFeet: null,
      heightInches: null,
      weightPounds: null,
      jerseyNumber: null,
      college: null,
      country: null,
      draftYear: null,
      draftRound: null,
      draftNumber: null,
      team: null,
    }
    expect(player.team).toBeNull()
    expect(player.heightFeet).toBeNull()
  })
})

describe('StatsResult type compliance', () => {
  it('result from cache', () => {
    const result: StatsResult<NBAGame[]> = {
      data: [],
      fromCache: true,
      cachedAt: '2026-03-14T00:00:00Z',
      expiresAt: '2026-03-14T01:00:00Z',
    }
    expect(result.fromCache).toBe(true)
    expect(result.cachedAt).toBeTruthy()
  })

  it('result from live API', () => {
    const result: StatsResult<NBAGame[]> = {
      data: [],
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
    }
    expect(result.fromCache).toBe(false)
    expect(result.cachedAt).toBeNull()
  })

  it('result with warning', () => {
    const result: StatsResult<NBAGame[]> = {
      data: [],
      fromCache: true,
      cachedAt: '2026-03-14T00:00:00Z',
      expiresAt: '2026-03-13T00:00:00Z',
      warning: 'Data may be outdated',
    }
    expect(result.warning).toContain('outdated')
  })

  it('result with note for unsupported sport', () => {
    const result: StatsResult<NBAGame[]> = {
      data: [],
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
      note: UNSUPPORTED_SPORT_NOTE,
    }
    expect(result.note).toContain('balldontlie')
  })
})

describe('StatsResult envelope contract', () => {
  it('live result has fromCache=false and null timestamps', () => {
    const result: StatsResult<string[]> = {
      data: ['test'],
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
    }
    expect(result.fromCache).toBe(false)
    expect(result.cachedAt).toBeNull()
    expect(result.expiresAt).toBeNull()
    expect(result.warning).toBeUndefined()
    expect(result.note).toBeUndefined()
  })

  it('cached result has fromCache=true with timestamps', () => {
    const result: StatsResult<number[]> = {
      data: [1, 2, 3],
      fromCache: true,
      cachedAt: '2026-03-15T00:00:00Z',
      expiresAt: '2026-03-15T01:00:00Z',
    }
    expect(result.fromCache).toBe(true)
    expect(result.cachedAt).toBeTruthy()
    expect(result.expiresAt).toBeTruthy()
    expect(new Date(result.expiresAt!).getTime()).toBeGreaterThan(
      new Date(result.cachedAt!).getTime()
    )
  })

  it('can carry both warning and note simultaneously', () => {
    const result: StatsResult<null> = {
      data: null,
      fromCache: true,
      cachedAt: '2026-03-15T00:00:00Z',
      expiresAt: '2026-03-14T00:00:00Z',
      warning: 'Stale data',
      note: UNSUPPORTED_SPORT_NOTE,
    }
    expect(result.warning).toBeTruthy()
    expect(result.note).toBeTruthy()
  })
})

describe('NBASeasonAverages type compliance', () => {
  it('season averages have all stat fields', () => {
    const avg: NBASeasonAverages = {
      playerId: 237,
      season: 2025,
      gamesPlayed: 55,
      min: '35:12',
      pts: 25.7,
      reb: 7.3,
      ast: 8.1,
      stl: 1.2,
      blk: 0.6,
      fgm: 9.5,
      fga: 19.2,
      fg3m: 2.1,
      fg3a: 5.8,
      ftm: 5.1,
      fta: 6.7,
      oreb: 0.9,
      dreb: 6.4,
      turnover: 3.5,
      pf: 1.1,
      fgPct: 0.495,
      fg3Pct: 0.362,
      ftPct: 0.761,
    }
    expect(avg.pts).toBeGreaterThan(0)
    expect(avg.fgPct).toBeLessThan(1)
    expect(avg.season).toBe(2025)
  })
})
