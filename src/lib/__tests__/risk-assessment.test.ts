/**
 * Risk Assessment tests.
 *
 * Tests risk scoring, individual factors, and recommendations.
 * Pure logic — no side effects.
 */

import { describe, it, expect } from 'vitest'
import { assessRisk, type RiskInput } from '@/lib/risk-assessment'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<RiskInput> = {}): RiskInput {
  return {
    odds: -110,
    units: 1,
    sport: 'nba',
    betType: 'moneyline',
    bankroll: 1000,
    unitSize: 10,
    recentOutcomes: ['win', 'loss', 'win', 'win', 'loss'],
    pendingPickCount: 2,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. Basic risk assessment
// ---------------------------------------------------------------------------

describe('assessRisk — basic', () => {
  it('returns a valid risk assessment', () => {
    const result = assessRisk(makeInput())
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(['low', 'moderate', 'elevated', 'high', 'extreme']).toContain(result.level)
    expect(result.factors).toHaveLength(5)
    expect(result.recommendation).toBeTruthy()
    expect(result.maxRecommendedUnits).toBeGreaterThan(0)
  })

  it('low risk for conservative bet', () => {
    const result = assessRisk(makeInput({
      units: 1,
      bankroll: 5000,
      unitSize: 10,
      pendingPickCount: 1,
      recentOutcomes: ['win', 'win', 'win', 'win', 'loss'],
    }))
    expect(result.score).toBeLessThanOrEqual(40)
    expect(['low', 'moderate']).toContain(result.level)
  })

  it('high risk for aggressive bet', () => {
    const result = assessRisk(makeInput({
      units: 5,
      bankroll: 500,
      unitSize: 50,
      pendingPickCount: 12,
      recentOutcomes: ['loss', 'loss', 'loss', 'loss', 'loss'],
    }))
    expect(result.score).toBeGreaterThanOrEqual(60)
    expect(['elevated', 'high', 'extreme']).toContain(result.level)
  })
})

// ---------------------------------------------------------------------------
// 2. Bankroll exposure
// ---------------------------------------------------------------------------

describe('assessRisk — bankroll exposure', () => {
  it('low score for small exposure', () => {
    const result = assessRisk(makeInput({ units: 1, bankroll: 5000, unitSize: 10 }))
    const exposure = result.factors.find((f) => f.name === 'Bankroll Exposure')
    expect(exposure?.score).toBeLessThanOrEqual(30)
    expect(exposure?.severity).toBe('ok')
  })

  it('high score for large exposure', () => {
    const result = assessRisk(makeInput({ units: 5, bankroll: 200, unitSize: 25 }))
    const exposure = result.factors.find((f) => f.name === 'Bankroll Exposure')
    expect(exposure?.score).toBeGreaterThanOrEqual(80)
    expect(exposure?.severity).toBe('danger')
  })

  it('handles zero bankroll', () => {
    const result = assessRisk(makeInput({ bankroll: 0 }))
    const exposure = result.factors.find((f) => f.name === 'Bankroll Exposure')
    expect(exposure?.score).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// 3. Odds value
// ---------------------------------------------------------------------------

describe('assessRisk — odds value', () => {
  it('low score when +EV with fair implied', () => {
    const result = assessRisk(makeInput({
      odds: -110,
      fairImplied: 0.58, // Market thinks 58% but you're getting 52.4% implied
    }))
    const value = result.factors.find((f) => f.name === 'Odds Value')
    expect(value?.score).toBeLessThanOrEqual(25)
    expect(value?.severity).toBe('ok')
  })

  it('high score when -EV with fair implied', () => {
    const result = assessRisk(makeInput({
      odds: -110,
      fairImplied: 0.48, // Market thinks only 48% but you're paying 52.4%
    }))
    const value = result.factors.find((f) => f.name === 'Odds Value')
    expect(value?.score).toBeGreaterThanOrEqual(60)
  })

  it('moderate score without fair implied data', () => {
    const result = assessRisk(makeInput({ fairImplied: undefined }))
    const value = result.factors.find((f) => f.name === 'Odds Value')
    expect(value?.score).toBeLessThanOrEqual(60)
    expect(value?.severity).toBe('warning')
  })
})

// ---------------------------------------------------------------------------
// 4. Tilt / recency bias
// ---------------------------------------------------------------------------

describe('assessRisk — tilt detection', () => {
  it('low tilt score with mixed results', () => {
    const result = assessRisk(makeInput({
      recentOutcomes: ['win', 'loss', 'win', 'loss', 'win'],
    }))
    const tilt = result.factors.find((f) => f.name === 'Recency Bias')
    expect(tilt?.score).toBeLessThanOrEqual(25)
  })

  it('high tilt score after 4+ losses', () => {
    const result = assessRisk(makeInput({
      recentOutcomes: ['loss', 'loss', 'loss', 'loss', 'loss'],
    }))
    const tilt = result.factors.find((f) => f.name === 'Recency Bias')
    expect(tilt?.score).toBeGreaterThanOrEqual(85)
    expect(tilt?.severity).toBe('danger')
  })

  it('handles short recent history', () => {
    const result = assessRisk(makeInput({ recentOutcomes: ['win'] }))
    const tilt = result.factors.find((f) => f.name === 'Recency Bias')
    expect(tilt?.score).toBeLessThanOrEqual(25)
  })
})

// ---------------------------------------------------------------------------
// 5. Portfolio concentration
// ---------------------------------------------------------------------------

describe('assessRisk — concentration', () => {
  it('low concentration with few pending', () => {
    const result = assessRisk(makeInput({ pendingPickCount: 1 }))
    const conc = result.factors.find((f) => f.name === 'Portfolio Concentration')
    expect(conc?.score).toBeLessThanOrEqual(15)
  })

  it('high concentration with many pending', () => {
    const result = assessRisk(makeInput({ pendingPickCount: 15 }))
    const conc = result.factors.find((f) => f.name === 'Portfolio Concentration')
    expect(conc?.score).toBeGreaterThanOrEqual(80)
    expect(conc?.severity).toBe('danger')
  })
})

// ---------------------------------------------------------------------------
// 6. Unit sizing
// ---------------------------------------------------------------------------

describe('assessRisk — unit sizing', () => {
  it('low score for 1 unit', () => {
    const result = assessRisk(makeInput({ units: 1 }))
    const sizing = result.factors.find((f) => f.name === 'Unit Sizing')
    expect(sizing?.score).toBeLessThanOrEqual(15)
  })

  it('high score for 4+ units', () => {
    const result = assessRisk(makeInput({ units: 5 }))
    const sizing = result.factors.find((f) => f.name === 'Unit Sizing')
    expect(sizing?.score).toBeGreaterThanOrEqual(80)
    expect(sizing?.severity).toBe('danger')
  })
})

// ---------------------------------------------------------------------------
// 7. Max recommended units
// ---------------------------------------------------------------------------

describe('assessRisk — maxRecommendedUnits', () => {
  it('recommends based on 3% of bankroll', () => {
    const result = assessRisk(makeInput({ bankroll: 1000, unitSize: 10 }))
    // 3% of 1000 = $30, divided by $10 = 3 units
    expect(result.maxRecommendedUnits).toBe(3)
  })

  it('caps at 5 units', () => {
    const result = assessRisk(makeInput({ bankroll: 10000, unitSize: 10 }))
    expect(result.maxRecommendedUnits).toBeLessThanOrEqual(5)
  })

  it('minimum 0.5 units', () => {
    const result = assessRisk(makeInput({ bankroll: 100, unitSize: 100 }))
    expect(result.maxRecommendedUnits).toBeGreaterThanOrEqual(0.5)
  })

  it('handles zero bankroll', () => {
    const result = assessRisk(makeInput({ bankroll: 0 }))
    expect(result.maxRecommendedUnits).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 8. Recommendation text
// ---------------------------------------------------------------------------

describe('assessRisk — recommendation', () => {
  it('positive recommendation for low risk', () => {
    const result = assessRisk(makeInput({
      units: 1,
      bankroll: 10000,
      unitSize: 10,
      pendingPickCount: 0,
      recentOutcomes: ['win', 'win', 'win'],
    }))
    expect(result.recommendation).toBeTruthy()
    expect(typeof result.recommendation).toBe('string')
  })

  it('caution recommendation for high risk', () => {
    const result = assessRisk(makeInput({
      units: 5,
      bankroll: 200,
      unitSize: 50,
      pendingPickCount: 15,
      recentOutcomes: ['loss', 'loss', 'loss', 'loss', 'loss'],
    }))
    expect(result.recommendation.toLowerCase()).toContain('caution')
  })
})

// ---------------------------------------------------------------------------
// 9. Edge cases
// ---------------------------------------------------------------------------

describe('assessRisk — edge cases', () => {
  it('handles extreme odds', () => {
    const result = assessRisk(makeInput({ odds: -1000 }))
    expect(isFinite(result.score)).toBe(true)
    expect(result.factors.every((f) => isFinite(f.score))).toBe(true)
  })

  it('handles extreme positive odds', () => {
    const result = assessRisk(makeInput({ odds: 1000 }))
    expect(isFinite(result.score)).toBe(true)
  })

  it('handles empty recent outcomes', () => {
    const result = assessRisk(makeInput({ recentOutcomes: [] }))
    expect(isFinite(result.score)).toBe(true)
  })

  it('all factor scores are 0-100', () => {
    const inputs = [
      makeInput(),
      makeInput({ units: 10, bankroll: 100 }),
      makeInput({ pendingPickCount: 20 }),
    ]
    for (const input of inputs) {
      const result = assessRisk(input)
      for (const factor of result.factors) {
        expect(factor.score).toBeGreaterThanOrEqual(0)
        expect(factor.score).toBeLessThanOrEqual(100)
      }
    }
  })
})
