import { describe, it, expect } from 'vitest'
import {
  analyzeLeg,
  analyzeSlip,
  addLeg,
  removeLeg,
  calculateRoundRobin,
  formatSlipAsText,
  type SlipLeg,
  type SlipConfig,
} from '../bet-slip'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLeg(overrides: Partial<SlipLeg> = {}): SlipLeg {
  return {
    id: 'leg1',
    gameId: 'game1',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    side: 'home',
    market: 'moneyline',
    odds: -110,
    line: null,
    fairProbability: 0.55,
    bookmaker: 'draftkings',
    commenceTime: '2026-03-25T23:00:00Z',
    ...overrides,
  }
}

const defaultConfig: SlipConfig = { mode: 'parlay', units: 1 }

// ---------------------------------------------------------------------------
// analyzeLeg
// ---------------------------------------------------------------------------

describe('analyzeLeg', () => {
  it('calculates decimal odds and implied probability', () => {
    const leg = makeLeg({ odds: -110 })
    const result = analyzeLeg(leg)
    expect(result.decimalOdds).toBeCloseTo(1.909, 2)
    expect(result.impliedProbability).toBeCloseTo(0.524, 2)
  })

  it('calculates EV when fair probability is available', () => {
    const leg = makeLeg({ odds: -110, fairProbability: 0.55 })
    const result = analyzeLeg(leg)
    expect(result.ev).not.toBeNull()
    // EV = (0.55 * 1.909 - 1) * 100 = 5.0%
    expect(result.ev!).toBeCloseTo(5.0, 0)
    expect(result.isPositiveEv).toBe(true)
  })

  it('returns null EV when no fair probability', () => {
    const leg = makeLeg({ fairProbability: null })
    const result = analyzeLeg(leg)
    expect(result.ev).toBeNull()
    expect(result.isPositiveEv).toBe(false)
  })

  it('detects negative EV', () => {
    // Fair prob 0.50, odds -110 → EV = (0.50 * 1.909 - 1) * 100 = -4.5%
    const leg = makeLeg({ odds: -110, fairProbability: 0.50 })
    const result = analyzeLeg(leg)
    expect(result.ev!).toBeLessThan(0)
    expect(result.isPositiveEv).toBe(false)
  })

  it('handles underdog odds correctly', () => {
    const leg = makeLeg({ odds: 200, fairProbability: 0.35 })
    const result = analyzeLeg(leg)
    expect(result.decimalOdds).toBe(3.0)
    // EV = (0.35 * 3.0 - 1) * 100 = 5%
    expect(result.ev!).toBeCloseTo(5.0, 0)
  })
})

// ---------------------------------------------------------------------------
// analyzeSlip
// ---------------------------------------------------------------------------

