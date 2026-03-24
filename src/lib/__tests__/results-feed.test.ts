import { describe, it, expect } from 'vitest'
import {
  buildResultsFeed,
  formatPickType,
  getResultColor,
  getResultBg,
} from '../results-feed'

const makeGame = (id: string, home: string, away: string) => ({
  externalGameId: id,
  sport: 'nba',
  homeTeam: home,
  awayTeam: away,
  commenceTime: '2026-03-24T19:00:00Z',
})

const makePick = (overrides: Partial<{
  id: string
  external_game_id: string
  sport: string
  pick_type: string
  pick_team: string | null
  pick_line: number | null
  odds: number
  units: number
  outcome: string | null
  profit: number | null
  game_date: string
  resolved_at: string | null
}> = {}) => ({
  id: overrides.id ?? 'pick-1',
  external_game_id: overrides.external_game_id ?? 'game-1',
  sport: overrides.sport ?? 'nba',
  pick_type: overrides.pick_type ?? 'moneyline',
  pick_team: overrides.pick_team ?? 'Lakers',
  pick_line: overrides.pick_line ?? null,
  odds: overrides.odds ?? -150,
  units: overrides.units ?? 1,
  outcome: overrides.outcome ?? 'win',
  profit: overrides.profit ?? 1.5,
  game_date: overrides.game_date ?? '2026-03-24',
  resolved_at: overrides.resolved_at ?? '2026-03-24T22:00:00Z',
})

describe('buildResultsFeed', () => {
  it('returns empty feed for no picks', () => {
    const result = buildResultsFeed([], [], '2026-03-24')
    expect(result.results).toHaveLength(0)
    expect(result.todayPnL).toBe(0)
    expect(result.todayWins).toBe(0)
  })

  it('filters to target date only', () => {
    const picks = [
      makePick({ game_date: '2026-03-24' }),
      makePick({ id: 'pick-2', game_date: '2026-03-23' }),
    ]
    const result = buildResultsFeed(picks, [], '2026-03-24')
    expect(result.results).toHaveLength(1)
  })

  it('counts wins, losses, pushes correctly', () => {
    const picks = [
      makePick({ id: 'p1', external_game_id: 'g1', outcome: 'win', profit: 2 }),
      makePick({ id: 'p2', external_game_id: 'g2', outcome: 'loss', profit: -1 }),
      makePick({ id: 'p3', external_game_id: 'g3', outcome: 'push', profit: 0 }),
    ]
    const result = buildResultsFeed(picks, [], '2026-03-24')
    expect(result.todayWins).toBe(1)
    expect(result.todayLosses).toBe(1)
    expect(result.todayPushes).toBe(1)
    expect(result.todayPnL).toBe(1)
  })

  it('counts pending picks', () => {
    const picks = [
      makePick({ outcome: 'pending', profit: null }),
    ]
    const result = buildResultsFeed(picks, [], '2026-03-24')
    expect(result.pendingCount).toBe(1)
    expect(result.results).toHaveLength(0)
  })

  it('matches picks with game data', () => {
    const picks = [makePick({ external_game_id: 'g1' })]
    const games = [makeGame('g1', 'Lakers', 'Celtics')]
    const result = buildResultsFeed(picks, games, '2026-03-24')
    expect(result.results[0].homeTeam).toBe('Lakers')
    expect(result.results[0].awayTeam).toBe('Celtics')
  })

  it('sorts by resolved time (most recent first)', () => {
    const picks = [
      makePick({ id: 'p1', external_game_id: 'g1', resolved_at: '2026-03-24T20:00:00Z' }),
      makePick({ id: 'p2', external_game_id: 'g2', resolved_at: '2026-03-24T23:00:00Z' }),
    ]
    const result = buildResultsFeed(picks, [], '2026-03-24')
    expect(result.results[0].resolvedAt).toBe('2026-03-24T23:00:00Z')
    expect(result.results[1].resolvedAt).toBe('2026-03-24T20:00:00Z')
  })

  it('handles unknown game data gracefully', () => {
    const picks = [makePick({ external_game_id: 'unknown' })]
    const result = buildResultsFeed(picks, [], '2026-03-24')
    expect(result.results[0].homeTeam).toBe('Unknown')
  })
})

describe('formatPickType', () => {
  it('formats moneyline', () => {
    expect(formatPickType('moneyline', 'Lakers', null)).toBe('ML: Lakers')
  })

  it('formats spread with positive line', () => {
    expect(formatPickType('spread', 'Lakers', 3.5)).toBe('Lakers +3.5')
  })

  it('formats spread with negative line', () => {
    expect(formatPickType('spread', 'Lakers', -3.5)).toBe('Lakers -3.5')
  })

  it('formats over', () => {
    expect(formatPickType('over', null, 220.5)).toBe('Over 220.5')
  })

  it('formats under', () => {
    expect(formatPickType('under', null, 220.5)).toBe('Under 220.5')
  })

  it('formats prop', () => {
    expect(formatPickType('prop', null, null)).toBe('Prop')
  })
})

describe('getResultColor', () => {
  it('returns green for win', () => {
    expect(getResultColor('win')).toContain('green')
  })
  it('returns red for loss', () => {
    expect(getResultColor('loss')).toContain('red')
  })
  it('returns zinc for push', () => {
    expect(getResultColor('push')).toContain('zinc')
  })
})

describe('getResultBg', () => {
  it('returns correct background for each status', () => {
    expect(getResultBg('win')).toContain('green')
    expect(getResultBg('loss')).toContain('red')
    expect(getResultBg('push')).toContain('zinc')
    expect(getResultBg('no-pick')).toContain('zinc')
  })
})
