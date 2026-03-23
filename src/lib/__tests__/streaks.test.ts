import { describe, it, expect } from 'vitest'
import {
  calculateStreaks,
  calculateBadges,
  getWeekLabel,
  type StreakInfo,
  type Badge,
} from '../streaks'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePick(
  outcome: string | null,
  gameDate: string,
  opts: { profit?: number; odds?: number; closing_odds?: number | null } = {}
) {
  return {
    outcome,
    game_date: gameDate,
    resolved_at: outcome !== 'pending' ? gameDate : null,
    profit: opts.profit ?? (outcome === 'win' ? 1 : outcome === 'loss' ? -1 : 0),
    odds: opts.odds ?? -110,
    closing_odds: opts.closing_odds ?? null,
  }
}

// ---------------------------------------------------------------------------
// calculateStreaks
// ---------------------------------------------------------------------------

describe('calculateStreaks', () => {
  it('returns zeros for empty picks', () => {
    const result = calculateStreaks([])
    expect(result.currentType).toBeNull()
    expect(result.currentLength).toBe(0)
    expect(result.longestWinStreak).toBe(0)
    expect(result.longestLossStreak).toBe(0)
    expect(result.bestWeek).toBeNull()
  })

  it('returns zeros for only pending picks', () => {
    const picks = [
      makePick('pending', '2026-03-20'),
      makePick('pending', '2026-03-21'),
    ]
    const result = calculateStreaks(picks)
    expect(result.currentType).toBeNull()
    expect(result.currentLength).toBe(0)
  })

  it('calculates a single win correctly', () => {
    const picks = [makePick('win', '2026-03-20')]
    const result = calculateStreaks(picks)
    expect(result.currentType).toBe('win')
    expect(result.currentLength).toBe(1)
    expect(result.longestWinStreak).toBe(1)
    expect(result.longestLossStreak).toBe(0)
  })

  it('calculates current win streak', () => {
    const picks = [
      makePick('loss', '2026-03-18'),
      makePick('win', '2026-03-19'),
      makePick('win', '2026-03-20'),
      makePick('win', '2026-03-21'),
    ]
    const result = calculateStreaks(picks)
    expect(result.currentType).toBe('win')
    expect(result.currentLength).toBe(3)
    expect(result.longestWinStreak).toBe(3)
    expect(result.longestLossStreak).toBe(1)
  })

  it('calculates current loss streak', () => {
    const picks = [
      makePick('win', '2026-03-18'),
      makePick('win', '2026-03-19'),
      makePick('loss', '2026-03-20'),
      makePick('loss', '2026-03-21'),
    ]
    const result = calculateStreaks(picks)
    expect(result.currentType).toBe('loss')
    expect(result.currentLength).toBe(2)
    expect(result.longestWinStreak).toBe(2)
    expect(result.longestLossStreak).toBe(2)
  })

  it('calculates longest win streak when it is not the current streak', () => {
    const picks = [
      makePick('win', '2026-03-15'),
      makePick('win', '2026-03-16'),
      makePick('win', '2026-03-17'),
      makePick('win', '2026-03-18'),
      makePick('win', '2026-03-19'),
      makePick('loss', '2026-03-20'),
      makePick('win', '2026-03-21'),
    ]
    const result = calculateStreaks(picks)
    expect(result.currentType).toBe('win')
    expect(result.currentLength).toBe(1)
    expect(result.longestWinStreak).toBe(5)
  })

  it('ignores push picks for streaks', () => {
    const picks = [
      makePick('win', '2026-03-18'),
      makePick('push', '2026-03-19'),
      makePick('win', '2026-03-20'),
    ]
    // Pushes are filtered out, so it's 2 consecutive wins
    const result = calculateStreaks(picks)
    expect(result.currentType).toBe('win')
    expect(result.currentLength).toBe(2)
    expect(result.longestWinStreak).toBe(2)
  })

  it('calculates longest loss streak', () => {
    const picks = [
      makePick('loss', '2026-03-15'),
      makePick('loss', '2026-03-16'),
      makePick('loss', '2026-03-17'),
      makePick('win', '2026-03-18'),
      makePick('loss', '2026-03-19'),
    ]
    const result = calculateStreaks(picks)
    expect(result.longestLossStreak).toBe(3)
  })

  it('handles alternating wins and losses', () => {
    const picks = [
      makePick('win', '2026-03-15'),
      makePick('loss', '2026-03-16'),
      makePick('win', '2026-03-17'),
      makePick('loss', '2026-03-18'),
    ]
    const result = calculateStreaks(picks)
    expect(result.longestWinStreak).toBe(1)
    expect(result.longestLossStreak).toBe(1)
    expect(result.currentLength).toBe(1)
  })

  it('calculates best week', () => {
    // All in same week (Mon Mar 16 - Sun Mar 22, 2026)
    const picks = [
      makePick('win', '2026-03-16'),
      makePick('win', '2026-03-17'),
      makePick('win', '2026-03-18'),
      makePick('loss', '2026-03-19'),
    ]
    const result = calculateStreaks(picks)
    expect(result.bestWeek).not.toBeNull()
    expect(result.bestWeek!.wins).toBe(3)
    expect(result.bestWeek!.losses).toBe(1)
    expect(result.bestWeek!.net).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// getWeekLabel
// ---------------------------------------------------------------------------

describe('getWeekLabel', () => {
  it('returns a Mon-Sun range', () => {
    // March 18, 2026 is a Wednesday
    const label = getWeekLabel(new Date('2026-03-18'))
    expect(label).toContain('Mar')
    expect(label).toContain(' - ')
  })

  it('handles Monday correctly', () => {
    // March 16, 2026 is a Monday
    const label = getWeekLabel(new Date('2026-03-16'))
    expect(label).toContain('Mar 16')
  })

  it('handles Sunday correctly', () => {
    // March 22, 2026 is a Sunday
    const label = getWeekLabel(new Date('2026-03-22'))
    expect(label).toContain('Mar 22')
  })
})

// ---------------------------------------------------------------------------
// calculateBadges
// ---------------------------------------------------------------------------

describe('calculateBadges', () => {
  it('returns empty array for no picks', () => {
    expect(calculateBadges([])).toEqual([])
  })

  it('awards Hot Hand badge for 3+ win streak', () => {
    const picks = [
      makePick('win', '2026-03-18'),
      makePick('win', '2026-03-19'),
      makePick('win', '2026-03-20'),
    ]
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'hot-hand')).toBeDefined()
  })

  it('does not award Hot Hand for 2 wins', () => {
    const picks = [
      makePick('win', '2026-03-18'),
      makePick('win', '2026-03-19'),
    ]
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'hot-hand')).toBeUndefined()
  })

  it('awards 5-Game Heater for 5+ win streak', () => {
    const picks = Array.from({ length: 5 }, (_, i) =>
      makePick('win', `2026-03-${15 + i}`)
    )
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'heater')).toBeDefined()
  })

  it('awards On Fire for 10+ win streak', () => {
    const picks = Array.from({ length: 10 }, (_, i) =>
      makePick('win', `2026-03-${10 + i}`)
    )
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'on-fire')).toBeDefined()
  })

  it('awards Getting Started for 10+ resolved picks', () => {
    const picks = Array.from({ length: 10 }, (_, i) =>
      makePick(i % 2 === 0 ? 'win' : 'loss', `2026-03-${10 + i}`)
    )
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'getting-started')).toBeDefined()
  })

  it('does not award Getting Started for 9 resolved picks', () => {
    const picks = Array.from({ length: 9 }, (_, i) =>
      makePick('win', `2026-03-${10 + i}`)
    )
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'getting-started')).toBeUndefined()
  })

  it('awards Consistent for 50+ resolved picks', () => {
    const picks = Array.from({ length: 50 }, (_, i) =>
      makePick(i % 2 === 0 ? 'win' : 'loss', `2026-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`)
    )
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'consistent')).toBeDefined()
  })

  it('awards In the Green for positive ROI with 20+ picks', () => {
    // 15 wins, 5 losses = +10 profit on 20 picks = 50% ROI
    const picks = [
      ...Array.from({ length: 15 }, (_, i) =>
        makePick('win', `2026-03-${String(i + 1).padStart(2, '0')}`, { profit: 1 })
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makePick('loss', `2026-02-${String(i + 1).padStart(2, '0')}`, { profit: -1 })
      ),
    ]
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'profitable')).toBeDefined()
  })

  it('does not award In the Green for negative ROI', () => {
    const picks = [
      ...Array.from({ length: 5 }, (_, i) =>
        makePick('win', `2026-03-${String(i + 1).padStart(2, '0')}`, { profit: 1 })
      ),
      ...Array.from({ length: 15 }, (_, i) =>
        makePick('loss', `2026-02-${String(i + 1).padStart(2, '0')}`, { profit: -1 })
      ),
    ]
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'profitable')).toBeUndefined()
  })

  it('awards CLV King for 60%+ CLV rate with 10+ tracked picks', () => {
    // Create 10 picks where 7 have positive CLV
    const picks = Array.from({ length: 10 }, (_, i) => {
      const hasPositiveCLV = i < 7
      return makePick('win', `2026-03-${String(i + 10).padStart(2, '0')}`, {
        odds: -110,
        // Positive CLV = closing odds have higher implied prob (more negative)
        closing_odds: hasPositiveCLV ? -130 : -100,
      })
    })
    const badges = calculateBadges(picks)
    expect(badges.find((b) => b.id === 'clv-king')).toBeDefined()
  })

  it('every badge has required fields', () => {
    const picks = Array.from({ length: 100 }, (_, i) =>
      makePick('win', `2026-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, {
        profit: 1,
        odds: -110,
        closing_odds: -130,
      })
    )
    const badges = calculateBadges(picks)
    for (const badge of badges) {
      expect(badge.id).toBeTruthy()
      expect(badge.label).toBeTruthy()
      expect(badge.description).toBeTruthy()
      expect(badge.icon).toBeTruthy()
    }
  })
})
