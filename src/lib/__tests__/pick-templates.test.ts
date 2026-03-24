import { describe, it, expect, beforeEach, vi } from 'vitest'
import { suggestTemplates } from '../pick-templates'

// Pure function tests — no localStorage needed

describe('suggestTemplates', () => {
  it('returns empty for no picks', () => {
    expect(suggestTemplates([])).toEqual([])
  })

  it('returns empty when no pattern used 3+ times', () => {
    const picks = [
      { sport: 'nba', pick_type: 'moneyline', units: 1 },
      { sport: 'nba', pick_type: 'moneyline', units: 1 },
    ]
    expect(suggestTemplates(picks)).toEqual([])
  })

  it('suggests patterns used 3+ times', () => {
    const picks = [
      { sport: 'nba', pick_type: 'moneyline', units: 1 },
      { sport: 'nba', pick_type: 'moneyline', units: 1 },
      { sport: 'nba', pick_type: 'moneyline', units: 1 },
    ]
    const suggestions = suggestTemplates(picks)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toEqual({
      sport: 'nba',
      pickType: 'moneyline',
      units: 1,
      count: 3,
    })
  })

  it('sorts by frequency descending', () => {
    const picks = [
      ...Array(5).fill({ sport: 'nba', pick_type: 'spread', units: 2 }),
      ...Array(3).fill({ sport: 'nfl', pick_type: 'moneyline', units: 1 }),
      ...Array(4).fill({ sport: 'nba', pick_type: 'moneyline', units: 1 }),
    ]
    const suggestions = suggestTemplates(picks)
    expect(suggestions).toHaveLength(3)
    expect(suggestions[0].count).toBe(5)
    expect(suggestions[1].count).toBe(4)
    expect(suggestions[2].count).toBe(3)
  })

  it('limits to 5 suggestions', () => {
    const picks = [
      ...Array(10).fill({ sport: 'nba', pick_type: 'moneyline', units: 1 }),
      ...Array(8).fill({ sport: 'nba', pick_type: 'spread', units: 1 }),
      ...Array(6).fill({ sport: 'nfl', pick_type: 'moneyline', units: 2 }),
      ...Array(5).fill({ sport: 'nhl', pick_type: 'moneyline', units: 1 }),
      ...Array(4).fill({ sport: 'mlb', pick_type: 'over', units: 1 }),
      ...Array(3).fill({ sport: 'mlb', pick_type: 'under', units: 1 }),
      ...Array(3).fill({ sport: 'nba', pick_type: 'prop', units: 0.5 }),
    ]
    const suggestions = suggestTemplates(picks)
    expect(suggestions).toHaveLength(5)
  })

  it('treats different units as different patterns', () => {
    const picks = [
      ...Array(3).fill({ sport: 'nba', pick_type: 'moneyline', units: 1 }),
      ...Array(3).fill({ sport: 'nba', pick_type: 'moneyline', units: 2 }),
    ]
    const suggestions = suggestTemplates(picks)
    expect(suggestions).toHaveLength(2)
  })

  it('treats different sports as different patterns', () => {
    const picks = [
      ...Array(3).fill({ sport: 'nba', pick_type: 'moneyline', units: 1 }),
      ...Array(3).fill({ sport: 'nfl', pick_type: 'moneyline', units: 1 }),
    ]
    const suggestions = suggestTemplates(picks)
    expect(suggestions).toHaveLength(2)
  })
})
