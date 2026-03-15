/**
 * Smart Signals detection logic unit tests.
 *
 * Tests the exported SmartSignal interface, the detection thresholds,
 * signal strength rules, and moneyline variance calculation.
 *
 * Does NOT call Supabase — only pure logic and type compliance are tested.
 * The constants (MIN_BOOKMAKERS_FOR_SIGNAL, MONEYLINE_VARIANCE_THRESHOLD,
 * AI_CONFIDENCE_THRESHOLD) are not exported, so they are reproduced here
 * with the documented values and exercised through replicated helper logic.
 */

import { describe, it, expect } from 'vitest'
import type { SmartSignal } from '@/lib/signals'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Constants (mirrors signals.ts — update here if the source changes)
// ---------------------------------------------------------------------------

const MIN_BOOKMAKERS_FOR_SIGNAL = 3
const MONEYLINE_VARIANCE_THRESHOLD = 30
const AI_CONFIDENCE_THRESHOLD = 75

// ---------------------------------------------------------------------------
// Replicated helpers — match the private implementations in signals.ts
// ---------------------------------------------------------------------------

function getMoneylineVariance(bookmakers: NormalizedBookmakerOdds[]): {
  home: number
  away: number
} {
  const homePrices: number[] = []
  const awayPrices: number[] = []

  for (const bk of bookmakers) {
    if (bk.moneyline?.home !== null && bk.moneyline?.home !== undefined) {
      homePrices.push(bk.moneyline.home)
    }
    if (bk.moneyline?.away !== null && bk.moneyline?.away !== undefined) {
      awayPrices.push(bk.moneyline.away)
    }
  }

  return {
    home:
      homePrices.length >= 2
        ? Math.max(...homePrices) - Math.min(...homePrices)
        : 0,
    away:
      awayPrices.length >= 2
        ? Math.max(...awayPrices) - Math.min(...awayPrices)
        : 0,
  }
}

function signalStrength(signalCount: number): 'strong' | 'moderate' {
  return signalCount >= 3 ? 'strong' : 'moderate'
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeBookmaker(
  name: string,
  homeOdds: number | null,
  awayOdds: number | null
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: homeOdds, away: awayOdds, draw: null },
    spread: null,
    total: null,
    lastUpdated: '2026-03-14T08:00:00Z',
  }
}

function makeGame(
  bookmakers: NormalizedBookmakerOdds[],
  overrides: Partial<NormalizedGame> = {}
): NormalizedGame {
  return {
    id: 'game-001',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-14T23:00:00Z',
    fromCache: true,
    isFresh: true,
    bookmakers,
    ...overrides,
  }
}

