/**
 * Tests for the odds converter math used in the MiniOddsConverter component.
 * Validates implied probability and payout calculations.
 */

import { describe, it, expect } from 'vitest'

// Extract the calculation logic from the component for testing
function calcOddsDetails(odds: number) {
  const isValid = !isNaN(odds) && odds !== 0 && (odds <= -100 || odds >= 100)
  if (!isValid) return null

  let impliedProb: number
  let payout: number

  if (odds < 0) {
    impliedProb = Math.abs(odds) / (Math.abs(odds) + 100)
    payout = 100 + (100 / Math.abs(odds)) * 100
  } else {
    impliedProb = 100 / (odds + 100)
    payout = 100 + odds
  }

  return {
    impliedProb: Math.round(impliedProb * 1000) / 1000,
    payout: Math.round(payout * 100) / 100,
    profit: Math.round((payout - 100) * 100) / 100,
  }
}

describe('odds converter math', () => {
  it('calculates -110 correctly', () => {
    const result = calcOddsDetails(-110)!
    expect(result.impliedProb).toBeCloseTo(0.524, 2)
    expect(result.payout).toBeCloseTo(190.91, 0)
    expect(result.profit).toBeCloseTo(90.91, 0)
  })

  it('calculates +150 correctly', () => {
    const result = calcOddsDetails(150)!
    expect(result.impliedProb).toBeCloseTo(0.4, 1)
    expect(result.payout).toBe(250)
    expect(result.profit).toBe(150)
  })

  it('calculates -200 correctly', () => {
    const result = calcOddsDetails(-200)!
    expect(result.impliedProb).toBeCloseTo(0.667, 2)
    expect(result.payout).toBe(150)
    expect(result.profit).toBe(50)
  })

  it('calculates +100 (even money)', () => {
    const result = calcOddsDetails(100)!
    expect(result.impliedProb).toBe(0.5)
    expect(result.payout).toBe(200)
    expect(result.profit).toBe(100)
  })

  it('calculates -100 (even money)', () => {
    const result = calcOddsDetails(-100)!
    expect(result.impliedProb).toBe(0.5)
    expect(result.payout).toBe(200)
    expect(result.profit).toBe(100)
  })

  it('returns null for 0', () => {
    expect(calcOddsDetails(0)).toBeNull()
  })

  it('returns null for NaN', () => {
    expect(calcOddsDetails(NaN)).toBeNull()
  })

  it('returns null for invalid range (-50)', () => {
    expect(calcOddsDetails(-50)).toBeNull()
  })

  it('handles heavy favorite (-1000)', () => {
    const result = calcOddsDetails(-1000)!
    expect(result.impliedProb).toBeCloseTo(0.909, 2)
    expect(result.profit).toBeCloseTo(10, 0)
  })

  it('handles big underdog (+1000)', () => {
    const result = calcOddsDetails(1000)!
    expect(result.impliedProb).toBeCloseTo(0.091, 2)
    expect(result.profit).toBe(1000)
  })
})
