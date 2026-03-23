import { describe, it, expect } from 'vitest'
import { getUnitRecommendations, getFlatUnitSize } from '../unit-sizing'

describe('getUnitRecommendations', () => {
  const config = { bankroll: 1000, unitSize: 10 }

  it('returns 4 recommendations (one per confidence tier)', () => {
    const recs = getUnitRecommendations(0.55, -110, config)
    expect(recs).toHaveLength(4)
  })

  it('returns ordered by confidence (low to max)', () => {
    const recs = getUnitRecommendations(0.55, -110, config)
    expect(recs[0].confidence).toBe('low')
    expect(recs[1].confidence).toBe('medium')
    expect(recs[2].confidence).toBe('high')
    expect(recs[3].confidence).toBe('max')
  })

  it('higher confidence = larger units', () => {
    const recs = getUnitRecommendations(0.55, -110, config)
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].units).toBeGreaterThanOrEqual(recs[i - 1].units)
    }
  })

  it('returns 0 units for -EV bets', () => {
    // 45% at -110 is negative EV
    const recs = getUnitRecommendations(0.45, -110, config)
    for (const rec of recs) {
      expect(rec.units).toBe(0)
    }
  })

  it('caps bankroll percentage at 5%', () => {
    // 90% at +200 = huge edge, Kelly would be > 5%
    const recs = getUnitRecommendations(0.9, 200, config)
    for (const rec of recs) {
      expect(rec.bankrollPct).toBeLessThanOrEqual(0.05)
    }
  })

  it('dollar amounts are non-negative', () => {
    const recs = getUnitRecommendations(0.55, -110, config)
    for (const rec of recs) {
      expect(rec.dollarAmount).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns empty for zero bankroll', () => {
    expect(getUnitRecommendations(0.55, -110, { bankroll: 0, unitSize: 10 })).toEqual([])
  })

  it('returns empty for zero unit size', () => {
    expect(getUnitRecommendations(0.55, -110, { bankroll: 1000, unitSize: 0 })).toEqual([])
  })

  it('respects custom kellyMultiplier', () => {
    const normalRecs = getUnitRecommendations(0.6, -110, config)
    const halfRecs = getUnitRecommendations(0.6, -110, { ...config, kellyMultiplier: 0.5 })
    // Half multiplier should produce smaller or equal units
    for (let i = 0; i < normalRecs.length; i++) {
      expect(halfRecs[i].units).toBeLessThanOrEqual(normalRecs[i].units)
    }
  })

  it('handles large bankrolls', () => {
    const recs = getUnitRecommendations(0.55, -110, { bankroll: 100000, unitSize: 100 })
    for (const rec of recs) {
      expect(isFinite(rec.dollarAmount)).toBe(true)
      expect(isFinite(rec.units)).toBe(true)
    }
  })

  it('each recommendation has a label', () => {
    const recs = getUnitRecommendations(0.55, -110, config)
    for (const rec of recs) {
      expect(rec.label).toBeTruthy()
    }
  })

  it('works with positive American odds (underdog)', () => {
    // 40% at +200 = small positive EV
    const recs = getUnitRecommendations(0.4, 200, config)
    expect(recs[3].units).toBeGreaterThan(0)
  })
})

describe('getFlatUnitSize', () => {
  it('conservative is 1% of bankroll', () => {
    expect(getFlatUnitSize(1000, 'conservative')).toBe(10)
  })

  it('moderate is 2% of bankroll', () => {
    expect(getFlatUnitSize(1000, 'moderate')).toBe(20)
  })

  it('aggressive is 3% of bankroll', () => {
    expect(getFlatUnitSize(1000, 'aggressive')).toBe(30)
  })

  it('handles decimal results', () => {
    expect(getFlatUnitSize(333, 'conservative')).toBe(3.33)
  })

  it('handles zero bankroll', () => {
    expect(getFlatUnitSize(0, 'moderate')).toBe(0)
  })
})
