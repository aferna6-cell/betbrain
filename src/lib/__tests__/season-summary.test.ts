import { describe, it, expect } from 'vitest'
import { generateSeasonSummary, formatSummaryText } from '../season-summary'

function pick(overrides: Record<string, unknown> = {}) {
  return {
    sport: 'nba',
    pick_type: 'moneyline',
    pick_team: 'Lakers',
    odds: -110,
    units: 1,
    outcome: 'win',
    profit: 0.91,
    game_date: '2026-03-20',
    ...overrides,
  }
}

describe('generateSeasonSummary', () => {
  it('handles empty picks', () => {
    const s = generateSeasonSummary([])
    expect(s.totalPicks).toBe(0)
    expect(s.grade).toBe('--')
  })

  it('calculates basic stats', () => {
    const picks = [
      pick({ outcome: 'win', profit: 1.0 }),
      pick({ outcome: 'loss', profit: -1.0 }),
      pick({ outcome: 'win', profit: 1.5 }),
    ]
    const s = generateSeasonSummary(picks)
    expect(s.totalPicks).toBe(3)
    expect(s.record.wins).toBe(2)
    expect(s.record.losses).toBe(1)
    expect(s.winRate).toBe(66.7)
    expect(s.profit).toBe(1.5)
  })

  it('filters pending picks', () => {
    const picks = [
      pick({ outcome: 'win', profit: 1.0 }),
      pick({ outcome: 'pending', profit: null }),
    ]
    const s = generateSeasonSummary(picks)
    expect(s.totalPicks).toBe(1)
  })

  it('filters by date range', () => {
    const picks = [
      pick({ game_date: '2026-01-15', outcome: 'win', profit: 1.0 }),
      pick({ game_date: '2026-03-15', outcome: 'loss', profit: -1.0 }),
      pick({ game_date: '2026-04-15', outcome: 'win', profit: 2.0 }),
    ]
    const s = generateSeasonSummary(picks, '2026-02-01', '2026-03-31')
    expect(s.totalPicks).toBe(1)
    expect(s.record.losses).toBe(1)
  })

  it('identifies best and worst sport', () => {
    const picks = [
      pick({ sport: 'nba', outcome: 'win', profit: 3.0 }),
      pick({ sport: 'nfl', outcome: 'loss', profit: -2.0 }),
    ]
    const s = generateSeasonSummary(picks)
    expect(s.bestSport?.sport).toBe('nba')
    expect(s.worstSport?.sport).toBe('nfl')
  })

  it('calculates streaks', () => {
    const picks = [
      pick({ game_date: '2026-03-01', outcome: 'win' }),
      pick({ game_date: '2026-03-02', outcome: 'win' }),
      pick({ game_date: '2026-03-03', outcome: 'win' }),
      pick({ game_date: '2026-03-04', outcome: 'loss' }),
      pick({ game_date: '2026-03-05', outcome: 'loss' }),
    ]
    const s = generateSeasonSummary(picks)
    expect(s.longestWinStreak).toBe(3)
    expect(s.longestLossStreak).toBe(2)
  })

  it('calculates bet type breakdown', () => {
    const picks = [
      pick({ pick_type: 'moneyline', outcome: 'win', profit: 1.0 }),
      pick({ pick_type: 'spread', outcome: 'loss', profit: -1.0 }),
      pick({ pick_type: 'moneyline', outcome: 'win', profit: 1.0 }),
    ]
    const s = generateSeasonSummary(picks)
    expect(s.betTypeBreakdown).toHaveLength(2)
    const ml = s.betTypeBreakdown.find((b) => b.type === 'moneyline')!
    expect(ml.wins).toBe(2)
    expect(ml.losses).toBe(0)
  })

  it('assigns correct grades', () => {
    // Need 10+ picks for grading
    const winning = Array.from({ length: 12 }, (_, i) =>
      pick({ game_date: `2026-03-${String(i + 1).padStart(2, '0')}`, outcome: 'win', profit: 2.0 })
    )
    const s = generateSeasonSummary(winning)
    expect(s.grade).toBe('A+')

    const losing = Array.from({ length: 12 }, (_, i) =>
      pick({ game_date: `2026-03-${String(i + 1).padStart(2, '0')}`, outcome: 'loss', profit: -1.0 })
    )
    const s2 = generateSeasonSummary(losing)
    expect(s2.grade).toBe('F')
  })

  it('handles pushes', () => {
    const picks = [
      pick({ outcome: 'push', profit: 0 }),
      pick({ outcome: 'win', profit: 1.0 }),
    ]
    const s = generateSeasonSummary(picks)
    expect(s.record.pushes).toBe(1)
    expect(s.winRate).toBe(100) // Push doesn't count in win rate
  })

  it('finds best and worst individual picks', () => {
    const picks = [
      pick({ pick_team: 'Lakers', profit: 5.0, outcome: 'win' }),
      pick({ pick_team: 'Celtics', profit: -3.0, outcome: 'loss' }),
    ]
    const s = generateSeasonSummary(picks)
    expect(s.bestPick?.profit).toBe(5.0)
    expect(s.worstPick?.profit).toBe(-3.0)
  })
})

describe('formatSummaryText', () => {
  it('generates readable text', () => {
    const picks = Array.from({ length: 10 }, (_, i) =>
      pick({ game_date: `2026-03-${String(i + 1).padStart(2, '0')}` })
    )
    const summary = generateSeasonSummary(picks)
    const text = formatSummaryText(summary)
    expect(text).toContain('Season Summary')
    expect(text).toContain('Grade:')
    expect(text).toContain('Record:')
    expect(text).toContain('Not financial advice')
  })
})
