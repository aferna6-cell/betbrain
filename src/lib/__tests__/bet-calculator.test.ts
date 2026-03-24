/**
 * Bet Calculator tests.
 *
 * Tests single bet payout, hedge calculation, parlay math,
 * expected value, and break-even calculations.
 */

import { describe, it, expect } from 'vitest'
import {
  calculatePayout,
  calculateHedge,
  calculateParlay,
  breakEvenWinRate,
  expectedValue,
  winsNeededToProfit,
} from '@/lib/bet-calculator'

// ---------------------------------------------------------------------------
// 1. calculatePayout
// ---------------------------------------------------------------------------

describe('calculatePayout', () => {
  it('calculates $100 bet at -110 (standard)', () => {
    const result = calculatePayout(100, -110)
    expect(result.wager).toBe(100)
    expect(result.odds).toBe(-110)
    expect(result.profit).toBeCloseTo(90.91, 1)
    expect(result.totalPayout).toBeCloseTo(190.91, 1)
    expect(result.decimalOdds).toBeCloseTo(1.909, 2)
    expect(result.impliedProbability).toBeCloseTo(0.5238, 3)
  })

  it('calculates $100 bet at +150 (underdog)', () => {
    const result = calculatePayout(100, 150)
    expect(result.profit).toBe(150)
    expect(result.totalPayout).toBe(250)
    expect(result.decimalOdds).toBe(2.5)
  })

  it('calculates $100 bet at +100 (even money)', () => {
    const result = calculatePayout(100, 100)
    expect(result.profit).toBe(100)
    expect(result.totalPayout).toBe(200)
    expect(result.breakEvenRate).toBe(0.5)
  })

  it('calculates $50 bet at -200 (heavy favorite)', () => {
    const result = calculatePayout(50, -200)
    expect(result.profit).toBe(25)
    expect(result.totalPayout).toBe(75)
  })

  it('breakEvenRate matches implied probability', () => {
    const result = calculatePayout(100, -110)
    expect(result.breakEvenRate).toBe(result.impliedProbability)
  })

  it('handles large underdog odds', () => {
    const result = calculatePayout(10, 500)
    expect(result.profit).toBe(50)
    expect(result.totalPayout).toBe(60)
  })
})

// ---------------------------------------------------------------------------
// 2. calculateHedge
// ---------------------------------------------------------------------------

