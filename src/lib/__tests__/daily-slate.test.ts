/**
 * Daily Slate unit tests.
 *
 * Tests verdict calculation, game interest scoring, sport breakdown,
 * and full slate building.
 */

import { describe, it, expect } from 'vitest'
import {
  getSlateVerdict,
  getVerdictLabel,
  getVerdictColor,
  scoreGameInterest,
  buildDailySlate,
} from '@/lib/daily-slate'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'
import type { EVOpportunity } from '@/lib/ev-scanner'
import type { GameScript, GameFlowType } from '@/lib/game-script'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBookmaker(name: string): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: -110, away: -110, draw: null },
    spread: { homeLine: -3.5, homeOdds: -110, awayLine: 3.5, awayOdds: -110 },
    total: { line: 220, overOdds: -110, underOdds: -110 },
    lastUpdated: '2026-03-24T08:00:00Z',
  }
}

function makeGame(id: string, sport: 'nba' | 'nfl' | 'mlb' | 'nhl', date: string = '2026-03-24'): NormalizedGame {
  return {
    id,
    sport,
    homeTeam: 'Home Team',
    awayTeam: 'Away Team',
    commenceTime: `${date}T20:00:00Z`,
    fromCache: true,
    isFresh: true,
    bookmakers: [makeBookmaker('DK'), makeBookmaker('FD'), makeBookmaker('MGM')],
  }
}

function makeEVOpp(gameId: string, sport: 'nba' | 'nfl' | 'mlb' | 'nhl', ev: number): EVOpportunity {
  return {
    game: makeGame(gameId, sport),
    market: 'moneyline',
    side: 'home',
    team: 'Home Team',
    bookmaker: 'DraftKings',
    bookOdds: -100,
    fairOdds: -110,
    ev,
    fairProbability: 0.52,
    bookImplied: 0.50,
  }
}

function makeScript(gameId: string, flow: GameFlowType, confidence: number): GameScript {
  return {
    game: makeGame(gameId, 'nba'),
    predictedFlow: flow,
    probabilities: { blowout: 0.2, comfortable: 0.3, close: 0.35, overtime: 0.15 },
    scoring: { expectedTotal: 220, tempo: 'medium', scoringEnv: 'Average' },
    spreadAnalysis: { consensusSpread: -3.5, spreadRange: 0.5, lopsided: false },
    narrative: 'Test narrative',
    confidence,
    factors: [],
  }
}

// ---------------------------------------------------------------------------
// 1. Verdict calculation
// ---------------------------------------------------------------------------

describe('getSlateVerdict', () => {
  it('empty for 0 games', () => {
    expect(getSlateVerdict(0, 0, 0)).toBe('empty')
  })

  it('loaded for 10+ games across 3+ sports', () => {
    expect(getSlateVerdict(12, 3, 5)).toBe('loaded')
  })

  it('solid for 6+ games', () => {
    expect(getSlateVerdict(7, 2, 1)).toBe('solid')
  })

  it('average for 3-5 games', () => {
    expect(getSlateVerdict(4, 1, 0)).toBe('average')
  })

  it('light for 1-2 games', () => {
    expect(getSlateVerdict(2, 1, 0)).toBe('light')
  })
})

describe('getVerdictLabel', () => {
  it('returns labels for all verdicts', () => {
    expect(getVerdictLabel('loaded')).toBe('Loaded Slate')
    expect(getVerdictLabel('empty')).toBe('No Games')
  })
})

describe('getVerdictColor', () => {
  it('loaded is green', () => {
    expect(getVerdictColor('loaded')).toContain('green')
  })

  it('empty is muted', () => {
    expect(getVerdictColor('empty')).toContain('muted')
  })
})

// ---------------------------------------------------------------------------
// 2. Game interest scoring
// ---------------------------------------------------------------------------

