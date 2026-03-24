import { describe, it, expect } from 'vitest'
import {
  runBacktest,
  compareStrategies,
  DEFAULT_STRATEGIES,
  type HistoricalPick,
  type StrategyConfig,
} from '../position-sizing-backtest'

const samplePicks: HistoricalPick[] = [
  { id: '1', odds: -110, units: 1, result: 'win' },
  { id: '2', odds: -110, units: 1, result: 'loss' },
  { id: '3', odds: 150, units: 1, result: 'win' },
  { id: '4', odds: -130, units: 1, result: 'loss' },
  { id: '5', odds: -110, units: 1, result: 'win' },
  { id: '6', odds: 200, units: 1, result: 'win' },
  { id: '7', odds: -110, units: 1, result: 'loss' },
  { id: '8', odds: -110, units: 1, result: 'push' },
  { id: '9', odds: -150, units: 1, result: 'win' },
  { id: '10', odds: 120, units: 1, result: 'loss' },
]

const confidencePicks: HistoricalPick[] = [
  { id: '1', odds: -110, units: 1, result: 'win', confidence: 5 },
  { id: '2', odds: -110, units: 1, result: 'loss', confidence: 2 },
  { id: '3', odds: 150, units: 1, result: 'win', confidence: 4 },
  { id: '4', odds: -130, units: 1, result: 'loss', confidence: 1 },
  { id: '5', odds: -110, units: 1, result: 'win', confidence: 3 },
]

describe('runBacktest', () => {
  describe('flat strategy', () => {
    it('uses fixed unit size', () => {
      const strategy: StrategyConfig = { strategy: 'flat', param: 1, label: 'Flat 1u' }
      const result = runBacktest(samplePicks, strategy, 100)
      expect(result.trajectory).toHaveLength(10)
      for (const point of result.trajectory) {
        expect(point.units).toBe(1)
      }
    })

    it('tracks bankroll correctly', () => {
      const strategy: StrategyConfig = { strategy: 'flat', param: 1, label: 'Flat 1u' }
      const result = runBacktest(
        [{ id: '1', odds: -110, units: 1, result: 'win' }],
        strategy,
        100
      )
      // Win at -110 pays ~0.909 per unit
      expect(result.finalBankroll).toBeCloseTo(100.91, 1)
    })

    it('handles all losses', () => {
      const picks = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`, odds: -110, units: 1, result: 'loss' as const,
      }))
      const result = runBacktest(picks, { strategy: 'flat', param: 1, label: 'Flat' }, 100)
      expect(result.finalBankroll).toBe(95)
      expect(result.totalProfit).toBe(-5)
      expect(result.roi).toBeCloseTo(-5, 0)
    })
  })

  describe('percentage strategy', () => {
    it('scales with bankroll', () => {
      const strategy: StrategyConfig = { strategy: 'percentage', param: 5, label: '5%' }
      const result = runBacktest(samplePicks, strategy, 100)
      // First bet should be 5% of 100 = 5
      expect(result.trajectory[0].units).toBe(5)
      // After wins/losses, units change
      expect(result.trajectory.some(p => p.units !== 5)).toBe(true)
    })

    it('decreases bet size after losses', () => {
      const picks: HistoricalPick[] = [
        { id: '1', odds: -110, units: 1, result: 'loss' },
        { id: '2', odds: -110, units: 1, result: 'loss' },
      ]
      const strategy: StrategyConfig = { strategy: 'percentage', param: 5, label: '5%' }
      const result = runBacktest(picks, strategy, 100)
      expect(result.trajectory[1].units).toBeLessThan(result.trajectory[0].units)
    })
  })

  describe('kelly strategy', () => {
    it('sizes based on edge estimate', () => {
      const strategy: StrategyConfig = { strategy: 'kelly', param: 0.25, label: 'Quarter Kelly' }
      const result = runBacktest(samplePicks, strategy, 100)
      expect(result.trajectory).toHaveLength(10)
      // Kelly sizes should vary with odds
      expect(result.totalUnitsWagered).toBeGreaterThan(0)
    })

    it('caps at 10% of bankroll', () => {
      const strategy: StrategyConfig = { strategy: 'kelly', param: 1, label: 'Full Kelly' }
      const result = runBacktest(samplePicks, strategy, 100)
      for (const point of result.trajectory) {
        if (point.units > 0) {
          expect(point.units).toBeLessThanOrEqual(10.01) // 10% of 100 + rounding
        }
      }
    })
  })

  describe('confidence strategy', () => {
    it('scales units with confidence', () => {
      const strategy: StrategyConfig = { strategy: 'confidence', param: 1, label: 'Conf' }
      const result = runBacktest(confidencePicks, strategy, 100)
      // Confidence 5 → 2.5 units, confidence 1 → 0.5 units
      expect(result.trajectory[0].units).toBe(2.5) // conf 5
      expect(result.trajectory[3].units).toBe(0.5) // conf 1
    })

    it('defaults to confidence 3 when missing', () => {
      const strategy: StrategyConfig = { strategy: 'confidence', param: 1, label: 'Conf' }
      const picks = [{ id: '1', odds: -110, units: 1, result: 'win' as const }]
      const result = runBacktest(picks, strategy, 100)
      expect(result.trajectory[0].units).toBe(1.5) // conf 3: 0.5 + (3-1)*0.5 = 1.5
    })
  })

  describe('anti-martingale strategy', () => {
    it('increases after wins', () => {
      const picks: HistoricalPick[] = [
        { id: '1', odds: -110, units: 1, result: 'win' },
        { id: '2', odds: -110, units: 1, result: 'win' },
        { id: '3', odds: -110, units: 1, result: 'win' },
      ]
      const strategy: StrategyConfig = { strategy: 'anti-martingale', param: 1.5, label: 'AM' }
      const result = runBacktest(picks, strategy, 100)
      expect(result.trajectory[0].units).toBe(1) // first bet
      expect(result.trajectory[1].units).toBe(1.5) // after win: 1 * 1.5
      expect(result.trajectory[2].units).toBe(2.25) // after win: 1.5 * 1.5
    })

    it('resets after losses', () => {
      const picks: HistoricalPick[] = [
        { id: '1', odds: -110, units: 1, result: 'win' },
        { id: '2', odds: -110, units: 1, result: 'loss' },
        { id: '3', odds: -110, units: 1, result: 'win' },
      ]
      const strategy: StrategyConfig = { strategy: 'anti-martingale', param: 2, label: 'AM' }
      const result = runBacktest(picks, strategy, 100)
      expect(result.trajectory[2].units).toBe(1) // reset after loss
    })
  })

  describe('general behavior', () => {
    it('calculates max drawdown', () => {
      const result = runBacktest(samplePicks, { strategy: 'flat', param: 1, label: 'Flat' }, 100)
      expect(result.maxDrawdownPct).toBeGreaterThanOrEqual(0)
      expect(result.maxDrawdownPct).toBeLessThanOrEqual(100)
    })

    it('tracks peak bankroll', () => {
      const result = runBacktest(samplePicks, { strategy: 'flat', param: 1, label: 'Flat' }, 100)
      expect(result.peak).toBeGreaterThanOrEqual(100)
    })

    it('calculates sharpe ratio', () => {
      const result = runBacktest(samplePicks, { strategy: 'flat', param: 1, label: 'Flat' }, 100)
      expect(typeof result.sharpeRatio).toBe('number')
      expect(isFinite(result.sharpeRatio)).toBe(true)
    })

    it('detects when bankroll goes below start', () => {
      const picks: HistoricalPick[] = [
        { id: '1', odds: -110, units: 1, result: 'loss' },
        { id: '2', odds: -110, units: 1, result: 'win' },
      ]
      const result = runBacktest(picks, { strategy: 'flat', param: 1, label: 'Flat' }, 100)
      // Loss: 100 → 99 (below start), Win at -110: 99 → 99.91 (still below start)
      expect(result.belowStartCount).toBe(2)
    })

    it('handles push correctly', () => {
      const picks: HistoricalPick[] = [
        { id: '1', odds: -110, units: 1, result: 'push' },
      ]
      const result = runBacktest(picks, { strategy: 'flat', param: 1, label: 'Flat' }, 100)
      expect(result.finalBankroll).toBe(100)
      expect(result.totalProfit).toBe(0)
    })

    it('handles empty picks', () => {
      const result = runBacktest([], { strategy: 'flat', param: 1, label: 'Flat' }, 100)
      expect(result.finalBankroll).toBe(100)
      expect(result.trajectory).toEqual([])
    })

    it('detects bankruptcy', () => {
      const picks = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`, odds: -110, units: 1, result: 'loss' as const,
      }))
      const result = runBacktest(picks, { strategy: 'percentage', param: 50, label: '50%' }, 10)
      // With 50% bets and all losses, bankroll will approach 0
      expect(result.finalBankroll).toBeLessThan(1)
    })
  })
})

