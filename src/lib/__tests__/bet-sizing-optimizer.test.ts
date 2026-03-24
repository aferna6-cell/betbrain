import { describe, it, expect } from 'vitest'
import {
  analyzeRecentPerformance,
  getOptimalSizing,
  getSizingHealth,
} from '../bet-sizing-optimizer'

describe('analyzeRecentPerformance', () => {
  it('returns empty stats for no picks', () => {
    const result = analyzeRecentPerformance([])
    expect(result.totalPicks).toBe(0)
    expect(result.winRate).toBe(0)
    expect(result.roi).toBe(0)
  })

  it('ignores pending picks', () => {
    const picks = [
      { outcome: 'pending', profit: null, units: 1, odds: -110, game_date: new Date().toISOString().slice(0, 10) },
    ]
    const result = analyzeRecentPerformance(picks)
    expect(result.totalPicks).toBe(0)
  })

  it('calculates win rate correctly', () => {
    const today = new Date().toISOString().slice(0, 10)
    const picks = [
      { outcome: 'win', profit: 1, units: 1, odds: -110, game_date: today },
      { outcome: 'win', profit: 1, units: 1, odds: -110, game_date: today },
      { outcome: 'loss', profit: -1, units: 1, odds: -110, game_date: today },
    ]
    const result = analyzeRecentPerformance(picks, 30)
    expect(result.winRate).toBeCloseTo(0.667, 2)
    expect(result.wins).toBe(2)
    expect(result.losses).toBe(1)
  })

  it('filters by window days', () => {
    const today = new Date().toISOString().slice(0, 10)
    const oldDate = '2020-01-01'
    const picks = [
      { outcome: 'win', profit: 1, units: 1, odds: -110, game_date: today },
      { outcome: 'loss', profit: -1, units: 1, odds: -110, game_date: oldDate },
    ]
    const result = analyzeRecentPerformance(picks, 14)
    expect(result.totalPicks).toBe(1)
    expect(result.wins).toBe(1)
  })

  it('calculates ROI correctly', () => {
    const today = new Date().toISOString().slice(0, 10)
    const picks = [
      { outcome: 'win', profit: 3, units: 2, odds: -110, game_date: today },
      { outcome: 'loss', profit: -1, units: 1, odds: -110, game_date: today },
    ]
    const result = analyzeRecentPerformance(picks, 30)
    // Net profit = 2, total units = 3, ROI = (2/3)*100 = 66.67%
    expect(result.roi).toBeCloseTo(66.67, 0)
  })
})

describe('getOptimalSizing', () => {
  const goodPerf = {
    wins: 8, losses: 2, pushes: 0, totalPicks: 10,
    winRate: 0.8, roi: 25, avgUnits: 1, netProfit: 10,
  }

  const badPerf = {
    wins: 2, losses: 8, pushes: 0, totalPicks: 10,
    winRate: 0.2, roi: -30, avgUnits: 1, netProfit: -12,
  }

  const noData = {
    wins: 0, losses: 0, pushes: 0, totalPicks: 0,
    winRate: 0, roi: 0, avgUnits: 0, netProfit: 0,
  }

  it('returns 5 factors', () => {
    const result = getOptimalSizing(1000, 10, 0.25, goodPerf)
    expect(result.factors).toHaveLength(5)
  })

  it('increases sizing for good performance', () => {
    const result = getOptimalSizing(1000, 10, 0.25, goodPerf)
    expect(result.adjustmentFactor).toBeGreaterThan(1.0)
    expect(result.adjustedUnitSize).toBeGreaterThan(10)
  })

  it('decreases sizing for bad performance', () => {
    const result = getOptimalSizing(1000, 10, 0.25, badPerf)
    expect(result.adjustmentFactor).toBeLessThan(1.0)
    expect(result.adjustedUnitSize).toBeLessThan(10)
  })

  it('stays near base with no data', () => {
    const result = getOptimalSizing(1000, 10, 0.25, noData)
    expect(result.adjustmentFactor).toBeCloseTo(1.0, 0)
    expect(result.reason).toContain('Not enough')
  })

  it('has sizing score between 0 and 100', () => {
    const result = getOptimalSizing(1000, 10, 0.5, goodPerf)
    expect(result.sizingScore).toBeGreaterThanOrEqual(0)
    expect(result.sizingScore).toBeLessThanOrEqual(100)
  })

  it('caps adjustment factor', () => {
    const result = getOptimalSizing(1000, 10, 0.25, goodPerf)
    expect(result.adjustmentFactor).toBeLessThanOrEqual(1.5)
    expect(result.adjustmentFactor).toBeGreaterThanOrEqual(0.5)
  })
})

describe('getSizingHealth', () => {
  it('returns Increase for high scores', () => {
    expect(getSizingHealth(80).label).toBe('Increase')
    expect(getSizingHealth(80).color).toContain('green')
  })

  it('returns Maintain for medium scores', () => {
    expect(getSizingHealth(55).label).toBe('Maintain')
  })

  it('returns Reduce for low scores', () => {
    expect(getSizingHealth(35).label).toBe('Reduce')
  })

  it('returns Protect for very low scores', () => {
    expect(getSizingHealth(15).label).toBe('Protect')
    expect(getSizingHealth(15).color).toContain('red')
  })
})
