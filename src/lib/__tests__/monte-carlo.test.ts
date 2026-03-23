import { describe, it, expect } from 'vitest'
import { runSimulation, deriveConfigFromPicks, type SimulationConfig } from '../monte-carlo'

const baseConfig: SimulationConfig = {
  startingBankroll: 100,
  winRate: 0.55,
  avgOdds: -110,
  unitSize: 1,
  numBets: 100,
  numSimulations: 500,
}

describe('monte-carlo', () => {
  it('returns empty result for invalid config', () => {
    const result = runSimulation({ ...baseConfig, startingBankroll: 0 })
    expect(result.median).toBe(0)
    expect(result.trajectories).toHaveLength(0)
  })

  it('returns empty result for zero win rate', () => {
    const result = runSimulation({ ...baseConfig, winRate: 0 })
    expect(result.median).toBe(100) // unchanged starting bankroll
  })

  it('returns empty result for win rate of 1', () => {
    const result = runSimulation({ ...baseConfig, winRate: 1 })
    expect(result.median).toBe(100)
  })

  it('runs simulation with deterministic seed', () => {
    const result1 = runSimulation(baseConfig, 42)
    const result2 = runSimulation(baseConfig, 42)
    expect(result1.median).toBe(result2.median)
    expect(result1.p5).toBe(result2.p5)
    expect(result1.p95).toBe(result2.p95)
  })

  it('different seeds produce different results', () => {
    const config = { ...baseConfig, numSimulations: 1000, numBets: 200 }
    const result1 = runSimulation(config, 42)
    const result2 = runSimulation(config, 999)
    // With 1000 sims and 200 bets, different seeds should produce different trajectories
    const t1 = result1.trajectories.map((t) => t.median).join(',')
    const t2 = result2.trajectories.map((t) => t.median).join(',')
    expect(t1).not.toBe(t2)
  })

  it('positive edge bettor has profitable median', () => {
    const result = runSimulation(
      { ...baseConfig, winRate: 0.56, avgOdds: -110, numSimulations: 1000 },
      123
    )
    expect(result.median).toBeGreaterThan(baseConfig.startingBankroll)
    expect(result.profitProbability).toBeGreaterThan(50)
    expect(result.expectedROI).toBeGreaterThan(0)
  })

  it('negative edge bettor loses over time', () => {
    const result = runSimulation(
      { ...baseConfig, winRate: 0.45, avgOdds: -110, numSimulations: 1000 },
      123
    )
    expect(result.median).toBeLessThan(baseConfig.startingBankroll)
    expect(result.profitProbability).toBeLessThan(50)
  })

  it('detects ruin probability', () => {
    // Small bankroll, many bets
    const result = runSimulation(
      {
        startingBankroll: 5,
        winRate: 0.45,
        avgOdds: -110,
        unitSize: 1,
        numBets: 200,
        numSimulations: 500,
        enableRuin: true,
      },
      123
    )
    expect(result.ruinProbability).toBeGreaterThan(0)
  })

  it('generates trajectory points', () => {
    const result = runSimulation({ ...baseConfig, numBets: 50 }, 42)
    expect(result.trajectories.length).toBeGreaterThan(0)
    // Each trajectory point has percentile data
    const first = result.trajectories[0]
    expect(first.bet).toBeGreaterThan(0)
    expect(first.p5).toBeDefined()
    expect(first.median).toBeDefined()
    expect(first.p95).toBeDefined()
    // p5 <= median <= p95
    expect(first.p5).toBeLessThanOrEqual(first.median)
    expect(first.median).toBeLessThanOrEqual(first.p95)
  })

  it('caps numBets at 1000', () => {
    const result = runSimulation({ ...baseConfig, numBets: 5000 }, 42)
    expect(result.config.numBets).toBe(1000)
  })

  it('caps numSimulations at 5000', () => {
    const result = runSimulation({ ...baseConfig, numSimulations: 10000 }, 42)
    expect(result.config.numSimulations).toBe(5000)
  })

  it('calculates doubling probability', () => {
    const result = runSimulation(
      { ...baseConfig, winRate: 0.58, numBets: 500, numSimulations: 500 },
      42
    )
    expect(result.doubleProbability).toBeGreaterThanOrEqual(0)
    expect(result.doubleProbability).toBeLessThanOrEqual(100)
  })

  it('results are bounded', () => {
    const result = runSimulation(baseConfig, 42)
    expect(result.profitProbability).toBeGreaterThanOrEqual(0)
    expect(result.profitProbability).toBeLessThanOrEqual(100)
    expect(result.ruinProbability).toBeGreaterThanOrEqual(0)
    expect(result.ruinProbability).toBeLessThanOrEqual(100)
  })
})

describe('deriveConfigFromPicks', () => {
  it('returns defaults for empty picks', () => {
    const config = deriveConfigFromPicks([], 100)
    expect(config.winRate).toBe(0.5)
    expect(config.avgOdds).toBe(-110)
    expect(config.unitSize).toBe(1)
  })

  it('derives config from pick history', () => {
    const picks = [
      { outcome: 'win', odds: -110, units: 2 },
      { outcome: 'win', odds: -110, units: 2 },
      { outcome: 'loss', odds: -110, units: 2 },
      { outcome: 'win', odds: +150, units: 1 },
      { outcome: 'pending', odds: -110, units: 2 },
    ]
    const config = deriveConfigFromPicks(picks, 100)
    expect(config.winRate).toBe(0.75) // 3/4 resolved wins
    expect(config.startingBankroll).toBe(100)
    expect(config.unitSize).toBeGreaterThan(0)
  })

  it('ignores pending picks', () => {
    const picks = [
      { outcome: 'pending', odds: -110, units: 1 },
      { outcome: 'pending', odds: -110, units: 1 },
    ]
    const config = deriveConfigFromPicks(picks, 50)
    expect(config.winRate).toBe(0.5) // default
  })
})
