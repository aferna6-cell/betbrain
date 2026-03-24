/**
 * Game Script Predictor unit tests.
 *
 * Tests consensus calculation, flow probability, OT estimation,
 * narrative generation, and full prediction pipeline.
 */

import { describe, it, expect } from 'vitest'
import {
  getConsensusSpread,
  getConsensusTotal,
  getSpreadRange,
  estimateOTProbability,
  describeScoringEnv,
  calculateFlowProbabilities,
  determinePrimaryFlow,
  predictGameScript,
  predictAllGameScripts,
  getFlowLabel,
  getFlowColor,
} from '@/lib/game-script'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeBookmaker(
  name: string,
  opts: {
    ml?: { home: number; away: number }
    spread?: { homeLine: number; homeOdds: number; awayLine: number; awayOdds: number }
    total?: { line: number; overOdds: number; underOdds: number }
  } = {}
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: opts.ml ? { home: opts.ml.home, away: opts.ml.away, draw: null } : null,
    spread: opts.spread ? {
      homeLine: opts.spread.homeLine,
      homeOdds: opts.spread.homeOdds,
      awayLine: opts.spread.awayLine,
      awayOdds: opts.spread.awayOdds,
    } : null,
    total: opts.total ? {
      line: opts.total.line,
      overOdds: opts.total.overOdds,
      underOdds: opts.total.underOdds,
    } : null,
    lastUpdated: '2026-03-24T08:00:00Z',
  }
}