describe('scoreGameInterest', () => {
  it('game with EV opportunity scores higher', () => {
    const game = makeGame('g1', 'nba')
    const evOpp = makeEVOpp('g1', 'nba', 3.0)
    const { score: withEV } = scoreGameInterest(game, [evOpp], undefined)
    const { score: noEV } = scoreGameInterest(game, [], undefined)
    expect(withEV).toBeGreaterThan(noEV)
  })

  it('OT candidate adds to score', () => {
    const game = makeGame('g1', 'nba')
    const otScript = makeScript('g1', 'overtime_candidate', 70)
    const closeScript = makeScript('g1', 'close', 70)
    const { score: otScore } = scoreGameInterest(game, [], otScript)
    const { score: closeScore } = scoreGameInterest(game, [], closeScript)
    expect(otScore).toBeGreaterThan(closeScore)
  })

  it('generates reasons for each signal', () => {
    const game = makeGame('g1', 'nba')
    const evOpp = makeEVOpp('g1', 'nba', 2.5)
    const script = makeScript('g1', 'overtime_candidate', 75)
    const { reasons } = scoreGameInterest(game, [evOpp], script)
    expect(reasons.length).toBeGreaterThanOrEqual(2)
    expect(reasons.some(r => r.includes('EV'))).toBe(true)
    expect(reasons.some(r => r.includes('OT'))).toBe(true)
  })

  it('score is capped at 100', () => {
    const game = makeGame('g1', 'nba')
    // Pile on signals
    game.bookmakers = Array.from({ length: 6 }, (_, i) => makeBookmaker(`bk${i}`))
    const evOpps = [makeEVOpp('g1', 'nba', 10)]
    const script = { ...makeScript('g1', 'overtime_candidate', 95), spreadAnalysis: { consensusSpread: -3, spreadRange: 3, lopsided: false } }
    const { score } = scoreGameInterest(game, evOpps, script)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// 3. Full slate building
// ---------------------------------------------------------------------------

describe('buildDailySlate', () => {
  const date = '2026-03-24'

  it('builds slate with games from multiple sports', () => {
    const games = [
      makeGame('g1', 'nba', date),
      makeGame('g2', 'nba', date),
      makeGame('g3', 'nfl', date),
      makeGame('g4', 'mlb', date),
    ]
    const slate = buildDailySlate(games, [], [], date)

    expect(slate.totalGames).toBe(4)
    expect(slate.activeSports).toBe(3)
    expect(slate.sports).toHaveLength(3)
    expect(slate.verdict).toBe('average')
  })

  it('filters to specified date only', () => {
    const games = [
      makeGame('g1', 'nba', '2026-03-24'),
      makeGame('g2', 'nba', '2026-03-25'), // tomorrow
    ]
    const slate = buildDailySlate(games, [], [], '2026-03-24')
    expect(slate.totalGames).toBe(1)
  })

  it('ranks top games by composite score', () => {
    const games = [
      makeGame('g1', 'nba', date),
      makeGame('g2', 'nba', date),
    ]
    const evOpps = [makeEVOpp('g2', 'nba', 5.0)]
    const scripts = [
      makeScript('g1', 'close', 60),
      makeScript('g2', 'close', 80),
    ]
    const slate = buildDailySlate(games, evOpps, scripts, date)
    // g2 has EV + higher confidence → should rank first
    expect(slate.topGames[0].game.id).toBe('g2')
  })

  it('loaded verdict for big slate', () => {
    const games = Array.from({ length: 12 }, (_, i) => {
      const sports: ('nba' | 'nfl' | 'mlb' | 'nhl')[] = ['nba', 'nfl', 'mlb', 'nhl']
      return makeGame(`g${i}`, sports[i % 4], date)
    })
    const slate = buildDailySlate(games, [], [], date)
    expect(slate.verdict).toBe('loaded')
    expect(slate.verdictLabel).toBe('Loaded Slate')
  })

  it('empty verdict for no games', () => {
    const slate = buildDailySlate([], [], [], date)
    expect(slate.verdict).toBe('empty')
    expect(slate.totalGames).toBe(0)
  })

  it('sports are sorted by game count descending', () => {
    const games = [
      makeGame('g1', 'nba', date),
      makeGame('g2', 'nba', date),
      makeGame('g3', 'nba', date),
      makeGame('g4', 'nfl', date),
    ]
    const slate = buildDailySlate(games, [], [], date)
    expect(slate.sports[0].sport).toBe('nba')
    expect(slate.sports[0].gameCount).toBe(3)
  })

  it('includes script stats', () => {
    const games = [makeGame('g1', 'nba', date)]
    const scripts = [makeScript('g1', 'overtime_candidate', 75)]
    const slate = buildDailySlate(games, [], scripts, date)
    expect(slate.stats.otCandidates).toBe(1)
    expect(slate.stats.avgConfidence).toBe(75)
  })

  it('limits top games to 10', () => {
    const games = Array.from({ length: 15 }, (_, i) => makeGame(`g${i}`, 'nba', date))
    const slate = buildDailySlate(games, [], [], date)
    expect(slate.topGames.length).toBeLessThanOrEqual(10)
  })
})
