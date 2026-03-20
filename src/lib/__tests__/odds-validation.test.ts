/**
 * Tests for American odds validation logic used in pick creation.
 * Mirrors the validation in both the client form and API route.
 */

import { describe, it, expect } from 'vitest'

function isValidAmericanOdds(odds: number): boolean {
  if (odds === 0) return false
  if (isNaN(odds)) return false
  if (odds > -100 && odds < 100) return false
  return true
}

describe('American odds validation', () => {
  it('rejects zero', () => {
    expect(isValidAmericanOdds(0)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidAmericanOdds(NaN)).toBe(false)
  })

  it('rejects odds between -100 and +100 (invalid range)', () => {
    expect(isValidAmericanOdds(-50)).toBe(false)
    expect(isValidAmericanOdds(50)).toBe(false)
    expect(isValidAmericanOdds(-99)).toBe(false)
    expect(isValidAmericanOdds(99)).toBe(false)
    expect(isValidAmericanOdds(1)).toBe(false)
    expect(isValidAmericanOdds(-1)).toBe(false)
  })

  it('accepts -100 (even money favorite)', () => {
    expect(isValidAmericanOdds(-100)).toBe(true)
  })

  it('accepts +100 (even money underdog)', () => {
    expect(isValidAmericanOdds(100)).toBe(true)
  })

  it('accepts standard favorite odds', () => {
    expect(isValidAmericanOdds(-110)).toBe(true)
    expect(isValidAmericanOdds(-150)).toBe(true)
    expect(isValidAmericanOdds(-300)).toBe(true)
    expect(isValidAmericanOdds(-10000)).toBe(true)
  })

  it('accepts standard underdog odds', () => {
    expect(isValidAmericanOdds(110)).toBe(true)
    expect(isValidAmericanOdds(150)).toBe(true)
    expect(isValidAmericanOdds(300)).toBe(true)
    expect(isValidAmericanOdds(10000)).toBe(true)
  })
})