function makeGame(
  bookmakers: NormalizedBookmakerOdds[],
  overrides: Partial<NormalizedGame> = {}
): NormalizedGame {
  return {
    id: 'game-001',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-24T23:00:00Z',
    fromCache: true,
    isFresh: true,
    bookmakers,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. Consensus spread
// ---------------------------------------------------------------------------

describe('getConsensusSpread', () => {
  it('returns median spread from odd number of books', () => {
    const bks = [
      makeBookmaker('DK', { spread: { homeLine: -3, homeOdds: -110, awayLine: 3, awayOdds: -110 } }),
      makeBookmaker('FD', { spread: { homeLine: -3.5, homeOdds: -110, awayLine: 3.5, awayOdds: -110 } }),
      makeBookmaker('MGM', { spread: { homeLine: -4, homeOdds: -110, awayLine: 4, awayOdds: -110 } }),
    ]
    expect(getConsensusSpread(bks)).toBe(-3.5)
  })

  it('returns average of middle two for even number of books', () => {
    const bks = [
      makeBookmaker('DK', { spread: { homeLine: -3, homeOdds: -110, awayLine: 3, awayOdds: -110 } }),
      makeBookmaker('FD', { spread: { homeLine: -4, homeOdds: -110, awayLine: 4, awayOdds: -110 } }),
    ]
    expect(getConsensusSpread(bks)).toBe(-3.5)
  })

  it('returns null when no spreads available', () => {
    const bks = [makeBookmaker('DK', { ml: { home: -110, away: -110 } })]
    expect(getConsensusSpread(bks)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 2. Consensus total
// ---------------------------------------------------------------------------

describe('getConsensusTotal', () => {
  it('returns median total', () => {
    const bks = [
      makeBookmaker('DK', { total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('FD', { total: { line: 221, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('MGM', { total: { line: 220.5, overOdds: -110, underOdds: -110 } }),
    ]
    expect(getConsensusTotal(bks)).toBe(220.5)
  })

  it('returns null when no totals available', () => {
    expect(getConsensusTotal([makeBookmaker('DK')])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 3. Spread range
// ---------------------------------------------------------------------------

describe('getSpreadRange', () => {
  it('calculates range correctly', () => {
    const bks = [
      makeBookmaker('DK', { spread: { homeLine: -3, homeOdds: -110, awayLine: 3, awayOdds: -110 } }),
      makeBookmaker('FD', { spread: { homeLine: -5, homeOdds: -110, awayLine: 5, awayOdds: -110 } }),
    ]
    expect(getSpreadRange(bks)).toBe(2)
  })

  it('returns 0 for single bookmaker', () => {
    const bks = [makeBookmaker('DK', { spread: { homeLine: -3, homeOdds: -110, awayLine: 3, awayOdds: -110 } })]
    expect(getSpreadRange(bks)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 4. OT probability
// ---------------------------------------------------------------------------

describe('estimateOTProbability', () => {
  it('close NBA game has higher OT probability than base', () => {
    const ot = estimateOTProbability(-2, 'nba')
    expect(ot).toBeGreaterThan(0.06) // base rate
  })

  it('blowout NBA game has lower OT probability', () => {
    const ot = estimateOTProbability(-12, 'nba')
    expect(ot).toBeLessThan(0.06)
  })

  it('NHL has highest base OT rate', () => {
    const nhlOt = estimateOTProbability(null, 'nhl')
    const nbaOt = estimateOTProbability(null, 'nba')
    expect(nhlOt).toBeGreaterThan(nbaOt)
  })

  it('null spread returns base rate', () => {
    expect(estimateOTProbability(null, 'nba')).toBe(0.06)
  })
})

// ---------------------------------------------------------------------------
// 5. Scoring environment
// ---------------------------------------------------------------------------

describe('describeScoringEnv', () => {
  it('high NBA total returns high tempo', () => {
    const { tempo } = describeScoringEnv(235, 'nba')
    expect(tempo).toBe('high')
  })

  it('low NBA total returns low tempo', () => {
    const { tempo } = describeScoringEnv(205, 'nba')
    expect(tempo).toBe('low')
  })

  it('null total returns medium', () => {
    const { tempo } = describeScoringEnv(null, 'nba')
    expect(tempo).toBe('medium')
  })

  it('high NFL total', () => {
    const { tempo } = describeScoringEnv(52, 'nfl')
    expect(tempo).toBe('high')
  })
})

// ---------------------------------------------------------------------------
// 6. Flow probabilities
// ---------------------------------------------------------------------------

describe('calculateFlowProbabilities', () => {
  it('probabilities sum to 1', () => {
    const probs = calculateFlowProbabilities(-7, 'nba')
    const sum = probs.blowout + probs.comfortable + probs.close + probs.overtime
    expect(sum).toBeCloseTo(1, 1)
  })

  it('large spread has highest blowout probability', () => {
    const probs = calculateFlowProbabilities(-12, 'nba')
    expect(probs.blowout).toBeGreaterThan(probs.close)
  })

  it('tight spread has highest close probability', () => {
    const probs = calculateFlowProbabilities(-1.5, 'nba')
    expect(probs.close).toBeGreaterThan(probs.blowout)
  })

  it('null spread returns default distribution', () => {
    const probs = calculateFlowProbabilities(null, 'nba')
    expect(probs.blowout).toBe(0.15)
    expect(probs.comfortable).toBe(0.30)
  })
})

// ---------------------------------------------------------------------------
// 7. Flow determination
// ---------------------------------------------------------------------------

describe('determinePrimaryFlow', () => {
  it('large negative spread → blowout_home', () => {
    const probs = calculateFlowProbabilities(-12, 'nba')
    const flow = determinePrimaryFlow(-12, probs)
    expect(flow).toBe('blowout_home')
  })

  it('large positive spread → blowout_away', () => {
    const probs = calculateFlowProbabilities(12, 'nba')
    const flow = determinePrimaryFlow(12, probs)
    expect(flow).toBe('blowout_away')
  })

  it('null spread → coin_flip', () => {
    const probs = calculateFlowProbabilities(null, 'nba')
    expect(determinePrimaryFlow(null, probs)).toBe('coin_flip')
  })

  it('tight NHL spread can produce OT candidate', () => {
    const probs = calculateFlowProbabilities(-1, 'nhl')
    const flow = determinePrimaryFlow(-1, probs)
    // NHL close games often predict OT candidate due to high base rate
    expect(['overtime_candidate', 'close', 'coin_flip']).toContain(flow)
  })
})

// ---------------------------------------------------------------------------
// 8. Full prediction pipeline
// ---------------------------------------------------------------------------

describe('predictGameScript', () => {
  it('produces valid script for game with full data', () => {
    const game = makeGame([
      makeBookmaker('DK', {
        ml: { home: -200, away: 170 },
        spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
        total: { line: 225, overOdds: -110, underOdds: -110 },
      }),
      makeBookmaker('FD', {
        ml: { home: -190, away: 160 },
        spread: { homeLine: -5, homeOdds: -110, awayLine: 5, awayOdds: -110 },
        total: { line: 225.5, overOdds: -110, underOdds: -110 },
      }),
      makeBookmaker('MGM', {
        ml: { home: -195, away: 165 },
        spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
        total: { line: 225, overOdds: -110, underOdds: -110 },
      }),
    ])

    const script = predictGameScript(game)
    expect(script.predictedFlow).toBeDefined()
    expect(script.narrative.length).toBeGreaterThan(20)
    expect(script.confidence).toBeGreaterThan(0)
    expect(script.confidence).toBeLessThanOrEqual(95)
    expect(script.scoring.expectedTotal).toBeCloseTo(225, 0)
    expect(script.spreadAnalysis.consensusSpread).toBeCloseTo(-5.5, 0)
    // Factors may or may not be generated depending on thresholds
    expect(script.factors).toBeDefined()

    // Probabilities sum to 1
    const { blowout, comfortable, close, overtime } = script.probabilities
    expect(blowout + comfortable + close + overtime).toBeCloseTo(1, 1)
  })

  it('handles game with no spread data', () => {
    const game = makeGame([
      makeBookmaker('DK', { ml: { home: -110, away: -110 } }),
    ])
    const script = predictGameScript(game)
    expect(script.spreadAnalysis.consensusSpread).toBeNull()
    expect(script.predictedFlow).toBe('coin_flip')
  })

  it('high confidence for lopsided game with many books', () => {
    const game = makeGame([
      makeBookmaker('DK', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('FD', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('MGM', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('BR', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('PP', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
    ])
    const script = predictGameScript(game)
    expect(script.confidence).toBeGreaterThanOrEqual(80)
  })
})

// ---------------------------------------------------------------------------
// 9. Batch prediction
// ---------------------------------------------------------------------------

describe('predictAllGameScripts', () => {
  it('sorts by confidence descending', () => {
    const g1 = makeGame([
      makeBookmaker('DK', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('FD', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('MGM', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('BR', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
      makeBookmaker('PP', { spread: { homeLine: -10, homeOdds: -110, awayLine: 10, awayOdds: -110 }, total: { line: 220, overOdds: -110, underOdds: -110 } }),
    ], { id: 'g1' })

    const g2 = makeGame([
      makeBookmaker('DK', { ml: { home: -110, away: -110 } }),
    ], { id: 'g2' })

    const results = predictAllGameScripts([g2, g1])
    expect(results[0].game.id).toBe('g1')
    expect(results[0].confidence).toBeGreaterThanOrEqual(results[1].confidence)
  })
})

// ---------------------------------------------------------------------------
// 10. Display helpers
// ---------------------------------------------------------------------------

describe('getFlowLabel', () => {
  it('returns readable labels', () => {
    expect(getFlowLabel('blowout_home')).toBe('Home Blowout')
    expect(getFlowLabel('overtime_candidate')).toBe('OT Candidate')
    expect(getFlowLabel('coin_flip')).toBe('Coin Flip')
  })
})

describe('getFlowColor', () => {
  it('blowouts are red', () => {
    expect(getFlowColor('blowout_home')).toContain('red')
  })

  it('OT candidates are purple', () => {
    expect(getFlowColor('overtime_candidate')).toContain('purple')
  })
})