describe('compareStrategies', () => {
  it('runs all default strategies', () => {
    const result = compareStrategies(samplePicks, 100)
    expect(result.results).toHaveLength(DEFAULT_STRATEGIES.length)
    expect(result.startingBankroll).toBe(100)
    expect(result.picks).toBe(samplePicks)
  })

  it('identifies best and worst strategy', () => {
    const result = compareStrategies(samplePicks, 100)
    expect(result.bestStrategy).toBeDefined()
    expect(result.worstStrategy).toBeDefined()
    expect(result.bestStrategy.length).toBeGreaterThan(0)
    expect(result.worstStrategy.length).toBeGreaterThan(0)
  })

  it('uses custom strategies when provided', () => {
    const custom: StrategyConfig[] = [
      { strategy: 'flat', param: 1, label: 'Small' },
      { strategy: 'flat', param: 5, label: 'Large' },
    ]
    const result = compareStrategies(samplePicks, 100, custom)
    expect(result.results).toHaveLength(2)
  })

  it('best strategy has highest final bankroll', () => {
    const result = compareStrategies(samplePicks, 100)
    const best = result.results.find(r => r.strategy.label === result.bestStrategy)!
    for (const r of result.results) {
      expect(best.finalBankroll).toBeGreaterThanOrEqual(r.finalBankroll)
    }
  })
})

describe('DEFAULT_STRATEGIES', () => {
  it('has at least 5 strategies', () => {
    expect(DEFAULT_STRATEGIES.length).toBeGreaterThanOrEqual(5)
  })

  it('includes all strategy types', () => {
    const types = new Set(DEFAULT_STRATEGIES.map(s => s.strategy))
    expect(types.has('flat')).toBe(true)
    expect(types.has('percentage')).toBe(true)
    expect(types.has('kelly')).toBe(true)
  })
})
