import { describe, it, expect } from 'vitest'
import { buildBankrollCurve, calcHomeAwaySplit } from '../bankroll-history'

describe('buildBankrollCurve', () => {
  it('returns empty array for no picks', () => {
    expect(buildBankrollCurve([])).toEqual([])
  })

  it('returns empty for only pending picks', () => {
    const picks = [
      { outcome: 'pending', profit: null, game_date: '2026-03-24' },
      { outcome: null, profit: null, game_date: '2026-03-25' },
    ]
    expect(buildBankrollCurve(picks)).toEqual([])
  })

  it('builds cumulative curve from resolved picks', () => {
    const picks = [
      { outcome: 'win', profit: 1.5, game_date: '2026-03-20' },
      { outcome: 'loss', profit: -1.0, game_date: '2026-03-21' },
      { outcome: 'win', profit: 2.0, game_date: '2026-03-22' },
    ]
    const curve = buildBankrollCurve(picks)
    expect(curve).toHaveLength(3)
    expect(curve[0].cumulative).toBe(1.5)
    expect(curve[1].cumulative).toBe(0.5)
    expect(curve[2].cumulative).toBe(2.5)
  })

  it('sorts picks by game_date', () => {
    const picks = [
      { outcome: 'win', profit: 3.0, game_date: '2026-03-22' },
      { outcome: 'loss', profit: -1.0, game_date: '2026-03-20' },
      { outcome: 'win', profit: 1.0, game_date: '2026-03-21' },
    ]
    const curve = buildBankrollCurve(picks)
    expect(curve[0].date).toBe('2026-03-20')
    expect(curve[0].cumulative).toBe(-1.0)
    expect(curve[1].cumulative).toBe(0)
    expect(curve[2].cumulative).toBe(3.0)
  })

  it('strips time from date', () => {
    const picks = [
      { outcome: 'win', profit: 1.0, game_date: '2026-03-20T19:30:00Z' },
    ]
    const curve = buildBankrollCurve(picks)
    expect(curve[0].date).toBe('2026-03-20')
  })

  it('skips picks with null profit', () => {
    const picks = [
      { outcome: 'win', profit: 1.0, game_date: '2026-03-20' },
      { outcome: 'win', profit: null, game_date: '2026-03-21' },
      { outcome: 'win', profit: 2.0, game_date: '2026-03-22' },
    ]
    const curve = buildBankrollCurve(picks)
    expect(curve).toHaveLength(2)
  })

  it('rounds cumulative to 2 decimal places', () => {
    const picks = [
      { outcome: 'win', profit: 1.333, game_date: '2026-03-20' },
      { outcome: 'win', profit: 0.667, game_date: '2026-03-21' },
    ]
    const curve = buildBankrollCurve(picks)
    expect(curve[1].cumulative).toBe(2.0)
  })
})

describe('calcHomeAwaySplit', () => {
  it('returns empty for no picks', () => {
    expect(calcHomeAwaySplit([])).toEqual([])
  })

  it('returns empty for pending picks', () => {
    const picks = [
      { outcome: 'pending', profit: null, units: 1, pick_team: 'Lakers', home_team: 'Lakers', away_team: 'Celtics' },
    ]
    expect(calcHomeAwaySplit(picks)).toEqual([])
  })

  it('splits home and away picks correctly', () => {
    const picks = [
      { outcome: 'win', profit: 1.5, units: 1, pick_team: 'Lakers', home_team: 'Lakers', away_team: 'Celtics' },
      { outcome: 'loss', profit: -1.0, units: 1, pick_team: 'Celtics', home_team: 'Lakers', away_team: 'Celtics' },
      { outcome: 'win', profit: 2.0, units: 1, pick_team: 'Lakers', home_team: 'Lakers', away_team: 'Warriors' },
    ]
    const splits = calcHomeAwaySplit(picks)
    expect(splits).toHaveLength(2)

    const home = splits.find((s) => s.side === 'home')!
    expect(home.wins).toBe(2)
    expect(home.losses).toBe(0)
    expect(home.total).toBe(2)
    expect(home.winRate).toBe(100)

    const away = splits.find((s) => s.side === 'away')!
    expect(away.wins).toBe(0)
    expect(away.losses).toBe(1)
    expect(away.total).toBe(1)
  })

  it('calculates ROI correctly', () => {
    const picks = [
      { outcome: 'win', profit: 2.0, units: 2, pick_team: 'Lakers', home_team: 'Lakers', away_team: 'Celtics' },
      { outcome: 'loss', profit: -1.0, units: 1, pick_team: 'Lakers', home_team: 'Lakers', away_team: 'Warriors' },
    ]
    const splits = calcHomeAwaySplit(picks)
    const home = splits.find((s) => s.side === 'home')!
    // ROI = (2.0 - 1.0) / 3 * 100 = 33.33
    expect(home.roi).toBe(33.33)
  })

  it('skips picks without team data', () => {
    const picks = [
      { outcome: 'win', profit: 1.0, units: 1, pick_team: null, home_team: null, away_team: null },
    ]
    const splits = calcHomeAwaySplit(picks)
    expect(splits).toEqual([])
  })

  it('counts pushes separately', () => {
    const picks = [
      { outcome: 'push', profit: 0, units: 1, pick_team: 'Lakers', home_team: 'Lakers', away_team: 'Celtics' },
    ]
    const splits = calcHomeAwaySplit(picks)
    const home = splits.find((s) => s.side === 'home')!
    expect(home.pushes).toBe(1)
    expect(home.winRate).toBeNull()
  })

  it('uses gameMetadata map when home_team is not on pick', () => {
    const picks = [
      { outcome: 'win', profit: 1.0, units: 1, pick_team: 'Lakers' },
    ]
    const metadata = new Map([
      ['game1', { homeTeam: 'Lakers', awayTeam: 'Celtics' }],
    ])
    const splits = calcHomeAwaySplit(picks, metadata)
    expect(splits).toHaveLength(1)
    expect(splits[0].side).toBe('home')
  })

  it('only returns sides with picks', () => {
    const picks = [
      { outcome: 'win', profit: 1.0, units: 1, pick_team: 'Lakers', home_team: 'Lakers', away_team: 'Celtics' },
    ]
    const splits = calcHomeAwaySplit(picks)
    expect(splits).toHaveLength(1)
    expect(splits[0].side).toBe('home')
  })
})
