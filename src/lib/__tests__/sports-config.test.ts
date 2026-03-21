/**
 * Tests for sports configuration constants and helpers.
 */

import { describe, it, expect } from 'vitest'
import {
  ODDS_API_SPORT_KEYS,
  SUPPORTED_SPORTS,
  isSport,
  SPORT_LABELS,
  CACHE_TTL_MS,
  ODDS_API_MONTHLY_LIMIT,
  ODDS_API_WARN_AT,
} from '@/lib/sports/config'

describe('SUPPORTED_SPORTS', () => {
  it('includes all four major leagues', () => {
    expect(SUPPORTED_SPORTS).toContain('nba')
    expect(SUPPORTED_SPORTS).toContain('nfl')
    expect(SUPPORTED_SPORTS).toContain('mlb')
    expect(SUPPORTED_SPORTS).toContain('nhl')
    expect(SUPPORTED_SPORTS).toHaveLength(4)
  })
})

describe('isSport', () => {
  it('returns true for valid sports', () => {
    expect(isSport('nba')).toBe(true)
    expect(isSport('nfl')).toBe(true)
    expect(isSport('mlb')).toBe(true)
    expect(isSport('nhl')).toBe(true)
  })

  it('returns false for invalid sports', () => {
    expect(isSport('soccer')).toBe(false)
    expect(isSport('NBA')).toBe(false) // case-sensitive
    expect(isSport('')).toBe(false)
    expect(isSport('mma')).toBe(false)
  })
})

describe('ODDS_API_SPORT_KEYS', () => {
  it('maps each sport to The Odds API key', () => {
    expect(ODDS_API_SPORT_KEYS.nba).toBe('basketball_nba')
    expect(ODDS_API_SPORT_KEYS.nfl).toBe('americanfootball_nfl')
    expect(ODDS_API_SPORT_KEYS.mlb).toBe('baseball_mlb')
    expect(ODDS_API_SPORT_KEYS.nhl).toBe('icehockey_nhl')
  })
})

describe('SPORT_LABELS', () => {
  it('has uppercase labels for all sports', () => {
    expect(SPORT_LABELS.nba).toBe('NBA')
    expect(SPORT_LABELS.nfl).toBe('NFL')
    expect(SPORT_LABELS.mlb).toBe('MLB')
    expect(SPORT_LABELS.nhl).toBe('NHL')
  })
})

describe('CACHE_TTL_MS', () => {
  it('odds TTL is 5 minutes', () => {
    expect(CACHE_TTL_MS.ODDS).toBe(5 * 60 * 1000)
  })

  it('stats TTL is 1 hour', () => {
    expect(CACHE_TTL_MS.STATS).toBe(60 * 60 * 1000)
  })

  it('historical TTL is 24 hours', () => {
    expect(CACHE_TTL_MS.HISTORICAL).toBe(24 * 60 * 60 * 1000)
  })
})

describe('rate limit constants', () => {
  it('monthly limit is 500', () => {
    expect(ODDS_API_MONTHLY_LIMIT).toBe(500)
  })

  it('warning threshold is 80% of limit', () => {
    expect(ODDS_API_WARN_AT).toBe(400)
  })
})
