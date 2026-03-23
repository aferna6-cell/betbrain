import { describe, it, expect, beforeEach, vi } from 'vitest'
import { filterCurrentSeason, splitBySeason, SEASON_PRESETS } from '../seasonal-reset'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePick(gameDate: string) {
  return { game_date: gameDate, created_at: gameDate, outcome: 'win' as const }
}

// ---------------------------------------------------------------------------
// filterCurrentSeason
// ---------------------------------------------------------------------------

describe('filterCurrentSeason', () => {
  it('returns all picks when resetDate is null', () => {
    const picks = [makePick('2025-01-01'), makePick('2026-03-01')]
    expect(filterCurrentSeason(picks, null)).toEqual(picks)
  })

  it('filters picks before the reset date', () => {
    const picks = [
      makePick('2025-06-01'),
      makePick('2025-10-22'),
      makePick('2026-01-15'),
    ]
    const result = filterCurrentSeason(picks, '2025-10-22')
    expect(result.length).toBe(2)
    expect(result[0].game_date).toBe('2025-10-22')
    expect(result[1].game_date).toBe('2026-01-15')
  })

  it('returns empty when all picks are before the reset', () => {
    const picks = [makePick('2025-01-01'), makePick('2025-06-01')]
    const result = filterCurrentSeason(picks, '2026-01-01')
    expect(result).toEqual([])
  })

  it('returns all picks when reset date is before all picks', () => {
    const picks = [makePick('2026-01-01'), makePick('2026-02-01')]
    const result = filterCurrentSeason(picks, '2025-01-01')
    expect(result.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// splitBySeason
// ---------------------------------------------------------------------------

describe('splitBySeason', () => {
  it('puts all picks in current when no reset date', () => {
    const picks = [makePick('2025-01-01'), makePick('2026-01-01')]
    const { current, historical } = splitBySeason(picks, null)
    expect(current.length).toBe(2)
    expect(historical.length).toBe(0)
  })

  it('splits correctly at the boundary', () => {
    const picks = [
      makePick('2025-06-01'),
      makePick('2025-10-22'),
      makePick('2026-01-15'),
      makePick('2026-03-01'),
    ]
    const { current, historical } = splitBySeason(picks, '2025-10-22')
    expect(historical.length).toBe(1)
    expect(current.length).toBe(3)
    expect(historical[0].game_date).toBe('2025-06-01')
  })

  it('handles empty picks array', () => {
    const { current, historical } = splitBySeason([], '2026-01-01')
    expect(current).toEqual([])
    expect(historical).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// SEASON_PRESETS
// ---------------------------------------------------------------------------

describe('SEASON_PRESETS', () => {
  it('has at least 4 presets', () => {
    expect(SEASON_PRESETS.length).toBeGreaterThanOrEqual(4)
  })

  it('each preset has a valid date and label', () => {
    for (const preset of SEASON_PRESETS) {
      expect(preset.resetDate).toMatch(/^\d{4}-\d{2}-\d{2}/)
      expect(preset.label.length).toBeGreaterThan(0)
      // Date should be parseable
      expect(new Date(preset.resetDate).getTime()).not.toBeNaN()
    }
  })

  it('includes NBA, NFL, MLB, NHL presets', () => {
    const labels = SEASON_PRESETS.map((p) => p.label.toLowerCase())
    expect(labels.some((l) => l.includes('nba'))).toBe(true)
    expect(labels.some((l) => l.includes('nfl'))).toBe(true)
    expect(labels.some((l) => l.includes('mlb'))).toBe(true)
    expect(labels.some((l) => l.includes('nhl'))).toBe(true)
  })
})
