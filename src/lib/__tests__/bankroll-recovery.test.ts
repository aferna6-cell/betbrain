/**
 * Bankroll Recovery Calculator tests.
 */

import { describe, it, expect } from 'vitest'
import { calculateRecovery, type RecoveryInput } from '@/lib/bankroll-recovery'

function makeInput(overrides: Partial<RecoveryInput> = {}): RecoveryInput {
  return {
    current: 800,
    peak: 1000,
    winRate: 0.55,
    avgOdds: -110,
    unitSize: 10,
    ...overrides,
  }
}

describe('calculateRecovery', () => {
  it('returns zero deficit when current >= peak', () => {
    const result = calculateRecovery(makeInput({ current: 1000, peak: 1000 }))
    expect(result.deficit).toBe(0)
    expect(result.expectedBets).toBe(0)
  })

  it('calculates correct deficit', () => {
    const result = calculateRecovery(makeInput({ current: 800, peak: 1000 }))
    expect(result.deficit).toBe(200)
  })

  it('calculates drawdown percentage', () => {
    const result = calculateRecovery(makeInput({ current: 800, peak: 1000 }))
    expect(result.drawdownPct).toBe(20)
  })

  it('returns positive expected profit for winning player', () => {
    const result = calculateRecovery(makeInput({ winRate: 0.55, avgOdds: -110 }))
    expect(result.expectedProfitPerBet).toBeGreaterThan(0)
  })

  it('returns negative expected profit for losing player', () => {
    const result = calculateRecovery(makeInput({ winRate: 0.45, avgOdds: -110 }))
    expect(result.expectedProfitPerBet).toBeLessThan(0)
  })

  it('optimistic scenario needs fewer bets than expected', () => {
    const result = calculateRecovery(makeInput({ winRate: 0.55 }))
    if (result.expectedBets < 999 && result.optimisticBets < 999) {
      expect(result.optimisticBets).toBeLessThanOrEqual(result.expectedBets)
    }
  })

  it('pessimistic scenario needs more bets than expected', () => {
    const result = calculateRecovery(makeInput({ winRate: 0.55 }))
    if (result.expectedBets < 999 && result.pessimisticBets < 999) {
      expect(result.pessimisticBets).toBeGreaterThanOrEqual(result.expectedBets)
    }
  })

  it('recovery probability increases with more bets', () => {
    const result = calculateRecovery(makeInput({ winRate: 0.55 }))
    expect(result.recoveryProbability100).toBeGreaterThanOrEqual(result.recoveryProbability50)
  })

  it('calculates days at different bet frequencies', () => {
    const result = calculateRecovery(makeInput({ winRate: 0.55 }))
    if (result.expectedBets < 999) {
      expect(result.daysAt2Bets).toBe(Math.ceil(result.expectedBets / 2))
      expect(result.daysAt5Bets).toBe(Math.ceil(result.expectedBets / 5))
    }
  })

  it('handles zero unit size gracefully', () => {
    const result = calculateRecovery(makeInput({ unitSize: 0 }))
    // unitSize=0 triggers early return with no deficit since division is impossible
    expect(result.expectedBets).toBe(0)
  })

  it('handles zero peak gracefully', () => {
    const result = calculateRecovery(makeInput({ peak: 0, current: 0 }))
    expect(result.deficit).toBe(0)
    expect(result.drawdownPct).toBe(0)
  })

  it('caps expected bets at 999 for -EV players', () => {
    const result = calculateRecovery(makeInput({ winRate: 0.40, avgOdds: -110 }))
    expect(result.expectedBets).toBe(999)
  })

  it('handles plus odds correctly', () => {
    const result = calculateRecovery(makeInput({ avgOdds: +150, winRate: 0.45 }))
    // +150 pays 1.5:1, with 45% win rate, EV = 0.45 * 1.5 - 0.55 = 0.125 per bet
    expect(result.expectedProfitPerBet).toBeGreaterThan(0)
  })

  it('returns valid recovery probability range', () => {
    const result = calculateRecovery(makeInput())
    expect(result.recoveryProbability50).toBeGreaterThanOrEqual(0)
    expect(result.recoveryProbability50).toBeLessThanOrEqual(100)
    expect(result.recoveryProbability100).toBeGreaterThanOrEqual(0)
    expect(result.recoveryProbability100).toBeLessThanOrEqual(100)
  })

  it('larger drawdowns need more bets', () => {
    const small = calculateRecovery(makeInput({ current: 950, peak: 1000 }))
    const large = calculateRecovery(makeInput({ current: 500, peak: 1000 }))
    if (small.expectedBets < 999 && large.expectedBets < 999) {
      expect(large.expectedBets).toBeGreaterThan(small.expectedBets)
    }
  })
})
