/**
 * calcPickStats tests.
 *
 * Covers:
 * - Empty picks array
 * - Win/loss/push counting
 * - Pending pick handling
 * - Win rate calculation (excludes pushes from denominator)
 * - ROI calculation
 * - Favorite sport detection
 * - Edge cases: all pushes, all pending, mixed outcomes
 */

import { describe, it, expect } from 'vitest'
import type { Sport, PickType, PickOutcome } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Re-implement calcPickStats locally (actual module has server-side imports)
// ---------------------------------------------------------------------------

interface PickStats {
  total: number
  wins: number
  losses: number
  pushes: number
  pending: number
  winRate: number | null
  roi: number
  favoriteSport: Sport | null
}

interface UserPickRow {
  id: string
  user_id: string
  external_game_id: string
  sport: Sport
  pick_type: PickType
  pick_team: string | null
  pick_line: number | null
  odds: number
  units: number
  outcome: PickOutcome | null
  profit: number | null
  notes: string | null
  game_date: string
  created_at: string
}

function calcPickStats(picks: UserPickRow[]): PickStats {
  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  const wins = resolved.filter((p) => p.outcome === 'win').length
  const losses = resolved.filter((p) => p.outcome === 'loss').length
  const pushes = resolved.filter((p) => p.outcome === 'push').length
  const totalProfit = resolved.reduce((sum, p) => sum + (p.profit ?? 0), 0)
  const totalUnits = resolved.reduce((sum, p) => sum + p.units, 0)
  const roi = totalUnits > 0 ? (totalProfit / totalUnits) * 100 : 0

  const decidedCount = wins + losses
  const winRate = decidedCount > 0 ? wins / decidedCount : null

  const sportCounts = picks.reduce<Partial<Record<Sport, number>>>((acc, p) => {
    acc[p.sport] = (acc[p.sport] ?? 0) + 1
    return acc
  }, {})
  const favoriteSport =
    picks.length > 0
      ? (Object.entries(sportCounts).sort(
          (a, b) => (b[1] as number) - (a[1] as number)
        )[0][0] as Sport)
      : null

  return {
    total: picks.length,
    wins,
    losses,
    pushes,
    pending: picks.length - resolved.length,
    winRate,
    roi: Math.round(roi * 100) / 100,
    favoriteSport,
  }
}

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

