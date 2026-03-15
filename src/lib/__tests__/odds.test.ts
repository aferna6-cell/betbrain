/**
 * Odds conversion utility unit tests.
 *
 * Tests all exported functions in src/lib/odds.ts.
 * All functions are pure — no mocks or external dependencies required.
 */

import { describe, it, expect } from 'vitest'
import {
  americanToDecimal,
  decimalToAmerican,
  americanToImplied,
  impliedToAmerican,
  americanToFractional,
  formatAmerican,
  formatOdds,
  calculateVig,
  noVigOdds,
  getBestMoneyline,
  getBestSpreadOdds,
  getBestTotalOdds,
} from '@/lib/odds'
import type { NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// americanToDecimal
// ---------------------------------------------------------------------------

describe('americanToDecimal', () => {
  it('+150 → 2.5', () => {
    expect(americanToDecimal(150)).toBe(2.5)
  })

  it('-200 → 1.5', () => {
    expect(americanToDecimal(-200)).toBe(1.5)
  })

  it('+100 → 2.0', () => {
    expect(americanToDecimal(100)).toBe(2.0)
  })

  it('-100 → 2.0', () => {
    expect(americanToDecimal(-100)).toBe(2.0)
  })

  it('+300 → 4.0', () => {
    expect(americanToDecimal(300)).toBe(4.0)
  })

  it('-110 → ~1.909', () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 3)
  })

  it('+200 → 3.0', () => {
    expect(americanToDecimal(200)).toBe(3.0)
  })

  it('-400 → 1.25', () => {
    expect(americanToDecimal(-400)).toBe(1.25)
  })

  it('+1000 → 11.0 (very large positive)', () => {
    expect(americanToDecimal(1000)).toBe(11.0)
  })

  it('-1000 → 1.1 (very large negative)', () => {
    expect(americanToDecimal(-1000)).toBe(1.1)
  })
})

// ---------------------------------------------------------------------------
// decimalToAmerican
// ---------------------------------------------------------------------------

describe('decimalToAmerican', () => {
  it('2.5 → +150', () => {
    expect(decimalToAmerican(2.5)).toBe(150)
  })

  it('1.5 → -200', () => {
    expect(decimalToAmerican(1.5)).toBe(-200)
  })

  it('2.0 → +100', () => {
    expect(decimalToAmerican(2.0)).toBe(100)
  })

  it('4.0 → +300', () => {
    expect(decimalToAmerican(4.0)).toBe(300)
  })

  it('1.25 → -400', () => {
    expect(decimalToAmerican(1.25)).toBe(-400)
  })

  it('3.0 → +200', () => {
    expect(decimalToAmerican(3.0)).toBe(200)
  })

  it('11.0 → +1000', () => {
    expect(decimalToAmerican(11.0)).toBe(1000)
  })

  it('1.1 → -1000', () => {
    expect(decimalToAmerican(1.1)).toBe(-1000)
  })

  it('is approximately the inverse of americanToDecimal for +150', () => {
    expect(decimalToAmerican(americanToDecimal(150))).toBe(150)
  })

  it('is approximately the inverse of americanToDecimal for -110', () => {
    expect(decimalToAmerican(americanToDecimal(-110))).toBe(-110)
  })
})

// ---------------------------------------------------------------------------
// americanToImplied
// ---------------------------------------------------------------------------