describe('calculateHedge', () => {
  it('calculates hedge for a profitable position', () => {
    // Original: $100 at +200 (to win $200)
    // Hedge: other side at -150
    const result = calculateHedge(100, 200, -150)
    expect(result.hedgeWager).toBeGreaterThan(0)
    expect(result.totalOutlay).toBeGreaterThan(100)
    // Both outcomes should yield approximately equal profit
    expect(result.ifOriginalWins.profit).toBeCloseTo(result.ifHedgeWins.profit, 0)
  })

  it('guaranteedProfit is the minimum of both outcomes', () => {
    const result = calculateHedge(100, 200, -150)
    expect(result.guaranteedProfit).toBeLessThanOrEqual(result.ifOriginalWins.profit)
    expect(result.guaranteedProfit).toBeLessThanOrEqual(result.ifHedgeWins.profit)
  })

  it('hedgeWager is always positive', () => {
    const result = calculateHedge(100, -110, -110)
    expect(result.hedgeWager).toBeGreaterThan(0)
  })

  it('calculates ROI correctly', () => {
    const result = calculateHedge(100, 200, -150)
    expect(result.roi).toBeCloseTo(
      (result.guaranteedProfit / result.totalOutlay) * 100,
      1
    )
  })

  it('handles even money hedge', () => {
    const result = calculateHedge(100, 100, 100)
    expect(result.hedgeWager).toBe(100)
    // At even money on both sides, guaranteed profit is 0
    // because total outlay = 200, each side pays 200
    expect(result.guaranteedProfit).toBe(0)
  })

  it('handles heavy favorite original with underdog hedge', () => {
    const result = calculateHedge(100, -300, 250)
    expect(result.hedgeWager).toBeGreaterThan(0)
    expect(typeof result.guaranteedProfit).toBe('number')
    expect(isFinite(result.guaranteedProfit)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 3. calculateParlay
// ---------------------------------------------------------------------------

describe('calculateParlay', () => {
  it('calculates 2-leg parlay', () => {
    const result = calculateParlay(100, [-110, -110])
    // Each leg is ~1.909 decimal, combined = ~3.645
    expect(result.legs).toHaveLength(2)
    expect(result.combinedDecimalOdds).toBeCloseTo(3.645, 1)
    expect(result.totalPayout).toBeCloseTo(364.5, 0)
    expect(result.profit).toBeCloseTo(264.5, 0)
  })

  it('calculates 3-leg parlay', () => {
    const result = calculateParlay(100, [-110, -110, -110])
    expect(result.legs).toHaveLength(3)
    expect(result.combinedDecimalOdds).toBeGreaterThan(5)
    expect(result.profit).toBeGreaterThan(500)
  })

  it('single leg parlay equals single bet', () => {
    const parlay = calculateParlay(100, [150])
    const single = calculatePayout(100, 150)
    expect(parlay.totalPayout).toBeCloseTo(single.totalPayout, 1)
  })

  it('combined implied probability decreases with more legs', () => {
    const twoLeg = calculateParlay(100, [-110, -110])
    const threeLeg = calculateParlay(100, [-110, -110, -110])
    expect(threeLeg.combinedImpliedProbability).toBeLessThan(twoLeg.combinedImpliedProbability)
  })

  it('returns correct American odds for parlay', () => {
    const result = calculateParlay(100, [100, 100])
    // +100 + +100 = 2 * 2 = 4.0 decimal = +300 American
    expect(result.combinedAmericanOdds).toBe(300)
  })

  it('handles mixed favorites and underdogs', () => {
    const result = calculateParlay(100, [-200, 200])
    expect(result.legs).toHaveLength(2)
    expect(result.combinedDecimalOdds).toBeGreaterThan(1)
    expect(isFinite(result.profit)).toBe(true)
  })

  it('handles large parlays without overflow', () => {
    const tenLeg = calculateParlay(10, Array(10).fill(100))
    // 2^10 = 1024 decimal odds
    expect(tenLeg.combinedDecimalOdds).toBeCloseTo(1024, -1)
    expect(isFinite(tenLeg.totalPayout)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. breakEvenWinRate
// ---------------------------------------------------------------------------

describe('breakEvenWinRate', () => {
  it('returns ~52.4% for -110', () => {
    expect(breakEvenWinRate(-110)).toBeCloseTo(0.5238, 3)
  })

  it('returns 50% for +100', () => {
    expect(breakEvenWinRate(100)).toBe(0.5)
  })

  it('returns ~66.7% for -200', () => {
    expect(breakEvenWinRate(-200)).toBeCloseTo(0.6667, 3)
  })

  it('returns 25% for +300', () => {
    expect(breakEvenWinRate(300)).toBe(0.25)
  })

  it('higher favorites require higher win rate', () => {
    expect(breakEvenWinRate(-300)).toBeGreaterThan(breakEvenWinRate(-110))
  })
})

// ---------------------------------------------------------------------------
// 5. expectedValue
// ---------------------------------------------------------------------------

describe('expectedValue', () => {
  it('returns 0 for fair odds (no edge)', () => {
    // 50% at +100 = 0 EV
    expect(expectedValue(0.5, 100)).toBe(0)
  })

  it('returns positive for +EV bets', () => {
    // 55% at -110 = positive EV
    expect(expectedValue(0.55, -110)).toBeGreaterThan(0)
  })

  it('returns negative for -EV bets', () => {
    // 45% at -110 = negative EV
    expect(expectedValue(0.45, -110)).toBeLessThan(0)
  })

  it('returns per-dollar EV', () => {
    // 60% at +100 = 0.60*1 - 0.40*1 = 0.20 per dollar
    const ev = expectedValue(0.6, 100)
    expect(ev).toBeCloseTo(0.2, 3)
  })

  it('handles heavy favorite +EV', () => {
    // 75% at -200 = 0.75*0.5 - 0.25*1 = 0.375 - 0.25 = 0.125
    const ev = expectedValue(0.75, -200)
    expect(ev).toBeCloseTo(0.125, 3)
  })

  it('handles long shot +EV', () => {
    // 30% at +400 = 0.30*4 - 0.70*1 = 1.2 - 0.7 = 0.5
    const ev = expectedValue(0.3, 400)
    expect(ev).toBeCloseTo(0.5, 3)
  })
})

// ---------------------------------------------------------------------------
// 6. winsNeededToProfit
// ---------------------------------------------------------------------------

describe('winsNeededToProfit', () => {
  it('needs 6/10 at -110 to profit', () => {
    // Break-even at -110 is ~52.38%, so 6/10 needed
    expect(winsNeededToProfit(10, -110)).toBe(6)
  })

  it('needs 5/10 at +100 to profit', () => {
    expect(winsNeededToProfit(10, 100)).toBe(5)
  })

  it('needs 3/10 at +300 to profit', () => {
    // Break-even at +300 is 25%, so 3/10 needed
    expect(winsNeededToProfit(10, 300)).toBe(3)
  })

  it('needs 7/10 at -200 to profit', () => {
    // Break-even at -200 is ~66.7%, so 7/10 needed
    expect(winsNeededToProfit(10, -200)).toBe(7)
  })

  it('scales with total bets', () => {
    const ten = winsNeededToProfit(10, -110)
    const hundred = winsNeededToProfit(100, -110)
    expect(hundred).toBeGreaterThan(ten)
    // Both should be near the break-even rate (~52.4%)
    expect(hundred).toBeGreaterThanOrEqual(52)
    expect(hundred).toBeLessThanOrEqual(54)
  })
})

// ---------------------------------------------------------------------------
// 7. Edge cases
// ---------------------------------------------------------------------------

describe('Bet calculator edge cases', () => {
  it('calculatePayout handles $0 wager', () => {
    const result = calculatePayout(0, -110)
    expect(result.profit).toBe(0)
    expect(result.totalPayout).toBe(0)
  })

  it('calculateParlay handles empty legs', () => {
    const result = calculateParlay(100, [])
    expect(result.legs).toHaveLength(0)
    expect(result.combinedDecimalOdds).toBe(1) // identity
    expect(result.totalPayout).toBe(100) // wager returned
    expect(result.profit).toBe(0)
  })

  it('all functions return finite numbers for extreme odds', () => {
    const payout = calculatePayout(100, -1000)
    expect(isFinite(payout.profit)).toBe(true)
    expect(isFinite(payout.impliedProbability)).toBe(true)

    const payout2 = calculatePayout(100, 1000)
    expect(isFinite(payout2.profit)).toBe(true)

    const hedge = calculateHedge(100, 500, -500)
    expect(isFinite(hedge.hedgeWager)).toBe(true)
    expect(isFinite(hedge.guaranteedProfit)).toBe(true)
  })
})
