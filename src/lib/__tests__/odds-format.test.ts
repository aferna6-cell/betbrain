/**
 * Tests for the odds format conversion logic used by OddsFormatProvider.
 * Validates American → Decimal and American → Fractional conversion.
 */

import { describe, it, expect } from 'vitest'
import { americanToDecimal, americanToFractional } from '@/lib/odds'

type OddsFormat = 'american' | 'decimal' | 'fractional'

function formatPrice(american: number | null, format: OddsFormat): string {
  if (american === null) return '—'
  if (format === 'decimal') return americanToDecimal(american).toFixed(2)
  if (format === 'fractional') return americanToFractional(american)
  return american > 0 ? `+${american}` : `${american}`
}

describe('formatPrice (American mode)', () => {
  it('formats positive odds with + prefix', () => {
    expect(formatPrice(150, 'american')).toBe('+150')
  })

  it('formats negative odds as-is', () => {
    expect(formatPrice(-110, 'american')).toBe('-110')
  })

  it('returns em dash for null', () => {
    expect(formatPrice(null, 'american')).toBe('—')
  })
})

describe('formatPrice (Decimal mode)', () => {
  it('converts -110 to 1.91', () => {
    expect(formatPrice(-110, 'decimal')).toBe('1.91')
  })

  it('converts +150 to 2.50', () => {
    expect(formatPrice(150, 'decimal')).toBe('2.50')
  })

  it('converts -200 to 1.50', () => {
    expect(formatPrice(-200, 'decimal')).toBe('1.50')
  })

  it('converts +100 to 2.00', () => {
    expect(formatPrice(100, 'decimal')).toBe('2.00')
  })

  it('converts -100 to 2.00', () => {
    expect(formatPrice(-100, 'decimal')).toBe('2.00')
  })

  it('converts +300 to 4.00', () => {
    expect(formatPrice(300, 'decimal')).toBe('4.00')
  })

  it('returns em dash for null', () => {
    expect(formatPrice(null, 'decimal')).toBe('—')
  })
})

describe('formatPrice (Fractional mode)', () => {
  it('converts +150 to 3/2', () => {
    expect(formatPrice(150, 'fractional')).toBe('3/2')
  })

  it('converts -200 to 1/2', () => {
    expect(formatPrice(-200, 'fractional')).toBe('1/2')
  })

  it('converts +100 to 1/1 (evens)', () => {
    expect(formatPrice(100, 'fractional')).toBe('1/1')
  })

  it('converts -100 to 1/1 (evens)', () => {
    expect(formatPrice(-100, 'fractional')).toBe('1/1')
  })

  it('converts +300 to 3/1', () => {
    expect(formatPrice(300, 'fractional')).toBe('3/1')
  })

  it('returns em dash for null', () => {
    expect(formatPrice(null, 'fractional')).toBe('—')
  })
})