describe('americanToImplied', () => {
  it('-110 → ~0.5238', () => {
    expect(americanToImplied(-110)).toBeCloseTo(0.5238, 4)
  })

  it('+200 → ~0.3333', () => {
    expect(americanToImplied(200)).toBeCloseTo(0.3333, 4)
  })

  it('-200 → ~0.6667', () => {
    expect(americanToImplied(-200)).toBeCloseTo(0.6667, 4)
  })

  it('+100 → 0.5', () => {
    expect(americanToImplied(100)).toBeCloseTo(0.5, 10)
  })

  it('-100 → 0.5', () => {
    expect(americanToImplied(-100)).toBeCloseTo(0.5, 10)
  })

  it('-300 → 0.75', () => {
    expect(americanToImplied(-300)).toBeCloseTo(0.75, 10)
  })

  it('+300 → 0.25', () => {
    expect(americanToImplied(300)).toBeCloseTo(0.25, 10)
  })

  it('+150 → ~0.4', () => {
    expect(americanToImplied(150)).toBeCloseTo(0.4, 10)
  })

  it('result is always between 0 and 1 for +1000', () => {
    const implied = americanToImplied(1000)
    expect(implied).toBeGreaterThan(0)
    expect(implied).toBeLessThan(1)
  })

  it('result is always between 0 and 1 for -1000', () => {
    const implied = americanToImplied(-1000)
    expect(implied).toBeGreaterThan(0)
    expect(implied).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// impliedToAmerican
// ---------------------------------------------------------------------------

describe('impliedToAmerican', () => {
  it('0.5 → -100 or +100 (evens)', () => {
    // At exactly 50% the American odds representation depends on rounding
    // -100 and +100 are both valid representations of evens
    const result = impliedToAmerican(0.5)
    expect([100, -100]).toContain(result)
  })

  it('0.75 → -300 (heavy favourite)', () => {
    expect(impliedToAmerican(0.75)).toBe(-300)
  })

  it('0.25 → +300 (underdog)', () => {
    expect(impliedToAmerican(0.25)).toBe(300)
  })

  it('0.4 → +150 (underdog — reverse of americanToImplied)', () => {
    expect(impliedToAmerican(0.4)).toBe(150)
  })

  it('is approximately the inverse of americanToImplied for -110', () => {
    const implied = americanToImplied(-110)
    const backToAmerican = impliedToAmerican(implied)
    // -110 cannot round-trip perfectly because implied is irrational, but should be close
    expect(backToAmerican).toBeCloseTo(-110, -1)
  })

  it('0.6667 → approximately -200', () => {
    expect(impliedToAmerican(0.6667)).toBeCloseTo(-200, 0)
  })

  it('0.3333 → approximately +200', () => {
    expect(impliedToAmerican(0.3333)).toBeCloseTo(200, 0)
  })

  it('throws RangeError for probability = 0', () => {
    expect(() => impliedToAmerican(0)).toThrow(RangeError)
  })

  it('throws RangeError for probability = 1', () => {
    expect(() => impliedToAmerican(1)).toThrow(RangeError)
  })

  it('throws RangeError for probability > 1', () => {
    expect(() => impliedToAmerican(1.1)).toThrow(RangeError)
  })

  it('throws RangeError for probability < 0', () => {
    expect(() => impliedToAmerican(-0.1)).toThrow(RangeError)
  })

  it('very small probability (0.05) → large positive American odds', () => {
    const result = impliedToAmerican(0.05)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeGreaterThan(1000)
  })

  it('very large probability (0.95) → large negative American odds', () => {
    const result = impliedToAmerican(0.95)
    expect(result).toBeLessThan(0)
    expect(result).toBeLessThan(-1000)
  })
})

// ---------------------------------------------------------------------------
// americanToFractional
// ---------------------------------------------------------------------------

describe('americanToFractional', () => {
  it('+150 → "3/2"', () => {
    expect(americanToFractional(150)).toBe('3/2')
  })

  it('-200 → "1/2"', () => {
    expect(americanToFractional(-200)).toBe('1/2')
  })

  it('+100 → "1/1" (evens)', () => {
    expect(americanToFractional(100)).toBe('1/1')
  })

  it('-100 → "1/1" (evens)', () => {
    expect(americanToFractional(-100)).toBe('1/1')
  })

  it('+300 → "3/1"', () => {
    expect(americanToFractional(300)).toBe('3/1')
  })

  it('+200 → "2/1"', () => {
    expect(americanToFractional(200)).toBe('2/1')
  })

  it('-400 → "1/4"', () => {
    expect(americanToFractional(-400)).toBe('1/4')
  })

  it('result is always in "numerator/denominator" format', () => {
    const result = americanToFractional(150)
    expect(result).toMatch(/^\d+\/\d+$/)
  })

  it('denominator is never 0', () => {
    const result = americanToFractional(200)
    const denom = parseInt(result.split('/')[1])
    expect(denom).not.toBe(0)
  })
})

// ---------------------------------------------------------------------------
// formatAmerican
// ---------------------------------------------------------------------------

describe('formatAmerican', () => {
  it('+150 → "+150"', () => {
    expect(formatAmerican(150)).toBe('+150')
  })

  it('-200 → "-200"', () => {
    expect(formatAmerican(-200)).toBe('-200')
  })

  it('+100 → "+100"', () => {
    expect(formatAmerican(100)).toBe('+100')
  })

  it('-110 → "-110"', () => {
    expect(formatAmerican(-110)).toBe('-110')
  })

  it('0 → "+0" (zero is treated as non-negative)', () => {
    expect(formatAmerican(0)).toBe('+0')
  })

  it('+1000 → "+1000"', () => {
    expect(formatAmerican(1000)).toBe('+1000')
  })

  it('-1000 → "-1000"', () => {
    expect(formatAmerican(-1000)).toBe('-1000')
  })

  it('always starts with + for positive', () => {
    expect(formatAmerican(250).startsWith('+')).toBe(true)
  })

  it('always starts with - for negative', () => {
    expect(formatAmerican(-250).startsWith('-')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// calculateVig
// ---------------------------------------------------------------------------

describe('calculateVig', () => {
  it('-110/-110 → ~0.0476 (4.76% standard vig)', () => {
    expect(calculateVig(-110, -110)).toBeCloseTo(0.0476, 3)
  })

  it('+100/+100 → 0.0 (no vig at even money — unusual but valid)', () => {
    // 0.5 + 0.5 - 1 = 0
    expect(calculateVig(100, 100)).toBeCloseTo(0.0, 10)
  })

  it('-105/-105 → ~0.0238 (~2.4% reduced vig)', () => {
    // implied(-105) ≈ 0.5122, total ≈ 1.0244
    expect(calculateVig(-105, -105)).toBeCloseTo(0.0244, 3)
  })

  it('-115/+105 → small positive vig (asymmetric market)', () => {
    const vig = calculateVig(-115, 105)
    expect(vig).toBeGreaterThan(0)
  })

  it('-200/+160 → positive vig (typical favourite/underdog market)', () => {
    const vig = calculateVig(-200, 160)
    expect(vig).toBeGreaterThan(0)
  })

  it('returns a number', () => {
    expect(typeof calculateVig(-110, -110)).toBe('number')
  })

  it('vig is non-negative for any typical two-sided market', () => {
    expect(calculateVig(-120, +100)).toBeGreaterThanOrEqual(0)
    expect(calculateVig(-150, +130)).toBeGreaterThanOrEqual(0)
    expect(calculateVig(-110, -110)).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// noVigOdds
// ---------------------------------------------------------------------------

describe('noVigOdds', () => {
  it('-110/-110 produces fair odds that sum to exactly 100% implied probability', () => {
    const { fair1, fair2 } = noVigOdds(-110, -110)
    const p1 = americanToImplied(fair1)
    const p2 = americanToImplied(fair2)
    expect(p1 + p2).toBeCloseTo(1.0, 6)
  })

  it('-200/+160 fair odds sum to 100%', () => {
    const { fair1, fair2 } = noVigOdds(-200, 160)
    const p1 = americanToImplied(fair1)
    const p2 = americanToImplied(fair2)
    expect(p1 + p2).toBeCloseTo(1.0, 6)
  })

  it('-110/-110 fair odds are approximately +100/-100 (evens after removing vig)', () => {
    const { fair1, fair2 } = noVigOdds(-110, -110)
    // With equal -110/-110, the fair price is evens (+100 / -100)
    expect(Math.abs(fair1)).toBeCloseTo(100, 0)
    expect(Math.abs(fair2)).toBeCloseTo(100, 0)
  })

  it('-200/+160: favourite stays favourite and underdog stays underdog after removal', () => {
    const { fair1, fair2 } = noVigOdds(-200, 160)
    // fair1 from -200 favourite should still be negative (favourite)
    expect(fair1).toBeLessThan(0)
    // fair2 from +160 underdog should still be positive (underdog)
    expect(fair2).toBeGreaterThan(0)
  })

  it('returns two numeric properties', () => {
    const result = noVigOdds(-110, -110)
    expect(typeof result.fair1).toBe('number')
    expect(typeof result.fair2).toBe('number')
  })

  it('fair odds sum to 100% for an asymmetric -115/+105 market', () => {
    const { fair1, fair2 } = noVigOdds(-115, 105)
    const p1 = americanToImplied(fair1)
    const p2 = americanToImplied(fair2)
    expect(p1 + p2).toBeCloseTo(1.0, 6)
  })

  it('fair odds sum to 100% for a heavy favourite -300/+240 market', () => {
    const { fair1, fair2 } = noVigOdds(-300, 240)
    const p1 = americanToImplied(fair1)
    const p2 = americanToImplied(fair2)
    expect(p1 + p2).toBeCloseTo(1.0, 6)
  })
})

// ---------------------------------------------------------------------------
// formatOdds (display formatter with null handling)
// ---------------------------------------------------------------------------

describe('formatOdds', () => {
  it('returns em dash for null', () => {
    expect(formatOdds(null)).toBe('—')
  })

  it('prepends + for positive odds', () => {
    expect(formatOdds(150)).toBe('+150')
  })

  it('returns negative as-is', () => {
    expect(formatOdds(-110)).toBe('-110')
  })

  it('returns "0" for zero (no + prefix)', () => {
    expect(formatOdds(0)).toBe('0')
  })

  it('handles even money +100', () => {
    expect(formatOdds(100)).toBe('+100')
  })

  it('handles large favorites', () => {
    expect(formatOdds(-500)).toBe('-500')
  })

  it('handles large underdogs', () => {
    expect(formatOdds(1000)).toBe('+1000')
  })
})

// ---------------------------------------------------------------------------
// Best-odds finders
// ---------------------------------------------------------------------------

function makeBk(overrides: Partial<NormalizedBookmakerOdds> = {}): NormalizedBookmakerOdds {
  return {
    bookmaker: 'test',
    moneyline: null,
    spread: null,
    total: null,
    lastUpdated: '2026-03-14T12:00:00Z',
    ...overrides,
  }
}

describe('getBestMoneyline', () => {
  it('returns null for empty array', () => {
    expect(getBestMoneyline([], 'home')).toBeNull()
  })

  it('picks highest home price', () => {
    const bks = [
      makeBk({ moneyline: { home: -150, away: 130, draw: null } }),
      makeBk({ moneyline: { home: -140, away: 125, draw: null } }),
    ]
    expect(getBestMoneyline(bks, 'home')).toBe(-140)
  })

  it('picks highest away price', () => {
    const bks = [
      makeBk({ moneyline: { home: -150, away: 130, draw: null } }),
      makeBk({ moneyline: { home: -140, away: 135, draw: null } }),
    ]
    expect(getBestMoneyline(bks, 'away')).toBe(135)
  })

  it('skips null moneyline', () => {
    const bks = [
      makeBk({ moneyline: null }),
      makeBk({ moneyline: { home: -110, away: 100, draw: null } }),
    ]
    expect(getBestMoneyline(bks, 'home')).toBe(-110)
  })
})

describe('getBestSpreadOdds', () => {
  it('returns null for empty array', () => {
    expect(getBestSpreadOdds([], 'home')).toBeNull()
  })

  it('picks highest home spread odds', () => {
    const bks = [
      makeBk({ spread: { homeLine: -3.5, awayLine: 3.5, homeOdds: -110, awayOdds: -110 } }),
      makeBk({ spread: { homeLine: -3.5, awayLine: 3.5, homeOdds: -105, awayOdds: -115 } }),
    ]
    expect(getBestSpreadOdds(bks, 'home')).toBe(-105)
  })

  it('picks highest away spread odds', () => {
    const bks = [
      makeBk({ spread: { homeLine: -3.5, awayLine: 3.5, homeOdds: -110, awayOdds: -110 } }),
      makeBk({ spread: { homeLine: -3.5, awayLine: 3.5, homeOdds: -105, awayOdds: -105 } }),
    ]
    expect(getBestSpreadOdds(bks, 'away')).toBe(-105)
  })

  it('skips null spread', () => {
    const bks = [
      makeBk({ spread: null }),
      makeBk({ spread: { homeLine: -3.5, awayLine: 3.5, homeOdds: -110, awayOdds: -110 } }),
    ]
    expect(getBestSpreadOdds(bks, 'home')).toBe(-110)
  })
})

describe('getBestTotalOdds', () => {
  it('returns null for empty array', () => {
    expect(getBestTotalOdds([], 'over')).toBeNull()
  })

  it('picks highest over odds', () => {
    const bks = [
      makeBk({ total: { line: 220.5, overOdds: -115, underOdds: -105 } }),
      makeBk({ total: { line: 220.5, overOdds: -110, underOdds: -110 } }),
    ]
    expect(getBestTotalOdds(bks, 'over')).toBe(-110)
  })

  it('picks highest under odds', () => {
    const bks = [
      makeBk({ total: { line: 220.5, overOdds: -110, underOdds: -110 } }),
      makeBk({ total: { line: 220.5, overOdds: -115, underOdds: -105 } }),
    ]
    expect(getBestTotalOdds(bks, 'under')).toBe(-105)
  })

  it('skips null total', () => {
    const bks = [
      makeBk({ total: null }),
      makeBk({ total: { line: 220.5, overOdds: -110, underOdds: -110 } }),
    ]
    expect(getBestTotalOdds(bks, 'over')).toBe(-110)
  })
})
