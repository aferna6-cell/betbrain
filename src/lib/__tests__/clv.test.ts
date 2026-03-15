import { describe, it, expect } from 'vitest'
import {
  americanToImpliedProbability,
  calculateCLV,
  calculateCLVStats,
} from '@/lib/clv'

describe('americanToImpliedProbability', () => {
  it('converts negative American odds', () => {
    expect(americanToImpliedProbability(-110)).toBeCloseTo(0.5238, 3)
    expect(americanToImpliedProbability(-200)).toBeCloseTo(0.6667, 3)
    expect(americanToImpliedProbability(-150)).toBeCloseTo(0.6, 3)
  })

  it('converts positive American odds', () => {
    expect(americanToImpliedProbability(100)).toBeCloseTo(0.5, 3)
    expect(americanToImpliedProbability(150)).toBeCloseTo(0.4, 3)
    expect(americanToImpliedProbability(200)).toBeCloseTo(0.3333, 3)
  })

  it('converts even odds', () => {
    expect(americanToImpliedProbability(100)).toBeCloseTo(0.5, 3)
  })

  it('converts heavy favorites', () => {
    expect(americanToImpliedProbability(-500)).toBeCloseTo(0.8333, 3)
    expect(americanToImpliedProbability(-1000)).toBeCloseTo(0.9091, 3)
  })

  it('converts heavy underdogs', () => {
    expect(americanToImpliedProbability(500)).toBeCloseTo(0.1667, 3)
    expect(americanToImpliedProbability(1000)).toBeCloseTo(0.0909, 3)
  })
})

describe('calculateCLV', () => {
  it('returns positive CLV when closing line moves toward your side', () => {
    // Bet at -110 (52.38%), closed at -120 (54.55%) → +2.17% CLV
    const clv = calculateCLV(-110, -120)
    expect(clv).toBeGreaterThan(0)
    expect(clv).toBeCloseTo(2.16, 1)
  })

  it('returns negative CLV when closing line moves away from your side', () => {
    // Bet at -120 (54.55%), closed at -110 (52.38%) → -2.17% CLV
    const clv = calculateCLV(-120, -110)
    expect(clv).toBeLessThan(0)
    expect(clv).toBeCloseTo(-2.16, 1)
  })

  it('returns zero CLV when bet odds equal closing odds', () => {
    expect(calculateCLV(-110, -110)).toBe(0)
    expect(calculateCLV(150, 150)).toBe(0)
  })

  it('handles positive odds correctly', () => {
    // Bet at +150 (40%), closed at +130 (43.48%) → +3.48% CLV
    const clv = calculateCLV(150, 130)
    expect(clv).toBeGreaterThan(0)
    expect(clv).toBeCloseTo(3.48, 1)
  })

  it('handles cross-zero odds (favorite to underdog)', () => {
    // Bet at +100 (50%), closed at -110 (52.38%) → +2.38% CLV
    const clv = calculateCLV(100, -110)
    expect(clv).toBeGreaterThan(0)
  })

  it('handles large movements', () => {
    // Bet at +200 (33.33%), closed at -150 (60%) → +26.67% CLV
    const clv = calculateCLV(200, -150)
    expect(clv).toBeGreaterThan(20)
  })
})

describe('calculateCLVStats', () => {
  it('returns zeros for empty array', () => {
    const stats = calculateCLVStats([])
    expect(stats.averageCLV).toBe(0)
    expect(stats.totalPicks).toBe(0)
    expect(stats.positiveCLVCount).toBe(0)
    expect(stats.negativeCLVCount).toBe(0)
    expect(stats.positiveCLVRate).toBe(0)
    expect(stats.weightedCLV).toBe(0)
  })

  it('returns zeros when no picks have closing odds', () => {
    const stats = calculateCLVStats([
      { odds: -110, closing_odds: null, units: 1 },
      { odds: 150, closing_odds: null, units: 2 },
    ])
    expect(stats.totalPicks).toBe(0)
    expect(stats.averageCLV).toBe(0)
  })

  it('calculates stats for picks with closing odds', () => {
    const stats = calculateCLVStats([
      { odds: -110, closing_odds: -120, units: 1 }, // +CLV
      { odds: -120, closing_odds: -110, units: 1 }, // -CLV
      { odds: -110, closing_odds: -110, units: 1 }, // 0 CLV
    ])
    expect(stats.totalPicks).toBe(3)
    expect(stats.positiveCLVCount).toBe(1)
    expect(stats.negativeCLVCount).toBe(1)
  })

  it('filters out picks without closing odds', () => {
    const stats = calculateCLVStats([
      { odds: -110, closing_odds: -120, units: 1 },
      { odds: 150, closing_odds: null, units: 2 },
    ])
    expect(stats.totalPicks).toBe(1)
  })

  it('calculates weighted CLV by units', () => {
    const stats = calculateCLVStats([
      { odds: -110, closing_odds: -120, units: 5 }, // +CLV, 5 units
      { odds: -120, closing_odds: -110, units: 1 }, // -CLV, 1 unit
    ])
    // Weighted toward the 5-unit positive CLV pick
    expect(stats.weightedCLV).toBeGreaterThan(0)
  })

  it('calculates positive CLV rate', () => {
    const stats = calculateCLVStats([
      { odds: -110, closing_odds: -120, units: 1 }, // +CLV
      { odds: -110, closing_odds: -130, units: 1 }, // +CLV
      { odds: -120, closing_odds: -110, units: 1 }, // -CLV
      { odds: -130, closing_odds: -110, units: 1 }, // -CLV
    ])
    expect(stats.positiveCLVRate).toBe(50)
    expect(stats.positiveCLVCount).toBe(2)
    expect(stats.negativeCLVCount).toBe(2)
  })
})
