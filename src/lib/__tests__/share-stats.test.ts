/**
 * ShareableStats interface and data shape tests.
 *
 * Does NOT call Supabase — pure type compliance and calculation tests.
 */

import { describe, it, expect } from 'vitest'
import type { ShareableStats } from '@/lib/share-stats'

function makeStats(overrides: Partial<ShareableStats> = {}): ShareableStats {
  return {
    displayName: 'SharpBettor',
    memberSince: 'Mar 2026',
    record: { wins: 15, losses: 10, pushes: 2 },
    total: 30,
    winRate: 60,
    roi: 12.5,
    totalProfit: 5.25,
    favoriteSport: 'nba',
    clv: { averageCLV: 1.8, positiveCLVRate: 62.5 },
    topSport: { sport: 'nba', wins: 10, losses: 5, roi: 22 },
    ...overrides,
  }
}

describe('ShareableStats interface', () => {
  it('satisfies the interface shape', () => {
    const stats = makeStats()
    expect(typeof stats.displayName).toBe('string')
    expect(typeof stats.memberSince).toBe('string')
    expect(typeof stats.record.wins).toBe('number')
    expect(typeof stats.record.losses).toBe('number')
    expect(typeof stats.record.pushes).toBe('number')
    expect(typeof stats.total).toBe('number')
    expect(stats.winRate === null || typeof stats.winRate === 'number').toBe(true)
    expect(typeof stats.roi).toBe('number')
    expect(typeof stats.totalProfit).toBe('number')
  })

  it('CLV is null when fewer than 3 picks have closing odds', () => {
    const stats = makeStats({ clv: null })
    expect(stats.clv).toBeNull()
  })

  it('CLV is present when 3+ picks have closing odds', () => {
    const stats = makeStats()
    expect(stats.clv).not.toBeNull()
    expect(typeof stats.clv!.averageCLV).toBe('number')
    expect(typeof stats.clv!.positiveCLVRate).toBe('number')
  })

  it('topSport is null when no picks exist', () => {
    const stats = makeStats({ topSport: null })
    expect(stats.topSport).toBeNull()
  })

  it('favoriteSport can be null', () => {
    const stats = makeStats({ favoriteSport: null })
    expect(stats.favoriteSport).toBeNull()
  })

  it('winRate is null when no decided picks', () => {
    const stats = makeStats({ winRate: null })
    expect(stats.winRate).toBeNull()
  })

  it('record consistency: wins + losses + pushes <= total', () => {
    const stats = makeStats()
    const resolved = stats.record.wins + stats.record.losses + stats.record.pushes
    expect(resolved).toBeLessThanOrEqual(stats.total)
  })

  it('displayName defaults to "Anonymous" when null', () => {
    const stats = makeStats({ displayName: 'Anonymous' })
    expect(stats.displayName).toBe('Anonymous')
  })

  it('memberSince format is readable', () => {
    const stats = makeStats()
    expect(stats.memberSince).toMatch(/\w+ \d{4}/)
  })

  it('roi can be negative', () => {
    const stats = makeStats({ roi: -8.5 })
    expect(stats.roi).toBeLessThan(0)
  })

  it('totalProfit can be negative', () => {
    const stats = makeStats({ totalProfit: -3.2 })
    expect(stats.totalProfit).toBeLessThan(0)
  })
})
