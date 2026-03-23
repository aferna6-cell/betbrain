import { describe, it, expect } from 'vitest'
import { generateWeeklyRecap } from '../weekly-recap'

function makePick(overrides: Record<string, unknown> = {}) {
  return {
    sport: 'nba',
    pick_team: 'Lakers',
    odds: -110,
    units: 1,
    outcome: 'win' as const,
    profit: 0.91,
    game_date: '2026-03-23',
    created_at: '2026-03-23T12:00:00Z',
    ...overrides,
  }
}

describe('weekly-recap', () => {
  // Use a fixed reference date: Wednesday March 25, 2026
  // Week: Monday March 23 - Sunday March 29
  const refDate = new Date('2026-03-25T12:00:00Z')

  it('generates recap for empty picks', () => {
    const recap = generateWeeklyRecap([], refDate)
    expect(recap.totalPicks).toBe(0)
    expect(recap.wins).toBe(0)
    expect(recap.profit).toBe(0)
  })

  it('counts wins and losses', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 0.91, game_date: '2026-03-23' }),
      makePick({ outcome: 'win', profit: 0.91, game_date: '2026-03-24' }),
      makePick({ outcome: 'loss', profit: -1, game_date: '2026-03-25' }),
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.wins).toBe(2)
    expect(recap.losses).toBe(1)
    expect(recap.totalPicks).toBe(3)
  })

  it('calculates profit correctly', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 2, game_date: '2026-03-23' }),
      makePick({ outcome: 'loss', profit: -1, game_date: '2026-03-24' }),
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.profit).toBe(1)
  })

  it('identifies best and worst picks', () => {
    const picks = [
      makePick({ pick_team: 'Lakers', outcome: 'win', profit: 3, odds: 200, game_date: '2026-03-23' }),
      makePick({ pick_team: 'Celtics', outcome: 'loss', profit: -2, odds: -150, game_date: '2026-03-24' }),
      makePick({ pick_team: 'Warriors', outcome: 'win', profit: 1, odds: -110, game_date: '2026-03-25' }),
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.bestPick?.team).toBe('Lakers')
    expect(recap.bestPick?.profit).toBe(3)
    expect(recap.worstPick?.team).toBe('Celtics')
    expect(recap.worstPick?.profit).toBe(-2)
  })

  it('breaks down by sport', () => {
    const picks = [
      makePick({ sport: 'nba', outcome: 'win', profit: 1, game_date: '2026-03-23' }),
      makePick({ sport: 'nba', outcome: 'loss', profit: -1, game_date: '2026-03-24' }),
      makePick({ sport: 'nfl', outcome: 'win', profit: 2, game_date: '2026-03-25' }),
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.sportBreakdown.length).toBe(2)

    const nba = recap.sportBreakdown.find((s) => s.sport === 'nba')
    expect(nba?.wins).toBe(1)
    expect(nba?.losses).toBe(1)

    const nfl = recap.sportBreakdown.find((s) => s.sport === 'nfl')
    expect(nfl?.wins).toBe(1)
  })

  it('excludes picks from other weeks', () => {
    const picks = [
      makePick({ game_date: '2026-03-23' }), // this week
      makePick({ game_date: '2026-03-15' }), // last week
      makePick({ game_date: '2026-03-30' }), // next week
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.totalPicks).toBe(1)
  })

  it('tracks pending picks', () => {
    const picks = [
      makePick({ outcome: 'pending', profit: null, game_date: '2026-03-25' }),
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.pending).toBe(1)
    expect(recap.wins).toBe(0)
  })

  it('calculates volume change vs last week', () => {
    const picks = [
      // This week
      makePick({ game_date: '2026-03-23' }),
      makePick({ game_date: '2026-03-24' }),
      makePick({ game_date: '2026-03-25' }),
      // Last week
      makePick({ game_date: '2026-03-16' }),
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.totalPicks).toBe(3)
    expect(recap.volumeChange).toBe(2) // 3 this week - 1 last week
  })

  it('detects winning streak', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 1, game_date: '2026-03-25', created_at: '2026-03-25T15:00:00Z' }),
      makePick({ outcome: 'win', profit: 1, game_date: '2026-03-25', created_at: '2026-03-25T14:00:00Z' }),
      makePick({ outcome: 'win', profit: 1, game_date: '2026-03-24', created_at: '2026-03-24T12:00:00Z' }),
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.streak?.type).toBe('win')
    expect(recap.streak?.count).toBe(3)
  })

  it('calculates ROI and win rate', () => {
    const picks = [
      makePick({ outcome: 'win', profit: 1, units: 1, game_date: '2026-03-23' }),
      makePick({ outcome: 'loss', profit: -1, units: 1, game_date: '2026-03-24' }),
    ]
    const recap = generateWeeklyRecap(picks, refDate)
    expect(recap.roi).toBe(0)
    expect(recap.winRate).toBe(50)
  })
})
