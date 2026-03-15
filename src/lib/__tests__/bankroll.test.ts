import { describe, it, expect } from 'vitest'
import {
  calculateBankrollStats,
  kellyCriterion,
  type BankrollConfig,
} from '@/lib/bankroll'

const DEFAULT_CONFIG: BankrollConfig = {
  startingBalance: 1000,
  unitSize: 10,
}

describe('calculateBankrollStats', () => {
  it('returns starting balance with no picks', () => {
    const stats = calculateBankrollStats([], DEFAULT_CONFIG)
    expect(stats.currentBalance).toBe(1000)
    expect(stats.totalProfit).toBe(0)
    expect(stats.snapshots).toHaveLength(0)
  })

  it('ignores pending picks', () => {
    const stats = calculateBankrollStats(
      [
        { id: '1', game_date: '2026-03-15', outcome: 'pending', profit: null, units: 1 },
        { id: '2', game_date: '2026-03-16', outcome: null, profit: null, units: 1 },
      ],
      DEFAULT_CONFIG
    )
    expect(stats.currentBalance).toBe(1000)
    expect(stats.snapshots).toHaveLength(0)
  })

  it('calculates balance after wins and losses', () => {
    const stats = calculateBankrollStats(
      [
        { id: '1', game_date: '2026-03-10', outcome: 'win', profit: 0.91, units: 1 },
        { id: '2', game_date: '2026-03-11', outcome: 'loss', profit: -1, units: 1 },
        { id: '3', game_date: '2026-03-12', outcome: 'win', profit: 0.91, units: 1 },
      ],
      DEFAULT_CONFIG
    )
    // Starting 1000, +9.10, -10, +9.10 = 1008.20
    expect(stats.currentBalance).toBeCloseTo(1008.20, 1)
    expect(stats.totalProfit).toBeCloseTo(8.20, 1)
    expect(stats.snapshots).toHaveLength(3)
  })

  it('calculates max drawdown', () => {
    const stats = calculateBankrollStats(
      [
        { id: '1', game_date: '2026-03-10', outcome: 'win', profit: 2, units: 2 },
        { id: '2', game_date: '2026-03-11', outcome: 'loss', profit: -3, units: 3 },
        { id: '3', game_date: '2026-03-12', outcome: 'loss', profit: -2, units: 2 },
      ],
      DEFAULT_CONFIG
    )
    // Peak: 1000 + 20 = 1020, then -30, -20 → 970
    // Drawdown from peak: 1020 - 970 = 50
    expect(stats.peakBalance).toBe(1020)
    expect(stats.maxDrawdown).toBe(50)
    expect(stats.maxDrawdownPct).toBeCloseTo(4.9, 0)
  })

  it('tracks win/loss streaks', () => {
    const stats = calculateBankrollStats(
      [
        { id: '1', game_date: '2026-03-10', outcome: 'win', profit: 1, units: 1 },
        { id: '2', game_date: '2026-03-11', outcome: 'win', profit: 1, units: 1 },
        { id: '3', game_date: '2026-03-12', outcome: 'win', profit: 1, units: 1 },
        { id: '4', game_date: '2026-03-13', outcome: 'loss', profit: -1, units: 1 },
        { id: '5', game_date: '2026-03-14', outcome: 'loss', profit: -1, units: 1 },
      ],
      DEFAULT_CONFIG
    )
    expect(stats.bestStreak).toBe(3)
    expect(stats.worstStreak).toBe(-2)
    expect(stats.currentStreak).toBe(-2)
  })

  it('handles pushes (zero profit)', () => {
    const stats = calculateBankrollStats(
      [
        { id: '1', game_date: '2026-03-10', outcome: 'push', profit: 0, units: 1 },
      ],
      DEFAULT_CONFIG
    )
    expect(stats.currentBalance).toBe(1000)
    expect(stats.totalProfit).toBe(0)
    expect(stats.snapshots).toHaveLength(1)
  })

  it('sorts by game_date chronologically', () => {
    const stats = calculateBankrollStats(
      [
        { id: '2', game_date: '2026-03-12', outcome: 'loss', profit: -1, units: 1 },
        { id: '1', game_date: '2026-03-10', outcome: 'win', profit: 1, units: 1 },
      ],
      DEFAULT_CONFIG
    )
    // First snapshot should be the win (earlier date)
    expect(stats.snapshots[0].profit).toBe(10) // 1 unit * $10
    expect(stats.snapshots[1].profit).toBe(-10)
  })

  it('calculates ROI correctly', () => {
    const stats = calculateBankrollStats(
      [
        { id: '1', game_date: '2026-03-10', outcome: 'win', profit: 1, units: 1 },
        { id: '2', game_date: '2026-03-11', outcome: 'win', profit: 1, units: 1 },
        { id: '3', game_date: '2026-03-12', outcome: 'loss', profit: -1, units: 1 },
      ],
      DEFAULT_CONFIG
    )
    // Total wagered: 3 units * $10 = $30, profit: $10, ROI = 10/30 = 33.33%
    expect(stats.roi).toBeCloseTo(33.33, 1)
  })
})

describe('kellyCriterion', () => {
  it('returns 0 for edge-less bets', () => {
    // 50% win rate at even odds = 0 edge
    expect(kellyCriterion(0.5, 100)).toBe(0)
  })

  it('returns positive fraction for +EV bets', () => {
    // 55% win rate at -110 = positive edge
    const kelly = kellyCriterion(0.55, -110)
    expect(kelly).toBeGreaterThan(0)
    expect(kelly).toBeLessThan(0.25) // capped
  })

  it('returns 0 for -EV bets', () => {
    // 45% win rate at -110 = negative edge
    expect(kellyCriterion(0.45, -110)).toBe(0)
  })

  it('caps at 25% of bankroll', () => {
    // 90% win rate at +200 = huge edge, but capped
    expect(kellyCriterion(0.9, 200)).toBe(0.25)
  })

  it('returns 0 for impossible probabilities', () => {
    expect(kellyCriterion(0, -110)).toBe(0)
    expect(kellyCriterion(1, -110)).toBe(0)
    expect(kellyCriterion(-0.5, -110)).toBe(0)
  })

  it('handles positive American odds', () => {
    // 40% win rate at +200 = slight positive edge
    const kelly = kellyCriterion(0.4, 200)
    expect(kelly).toBeGreaterThan(0)
  })

  it('handles heavy favorites', () => {
    // 70% at -200 = edge
    const kelly = kellyCriterion(0.7, -200)
    expect(kelly).toBeGreaterThan(0)
    expect(kelly).toBeLessThanOrEqual(0.25)
  })
})