let idCounter = 0
function makePick(overrides: Partial<UserPickRow> = {}): UserPickRow {
  idCounter++
  return {
    id: `pick-${idCounter}`,
    user_id: 'user-1',
    external_game_id: `game-${idCounter}`,
    sport: 'nba',
    pick_type: 'moneyline',
    pick_team: 'Lakers',
    pick_line: null,
    odds: -110,
    units: 1,
    outcome: null,
    profit: null,
    notes: null,
    game_date: '2026-03-14',
    created_at: '2026-03-14T12:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('empty picks', () => {
  it('returns zeroes for empty array', () => {
    const stats = calcPickStats([])
    expect(stats.total).toBe(0)
    expect(stats.wins).toBe(0)
    expect(stats.losses).toBe(0)
    expect(stats.pushes).toBe(0)
    expect(stats.pending).toBe(0)
    expect(stats.roi).toBe(0)
  })

  it('returns null win rate for empty array', () => {
    expect(calcPickStats([]).winRate).toBeNull()
  })

  it('returns null favorite sport for empty array', () => {
    expect(calcPickStats([]).favoriteSport).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Basic counting
// ---------------------------------------------------------------------------

describe('counting outcomes', () => {
  it('counts wins correctly', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 1 }),
      makePick({ outcome: 'win', profit: 0.91 }),
      makePick({ outcome: 'loss', profit: -1 }),
    ]
    const stats = calcPickStats(picks)
    expect(stats.wins).toBe(2)
    expect(stats.losses).toBe(1)
  })

  it('counts pushes correctly', () => {
    const picks = [
      makePick({ outcome: 'push', profit: 0 }),
      makePick({ outcome: 'push', profit: 0 }),
    ]
    const stats = calcPickStats(picks)
    expect(stats.pushes).toBe(2)
    expect(stats.wins).toBe(0)
    expect(stats.losses).toBe(0)
  })

  it('counts pending correctly', () => {
    const picks = [
      makePick({ outcome: null }),
      makePick({ outcome: 'pending' }),
      makePick({ outcome: 'win', profit: 1 }),
    ]
    const stats = calcPickStats(picks)
    expect(stats.pending).toBe(2)
    expect(stats.total).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Win rate
// ---------------------------------------------------------------------------

describe('win rate', () => {
  it('returns null when no decided picks', () => {
    const picks = [
      makePick({ outcome: 'push', profit: 0 }),
      makePick({ outcome: null }),
    ]
    expect(calcPickStats(picks).winRate).toBeNull()
  })

  it('calculates win rate excluding pushes', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 1 }),
      makePick({ outcome: 'loss', profit: -1 }),
      makePick({ outcome: 'push', profit: 0 }),
    ]
    // 1 win / (1 win + 1 loss) = 0.5, push excluded
    expect(calcPickStats(picks).winRate).toBe(0.5)
  })

  it('100% win rate', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 1 }),
      makePick({ outcome: 'win', profit: 0.91 }),
    ]
    expect(calcPickStats(picks).winRate).toBe(1)
  })

  it('0% win rate', () => {
    const picks = [
      makePick({ outcome: 'loss', profit: -1 }),
      makePick({ outcome: 'loss', profit: -1 }),
    ]
    expect(calcPickStats(picks).winRate).toBe(0)
  })

  it('win rate with single decided pick', () => {
    const picks = [makePick({ outcome: 'win', profit: 1 })]
    expect(calcPickStats(picks).winRate).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// ROI
// ---------------------------------------------------------------------------

describe('ROI', () => {
  it('positive ROI when profitable', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 2, units: 1 }),
      makePick({ outcome: 'loss', profit: -1, units: 1 }),
    ]
    // totalProfit = 1, totalUnits = 2, ROI = 50%
    expect(calcPickStats(picks).roi).toBe(50)
  })

  it('negative ROI when losing', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 0.5, units: 1 }),
      makePick({ outcome: 'loss', profit: -1, units: 1 }),
    ]
    // totalProfit = -0.5, totalUnits = 2, ROI = -25%
    expect(calcPickStats(picks).roi).toBe(-25)
  })

  it('zero ROI when break even', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 1, units: 1 }),
      makePick({ outcome: 'loss', profit: -1, units: 1 }),
    ]
    expect(calcPickStats(picks).roi).toBe(0)
  })

  it('ROI excludes pending picks from calculation', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 1, units: 1 }),
      makePick({ outcome: null, units: 1 }),
    ]
    // totalProfit = 1, totalUnits = 1 (only resolved), ROI = 100%
    expect(calcPickStats(picks).roi).toBe(100)
  })

  it('handles null profit as 0', () => {
    const picks = [
      makePick({ outcome: 'win', profit: null, units: 1 }),
    ]
    // profit defaults to 0
    expect(calcPickStats(picks).roi).toBe(0)
  })

  it('ROI is rounded to 2 decimal places', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 1, units: 3 }),
    ]
    // 1/3 * 100 = 33.333... → 33.33
    expect(calcPickStats(picks).roi).toBe(33.33)
  })
})

// ---------------------------------------------------------------------------
// Favorite sport
// ---------------------------------------------------------------------------

describe('favorite sport', () => {
  it('detects single sport', () => {
    const picks = [
      makePick({ sport: 'nba' }),
      makePick({ sport: 'nba' }),
    ]
    expect(calcPickStats(picks).favoriteSport).toBe('nba')
  })

  it('detects most frequent sport', () => {
    const picks = [
      makePick({ sport: 'nba' }),
      makePick({ sport: 'nba' }),
      makePick({ sport: 'nfl' }),
      makePick({ sport: 'mlb' }),
    ]
    expect(calcPickStats(picks).favoriteSport).toBe('nba')
  })

  it('includes pending picks in sport counting', () => {
    const picks = [
      makePick({ sport: 'nfl', outcome: null }),
      makePick({ sport: 'nfl', outcome: null }),
      makePick({ sport: 'nba', outcome: 'win', profit: 1 }),
    ]
    expect(calcPickStats(picks).favoriteSport).toBe('nfl')
  })
})
