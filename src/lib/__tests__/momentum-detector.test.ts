import { describe, it, expect } from 'vitest'
import {
  detectStreak,
  calculateMomentumScore,
  classifyMomentum,
  detectMomentum,
  findStreakFadeOpportunities,
} from '../momentum-detector'
import type { NormalizedGame } from '@/lib/sports/config'

function makeGame(id: string, home: string, away: string, homeML = -150, awayML = 130): NormalizedGame {
  return {
    id,
    sport: 'nba' as const,
    homeTeam: home,
    awayTeam: away,
    commenceTime: '2026-03-25T20:00:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers: [{
      bookmaker: 'DraftKings',
      moneyline: { home: homeML, away: awayML, draw: null },
      spread: null,
      total: null,
      lastUpdated: '2026-03-25T00:00:00Z',
    }],
  }
}

describe('detectStreak', () => {
  it('detects winning streak', () => {
    expect(detectStreak(['W', 'W', 'W', 'L', 'W'])).toBe(3)
  })

  it('detects losing streak', () => {
    expect(detectStreak(['L', 'L', 'L', 'W'])).toBe(-3)
  })

  it('returns 0 for empty results', () => {
    expect(detectStreak([])).toBe(0)
  })

  it('handles single result', () => {
    expect(detectStreak(['W'])).toBe(1)
    expect(detectStreak(['L'])).toBe(-1)
  })

  it('handles all same results', () => {
    expect(detectStreak(['W', 'W', 'W', 'W', 'W'])).toBe(5)
    expect(detectStreak(['L', 'L', 'L', 'L'])).toBe(-4)
  })
})

describe('calculateMomentumScore', () => {
  it('returns 0 for empty results', () => {
    expect(calculateMomentumScore([])).toBe(0)
  })

  it('returns 100 for all wins', () => {
    expect(calculateMomentumScore(['W', 'W', 'W', 'W', 'W'])).toBe(100)
  })

  it('returns -100 for all losses', () => {
    expect(calculateMomentumScore(['L', 'L', 'L', 'L', 'L'])).toBe(-100)
  })

  it('weights recent results more heavily', () => {
    // Recent win, then losses — should be slightly positive
    const recentWin = calculateMomentumScore(['W', 'L', 'L', 'L'])
    const allLosses = calculateMomentumScore(['L', 'L', 'L', 'L'])
    expect(recentWin).toBeGreaterThan(allLosses)
  })

  it('mixed results near zero', () => {
    const mixed = calculateMomentumScore(['W', 'L', 'W', 'L', 'W', 'L'])
    expect(Math.abs(mixed)).toBeLessThan(30)
  })
})

describe('classifyMomentum', () => {
  it('classifies hot', () => expect(classifyMomentum(80)).toBe('hot'))
  it('classifies warm', () => expect(classifyMomentum(40)).toBe('warm'))
  it('classifies neutral', () => expect(classifyMomentum(0)).toBe('neutral'))
  it('classifies cool', () => expect(classifyMomentum(-40)).toBe('cool'))
  it('classifies cold', () => expect(classifyMomentum(-80)).toBe('cold'))
})