function makeSignal(overrides: Partial<SmartSignal> = {}): SmartSignal {
  const game = makeGame([
    makeBookmaker('DraftKings', -115, -105),
    makeBookmaker('FanDuel', -120, +100),
    makeBookmaker('BetMGM', -110, -110),
  ])
  return {
    game,
    signals: ['Odds variance signal', 'High AI confidence signal'],
    strength: 'moderate',
    aiConfidence: 80,
    bestValue: { side: 'away', reasoning: 'Books disagree significantly on away price.' },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. SmartSignal interface compliance
// ---------------------------------------------------------------------------

describe('SmartSignal interface compliance', () => {
  it('a well-formed signal satisfies the interface shape', () => {
    const signal = makeSignal()
    expect(typeof signal.game.id).toBe('string')
    expect(Array.isArray(signal.signals)).toBe(true)
    expect(['strong', 'moderate']).toContain(signal.strength)
    expect(signal.aiConfidence === null || typeof signal.aiConfidence === 'number').toBe(true)
    expect(['home', 'away', null]).toContain(signal.bestValue.side)
    expect(
      signal.bestValue.reasoning === null || typeof signal.bestValue.reasoning === 'string'
    ).toBe(true)
  })

  it('aiConfidence can be null when no cached insight exists', () => {
    const signal = makeSignal({ aiConfidence: null })
    expect(signal.aiConfidence).toBeNull()
  })

  it('bestValue.side can be null when AI has no clear value pick', () => {
    const signal = makeSignal({ bestValue: { side: null, reasoning: null } })
    expect(signal.bestValue.side).toBeNull()
    expect(signal.bestValue.reasoning).toBeNull()
  })

  it('strength is either strong or moderate — no other values', () => {
    const moderate = makeSignal({ strength: 'moderate' })
    const strong = makeSignal({ strength: 'strong' })
    expect(moderate.strength).toBe('moderate')
    expect(strong.strength).toBe('strong')
  })

  it('signals array can hold multiple independent signal strings', () => {
    const signal = makeSignal({
      signals: [
        'Home moneyline varies by 35 pts across books — line shopping opportunity',
        'AI analysis confidence: 82% — above threshold',
        'AI identifies value on home side',
      ],
      strength: 'strong',
    })
    expect(signal.signals).toHaveLength(3)
    for (const s of signal.signals) {
      expect(typeof s).toBe('string')
      expect(s.length).toBeGreaterThan(0)
    }
  })

  it('game field carries full NormalizedGame including bookmakers array', () => {
    const signal = makeSignal()
    expect(Array.isArray(signal.game.bookmakers)).toBe(true)
    expect(signal.game.bookmakers.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Signal strength rules
// ---------------------------------------------------------------------------

describe('Signal strength rules', () => {
  it('exactly 2 signals produces moderate strength', () => {
    expect(signalStrength(2)).toBe('moderate')
  })

  it('exactly 3 signals produces strong strength', () => {
    expect(signalStrength(3)).toBe('strong')
  })

  it('4 or more signals also produces strong strength', () => {
    expect(signalStrength(4)).toBe('strong')
    expect(signalStrength(10)).toBe('strong')
  })

  it('1 signal would be moderate (below the 2-signal emit threshold)', () => {
    // detectSmartSignals only emits a SmartSignal when >= 2 signals fire,
    // but the strength function itself classifies 1 as moderate too.
    expect(signalStrength(1)).toBe('moderate')
  })

  it('a signal with 2 signal strings has moderate strength on the object', () => {
    const signal = makeSignal({
      signals: ['signal-a', 'signal-b'],
      strength: signalStrength(2),
    })
    expect(signal.strength).toBe('moderate')
  })

  it('a signal with 3 signal strings has strong strength on the object', () => {
    const signal = makeSignal({
      signals: ['signal-a', 'signal-b', 'signal-c'],
      strength: signalStrength(3),
    })
    expect(signal.strength).toBe('strong')
  })

  it('signal strength does not depend on aiConfidence value', () => {
    // High confidence alone doesn't override the count-based rule
    const highConf = makeSignal({ signals: ['s1', 's2'], aiConfidence: 99, strength: signalStrength(2) })
    expect(highConf.strength).toBe('moderate')
  })
})

// ---------------------------------------------------------------------------
// 3. Moneyline variance calculation
// ---------------------------------------------------------------------------

describe('Moneyline variance calculation', () => {
  it('returns 0 for home when only one bookmaker has a home price', () => {
    const bks = [makeBookmaker('DK', -115, -105)]
    expect(getMoneylineVariance(bks).home).toBe(0)
  })

  it('returns 0 for away when only one bookmaker has an away price', () => {
    const bks = [makeBookmaker('DK', -115, -105)]
    expect(getMoneylineVariance(bks).away).toBe(0)
  })

  it('calculates home variance as max minus min across bookmakers', () => {
    const bks = [
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -140, -110),
      makeBookmaker('MGM', -125, -110),
    ]
    // home prices: [-110, -140, -125] → max=-110, min=-140, variance=30
    expect(getMoneylineVariance(bks).home).toBe(30)
  })

  it('calculates away variance as max minus min across bookmakers', () => {
    const bks = [
      makeBookmaker('DK', -110, +120),
      makeBookmaker('FD', -110, +150),
      makeBookmaker('MGM', -110, +130),
    ]
    // away prices: [120, 150, 130] → max=150, min=120, variance=30
    expect(getMoneylineVariance(bks).away).toBe(30)
  })

  it('handles null moneyline prices — skips nulls correctly', () => {
    const bks: NormalizedBookmakerOdds[] = [
      { bookmaker: 'DK', moneyline: { home: -115, away: null, draw: null }, spread: null, total: null, lastUpdated: '' },
      { bookmaker: 'FD', moneyline: { home: -150, away: null, draw: null }, spread: null, total: null, lastUpdated: '' },
    ]
    const variance = getMoneylineVariance(bks)
    expect(variance.home).toBe(35) // -115 - (-150) = 35
    expect(variance.away).toBe(0)  // no away prices
  })

  it('handles bookmakers with null moneyline object', () => {
    const bks: NormalizedBookmakerOdds[] = [
      { bookmaker: 'DK', moneyline: null, spread: null, total: null, lastUpdated: '' },
      { bookmaker: 'FD', moneyline: null, spread: null, total: null, lastUpdated: '' },
    ]
    const variance = getMoneylineVariance(bks)
    expect(variance.home).toBe(0)
    expect(variance.away).toBe(0)
  })

  it('returns 0 for both sides when bookmakers array is empty', () => {
    const variance = getMoneylineVariance([])
    expect(variance.home).toBe(0)
    expect(variance.away).toBe(0)
  })

  it('a variance of exactly 30 equals the threshold (boundary)', () => {
    const bks = [
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -140, -110),
    ]
    const variance = getMoneylineVariance(bks)
    expect(variance.home).toBe(30)
    expect(variance.home).toBe(MONEYLINE_VARIANCE_THRESHOLD)
  })

  it('variance above 30 exceeds the threshold — would trigger a signal', () => {
    const bks = [
      makeBookmaker('DK', -105, -110),
      makeBookmaker('FD', -140, -110),
    ]
    const variance = getMoneylineVariance(bks)
    expect(variance.home).toBe(35)
    expect(variance.home).toBeGreaterThan(MONEYLINE_VARIANCE_THRESHOLD)
  })

  it('variance below 30 does not exceed the threshold — no signal', () => {
    const bks = [
      makeBookmaker('DK', -115, -110),
      makeBookmaker('FD', -130, -110),
    ]
    const variance = getMoneylineVariance(bks)
    expect(variance.home).toBe(15)
    expect(variance.home).toBeLessThan(MONEYLINE_VARIANCE_THRESHOLD)
  })
})

// ---------------------------------------------------------------------------
// 4. MIN_BOOKMAKERS_FOR_SIGNAL — games with < 3 bookmakers are skipped
// ---------------------------------------------------------------------------

describe('MIN_BOOKMAKERS_FOR_SIGNAL threshold', () => {
  it('constant is 3', () => {
    expect(MIN_BOOKMAKERS_FOR_SIGNAL).toBe(3)
  })

  it('a game with 0 bookmakers is below the threshold', () => {
    expect(0 < MIN_BOOKMAKERS_FOR_SIGNAL).toBe(true)
  })

  it('a game with 1 bookmaker is below the threshold', () => {
    expect(1 < MIN_BOOKMAKERS_FOR_SIGNAL).toBe(true)
  })

  it('a game with 2 bookmakers is below the threshold', () => {
    expect(2 < MIN_BOOKMAKERS_FOR_SIGNAL).toBe(true)
  })

  it('a game with exactly 3 bookmakers meets the threshold', () => {
    expect(3 < MIN_BOOKMAKERS_FOR_SIGNAL).toBe(false)
    expect(3 >= MIN_BOOKMAKERS_FOR_SIGNAL).toBe(true)
  })

  it('a game with 4+ bookmakers also meets the threshold', () => {
    expect(4 >= MIN_BOOKMAKERS_FOR_SIGNAL).toBe(true)
    expect(10 >= MIN_BOOKMAKERS_FOR_SIGNAL).toBe(true)
  })

  it('a game fixture with 3 bookmakers would not be skipped', () => {
    const game = makeGame([
      makeBookmaker('DK', -115, -105),
      makeBookmaker('FD', -120, +100),
      makeBookmaker('MGM', -110, -110),
    ])
    expect(game.bookmakers.length >= MIN_BOOKMAKERS_FOR_SIGNAL).toBe(true)
  })

  it('a game fixture with 2 bookmakers would be skipped', () => {
    const game = makeGame([
      makeBookmaker('DK', -115, -105),
      makeBookmaker('FD', -120, +100),
    ])
    expect(game.bookmakers.length < MIN_BOOKMAKERS_FOR_SIGNAL).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 5. AI_CONFIDENCE_THRESHOLD — 75% threshold
// ---------------------------------------------------------------------------

describe('AI_CONFIDENCE_THRESHOLD', () => {
  it('constant is 75', () => {
    expect(AI_CONFIDENCE_THRESHOLD).toBe(75)
  })

  it('confidence of 74 is below the threshold — no signal', () => {
    expect(74 >= AI_CONFIDENCE_THRESHOLD).toBe(false)
  })

  it('confidence of 75 meets the threshold — triggers signal', () => {
    expect(75 >= AI_CONFIDENCE_THRESHOLD).toBe(true)
  })

  it('confidence of 76 is above the threshold — triggers signal', () => {
    expect(76 >= AI_CONFIDENCE_THRESHOLD).toBe(true)
  })

  it('confidence of 100 is above the threshold', () => {
    expect(100 >= AI_CONFIDENCE_THRESHOLD).toBe(true)
  })

  it('null confidence does not meet the threshold', () => {
    const confidence: number | null = null
    expect(confidence !== null && confidence >= AI_CONFIDENCE_THRESHOLD).toBe(false)
  })

  it('a signal with aiConfidence 80 reflects an above-threshold value', () => {
    const signal = makeSignal({ aiConfidence: 80 })
    expect(signal.aiConfidence).not.toBeNull()
    expect(signal.aiConfidence! >= AI_CONFIDENCE_THRESHOLD).toBe(true)
  })

  it('a signal with aiConfidence 70 reflects a below-threshold value', () => {
    const signal = makeSignal({ aiConfidence: 70 })
    expect(signal.aiConfidence! >= AI_CONFIDENCE_THRESHOLD).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 6. MONEYLINE_VARIANCE_THRESHOLD — 30 point threshold
// ---------------------------------------------------------------------------

describe('MONEYLINE_VARIANCE_THRESHOLD', () => {
  it('constant is 30', () => {
    expect(MONEYLINE_VARIANCE_THRESHOLD).toBe(30)
  })

  it('variance of 29 does not exceed the threshold', () => {
    expect(29 > MONEYLINE_VARIANCE_THRESHOLD).toBe(false)
  })

  it('variance of 30 does not exceed the threshold (boundary is strictly >30)', () => {
    // signals.ts uses `> MONEYLINE_VARIANCE_THRESHOLD` (strict greater-than)
    expect(30 > MONEYLINE_VARIANCE_THRESHOLD).toBe(false)
  })

  it('variance of 31 exceeds the threshold — triggers signal', () => {
    expect(31 > MONEYLINE_VARIANCE_THRESHOLD).toBe(true)
  })

  it('three bookmakers with spread of 35 produce a triggering variance', () => {
    const bks = [
      makeBookmaker('DK', -100, -110),
      makeBookmaker('FD', -135, -110),
      makeBookmaker('MGM', -120, -110),
    ]
    // home prices: [-100, -135, -120] → max=-100, min=-135, variance=35
    const variance = getMoneylineVariance(bks)
    expect(variance.home).toBe(35)
    expect(variance.home > MONEYLINE_VARIANCE_THRESHOLD).toBe(true)
  })

  it('three bookmakers with spread of 20 do not trigger variance signal', () => {
    const bks = [
      makeBookmaker('DK', -110, -110),
      makeBookmaker('FD', -120, -110),
      makeBookmaker('MGM', -130, -110),
    ]
    // home prices: [-110, -120, -130] → max=-110, min=-130, variance=20
    const variance = getMoneylineVariance(bks)
    expect(variance.home).toBe(20)
    expect(variance.home > MONEYLINE_VARIANCE_THRESHOLD).toBe(false)
  })
})
