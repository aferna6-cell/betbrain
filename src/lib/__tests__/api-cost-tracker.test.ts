/**
 * API Cost Tracker tests.
 *
 * Tests cost metrics, sport efficiency, efficiency rating, and recommendations.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateCostMetrics,
  calculateSportEfficiency,
  getEfficiencyRating,
  generateRecommendation,
  type ApiCallRecord,
} from '@/lib/api-cost-tracker'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<ApiCallRecord> = {}): ApiCallRecord {
  return {
    timestamp: '2026-03-25T10:00:00Z',
    sport: 'nba',
    gamesReturned: 5,
    wasCacheHit: false,
    evOppsFound: 1,
    signalsTriggered: 0,
    alertsFired: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// calculateCostMetrics
// ---------------------------------------------------------------------------

describe('calculateCostMetrics', () => {
  it('calculates basic metrics', () => {
    const records = [
      makeRecord({ evOppsFound: 2, signalsTriggered: 1 }),
      makeRecord({ evOppsFound: 0, signalsTriggered: 0, alertsFired: 1 }),
    ]
    const metrics = calculateCostMetrics(records)

    expect(metrics.totalCalls).toBe(2)
    expect(metrics.totalEVOpps).toBe(2)
    expect(metrics.totalSignals).toBe(1)
    expect(metrics.totalAlerts).toBe(1)
    expect(metrics.totalInsights).toBe(4)
    expect(metrics.wasteCount).toBe(0)
    expect(metrics.wasteRate).toBe(0)
  })

  it('identifies waste calls', () => {
    const records = [
      makeRecord({ evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 }),
      makeRecord({ evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 }),
      makeRecord({ evOppsFound: 1 }),
    ]
    const metrics = calculateCostMetrics(records)

    expect(metrics.wasteCount).toBe(2)
    expect(metrics.wasteRate).toBe(67) // 2/3 rounded
  })

  it('counts cache hits separately', () => {
    const records = [
      makeRecord({ wasCacheHit: true }),
      makeRecord({ wasCacheHit: true }),
      makeRecord({ wasCacheHit: false }),
    ]
    const metrics = calculateCostMetrics(records)

    expect(metrics.totalCalls).toBe(1)
    expect(metrics.totalCacheHits).toBe(2)
    expect(metrics.cacheHitRate).toBe(67)
  })

  it('calculates calls per EV opportunity', () => {
    const records = [
      makeRecord({ evOppsFound: 2 }),
      makeRecord({ evOppsFound: 1 }),
      makeRecord({ evOppsFound: 0 }),
    ]
    const metrics = calculateCostMetrics(records)
    expect(metrics.callsPerEVOpp).toBe(1) // 3 calls / 3 EV opps
  })

  it('returns null for calls per insight when no insights', () => {
    const records = [
      makeRecord({ evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 }),
    ]
    const metrics = calculateCostMetrics(records)
    expect(metrics.callsPerInsight).toBeNull()
    expect(metrics.callsPerEVOpp).toBeNull()
  })

  it('handles empty records', () => {
    const metrics = calculateCostMetrics([])
    expect(metrics.totalCalls).toBe(0)
    expect(metrics.cacheHitRate).toBe(0)
    expect(metrics.wasteRate).toBe(0)
  })

  it('counts actionable games', () => {
    const records = [
      makeRecord({ evOppsFound: 1, gamesReturned: 5 }),
      makeRecord({ evOppsFound: 0, signalsTriggered: 0, alertsFired: 0, gamesReturned: 3 }),
    ]
    const metrics = calculateCostMetrics(records)
    expect(metrics.actionableGames).toBe(1)
    expect(metrics.totalGames).toBe(8)
    expect(metrics.actionableRate).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// calculateSportEfficiency
// ---------------------------------------------------------------------------

describe('calculateSportEfficiency', () => {
  it('groups by sport', () => {
    const records = [
      makeRecord({ sport: 'nba', evOppsFound: 2 }),
      makeRecord({ sport: 'nba', evOppsFound: 1 }),
      makeRecord({ sport: 'nfl', evOppsFound: 0 }),
    ]
    const efficiency = calculateSportEfficiency(records)

    expect(efficiency.length).toBe(2)
    const nba = efficiency.find(e => e.sport === 'nba')!
    expect(nba.calls).toBe(2)
    expect(nba.insights).toBe(3)
    expect(nba.insightsPerCall).toBe(1.5)
  })

  it('sorts by insights per call descending', () => {
    const records = [
      makeRecord({ sport: 'nba', evOppsFound: 0 }),
      makeRecord({ sport: 'nfl', evOppsFound: 3 }),
    ]
    const efficiency = calculateSportEfficiency(records)
    expect(efficiency[0].sport).toBe('nfl')
  })

  it('calculates waste rate per sport', () => {
    const records = [
      makeRecord({ sport: 'nba', evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 }),
      makeRecord({ sport: 'nba', evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 }),
      makeRecord({ sport: 'nba', evOppsFound: 1 }),
    ]
    const efficiency = calculateSportEfficiency(records)
    const nba = efficiency.find(e => e.sport === 'nba')!
    expect(nba.wasteRate).toBe(67)
  })
})

// ---------------------------------------------------------------------------
// getEfficiencyRating
// ---------------------------------------------------------------------------

describe('getEfficiencyRating', () => {
  it('rates excellent for high cache rate and low waste', () => {
    const metrics = calculateCostMetrics([
      makeRecord({ wasCacheHit: true }),
      makeRecord({ wasCacheHit: true }),
      makeRecord({ wasCacheHit: true }),
      makeRecord({ wasCacheHit: true }),
      makeRecord({ evOppsFound: 2, signalsTriggered: 1 }),
    ])
    const rating = getEfficiencyRating(metrics)
    expect(['excellent', 'good']).toContain(rating)
  })

  it('rates wasteful for high waste rate', () => {
    const records = Array.from({ length: 10 }, () =>
      makeRecord({ evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 })
    )
    const metrics = calculateCostMetrics(records)
    const rating = getEfficiencyRating(metrics)
    expect(['poor', 'wasteful']).toContain(rating)
  })

  it('returns average for zero calls', () => {
    const metrics = calculateCostMetrics([])
    expect(getEfficiencyRating(metrics)).toBe('average')
  })
})

// ---------------------------------------------------------------------------
// generateRecommendation
// ---------------------------------------------------------------------------

describe('generateRecommendation', () => {
  it('generates recommendation with optimal daily rate', () => {
    const metrics = calculateCostMetrics([
      makeRecord({ evOppsFound: 1 }),
    ])
    const sportEff = calculateSportEfficiency([makeRecord()])
    const rec = generateRecommendation(metrics, sportEff, 100, 15, 31)

    expect(rec.callsRemaining).toBe(400)
    expect(rec.daysRemaining).toBe(17)
    expect(rec.optimalDailyRate).toBe(23) // 400 / 17
    expect(rec.summary).toContain('insight')
    expect(rec.suggestions.length).toBeGreaterThan(0)
  })

  it('warns about tight budget', () => {
    const metrics = calculateCostMetrics([])
    const rec = generateRecommendation(metrics, [], 490, 28, 31)

    expect(rec.callsRemaining).toBe(10)
    expect(rec.optimalDailyRate).toBeLessThanOrEqual(3)
    expect(rec.suggestions.some(s => s.includes('tight'))).toBe(true)
  })

  it('warns about low cache hit rate', () => {
    const records = Array.from({ length: 5 }, () => makeRecord({ evOppsFound: 1 }))
    const metrics = calculateCostMetrics(records)
    const rec = generateRecommendation(metrics, [], 50, 10, 31)

    expect(rec.suggestions.some(s => s.includes('cache') || s.includes('Cache'))).toBe(true)
  })

  it('identifies worst sport', () => {
    const records = [
      makeRecord({ sport: 'mlb', evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 }),
      makeRecord({ sport: 'mlb', evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 }),
      makeRecord({ sport: 'mlb', evOppsFound: 0, signalsTriggered: 0, alertsFired: 0 }),
      makeRecord({ sport: 'nba', evOppsFound: 2 }),
    ]
    const sportEff = calculateSportEfficiency(records)
    const metrics = calculateCostMetrics(records)
    const rec = generateRecommendation(metrics, sportEff, 50, 10, 31)

    expect(rec.suggestions.some(s => s.includes('MLB'))).toBe(true)
  })

  it('identifies best sport', () => {
    const records = [
      makeRecord({ sport: 'nba', evOppsFound: 3 }),
    ]
    const sportEff = calculateSportEfficiency(records)
    const metrics = calculateCostMetrics(records)
    const rec = generateRecommendation(metrics, sportEff, 50, 10, 31)

    expect(rec.suggestions.some(s => s.includes('NBA'))).toBe(true)
  })
})
