import { describe, it, expect } from 'vitest'
import {
  calculateKellyFraction,
  runKellySimulation,
  type KellySimConfig,
} from '../kelly-simulator'

describe('calculateKellyFraction', () => {
  it('returns positive fraction for positive edge', () => {
    // 55% win rate at -110 (decimal payout ~0.909)
    const kelly = calculateKellyFraction(0.55, -110)
    expect(kelly).toBeGreaterThan(0)
    expect(kelly).toBeLessThan(1)
  })

  it('returns zero for no edge', () => {
    // 50% win rate at even money (+100)
    const kelly = calculateKellyFraction(0.5, 100)
    expect(kelly).toBe(0)
  })

  it('returns zero for negative edge', () => {
    // 40% win rate at -110
    const kelly = calculateKellyFraction(0.4, -110)
    expect(kelly).toBe(0)
  })

  it('returns higher fraction for bigger edge', () => {
    const small = calculateKellyFraction(0.55, -110)
    const big = calculateKellyFraction(0.65, -110)
    expect(big).toBeGreaterThan(small)
  })

  it('returns higher fraction for better odds', () => {
    const short = calculateKellyFraction(0.55, -110)
    const long = calculateKellyFraction(0.55, 150)
    expect(long).toBeGreaterThan(short)
  })
})

describe('runKellySimulation', () => {
  const baseConfig: KellySimConfig = {
    startingBankroll: 1000,
    numBets: 100,
    winRate: 0.55,
    avgOdds: -110,
    simulations: 50,
    seed: 42,
  }

  it('returns trajectories for multiple fractions', () => {
    const result = runKellySimulation(baseConfig)
    expect(result.trajectories.length).toBeGreaterThanOrEqual(2)
    expect(result.fullKellyFraction).toBeGreaterThan(0)
  })

  it('includes flat 2% as baseline', () => {
    const result = runKellySimulation(baseConfig)
    const flat = result.trajectories.find((t) => t.label === 'Flat 2%')
    expect(flat).toBeTruthy()
    expect(flat!.fraction).toBe(0.02)
  })

  it('trajectories have required fields', () => {
    const result = runKellySimulation(baseConfig)
    for (const t of result.trajectories) {
      expect(t.label).toBeTruthy()
      expect(t.fraction).toBeGreaterThan(0)
      expect(typeof t.medianFinal).toBe('number')
      expect(typeof t.p5Final).toBe('number')
      expect(typeof t.p95Final).toBe('number')
      expect(typeof t.ruinProbability).toBe('number')
      expect(typeof t.avgMaxDrawdown).toBe('number')
      expect(t.medianPath.length).toBe(baseConfig.numBets + 1)
    }
  })

  it('median final should grow for positive edge', () => {
    const result = runKellySimulation(baseConfig)
    const halfKelly = result.trajectories.find((t) => t.label === 'Half Kelly')
    if (halfKelly) {
      expect(halfKelly.medianFinal).toBeGreaterThan(baseConfig.startingBankroll * 0.8)
    }
  })

  it('higher Kelly has higher variance', () => {
    const result = runKellySimulation(baseConfig)
    const flat = result.trajectories.find((t) => t.label === 'Flat 2%')
    const full = result.trajectories.find((t) => t.label === 'Full Kelly')
    if (flat && full) {
      const flatRange = flat.p95Final - flat.p5Final
      const fullRange = full.p95Final - full.p5Final
      expect(fullRange).toBeGreaterThan(flatRange)
    }
  })

  it('full Kelly has higher ruin risk than quarter Kelly', () => {
    const result = runKellySimulation(baseConfig)
    const quarter = result.trajectories.find((t) => t.label === 'Quarter Kelly')
    const full = result.trajectories.find((t) => t.label === 'Full Kelly')
    if (quarter && full) {
      expect(full.ruinProbability).toBeGreaterThanOrEqual(quarter.ruinProbability)
    }
  })

  it('is deterministic with same seed', () => {
    const r1 = runKellySimulation(baseConfig)
    const r2 = runKellySimulation(baseConfig)
    expect(r1.trajectories[0].medianFinal).toBe(r2.trajectories[0].medianFinal)
  })

  it('different seeds give different results', () => {
    const r1 = runKellySimulation({ ...baseConfig, seed: 1 })
    const r2 = runKellySimulation({ ...baseConfig, seed: 999 })
    // Very unlikely to be exactly equal with different seeds
    expect(r1.trajectories[0].medianFinal).not.toBe(r2.trajectories[0].medianFinal)
  })

  it('generates a recommendation', () => {
    const result = runKellySimulation(baseConfig)
    expect(result.recommendation).toBeTruthy()
    expect(result.recommendation.length).toBeGreaterThan(10)
  })

  it('handles negative edge (no Kelly applicable)', () => {
    const result = runKellySimulation({
      ...baseConfig,
      winRate: 0.4,
    })
    expect(result.fullKellyFraction).toBe(0)
    expect(result.recommendation).toContain('negative')
  })

  it('median path starts at starting bankroll', () => {
    const result = runKellySimulation(baseConfig)
    for (const t of result.trajectories) {
      expect(t.medianPath[0]).toBe(baseConfig.startingBankroll)
    }
  })

  it('p5 <= median <= p95', () => {
    const result = runKellySimulation(baseConfig)
    for (const t of result.trajectories) {
      expect(t.p5Final).toBeLessThanOrEqual(t.medianFinal)
      expect(t.medianFinal).toBeLessThanOrEqual(t.p95Final)
    }
  })
})
