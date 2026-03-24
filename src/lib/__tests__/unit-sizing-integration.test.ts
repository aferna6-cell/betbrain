/**
 * Integration tests for unit sizing recommendations
 * with real-world betting scenarios.
 */

import { describe, it, expect } from 'vitest'
import { getUnitRecommendations, getFlatUnitSize } from '@/lib/unit-sizing'
import { kellyCriterion } from '@/lib/bankroll'

describe('getUnitRecommendations — real scenarios', () => {
  const config = { bankroll: 5000, unitSize: 50 }

  it('gives reasonable sizing for a moderate edge bet', () => {
    // 55% win prob at -110 = slight positive edge
    const recs = getUnitRecommendations(0.55, -110, config)
    expect(recs).toHaveLength(4) // low, medium, high, max
    // All should be >= 0
    for (const rec of recs) {
      expect(rec.units).toBeGreaterThanOrEqual(0)
      expect(rec.dollarAmount).toBeGreaterThanOrEqual(0)
      expect(rec.bankrollPct).toBeGreaterThanOrEqual(0)
      expect(rec.bankrollPct).toBeLessThanOrEqual(0.05) // capped at 5%
    }
    // Higher confidence should give larger sizing
    expect(recs[3].units).toBeGreaterThanOrEqual(recs[0].units)
  })

  it('returns zero sizing for negative EV bet', () => {
    // 45% at -110 = negative edge
    const recs = getUnitRecommendations(0.45, -110, config)
    for (const rec of recs) {
      expect(rec.units).toBe(0)
    }
  })

  it('caps at 5% of bankroll even with huge edge', () => {
    // 90% at +200 = massive edge
    const recs = getUnitRecommendations(0.9, 200, config)
    for (const rec of recs) {
      expect(rec.bankrollPct).toBeLessThanOrEqual(0.05)
      expect(rec.dollarAmount).toBeLessThanOrEqual(250) // 5% of 5000
    }
  })

  it('handles heavy favorite odds (-500)', () => {
    const recs = getUnitRecommendations(0.85, -500, config)
    for (const rec of recs) {
      expect(isFinite(rec.units)).toBe(true)
      expect(isNaN(rec.units)).toBe(false)
    }
  })

  it('handles big underdog odds (+800)', () => {
    const recs = getUnitRecommendations(0.15, 800, config)
    for (const rec of recs) {
      expect(isFinite(rec.units)).toBe(true)
      expect(isNaN(rec.units)).toBe(false)
    }
  })

  it('returns empty for zero bankroll', () => {
    const recs = getUnitRecommendations(0.55, -110, { bankroll: 0, unitSize: 50 })
    expect(recs).toHaveLength(0)
  })

  it('returns empty for zero unit size', () => {
    const recs = getUnitRecommendations(0.55, -110, { bankroll: 5000, unitSize: 0 })
    expect(recs).toHaveLength(0)
  })

  it('low confidence gives smaller sizing than max', () => {
    const recs = getUnitRecommendations(0.6, -110, config)
    const lowRec = recs.find((r) => r.confidence === 'low')!
    const maxRec = recs.find((r) => r.confidence === 'max')!
    expect(maxRec.kellyFraction).toBeGreaterThanOrEqual(lowRec.kellyFraction)
  })

  it('each tier has correct label', () => {
    const recs = getUnitRecommendations(0.55, -110, config)
    expect(recs[0].label).toContain('quarter Kelly')
    expect(recs[1].label).toContain('half Kelly')
    expect(recs[2].label).toContain('three-quarter Kelly')
    expect(recs[3].label).toContain('full Kelly')
  })
})

describe('getFlatUnitSize', () => {
  it('conservative = 1% of bankroll', () => {
    expect(getFlatUnitSize(1000, 'conservative')).toBe(10)
  })

  it('moderate = 2% of bankroll', () => {
    expect(getFlatUnitSize(1000, 'moderate')).toBe(20)
  })

  it('aggressive = 3% of bankroll', () => {
    expect(getFlatUnitSize(1000, 'aggressive')).toBe(30)
  })

  it('scales with bankroll', () => {
    expect(getFlatUnitSize(10000, 'moderate')).toBe(200)
  })

  it('returns 0 for zero bankroll', () => {
    expect(getFlatUnitSize(0, 'moderate')).toBe(0)
  })
})

describe('kellyCriterion consistency with unit sizing', () => {
  it('Kelly output feeds correctly into unit sizing', () => {
    const winProb = 0.6
    const odds = -110
    const kelly = kellyCriterion(winProb, odds)
    expect(kelly).toBeGreaterThan(0)

    const recs = getUnitRecommendations(winProb, odds, { bankroll: 10000, unitSize: 100 })
    // Max confidence = full Kelly (capped)
    const maxRec = recs.find((r) => r.confidence === 'max')!
    // Kelly fraction should be the raw value (possibly capped at 5%)
    expect(maxRec.kellyFraction).toBeGreaterThan(0)
  })
})