describe('detectMomentum', () => {
  it('returns empty for no teams', () => {
    const result = detectMomentum(new Map(), [])
    expect(result.teams).toEqual([])
  })

  it('filters out teams with < 3 results', () => {
    const teams = new Map([
      ['Lakers', { sport: 'nba', results: ['W', 'W'] as ('W' | 'L')[] }],
    ])
    const result = detectMomentum(teams, [])
    expect(result.teams).toHaveLength(0)
  })

  it('profiles teams with momentum', () => {
    const teams = new Map([
      ['Lakers', { sport: 'nba', results: ['W', 'W', 'W', 'W', 'W'] as ('W' | 'L')[] }],
      ['Celtics', { sport: 'nba', results: ['L', 'L', 'L', 'L'] as ('W' | 'L')[] }],
    ])
    const result = detectMomentum(teams, [])
    expect(result.teams).toHaveLength(2)
    expect(result.hotTeams.some(t => t.team === 'Lakers')).toBe(true)
    expect(result.coldTeams.some(t => t.team === 'Celtics')).toBe(true)
  })

  it('attaches next game info', () => {
    const teams = new Map([
      ['Lakers', { sport: 'nba', results: ['W', 'W', 'W'] as ('W' | 'L')[] }],
    ])
    const games = [makeGame('g1', 'Lakers', 'Warriors')]
    const result = detectMomentum(teams, games)
    const lakers = result.teams.find(t => t.team === 'Lakers')!
    expect(lakers.nextGame).toBeDefined()
    expect(lakers.nextGame!.opponent).toBe('Warriors')
    expect(lakers.nextGame!.isHome).toBe(true)
    expect(lakers.nextGame!.impliedWinProb).toBeGreaterThan(0)
  })

  it('identifies away team next game', () => {
    const teams = new Map([
      ['Warriors', { sport: 'nba', results: ['L', 'L', 'L'] as ('W' | 'L')[] }],
    ])
    const games = [makeGame('g1', 'Lakers', 'Warriors')]
    const result = detectMomentum(teams, games)
    const warriors = result.teams.find(t => t.team === 'Warriors')!
    expect(warriors.nextGame!.isHome).toBe(false)
    expect(warriors.nextGame!.opponent).toBe('Lakers')
  })

  it('sorts by absolute momentum score', () => {
    const teams = new Map([
      ['Neutral', { sport: 'nba', results: ['W', 'L', 'W'] as ('W' | 'L')[] }],
      ['Hot', { sport: 'nba', results: ['W', 'W', 'W', 'W', 'W'] as ('W' | 'L')[] }],
      ['Cold', { sport: 'nba', results: ['L', 'L', 'L', 'L', 'L'] as ('W' | 'L')[] }],
    ])
    const result = detectMomentum(teams, [])
    // Hot and Cold should be before Neutral (higher absolute score)
    expect(Math.abs(result.teams[0].momentumScore)).toBeGreaterThanOrEqual(
      Math.abs(result.teams[result.teams.length - 1].momentumScore)
    )
  })
})

describe('findStreakFadeOpportunities', () => {
  it('finds hot team that is underdog', () => {
    const teams = new Map([
      ['Hot', { sport: 'nba', results: ['W', 'W', 'W', 'W'] as ('W' | 'L')[] }],
    ])
    // Hot team is away underdog (+130)
    const games = [makeGame('g1', 'Opponent', 'Hot', -150, 130)]
    const result = detectMomentum(teams, games)
    const fades = findStreakFadeOpportunities(result)
    expect(fades.length).toBeGreaterThan(0)
  })

  it('finds cold team that is favored', () => {
    const teams = new Map([
      ['Cold', { sport: 'nba', results: ['L', 'L', 'L', 'L'] as ('W' | 'L')[] }],
    ])
    // Cold team is home favorite (-150)
    const games = [makeGame('g1', 'Cold', 'Opponent', -150, 130)]
    const result = detectMomentum(teams, games)
    const fades = findStreakFadeOpportunities(result)
    expect(fades.length).toBeGreaterThan(0)
  })

  it('ignores short streaks', () => {
    const teams = new Map([
      ['Short', { sport: 'nba', results: ['W', 'W', 'L', 'L', 'W'] as ('W' | 'L')[] }],
    ])
    const games = [makeGame('g1', 'Opponent', 'Short', -150, 130)]
    const result = detectMomentum(teams, games)
    const fades = findStreakFadeOpportunities(result)
    expect(fades).toHaveLength(0)
  })

  it('ignores teams without upcoming games', () => {
    const teams = new Map([
      ['NoGame', { sport: 'nba', results: ['W', 'W', 'W', 'W', 'W'] as ('W' | 'L')[] }],
    ])
    const result = detectMomentum(teams, [])
    const fades = findStreakFadeOpportunities(result)
    expect(fades).toHaveLength(0)
  })
})
