/**
 * Morning Brief unit tests.
 *
 * Tests headline generation, play scoring, caution alerts,
 * sport quick takes, checklist generation, and text formatting.
 */

import { describe, it, expect } from 'vitest'
import {
  generateMorningBrief,
  scoreBriefPlay,
  buildCautionAlerts,
  formatBriefAsText,
  type RecentPerformance,
  type SituationalSpot,
} from '@/lib/morning-brief'
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
    lastUpdated: '2026-03-25T08:00:00Z',
  }
}

function makeGame(id: string, sport: 'nba' | 'nfl' | 'mlb' | 'nhl', date: string = '2026-03-25'): NormalizedGame {
  return {
    id,
    sport,
    homeTeam: 'Home Team',
    awayTeam: 'Away Team',
    commenceTime: `${date}T20:00:00Z`,
    fromCache: true,
    isFresh: true,
    bookmakers: [
      makeBookmaker('DK'),
      makeBookmaker('FD'),
      makeBookmaker('MGM'),
      makeBookmaker('CZR'),
      makeBookmaker('BET365'),
      makeBookmaker('POINTS'),
    ],
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

function makeScript(gameId: string, sport: 'nba' | 'nfl' | 'mlb' | 'nhl', flow: GameFlowType, confidence: number = 70): GameScript {
  return {
    game: makeGame(gameId, sport),
    predictedFlow: flow,
    probabilities: { blowout: 0.1, comfortable: 0.3, close: 0.4, overtime: 0.2 },
    scoring: { expectedTotal: 220, tempo: 'medium', scoringEnv: 'Average' },
    spreadAnalysis: { consensusSpread: -3.5, spreadRange: 0.5, lopsided: false },
    narrative: 'Test narrative',
    confidence,
    factors: ['Test factor'],
  }
}

function makePerformance(overrides: Partial<RecentPerformance> = {}): RecentPerformance {
  return {
    lastNPicks: [
      { won: true, units: 1 },
      { won: false, units: 1 },
      { won: true, units: 1 },
    ],
    currentBankroll: 1000,
    startingBankroll: 1000,
    winRate7d: 0.55,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// scoreBriefPlay
// ---------------------------------------------------------------------------

describe('scoreBriefPlay', () => {
  it('scores a game with EV opportunities', () => {
    const game = makeGame('g1', 'nba')
    const evs = [makeEVOpp('g1', 'nba', 3.5)]
    const result = scoreBriefPlay(game, evs, undefined, [])

    expect(result.signalStrength).toBeGreaterThan(0)
    expect(result.bestEV).toBe(3.5)
    expect(result.edge.side).toBe('home')
    expect(result.reasons.some(r => r.includes('+3.5%'))).toBe(true)
  })

  it('scores higher for multiple EV opportunities', () => {
    const game = makeGame('g1', 'nba')
    const evs = [makeEVOpp('g1', 'nba', 3.5), makeEVOpp('g1', 'nba', 2.0)]
    evs[1].bookmaker = 'FanDuel'
    evs[1].side = 'away'
    const result = scoreBriefPlay(game, evs, undefined, [])

    expect(result.reasons.some(r => r.includes('2 +EV'))).toBe(true)
  })

  it('adds OT candidate signal', () => {
    const game = makeGame('g1', 'nba')
    const script = makeScript('g1', 'nba', 'overtime_candidate')
    const result = scoreBriefPlay(game, [], script, [])

    expect(result.signalStrength).toBeGreaterThanOrEqual(15)
    expect(result.reasons.some(r => r.includes('OT'))).toBe(true)
    expect(result.gameFlow).toBe('overtime candidate')
  })

  it('adds close game signal', () => {
    const game = makeGame('g1', 'nba')
    const script = makeScript('g1', 'nba', 'close')
    const result = scoreBriefPlay(game, [], script, [])

    expect(result.reasons.some(r => r.includes('close') || r.includes('Close'))).toBe(true)
  })

  it('adds spread disagreement signal', () => {
    const game = makeGame('g1', 'nba')
    const script = makeScript('g1', 'nba', 'close')
    script.spreadAnalysis.spreadRange = 2.5
    const result = scoreBriefPlay(game, [], script, [])

    expect(result.reasons.some(r => r.includes('disagree'))).toBe(true)
  })

  it('includes situational spots', () => {
    const game = makeGame('g1', 'nba')
    const spots: SituationalSpot[] = [{
      gameId: 'g1',
      type: 'back_to_back',
      impact: 3,
      description: 'Home team on B2B',
    }]
    const result = scoreBriefPlay(game, [], undefined, spots)

    expect(result.reasons).toContain('Home team on B2B')
    expect(result.signalStrength).toBeGreaterThan(0)
  })

  it('caps signal strength at 100', () => {
    const game = makeGame('g1', 'nba')
    const evs = [makeEVOpp('g1', 'nba', 15)] // very high EV
    const script = makeScript('g1', 'nba', 'overtime_candidate', 90)
    script.spreadAnalysis.spreadRange = 3
    const spots: SituationalSpot[] = [
      { gameId: 'g1', type: 'rest', impact: 5, description: '3-day rest advantage' },
    ]
    const result = scoreBriefPlay(game, evs, script, spots)

    expect(result.signalStrength).toBeLessThanOrEqual(100)
  })

  it('gives default reason for games with no signals', () => {
    const game = makeGame('g1', 'nba')
    game.bookmakers = [makeBookmaker('DK')]
    const result = scoreBriefPlay(game, [], undefined, [])

    expect(result.reasons).toContain('Standard game — no significant signals')
    expect(result.signalStrength).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// buildCautionAlerts
// ---------------------------------------------------------------------------

describe('buildCautionAlerts', () => {
  it('detects 5+ game losing streak as danger', () => {
    const perf = makePerformance({
      lastNPicks: [
        { won: false, units: 1 },
        { won: false, units: 1 },
        { won: false, units: 1 },
        { won: false, units: 1 },
        { won: false, units: 1 },
        { won: true, units: 1 },
      ],
    })
    const alerts = buildCautionAlerts(perf, 5, [])
    const streakAlert = alerts.find(a => a.type === 'losing_streak')

    expect(streakAlert).toBeDefined()
    expect(streakAlert!.severity).toBe('danger')
    expect(streakAlert!.message).toContain('5-game')
  })

  it('detects 3-game losing streak as warning', () => {
    const perf = makePerformance({
      lastNPicks: [
        { won: false, units: 1 },
        { won: false, units: 1 },
        { won: false, units: 1 },
        { won: true, units: 1 },
      ],
    })
    const alerts = buildCautionAlerts(perf, 5, [])
    const streakAlert = alerts.find(a => a.type === 'losing_streak')

    expect(streakAlert).toBeDefined()
    expect(streakAlert!.severity).toBe('warning')
  })

  it('detects >25% bankroll drawdown as danger', () => {
    const perf = makePerformance({
      currentBankroll: 700,
      startingBankroll: 1000,
    })
    const alerts = buildCautionAlerts(perf, 5, [])
    const bankrollAlert = alerts.find(a => a.type === 'bankroll_low')

    expect(bankrollAlert).toBeDefined()
    expect(bankrollAlert!.severity).toBe('danger')
    expect(bankrollAlert!.message).toContain('30%')
  })

  it('detects >10% bankroll drawdown as warning', () => {
    const perf = makePerformance({
      currentBankroll: 850,
      startingBankroll: 1000,
    })
    const alerts = buildCautionAlerts(perf, 5, [])
    const bankrollAlert = alerts.find(a => a.type === 'bankroll_low')

    expect(bankrollAlert).toBeDefined()
    expect(bankrollAlert!.severity).toBe('warning')
  })

  it('warns about light slate', () => {
    const alerts = buildCautionAlerts(null, 2, [])
    const slateAlert = alerts.find(a => a.type === 'light_slate')

    expect(slateAlert).toBeDefined()
    expect(slateAlert!.severity).toBe('info')
    expect(slateAlert!.message).toContain('2 games')
  })

  it('returns no alerts for healthy state', () => {
    const perf = makePerformance()
    const alerts = buildCautionAlerts(perf, 8, [])

    expect(alerts.length).toBe(0)
  })

  it('returns empty when performance is null', () => {
    const alerts = buildCautionAlerts(null, 8, [])
    expect(alerts.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// generateMorningBrief
// ---------------------------------------------------------------------------

describe('generateMorningBrief', () => {
  it('builds a complete brief with games', () => {
    const games = [
      makeGame('g1', 'nba'),
      makeGame('g2', 'nba'),
      makeGame('g3', 'nfl'),
    ]
    const evs = [makeEVOpp('g1', 'nba', 3.0)]
    const scripts = [makeScript('g1', 'nba', 'close'), makeScript('g3', 'nfl', 'overtime_candidate')]

    const brief = generateMorningBrief(games, evs, scripts, [], null, '2026-03-25')

    expect(brief.date).toBe('2026-03-25')
    expect(brief.totalGames).toBe(3)
    expect(brief.activeSports).toBe(2)
    expect(brief.topPlays.length).toBeLessThanOrEqual(5)
    expect(brief.sportTakes.length).toBe(2)
    expect(brief.headline).toContain('3')
    expect(brief.disclaimer).toContain('informational')
    expect(brief.stats.totalEVOpps).toBeGreaterThanOrEqual(1)
    expect(brief.checklist.length).toBeGreaterThan(0)
  })

  it('handles empty slate', () => {
    const brief = generateMorningBrief([], [], [], [], null, '2026-03-25')

    expect(brief.totalGames).toBe(0)
    expect(brief.slateVerdict).toBe('empty')
    expect(brief.headline).toContain('No games')
    expect(brief.topPlays.length).toBe(0)
    expect(brief.sportTakes.length).toBe(0)
  })

  it('labels loaded slate for 10+ games, 3+ sports', () => {
    const games = [
      ...Array.from({ length: 4 }, (_, i) => makeGame(`nba${i}`, 'nba')),
      ...Array.from({ length: 4 }, (_, i) => makeGame(`nfl${i}`, 'nfl')),
      ...Array.from({ length: 3 }, (_, i) => makeGame(`nhl${i}`, 'nhl')),
    ]
    const brief = generateMorningBrief(games, [], [], [], null, '2026-03-25')

    expect(brief.slateVerdict).toBe('loaded')
    expect(brief.headline.toLowerCase()).toContain('loaded')
  })

  it('ranks top plays by signal strength', () => {
    const games = [
      makeGame('g1', 'nba'),
      makeGame('g2', 'nba'),
    ]
    const evs = [makeEVOpp('g2', 'nba', 5.0)] // g2 has EV, g1 doesn't

    const brief = generateMorningBrief(games, evs, [], [], null, '2026-03-25')

    expect(brief.topPlays[0].gameId).toBe('g2')
    expect(brief.topPlays[0].signalStrength).toBeGreaterThan(brief.topPlays[1].signalStrength)
  })

  it('includes caution alerts from performance', () => {
    const games = [makeGame('g1', 'nba')]
    const perf: RecentPerformance = {
      lastNPicks: Array.from({ length: 6 }, () => ({ won: false, units: 1 })),
      currentBankroll: 600,
      startingBankroll: 1000,
      winRate7d: 0.2,
    }

    const brief = generateMorningBrief(games, [], [], [], perf, '2026-03-25')

    expect(brief.cautionAlerts.length).toBeGreaterThan(0)
    expect(brief.cautionAlerts.some(a => a.type === 'losing_streak')).toBe(true)
    expect(brief.cautionAlerts.some(a => a.type === 'bankroll_low')).toBe(true)
  })

  it('filters games to target date only', () => {
    const games = [
      makeGame('g1', 'nba', '2026-03-25'),
      makeGame('g2', 'nba', '2026-03-26'), // tomorrow
    ]

    const brief = generateMorningBrief(games, [], [], [], null, '2026-03-25')

    expect(brief.totalGames).toBe(1)
  })

  it('includes EV checklist item when EV opps exist', () => {
    const games = [makeGame('g1', 'nba')]
    const evs = [makeEVOpp('g1', 'nba', 3.0)]

    const brief = generateMorningBrief(games, evs, [], [], null, '2026-03-25')

    expect(brief.checklist.some(c => c.item.includes('+EV'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// formatBriefAsText
// ---------------------------------------------------------------------------

describe('formatBriefAsText', () => {
  it('formats a full brief', () => {
    const games = [makeGame('g1', 'nba'), makeGame('g2', 'nfl')]
    const evs = [makeEVOpp('g1', 'nba', 3.0)]
    const brief = generateMorningBrief(games, evs, [], [], null, '2026-03-25')
    const text = formatBriefAsText(brief)

    expect(text).toContain('MORNING BRIEF')
    expect(text).toContain('2026-03-25')
    expect(text).toContain('TOP PLAYS')
    expect(text).toContain('CHECKLIST')
    expect(text).toContain('informational')
  })

  it('includes caution section when alerts exist', () => {
    const games = [makeGame('g1', 'nba')]
    const perf: RecentPerformance = {
      lastNPicks: Array.from({ length: 5 }, () => ({ won: false, units: 1 })),
      currentBankroll: 1000,
      startingBankroll: 1000,
      winRate7d: 0.3,
    }
    const brief = generateMorningBrief(games, [], [], [], perf, '2026-03-25')
    const text = formatBriefAsText(brief)

    expect(text).toContain('CAUTION')
    expect(text).toContain('losing streak')
  })

  it('handles empty brief', () => {
    const brief = generateMorningBrief([], [], [], [], null, '2026-03-25')
    const text = formatBriefAsText(brief)

    expect(text).toContain('MORNING BRIEF')
    expect(text).toContain('No games')
    expect(text).not.toContain('TOP PLAYS')
  })
})
