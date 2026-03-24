/**
 * Parlay Optimizer unit tests.
 *
 * Tests combination generation, correlation detection, EV calculation,
 * evaluation, and full optimization pipeline.
 */

import { describe, it, expect } from 'vitest'
import {
  combinations,
  calculateCorrelationRisk,
  calculateParlayEV,
  evaluateCombo,
  optimizeParlays,
} from '@/lib/parlay-optimizer'
import type { ParlayCandidate } from '@/lib/parlay-optimizer'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCandidate(overrides: Partial<ParlayCandidate> = {}): ParlayCandidate {
  return {
    id: 'pick-1',
    description: 'Lakers ML',
    odds: -110,
    sport: 'nba',
    gameId: 'game-1',
    team: 'Lakers',
    side: 'home',
    market: 'moneyline',
    confidence: 65,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. Combinations
// ---------------------------------------------------------------------------

describe('combinations', () => {
  it('generates correct number of 2-combos from 4 items', () => {
    const result = combinations([1, 2, 3, 4], 2)
    expect(result).toHaveLength(6) // C(4,2) = 6
  })

  it('generates correct number of 3-combos from 5 items', () => {
    const result = combinations([1, 2, 3, 4, 5], 3)
    expect(result).toHaveLength(10) // C(5,3) = 10
  })

  it('respects max combos limit', () => {
    const result = combinations([1, 2, 3, 4, 5, 6, 7, 8], 3, 5)
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('returns empty for k > array length', () => {
    expect(combinations([1, 2], 3)).toHaveLength(0)
  })

  it('single combo when k equals array length', () => {
    expect(combinations([1, 2, 3], 3)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Correlation risk
// ---------------------------------------------------------------------------

describe('calculateCorrelationRisk', () => {
  it('no correlation for different games', () => {
    const legs = [
      makeCandidate({ id: '1', gameId: 'g1', team: 'Lakers' }),
      makeCandidate({ id: '2', gameId: 'g2', team: 'Celtics', sport: 'nfl' }),
    ]
    const { risk } = calculateCorrelationRisk(legs)
    expect(risk).toBeLessThan(20)
  })

  it('high correlation for same game', () => {
    const legs = [
      makeCandidate({ id: '1', gameId: 'g1', side: 'home', market: 'moneyline' }),
      makeCandidate({ id: '2', gameId: 'g1', side: 'over', market: 'total' }),
    ]
    const { risk, warnings } = calculateCorrelationRisk(legs)
    expect(risk).toBeGreaterThanOrEqual(40)
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('max correlation for opposing sides same game', () => {
    const legs = [
      makeCandidate({ id: '1', gameId: 'g1', side: 'home', market: 'moneyline' }),
      makeCandidate({ id: '2', gameId: 'g1', side: 'away', market: 'moneyline' }),
    ]
    const { risk } = calculateCorrelationRisk(legs)
    expect(risk).toBe(100)
  })

  it('moderate correlation for same team different games', () => {
    const legs = [
      makeCandidate({ id: '1', gameId: 'g1', team: 'Lakers' }),
      makeCandidate({ id: '2', gameId: 'g2', team: 'Lakers' }),
    ]
    const { risk } = calculateCorrelationRisk(legs)
    expect(risk).toBeGreaterThan(0)
    expect(risk).toBeLessThan(40)
  })

  it('capped at 100', () => {
    // Multiple same-game legs
    const legs = [
      makeCandidate({ id: '1', gameId: 'g1', side: 'home', market: 'moneyline' }),
      makeCandidate({ id: '2', gameId: 'g1', side: 'away', market: 'moneyline' }),
      makeCandidate({ id: '3', gameId: 'g1', side: 'over', market: 'total' }),
    ]
    const { risk } = calculateCorrelationRisk(legs)
    expect(risk).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// 3. EV calculation
// ---------------------------------------------------------------------------

describe('calculateParlayEV', () => {
  it('positive EV when fair probability > implied', () => {
    const legs = [
      makeCandidate({ odds: -110, fairProbability: 0.55 }), // fair > implied 52.4%
      makeCandidate({ id: '2', odds: -110, fairProbability: 0.55, gameId: 'g2' }),
    ]
    const { ev } = calculateParlayEV(legs)
    expect(ev).toBeGreaterThan(0)
  })

  it('negative EV when fair probability < implied', () => {
    const legs = [
      makeCandidate({ odds: -110, fairProbability: 0.50 }),
      makeCandidate({ id: '2', odds: -110, fairProbability: 0.50, gameId: 'g2' }),
    ]
    const { ev } = calculateParlayEV(legs)
    expect(ev).toBeLessThan(0)
  })

  it('payout multiplies correctly', () => {
    const legs = [
      makeCandidate({ odds: 100 }),  // decimal 2.0
      makeCandidate({ id: '2', odds: 100, gameId: 'g2' }),  // decimal 2.0
    ]
    const { payout } = calculateParlayEV(legs)
    expect(payout).toBeCloseTo(4.0, 1) // 2.0 * 2.0
  })

  it('implied probability is product of individual implied probs', () => {
    const legs = [
      makeCandidate({ odds: -110 }),  // ~52.4%
      makeCandidate({ id: '2', odds: -110, gameId: 'g2' }),
    ]
    const { impliedProb } = calculateParlayEV(legs)
    const expected = 0.5238 * 0.5238 // ~27.4%
    expect(impliedProb).toBeCloseTo(expected, 2)
  })
})

// ---------------------------------------------------------------------------
// 4. Combo evaluation
// ---------------------------------------------------------------------------

describe('evaluateCombo', () => {
  it('produces valid combo with all fields', () => {
    const legs = [
      makeCandidate({ id: '1', odds: -110, gameId: 'g1' }),
      makeCandidate({ id: '2', odds: 150, gameId: 'g2', team: 'Celtics' }),
    ]
    const combo = evaluateCombo(legs)
    expect(combo.legCount).toBe(2)
    expect(combo.combinedOdds).toBeGreaterThan(1)
    expect(combo.payout).toBeGreaterThan(1)
    expect(typeof combo.ev).toBe('number')
    expect(typeof combo.score).toBe('number')
    expect(combo.correlationRisk).toBeDefined()
  })

  it('same-game combo has lower score than cross-game', () => {
    const sameGame = evaluateCombo([
      makeCandidate({ id: '1', gameId: 'g1', side: 'home', market: 'moneyline' }),
      makeCandidate({ id: '2', gameId: 'g1', side: 'over', market: 'total' }),
    ])
    const crossGame = evaluateCombo([
      makeCandidate({ id: '1', gameId: 'g1', odds: -110 }),
      makeCandidate({ id: '2', gameId: 'g2', odds: -110, team: 'Celtics' }),
    ])
    expect(crossGame.score).toBeGreaterThan(sameGame.score)
  })
})

// ---------------------------------------------------------------------------
// 5. Full optimizer
// ---------------------------------------------------------------------------

describe('optimizeParlays', () => {
  it('returns empty for empty candidates', () => {
    const result = optimizeParlays([], [2, 3])
    expect(result.combos).toHaveLength(0)
    expect(result.bestEV).toBeNull()
    expect(result.candidateCount).toBe(0)
  })

  it('generates combos from candidates', () => {
    const candidates = [
      makeCandidate({ id: '1', gameId: 'g1', team: 'Lakers', odds: -110 }),
      makeCandidate({ id: '2', gameId: 'g2', team: 'Celtics', odds: 150 }),
      makeCandidate({ id: '3', gameId: 'g3', team: 'Warriors', odds: -120 }),
    ]
    const result = optimizeParlays(candidates, [2])
    expect(result.combos.length).toBeGreaterThan(0)
    expect(result.candidateCount).toBe(3)
    expect(result.combosEvaluated).toBe(3) // C(3,2) = 3
  })

  it('filters out impossible combos (opposing sides same game)', () => {
    const candidates = [
      makeCandidate({ id: '1', gameId: 'g1', side: 'home', market: 'moneyline' }),
      makeCandidate({ id: '2', gameId: 'g1', side: 'away', market: 'moneyline' }),
      makeCandidate({ id: '3', gameId: 'g2', team: 'Celtics', odds: -110 }),
    ]
    const result = optimizeParlays(candidates, [2])
    // The home/away same game combo should be filtered out
    const impossibleCombo = result.combos.find(
      (c) => c.legs.some((l) => l.id === '1') && c.legs.some((l) => l.id === '2')
    )
    expect(impossibleCombo).toBeUndefined()
  })

  it('identifies best EV, safest, and best payout', () => {
    const candidates = [
      makeCandidate({ id: '1', gameId: 'g1', odds: -110, fairProbability: 0.60 }),
      makeCandidate({ id: '2', gameId: 'g2', team: 'Celtics', odds: 200, fairProbability: 0.40 }),
      makeCandidate({ id: '3', gameId: 'g3', team: 'Warriors', odds: -150, fairProbability: 0.65, sport: 'nfl' }),
      makeCandidate({ id: '4', gameId: 'g4', team: 'Nets', odds: 300, fairProbability: 0.30, sport: 'nfl' }),
    ]
    const result = optimizeParlays(candidates, [2, 3])
    expect(result.bestEV).not.toBeNull()
    expect(result.safest).not.toBeNull()
    expect(result.bestPayout).not.toBeNull()
  })

  it('respects maxResults', () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      makeCandidate({ id: `p${i}`, gameId: `g${i}`, team: `Team${i}`, odds: -110 + i * 10 })
    )
    const result = optimizeParlays(candidates, [2], 5)
    expect(result.combos.length).toBeLessThanOrEqual(5)
  })

  it('handles multiple leg counts', () => {
    const candidates = [
      makeCandidate({ id: '1', gameId: 'g1', odds: -110 }),
      makeCandidate({ id: '2', gameId: 'g2', team: 'Celtics', odds: 150 }),
      makeCandidate({ id: '3', gameId: 'g3', team: 'Warriors', odds: -120 }),
      makeCandidate({ id: '4', gameId: 'g4', team: 'Nets', odds: 200 }),
    ]
    const result = optimizeParlays(candidates, [2, 3, 4])
    const legCounts = new Set(result.combos.map((c) => c.legCount))
    expect(legCounts.size).toBeGreaterThanOrEqual(1)
    expect(result.combosEvaluated).toBe(6 + 4 + 1) // C(4,2) + C(4,3) + C(4,4)
  })
})
