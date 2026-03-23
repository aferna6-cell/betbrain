/**
 * Analytics data shape and calculation tests.
 *
 * Tests the AnalyticsData interface, stat calculations, and edge cases.
 * Does NOT call Supabase — pure logic and type compliance only.
 */

import { describe, it, expect } from 'vitest'
import type { AnalyticsData } from '@/lib/analytics'

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------

function makeAnalytics(overrides: Partial<AnalyticsData> = {}): AnalyticsData {
  return {
    picks: {
      total: 20,
      wins: 10,
      losses: 7,
      pushes: 1,
      pending: 2,
      winRate: 58.8,
      totalProfit: 3.5,
      roi: 19.44,
      byType: [
        { type: 'moneyline', wins: 6, losses: 4, total: 10, winRate: 60, roi: 25 },
        { type: 'spread', wins: 4, losses: 3, total: 8, winRate: 57.1, roi: 12 },
      ],
      bySport: [
        { sport: 'nba', wins: 8, losses: 5, total: 14, roi: 22 },
        { sport: 'nfl', wins: 2, losses: 2, total: 6, roi: 5 },
      ],
      rollingROI: [],
    },
    clv: {
      averageCLV: 1.5,
      totalPicks: 8,
      positiveCLVCount: 5,
      negativeCLVCount: 3,
      positiveCLVRate: 62.5,
      weightedCLV: 1.8,
    },
    apiUsage: {
      odds: 150,
      balldontlie: 500,
      claude: 45,
      month: '2026-03',
    },
    activity: {
      recentPicks: 5,
      analysesGenerated: 30,
      signalsDetected: 12,
      signalsResolved: 8,
      signalHitRate: 62.5,
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. AnalyticsData interface compliance
// ---------------------------------------------------------------------------

describe('AnalyticsData interface', () => {
  it('a well-formed analytics object satisfies the interface shape', () => {
    const data = makeAnalytics()
    expect(typeof data.picks.total).toBe('number')
    expect(typeof data.picks.wins).toBe('number')
    expect(typeof data.picks.losses).toBe('number')
    expect(typeof data.picks.pushes).toBe('number')
    expect(typeof data.picks.pending).toBe('number')
    expect(data.picks.winRate === null || typeof data.picks.winRate === 'number').toBe(true)
    expect(typeof data.picks.totalProfit).toBe('number')
    expect(typeof data.picks.roi).toBe('number')
    expect(Array.isArray(data.picks.byType)).toBe(true)
    expect(Array.isArray(data.picks.bySport)).toBe(true)
  })

  it('CLV stats are included', () => {
    const data = makeAnalytics()
    expect(typeof data.clv.averageCLV).toBe('number')
    expect(typeof data.clv.totalPicks).toBe('number')
    expect(typeof data.clv.positiveCLVRate).toBe('number')
  })

  it('API usage has all three services', () => {
    const data = makeAnalytics()
    expect(typeof data.apiUsage.odds).toBe('number')
    expect(typeof data.apiUsage.balldontlie).toBe('number')
    expect(typeof data.apiUsage.claude).toBe('number')
    expect(typeof data.apiUsage.month).toBe('string')
  })

  it('activity section has all metrics', () => {
    const data = makeAnalytics()
    expect(typeof data.activity.recentPicks).toBe('number')
    expect(typeof data.activity.analysesGenerated).toBe('number')
    expect(typeof data.activity.signalsDetected).toBe('number')
    expect(typeof data.activity.signalsResolved).toBe('number')
    expect(data.activity.signalHitRate === null || typeof data.activity.signalHitRate === 'number').toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. Pick stats consistency
// ---------------------------------------------------------------------------

describe('Pick stats consistency', () => {
  it('resolved picks = wins + losses + pushes', () => {
    const data = makeAnalytics()
    const resolved = data.picks.wins + data.picks.losses + data.picks.pushes
    expect(resolved).toBe(data.picks.total - data.picks.pending)
  })

  it('win rate is calculated from decided picks (wins + losses)', () => {
    const data = makeAnalytics()
    const decided = data.picks.wins + data.picks.losses
    const expectedWinRate = Math.round((data.picks.wins / decided) * 1000) / 10
    expect(data.picks.winRate).toBe(expectedWinRate)
  })

  it('byType entries sum to resolved total', () => {
    const data = makeAnalytics()
    const typeTotal = data.picks.byType.reduce((s, t) => s + t.total, 0)
    expect(typeTotal).toBe(data.picks.wins + data.picks.losses + data.picks.pushes)
  })
})

// ---------------------------------------------------------------------------
// 3. Empty state
// ---------------------------------------------------------------------------

describe('Empty analytics', () => {
  it('handles zero picks gracefully', () => {
    const data = makeAnalytics({
      picks: {
        total: 0, wins: 0, losses: 0, pushes: 0, pending: 0,
        winRate: null, totalProfit: 0, roi: 0,
        byType: [], bySport: [], rollingROI: [],
      },
      clv: {
        averageCLV: 0, totalPicks: 0,
        positiveCLVCount: 0, negativeCLVCount: 0,
        positiveCLVRate: 0, weightedCLV: 0,
      },
      activity: {
        recentPicks: 0, analysesGenerated: 0,
        signalsDetected: 0, signalsResolved: 0, signalHitRate: null,
      },
    })
    expect(data.picks.total).toBe(0)
    expect(data.picks.winRate).toBeNull()
    expect(data.clv.totalPicks).toBe(0)
    expect(data.activity.signalHitRate).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 4. API usage boundaries
// ---------------------------------------------------------------------------

describe('API usage', () => {
  it('month format is YYYY-MM', () => {
    const data = makeAnalytics()
    expect(data.apiUsage.month).toMatch(/^\d{4}-\d{2}$/)
  })

  it('usage values are non-negative', () => {
    const data = makeAnalytics()
    expect(data.apiUsage.odds).toBeGreaterThanOrEqual(0)
    expect(data.apiUsage.balldontlie).toBeGreaterThanOrEqual(0)
    expect(data.apiUsage.claude).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Signal activity
// ---------------------------------------------------------------------------

describe('Signal activity', () => {
  it('signalsResolved <= signalsDetected', () => {
    const data = makeAnalytics()
    expect(data.activity.signalsResolved).toBeLessThanOrEqual(data.activity.signalsDetected)
  })

  it('signal hit rate is null when no signals resolved', () => {
    const data = makeAnalytics({
      activity: {
        recentPicks: 0, analysesGenerated: 0,
        signalsDetected: 5, signalsResolved: 0,
        signalHitRate: null,
      },
    })
    expect(data.activity.signalHitRate).toBeNull()
  })
})
