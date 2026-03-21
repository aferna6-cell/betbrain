/**
 * Tests for American odds validation — shared utility in src/lib/odds.ts.
 * Used by both the client pick form and the server API route.
 */

import { describe, it, expect } from 'vitest'
import { isValidAmericanOdds } from '@/lib/odds'

describe('isValidAmericanOdds', () => {
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