describe('analyzeSlip', () => {
  it('analyzes an empty slip', () => {
    const result = analyzeSlip([], defaultConfig)
    expect(result.legCount).toBe(0)
    expect(result.combinedDecimalOdds).toBe(1)
    expect(result.warnings).toHaveLength(0)
  })

  it('calculates combined parlay odds', () => {
    const legs = [
      makeLeg({ id: 'a', odds: -110 }),
      makeLeg({ id: 'b', gameId: 'game2', odds: 150, homeTeam: 'Bucks', awayTeam: 'Nets' }),
    ]
    const result = analyzeSlip(legs, defaultConfig)

    // Combined = 1.909 * 2.5 = 4.773
    expect(result.combinedDecimalOdds).toBeCloseTo(4.773, 1)
    expect(result.legCount).toBe(2)
    expect(result.parlayPayoutPerUnit).toBeCloseTo(3.77, 1)
  })

  it('calculates straight bet total payout', () => {
    const legs = [
      makeLeg({ id: 'a', odds: -110 }),
      makeLeg({ id: 'b', gameId: 'game2', odds: 150, homeTeam: 'Bucks', awayTeam: 'Nets' }),
    ]
    const config: SlipConfig = { mode: 'straight', units: 2 }
    const result = analyzeSlip(legs, config)

    // Leg A payout: (1.909-1)*2 = 1.818, Leg B: (2.5-1)*2 = 3.0
    expect(result.straightTotalPayout).toBeCloseTo(4.818, 1)
    expect(result.totalUnitsAtRisk).toBe(4) // 2 units * 2 legs
  })

  it('calculates combined fair probability and parlay EV', () => {
    const legs = [
      makeLeg({ id: 'a', odds: -110, fairProbability: 0.55 }),
      makeLeg({ id: 'b', gameId: 'game2', odds: 150, fairProbability: 0.35, homeTeam: 'Bucks', awayTeam: 'Nets' }),
    ]
    const result = analyzeSlip(legs, defaultConfig)

    // Combined fair = 0.55 * 0.35 = 0.1925
    expect(result.combinedFairProbability).toBeCloseTo(0.1925, 3)
    expect(result.parlayEv).not.toBeNull()
  })

  it('returns null combined fair prob when any leg is missing it', () => {
    const legs = [
      makeLeg({ id: 'a', fairProbability: 0.55 }),
      makeLeg({ id: 'b', gameId: 'game2', fairProbability: null, homeTeam: 'Bucks', awayTeam: 'Nets' }),
    ]
    const result = analyzeSlip(legs, defaultConfig)
    expect(result.combinedFairProbability).toBeNull()
    expect(result.parlayEv).toBeNull()
  })

  it('warns about same-game legs', () => {
    const legs = [
      makeLeg({ id: 'a', side: 'home', market: 'moneyline' }),
      makeLeg({ id: 'b', side: 'over', market: 'total' }),
    ]
    const result = analyzeSlip(legs, defaultConfig)
    expect(result.warnings.some((w) => w.type === 'correlation')).toBe(true)
  })

  it('warns about opposing sides', () => {
    const legs = [
      makeLeg({ id: 'a', side: 'home', market: 'moneyline' }),
      makeLeg({ id: 'b', side: 'away', market: 'moneyline' }),
    ]
    const result = analyzeSlip(legs, defaultConfig)
    const opposingWarning = result.warnings.find((w) =>
      w.message.includes('Opposing sides')
    )
    expect(opposingWarning).toBeDefined()
    expect(opposingWarning?.severity).toBe('high')
  })

  it('warns about all-negative-EV parlays', () => {
    const legs = [
      makeLeg({ id: 'a', odds: -200, fairProbability: 0.60 }),
      makeLeg({ id: 'b', gameId: 'game2', odds: -200, fairProbability: 0.60, homeTeam: 'Bucks', awayTeam: 'Nets' }),
    ]
    const result = analyzeSlip(legs, defaultConfig)
    const evWarning = result.warnings.find((w) => w.type === 'value')
    expect(evWarning).toBeDefined()
  })

  it('warns about longshot parlays (4+ legs)', () => {
    const legs = Array.from({ length: 5 }, (_, i) =>
      makeLeg({ id: `leg${i}`, gameId: `game${i}`, odds: 200, homeTeam: `Home${i}`, awayTeam: `Away${i}` })
    )
    const result = analyzeSlip(legs, defaultConfig)
    const sizeWarning = result.warnings.find((w) => w.message.includes('longshot'))
    expect(sizeWarning).toBeDefined()
  })

  it('warns about excessive stake', () => {
    const legs = Array.from({ length: 4 }, (_, i) =>
      makeLeg({ id: `leg${i}`, gameId: `game${i}`, odds: -110, homeTeam: `Home${i}`, awayTeam: `Away${i}` })
    )
    const config: SlipConfig = { mode: 'straight', units: 2 }
    const result = analyzeSlip(legs, config)
    // 2 units * 4 legs = 8 units > 5
    const stakeWarning = result.warnings.find((w) => w.message.includes('units at risk'))
    expect(stakeWarning).toBeDefined()
  })

  it('warns about sport concentration', () => {
    const legs = Array.from({ length: 5 }, (_, i) =>
      makeLeg({ id: `leg${i}`, gameId: `game${i}`, sport: 'nba', homeTeam: `Home${i}`, awayTeam: `Away${i}` })
    )
    const result = analyzeSlip(legs, defaultConfig)
    const exposureWarning = result.warnings.find((w) => w.type === 'exposure')
    expect(exposureWarning).toBeDefined()
  })

  it('sorts warnings by severity', () => {
    const legs = [
      makeLeg({ id: 'a', side: 'home', market: 'moneyline', odds: -200, fairProbability: 0.60 }),
      makeLeg({ id: 'b', side: 'away', market: 'moneyline', odds: -200, fairProbability: 0.60 }),
    ]
    const result = analyzeSlip(legs, defaultConfig)
    if (result.warnings.length >= 2) {
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
      for (let i = 1; i < result.warnings.length; i++) {
        expect(severityOrder[result.warnings[i].severity]).toBeGreaterThanOrEqual(
          severityOrder[result.warnings[i - 1].severity]
        )
      }
    }
  })
})

// ---------------------------------------------------------------------------
// addLeg / removeLeg
// ---------------------------------------------------------------------------

describe('addLeg', () => {
  it('adds a new leg', () => {
    const result = addLeg([], makeLeg())
    expect(result.legs).toHaveLength(1)
    expect(result.warning).toBeNull()
  })

  it('rejects duplicate legs', () => {
    const existing = [makeLeg()]
    const result = addLeg(existing, makeLeg())
    expect(result.legs).toHaveLength(1) // Unchanged
    expect(result.warning).toContain('already in the slip')
  })

  it('warns about opposing sides', () => {
    const existing = [makeLeg({ side: 'home', market: 'moneyline' })]
    const newLeg = makeLeg({ id: 'leg2', side: 'away', market: 'moneyline' })
    const result = addLeg(existing, newLeg)
    expect(result.legs).toHaveLength(2) // Still adds it
    expect(result.warning).toContain('opposing side')
  })
})

