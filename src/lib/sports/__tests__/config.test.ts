/**
 * Sports config tests.
 *
 * Covers:
 * - ODDS_API_SPORT_KEYS mapping completeness and values
 * - SUPPORTED_SPORTS array contents
 * - CACHE_TTL_MS durations and ordering
 * - Rate limit constants
 * - Normalized type compliance (structural checks)
 */

import { describe, it, expect } from 'vitest'
import {
  ODDS_API_SPORT_KEYS,
  SUPPORTED_SPORTS,
  CACHE_TTL_MS,
  ODDS_API_MONTHLY_LIMIT,
  ODDS_API_WARN_AT,
  isSport,
} from '@/lib/sports/config'
import type {
  NormalizedMoneyline,
  NormalizedSpread,
  NormalizedTotal,
  NormalizedBookmakerOdds,
  NormalizedGame,
  OddsResult,
  OddsApiOutcome,
  OddsApiMarket,
  OddsApiBookmaker,
  OddsApiGame,
} from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// ODDS_API_SPORT_KEYS
// ---------------------------------------------------------------------------

describe('ODDS_API_SPORT_KEYS', () => {
  it('maps all four supported sports', () => {
    expect(Object.keys(ODDS_API_SPORT_KEYS)).toHaveLength(4)
  })

  it('maps nfl to americanfootball_nfl', () => {
    expect(ODDS_API_SPORT_KEYS.nfl).toBe('americanfootball_nfl')
  })

  it('maps nba to basketball_nba', () => {
    expect(ODDS_API_SPORT_KEYS.nba).toBe('basketball_nba')
  })

  it('maps mlb to baseball_mlb', () => {
    expect(ODDS_API_SPORT_KEYS.mlb).toBe('baseball_mlb')
  })

  it('maps nhl to icehockey_nhl', () => {
    expect(ODDS_API_SPORT_KEYS.nhl).toBe('icehockey_nhl')
  })

  it('every key in SUPPORTED_SPORTS has a mapping', () => {
    for (const sport of SUPPORTED_SPORTS) {
      expect(ODDS_API_SPORT_KEYS[sport]).toBeDefined()
    }
  })

  it('all values are non-empty strings', () => {
    for (const val of Object.values(ODDS_API_SPORT_KEYS)) {
      expect(typeof val).toBe('string')
      expect(val.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// SUPPORTED_SPORTS
// ---------------------------------------------------------------------------

describe('SUPPORTED_SPORTS', () => {
  it('contains exactly 4 sports', () => {
    expect(SUPPORTED_SPORTS).toHaveLength(4)
  })

  it('includes nba', () => {
    expect(SUPPORTED_SPORTS).toContain('nba')
  })

  it('includes nfl', () => {
    expect(SUPPORTED_SPORTS).toContain('nfl')
  })

  it('includes mlb', () => {
    expect(SUPPORTED_SPORTS).toContain('mlb')
  })

  it('includes nhl', () => {
    expect(SUPPORTED_SPORTS).toContain('nhl')
  })

  it('has no duplicates', () => {
    const unique = new Set(SUPPORTED_SPORTS)
    expect(unique.size).toBe(SUPPORTED_SPORTS.length)
  })
})

// ---------------------------------------------------------------------------
// CACHE_TTL_MS
// ---------------------------------------------------------------------------

describe('CACHE_TTL_MS', () => {
  it('ODDS is 5 minutes in ms', () => {
    expect(CACHE_TTL_MS.ODDS).toBe(5 * 60 * 1000)
  })

  it('STATS is 1 hour in ms', () => {
    expect(CACHE_TTL_MS.STATS).toBe(60 * 60 * 1000)
  })

  it('HISTORICAL is 24 hours in ms', () => {
    expect(CACHE_TTL_MS.HISTORICAL).toBe(24 * 60 * 60 * 1000)
  })

  it('STANDINGS is 6 hours in ms', () => {
    expect(CACHE_TTL_MS.STANDINGS).toBe(6 * 60 * 60 * 1000)
  })

  it('ODDS < STATS < STANDINGS < HISTORICAL (refresh ordering)', () => {
    expect(CACHE_TTL_MS.ODDS).toBeLessThan(CACHE_TTL_MS.STATS)
    expect(CACHE_TTL_MS.STATS).toBeLessThan(CACHE_TTL_MS.STANDINGS)
    expect(CACHE_TTL_MS.STANDINGS).toBeLessThan(CACHE_TTL_MS.HISTORICAL)
  })

  it('all values are positive integers', () => {
    for (const val of Object.values(CACHE_TTL_MS)) {
      expect(val).toBeGreaterThan(0)
      expect(Number.isInteger(val)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

describe('Rate limit constants', () => {
  it('ODDS_API_MONTHLY_LIMIT is 500', () => {
    expect(ODDS_API_MONTHLY_LIMIT).toBe(500)
  })

  it('ODDS_API_WARN_AT is 80% of the monthly limit', () => {
    expect(ODDS_API_WARN_AT).toBe(Math.floor(ODDS_API_MONTHLY_LIMIT * 0.8))
  })

  it('ODDS_API_WARN_AT is 400', () => {
    expect(ODDS_API_WARN_AT).toBe(400)
  })

  it('warn threshold is less than the limit', () => {
    expect(ODDS_API_WARN_AT).toBeLessThan(ODDS_API_MONTHLY_LIMIT)
  })
})

// ---------------------------------------------------------------------------
// Normalized type compliance (structural assertions)
// ---------------------------------------------------------------------------

describe('NormalizedMoneyline type', () => {
  it('accepts full moneyline', () => {
    const ml: NormalizedMoneyline = { home: -150, away: 130, draw: null }
    expect(ml.home).toBe(-150)
    expect(ml.away).toBe(130)
    expect(ml.draw).toBeNull()
  })

  it('accepts all-null moneyline', () => {
    const ml: NormalizedMoneyline = { home: null, away: null, draw: null }
    expect(ml.home).toBeNull()
  })
})

describe('NormalizedSpread type', () => {
  it('accepts a spread', () => {
    const sp: NormalizedSpread = {
      homeLine: -3.5,
      homeOdds: -110,
      awayLine: 3.5,
      awayOdds: -110,
    }
    expect(sp.homeLine).toBe(-3.5)
    expect(sp.awayLine).toBe(3.5)
  })

  it('spread lines are symmetric', () => {
    const sp: NormalizedSpread = {
      homeLine: -7,
      homeOdds: -110,
      awayLine: 7,
      awayOdds: -110,
    }
    expect(sp.homeLine! + sp.awayLine!).toBe(0)
  })
})

describe('NormalizedTotal type', () => {
  it('accepts a total', () => {
    const tot: NormalizedTotal = {
      line: 220.5,
      overOdds: -110,
      underOdds: -110,
    }
    expect(tot.line).toBe(220.5)
  })
})

describe('NormalizedBookmakerOdds type', () => {
  it('accepts bookmaker odds with all markets', () => {
    const bm: NormalizedBookmakerOdds = {
      bookmaker: 'fanduel',
      moneyline: { home: -150, away: 130, draw: null },
      spread: { homeLine: -3.5, homeOdds: -110, awayLine: 3.5, awayOdds: -110 },
      total: { line: 220.5, overOdds: -110, underOdds: -110 },
      lastUpdated: '2026-03-14T12:00:00Z',
    }
    expect(bm.bookmaker).toBe('fanduel')
    expect(bm.moneyline).not.toBeNull()
    expect(bm.spread).not.toBeNull()
    expect(bm.total).not.toBeNull()
  })

  it('accepts bookmaker odds with null markets', () => {
    const bm: NormalizedBookmakerOdds = {
      bookmaker: 'draftkings',
      moneyline: null,
      spread: null,
      total: null,
      lastUpdated: '2026-03-14T12:00:00Z',
    }
    expect(bm.moneyline).toBeNull()
  })
})

describe('NormalizedGame type', () => {
  it('accepts a fully populated game', () => {
    const game: NormalizedGame = {
      id: 'game-abc123',
      sport: 'nba',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      commenceTime: '2026-03-14T19:30:00Z',
      fromCache: false,
      isFresh: true,
      bookmakers: [],
    }
    expect(game.id).toBe('game-abc123')
    expect(game.sport).toBe('nba')
    expect(game.fromCache).toBe(false)
    expect(game.isFresh).toBe(true)
  })

  it('accepts a cached game with cachedAt', () => {
    const game: NormalizedGame = {
      id: 'game-def456',
      sport: 'nfl',
      homeTeam: 'Chiefs',
      awayTeam: 'Eagles',
      commenceTime: '2026-03-14T20:00:00Z',
      fromCache: true,
      cachedAt: '2026-03-14T19:55:00Z',
      isFresh: false,
      bookmakers: [],
    }
    expect(game.fromCache).toBe(true)
    expect(game.cachedAt).toBeDefined()
    expect(game.isFresh).toBe(false)
  })
})

describe('OddsResult type', () => {
  it('accepts a result with usage warning', () => {
    const result: OddsResult = {
      games: [],
      apiUsageCount: 450,
      usageWarning: true,
      dataNotice: 'Serving cached data',
    }
    expect(result.usageWarning).toBe(true)
    expect(result.dataNotice).toBeDefined()
  })

  it('accepts a result without data notice', () => {
    const result: OddsResult = {
      games: [],
      apiUsageCount: 10,
      usageWarning: false,
    }
    expect(result.dataNotice).toBeUndefined()
  })

  it('usage warning should trigger at ODDS_API_WARN_AT', () => {
    const count = ODDS_API_WARN_AT
    const usageWarning = count >= ODDS_API_WARN_AT
    expect(usageWarning).toBe(true)
  })

  it('usage warning should not trigger below threshold', () => {
    const count = ODDS_API_WARN_AT - 1
    const usageWarning = count >= ODDS_API_WARN_AT
    expect(usageWarning).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

describe('OddsApiOutcome type', () => {
  it('accepts an outcome with point', () => {
    const o: OddsApiOutcome = { name: 'Over', price: -110, point: 220.5 }
    expect(o.point).toBe(220.5)
  })

  it('accepts an outcome without point', () => {
    const o: OddsApiOutcome = { name: 'Lakers', price: -150 }
    expect(o.point).toBeUndefined()
  })
})

describe('OddsApiMarket type', () => {
  it('accepts h2h market', () => {
    const m: OddsApiMarket = {
      key: 'h2h',
      last_update: '2026-03-14T12:00:00Z',
      outcomes: [{ name: 'Lakers', price: -150 }],
    }
    expect(m.key).toBe('h2h')
  })

  it('accepts spreads market', () => {
    const m: OddsApiMarket = {
      key: 'spreads',
      last_update: '2026-03-14T12:00:00Z',
      outcomes: [{ name: 'Lakers', price: -110, point: -3.5 }],
    }
    expect(m.key).toBe('spreads')
  })

  it('accepts totals market', () => {
    const m: OddsApiMarket = {
      key: 'totals',
      last_update: '2026-03-14T12:00:00Z',
      outcomes: [{ name: 'Over', price: -110, point: 220.5 }],
    }
    expect(m.key).toBe('totals')
  })
})

describe('OddsApiBookmaker type', () => {
  it('accepts a bookmaker with markets', () => {
    const bm: OddsApiBookmaker = {
      key: 'fanduel',
      title: 'FanDuel',
      last_update: '2026-03-14T12:00:00Z',
      markets: [
        {
          key: 'h2h',
          last_update: '2026-03-14T12:00:00Z',
          outcomes: [
            { name: 'Lakers', price: -150 },
            { name: 'Celtics', price: 130 },
          ],
        },
      ],
    }
    expect(bm.key).toBe('fanduel')
    expect(bm.markets).toHaveLength(1)
  })
})

describe('OddsApiGame type', () => {
  it('accepts a full raw game', () => {
    const game: OddsApiGame = {
      id: 'raw-game-123',
      sport_key: 'basketball_nba',
      sport_title: 'NBA',
      commence_time: '2026-03-14T19:30:00Z',
      home_team: 'Los Angeles Lakers',
      away_team: 'Boston Celtics',
      bookmakers: [],
    }
    expect(game.id).toBe('raw-game-123')
    expect(game.sport_key).toBe('basketball_nba')
  })
})

// ---------------------------------------------------------------------------
// isSport type guard
// ---------------------------------------------------------------------------

describe('isSport', () => {
  it('returns true for nba', () => {
    expect(isSport('nba')).toBe(true)
  })

  it('returns true for nfl', () => {
    expect(isSport('nfl')).toBe(true)
  })

  it('returns true for mlb', () => {
    expect(isSport('mlb')).toBe(true)
  })

  it('returns true for nhl', () => {
    expect(isSport('nhl')).toBe(true)
  })

  it('returns false for invalid sport', () => {
    expect(isSport('soccer')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSport('')).toBe(false)
  })

  it('returns false for uppercase', () => {
    expect(isSport('NBA')).toBe(false)
  })

  it('returns false for partial match', () => {
    expect(isSport('nb')).toBe(false)
  })
})
