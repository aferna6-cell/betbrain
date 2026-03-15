/**
 * Alert condition logic tests.
 *
 * Tests the alert value extraction and trigger decision logic
 * for all three markets: moneyline, spreads, and totals.
 */

import { describe, it, expect } from 'vitest'
import type { NormalizedBookmakerOdds } from '@/lib/sports/config'

// Re-implement getAlertValue logic for testing (it's private in alerts.ts)
function getAlertValue(
  bk: NormalizedBookmakerOdds,
  market: string,
  side: 'home' | 'away'
): number | null {
  switch (market) {
    case 'moneyline':
      return side === 'home' ? bk.moneyline?.home ?? null : bk.moneyline?.away ?? null
    case 'spreads':
      return side === 'home' ? bk.spread?.homeLine ?? null : bk.spread?.awayLine ?? null
    case 'totals':
      return bk.total?.line ?? null
    default:
      return null
  }
}

function shouldTrigger(
  value: number | null,
  condition: 'above' | 'below',
  threshold: number
): boolean {
  if (value === null) return false
  return condition === 'above' ? value > threshold : value < threshold
}

function makeBk(overrides: Partial<NormalizedBookmakerOdds> = {}): NormalizedBookmakerOdds {
  return {
    bookmaker: 'test',
    moneyline: null,
    spread: null,
    total: null,
    lastUpdated: '2026-03-15T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getAlertValue — moneyline
// ---------------------------------------------------------------------------

describe('getAlertValue — moneyline', () => {
  it('returns home moneyline for home side', () => {
    const bk = makeBk({ moneyline: { home: -150, away: 130, draw: null } })
    expect(getAlertValue(bk, 'moneyline', 'home')).toBe(-150)
  })

  it('returns away moneyline for away side', () => {
    const bk = makeBk({ moneyline: { home: -150, away: 130, draw: null } })
    expect(getAlertValue(bk, 'moneyline', 'away')).toBe(130)
  })

  it('returns null when moneyline is missing', () => {
    const bk = makeBk()
    expect(getAlertValue(bk, 'moneyline', 'home')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getAlertValue — spreads
// ---------------------------------------------------------------------------

describe('getAlertValue — spreads', () => {
  it('returns home spread line for home side', () => {
    const bk = makeBk({
      spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
    })
    expect(getAlertValue(bk, 'spreads', 'home')).toBe(-5.5)
  })

  it('returns away spread line for away side', () => {
    const bk = makeBk({
      spread: { homeLine: -5.5, homeOdds: -110, awayLine: 5.5, awayOdds: -110 },
    })
    expect(getAlertValue(bk, 'spreads', 'away')).toBe(5.5)
  })

  it('returns null when spread is missing', () => {
    const bk = makeBk()
    expect(getAlertValue(bk, 'spreads', 'home')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getAlertValue — totals
// ---------------------------------------------------------------------------

describe('getAlertValue — totals', () => {
  it('returns total line regardless of side', () => {
    const bk = makeBk({
      total: { line: 220.5, overOdds: -110, underOdds: -110 },
    })
    expect(getAlertValue(bk, 'totals', 'home')).toBe(220.5)
    expect(getAlertValue(bk, 'totals', 'away')).toBe(220.5)
  })

  it('returns null when total is missing', () => {
    const bk = makeBk()
    expect(getAlertValue(bk, 'totals', 'home')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getAlertValue — unknown market
// ---------------------------------------------------------------------------

describe('getAlertValue — unknown market', () => {
  it('returns null for unrecognized market', () => {
    const bk = makeBk({ moneyline: { home: -110, away: 100, draw: null } })
    expect(getAlertValue(bk, 'props', 'home')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// shouldTrigger
// ---------------------------------------------------------------------------

describe('shouldTrigger', () => {
  it('triggers when value is above threshold (above condition)', () => {
    expect(shouldTrigger(-100, 'above', -110)).toBe(true)
  })

  it('does not trigger when value equals threshold (above condition)', () => {
    expect(shouldTrigger(-110, 'above', -110)).toBe(false)
  })

  it('triggers when value is below threshold (below condition)', () => {
    expect(shouldTrigger(-120, 'below', -110)).toBe(true)
  })

  it('does not trigger when value equals threshold (below condition)', () => {
    expect(shouldTrigger(-110, 'below', -110)).toBe(false)
  })

  it('does not trigger for null value', () => {
    expect(shouldTrigger(null, 'above', -110)).toBe(false)
    expect(shouldTrigger(null, 'below', -110)).toBe(false)
  })

  // Spread-specific scenarios
  it('triggers spread alert: line moves past threshold', () => {
    // Alert: "notify when spread goes below -6"
    expect(shouldTrigger(-6.5, 'below', -6)).toBe(true)
  })

  it('does not trigger spread alert: line not past threshold', () => {
    expect(shouldTrigger(-5.5, 'below', -6)).toBe(false)
  })

  // Total-specific scenarios
  it('triggers total alert: line moves above threshold', () => {
    // Alert: "notify when total goes above 220"
    expect(shouldTrigger(221.5, 'above', 220)).toBe(true)
  })

  it('does not trigger total alert: line not past threshold', () => {
    expect(shouldTrigger(219.5, 'above', 220)).toBe(false)
  })
})
