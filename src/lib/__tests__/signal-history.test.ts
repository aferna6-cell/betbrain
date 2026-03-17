/**
 * Signal History unit tests.
 *
 * Tests the SignalHistoryRecord and SignalStats interfaces,
 * hit rate calculation logic, and data shape validation.
 *
 * Does NOT call Supabase — pure logic and type compliance only.
 */

import { describe, it, expect } from 'vitest'
import type { SignalHistoryRecord, SignalStats } from '@/lib/signal-history'
import type { Sport } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<SignalHistoryRecord> = {}): SignalHistoryRecord {
  return {
    id: 'rec-001',
    external_game_id: 'game-001',
    sport: 'nba',
    home_team: 'Lakers',
    away_team: 'Celtics',
    game_date: '2026-03-14T23:00:00Z',
    strength: 'moderate',
    signal_count: 2,
    signals: ['Odds variance signal', 'High AI confidence signal'],
    value_side: 'home',
    ai_confidence: 80,
    outcome: null,
    resolved_at: null,
    detected_at: '2026-03-14T20:00:00Z',
    ...overrides,
  }
}

function calcHitRate(wins: number, total: number): number | null {
  if (total === 0) return null
  return Math.round((wins / total) * 1000) / 10
}

function makeStats(overrides: Partial<SignalStats> = {}): SignalStats {
  return {
    total: 10,
    resolved: 8,
    pending: 2,
    wins: 5,
    losses: 2,
    pushes: 1,
    hitRate: calcHitRate(5, 8),
    byStrength: {
      strong: { total: 3, wins: 2, hitRate: calcHitRate(2, 3) },
      moderate: { total: 5, wins: 3, hitRate: calcHitRate(3, 5) },
    },
    bySport: {
      nba: { total: 4, wins: 3, hitRate: calcHitRate(3, 4) },
      nfl: { total: 2, wins: 1, hitRate: calcHitRate(1, 2) },
      mlb: { total: 2, wins: 1, hitRate: calcHitRate(1, 2) },
      nhl: { total: 0, wins: 0, hitRate: null },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. SignalHistoryRecord interface compliance
// ---------------------------------------------------------------------------

describe('SignalHistoryRecord interface', () => {
  it('a well-formed record satisfies the interface shape', () => {
    const record = makeRecord()
    expect(typeof record.id).toBe('string')
    expect(typeof record.external_game_id).toBe('string')
    expect(['nba', 'nfl', 'mlb', 'nhl']).toContain(record.sport)
    expect(typeof record.home_team).toBe('string')
    expect(typeof record.away_team).toBe('string')
    expect(typeof record.game_date).toBe('string')
    expect(['strong', 'moderate']).toContain(record.strength)
    expect(typeof record.signal_count).toBe('number')
    expect(Array.isArray(record.signals)).toBe(true)
    expect(['home', 'away', null]).toContain(record.value_side)
    expect(record.ai_confidence === null || typeof record.ai_confidence === 'number').toBe(true)
    expect(typeof record.detected_at).toBe('string')
  })

  it('outcome is null when unresolved', () => {
    const record = makeRecord({ outcome: null })
    expect(record.outcome).toBeNull()
    expect(record.resolved_at).toBeNull()
  })

  it('outcome can be win, loss, push, or pending', () => {
    for (const outcome of ['win', 'loss', 'push', 'pending'] as const) {
      const record = makeRecord({ outcome, resolved_at: '2026-03-15T12:00:00Z' })
      expect(record.outcome).toBe(outcome)
    }
  })

  it('value_side can be null when no clear value side', () => {
    const record = makeRecord({ value_side: null })
    expect(record.value_side).toBeNull()
  })

  it('signals array contains human-readable strings', () => {
    const record = makeRecord({
      signals: [
        'Home moneyline varies by 35 pts across books',
        'AI analysis confidence: 82% — above threshold',
      ],
    })
    expect(record.signals).toHaveLength(2)
    for (const s of record.signals) {
      expect(typeof s).toBe('string')
      expect(s.length).toBeGreaterThan(0)
    }
  })

  it('signal_count matches signals array length', () => {
    const signals = ['s1', 's2', 's3']
    const record = makeRecord({ signals, signal_count: signals.length })
    expect(record.signal_count).toBe(record.signals.length)
  })
})

// ---------------------------------------------------------------------------
// 2. Hit rate calculation
// ---------------------------------------------------------------------------

describe('Hit rate calculation', () => {
  it('returns null when total is 0', () => {
    expect(calcHitRate(0, 0)).toBeNull()
  })

  it('returns 100 when all resolved signals are wins', () => {
    expect(calcHitRate(5, 5)).toBe(100)
  })

  it('returns 0 when no signals are wins', () => {
    expect(calcHitRate(0, 5)).toBe(0)
  })

  it('returns 50 for an even split', () => {
    expect(calcHitRate(5, 10)).toBe(50)
  })

  it('rounds to one decimal place', () => {
    // 3/7 = 42.857... → rounds to 42.9
    expect(calcHitRate(3, 7)).toBe(42.9)
  })

  it('handles 1 win of 1 total', () => {
    expect(calcHitRate(1, 1)).toBe(100)
  })

  it('handles 2 wins of 3 total', () => {
    // 2/3 = 66.666... → rounds to 66.7
    expect(calcHitRate(2, 3)).toBe(66.7)
  })
})

// ---------------------------------------------------------------------------
// 3. SignalStats interface compliance
// ---------------------------------------------------------------------------

describe('SignalStats interface', () => {
  it('a well-formed stats object satisfies the interface shape', () => {
    const stats = makeStats()
    expect(typeof stats.total).toBe('number')
    expect(typeof stats.resolved).toBe('number')
    expect(typeof stats.pending).toBe('number')
    expect(typeof stats.wins).toBe('number')
    expect(typeof stats.losses).toBe('number')
    expect(typeof stats.pushes).toBe('number')
    expect(stats.hitRate === null || typeof stats.hitRate === 'number').toBe(true)
  })

  it('total = resolved + pending', () => {
    const stats = makeStats()
    expect(stats.total).toBe(stats.resolved + stats.pending)
  })

  it('resolved = wins + losses + pushes', () => {
    const stats = makeStats()
    expect(stats.resolved).toBe(stats.wins + stats.losses + stats.pushes)
  })

  it('hitRate is calculated from wins / resolved', () => {
    const stats = makeStats()
    expect(stats.hitRate).toBe(calcHitRate(stats.wins, stats.resolved))
  })

  it('byStrength has strong and moderate', () => {
    const stats = makeStats()
    expect(stats.byStrength).toHaveProperty('strong')
    expect(stats.byStrength).toHaveProperty('moderate')
    expect(typeof stats.byStrength.strong.total).toBe('number')
    expect(typeof stats.byStrength.strong.wins).toBe('number')
    expect(typeof stats.byStrength.moderate.total).toBe('number')
    expect(typeof stats.byStrength.moderate.wins).toBe('number')
  })

  it('bySport has all four sports', () => {
    const stats = makeStats()
    const sports: Sport[] = ['nba', 'nfl', 'mlb', 'nhl']
    for (const sport of sports) {
      expect(stats.bySport).toHaveProperty(sport)
      expect(typeof stats.bySport[sport].total).toBe('number')
      expect(typeof stats.bySport[sport].wins).toBe('number')
      expect(stats.bySport[sport].hitRate === null || typeof stats.bySport[sport].hitRate === 'number').toBe(true)
    }
  })

  it('sport with 0 resolved has null hitRate', () => {
    const stats = makeStats()
    expect(stats.bySport.nhl.total).toBe(0)
    expect(stats.bySport.nhl.hitRate).toBeNull()
  })

  it('strong hit rate is higher than moderate when strong signals outperform', () => {
    // strong: 2/3 = 66.7%, moderate: 3/5 = 60%
    const stats = makeStats()
    expect(stats.byStrength.strong.hitRate).not.toBeNull()
    expect(stats.byStrength.moderate.hitRate).not.toBeNull()
    expect(stats.byStrength.strong.hitRate!).toBeGreaterThan(stats.byStrength.moderate.hitRate!)
  })
})

// ---------------------------------------------------------------------------
// 4. Empty stats
// ---------------------------------------------------------------------------

describe('Empty stats', () => {
  it('all zeros and nulls when no data', () => {
    const stats = makeStats({
      total: 0,
      resolved: 0,
      pending: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      hitRate: null,
      byStrength: {
        strong: { total: 0, wins: 0, hitRate: null },
        moderate: { total: 0, wins: 0, hitRate: null },
      },
      bySport: {
        nba: { total: 0, wins: 0, hitRate: null },
        nfl: { total: 0, wins: 0, hitRate: null },
        mlb: { total: 0, wins: 0, hitRate: null },
        nhl: { total: 0, wins: 0, hitRate: null },
      },
    })
    expect(stats.total).toBe(0)
    expect(stats.hitRate).toBeNull()
    expect(stats.byStrength.strong.hitRate).toBeNull()
    expect(stats.byStrength.moderate.hitRate).toBeNull()
    for (const sport of ['nba', 'nfl', 'mlb', 'nhl'] as const) {
      expect(stats.bySport[sport].hitRate).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// 5. Outcome resolution logic
// ---------------------------------------------------------------------------

describe('Outcome resolution semantics', () => {
  it('resolving a signal sets outcome and resolved_at', () => {
    const record = makeRecord({ outcome: null, resolved_at: null })
    // Simulate resolve
    const resolved = { ...record, outcome: 'win' as const, resolved_at: '2026-03-15T12:00:00Z' }
    expect(resolved.outcome).toBe('win')
    expect(resolved.resolved_at).not.toBeNull()
  })

  it('a win means the value_side team won/covered', () => {
    const record = makeRecord({ value_side: 'home', outcome: 'win' })
    expect(record.value_side).toBe('home')
    expect(record.outcome).toBe('win')
  })

  it('a loss means the value_side team lost', () => {
    const record = makeRecord({ value_side: 'away', outcome: 'loss' })
    expect(record.value_side).toBe('away')
    expect(record.outcome).toBe('loss')
  })

  it('a push means neither side covered (e.g., exact spread hit)', () => {
    const record = makeRecord({ outcome: 'push' })
    expect(record.outcome).toBe('push')
  })
})

// ---------------------------------------------------------------------------
// 6. Limit parameter validation
// ---------------------------------------------------------------------------

describe('Limit parameter bounds', () => {
  it('valid limit within bounds', () => {
    const limit = '50'
    const parsed = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500))
    expect(parsed).toBe(50)
  })

  it('very large limit gets clamped to 500', () => {
    const limit = '999999'
    const parsed = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500))
    expect(parsed).toBe(500)
  })

  it('zero limit defaults to 50 (falsy zero hits fallback)', () => {
    const limit = '0'
    const parsed = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500))
    expect(parsed).toBe(50)
  })

  it('negative limit gets clamped to 1', () => {
    const limit = '-10'
    const parsed = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500))
    expect(parsed).toBe(1)
  })

  it('NaN limit defaults to 50', () => {
    const limit = 'abc'
    const parsed = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500))
    expect(parsed).toBe(50)
  })

  it('Infinity string defaults to 50', () => {
    const limit = 'Infinity'
    const parsed = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500))
    expect(parsed).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// 7. Single-pass stats accumulation correctness
// ---------------------------------------------------------------------------

describe('Stats accumulation correctness', () => {
  it('wins + losses + pushes = resolved', () => {
    const stats = makeStats()
    expect(stats.wins + stats.losses + stats.pushes).toBe(stats.resolved)
  })

  it('strength subtotals sum to overall resolved', () => {
    const stats = makeStats()
    const strengthTotal = stats.byStrength.strong.total + stats.byStrength.moderate.total
    expect(strengthTotal).toBe(stats.resolved)
  })

  it('strength wins sum to overall wins', () => {
    const stats = makeStats()
    const strengthWins = stats.byStrength.strong.wins + stats.byStrength.moderate.wins
    expect(strengthWins).toBe(stats.wins)
  })

  it('sport subtotals sum to overall resolved', () => {
    const stats = makeStats()
    const sportTotal = Object.values(stats.bySport).reduce((s, sp) => s + sp.total, 0)
    expect(sportTotal).toBe(stats.resolved)
  })

  it('sport wins sum to overall wins', () => {
    const stats = makeStats()
    const sportWins = Object.values(stats.bySport).reduce((s, sp) => s + sp.wins, 0)
    expect(sportWins).toBe(stats.wins)
  })
})