describe('removeLeg', () => {
  it('removes a leg by id', () => {
    const legs = [makeLeg({ id: 'a' }), makeLeg({ id: 'b', gameId: 'game2' })]
    const result = removeLeg(legs, 'a')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b')
  })

  it('returns unchanged array if id not found', () => {
    const legs = [makeLeg()]
    const result = removeLeg(legs, 'nonexistent')
    expect(result).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// calculateRoundRobin
// ---------------------------------------------------------------------------

describe('calculateRoundRobin', () => {
  it('calculates 2-leg round robin from 3 picks', () => {
    const legs = [
      makeLeg({ id: 'a', odds: -110, gameId: 'g1' }),
      makeLeg({ id: 'b', odds: 150, gameId: 'g2', homeTeam: 'Bucks', awayTeam: 'Nets' }),
      makeLeg({ id: 'c', odds: -130, gameId: 'g3', homeTeam: 'Heat', awayTeam: '76ers' }),
    ]
    const result = calculateRoundRobin(legs, 2, 1)
    expect(result.combinations).toBe(3) // C(3,2) = 3
    expect(result.totalStake).toBe(3)
    expect(result.bestPayout).toBeGreaterThan(0)
    expect(result.worstPayout).toBeGreaterThan(0)
    expect(result.bestPayout).toBeGreaterThanOrEqual(result.worstPayout)
  })

  it('returns zeros for invalid leg count', () => {
    const result = calculateRoundRobin([makeLeg()], 5, 1)
    expect(result.combinations).toBe(0)
    expect(result.totalStake).toBe(0)
  })

  it('handles single combination', () => {
    const legs = [
      makeLeg({ id: 'a', odds: -110, gameId: 'g1' }),
      makeLeg({ id: 'b', odds: 150, gameId: 'g2', homeTeam: 'Bucks', awayTeam: 'Nets' }),
    ]
    const result = calculateRoundRobin(legs, 2, 1)
    expect(result.combinations).toBe(1) // C(2,2) = 1
    expect(result.bestPayout).toBe(result.worstPayout)
  })
})

// ---------------------------------------------------------------------------
// formatSlipAsText
// ---------------------------------------------------------------------------

describe('formatSlipAsText', () => {
  it('formats a parlay slip as text', () => {
    const legs = [
      makeLeg({ id: 'a', odds: -110, side: 'home' }),
      makeLeg({ id: 'b', gameId: 'game2', odds: 150, side: 'away', homeTeam: 'Bucks', awayTeam: 'Nets' }),
    ]
    const analysis = analyzeSlip(legs, defaultConfig)
    const text = formatSlipAsText(legs, analysis, defaultConfig)

    expect(text).toContain('PARLAY')
    expect(text).toContain('Lakers')
    expect(text).toContain('Nets')
    expect(text).toContain('-110')
    expect(text).toContain('+150')
    expect(text).toContain('Combined')
    expect(text).toContain('informational purposes only')
  })

  it('formats a straight bet slip', () => {
    const legs = [makeLeg({ id: 'a', odds: -110 })]
    const config: SlipConfig = { mode: 'straight', units: 2 }
    const analysis = analyzeSlip(legs, config)
    const text = formatSlipAsText(legs, analysis, config)

    expect(text).toContain('STRAIGHT')
    expect(text).toContain('Total risk')
  })

  it('includes EV in leg description when available', () => {
    const legs = [makeLeg({ odds: -110, fairProbability: 0.55 })]
    const analysis = analyzeSlip(legs, defaultConfig)
    const text = formatSlipAsText(legs, analysis, defaultConfig)
    expect(text).toContain('EV:')
  })

  it('includes warnings', () => {
    const legs = [
      makeLeg({ id: 'a', side: 'home', market: 'moneyline' }),
      makeLeg({ id: 'b', side: 'away', market: 'moneyline' }),
    ]
    const analysis = analyzeSlip(legs, defaultConfig)
    const text = formatSlipAsText(legs, analysis, defaultConfig)
    expect(text).toContain('Warnings')
  })

  it('includes spread lines', () => {
    const legs = [makeLeg({ market: 'spread', side: 'home', line: -3.5 })]
    const analysis = analyzeSlip(legs, defaultConfig)
    const text = formatSlipAsText(legs, analysis, defaultConfig)
    expect(text).toContain('-3.5')
  })
})
