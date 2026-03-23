import { describe, it, expect } from 'vitest'
import {
  detectCorrelations,
  correlationScore,
  type ParlayLegForCorrelation,
  type CorrelationWarning,
} from '../parlay-correlation'

function makeLeg(
  overrides: Partial<ParlayLegForCorrelation> = {}
): ParlayLegForCorrelation {
  return {
    description: 'Lakers ML',
    sport: 'nba',
    gameId: null,
    team: null,
    market: 'moneyline',
    ...overrides,
  }
}

describe('detectCorrelations', () => {
  it('returns empty for empty legs', () => {
    expect(detectCorrelations([])).toEqual([])
  })

  it('returns empty for single leg', () => {
    expect(detectCorrelations([makeLeg()])).toEqual([])
  })

  it('returns empty for uncorrelated legs from different games', () => {
    const legs = [
      makeLeg({ gameId: 'game-1', team: 'Lakers' }),
      makeLeg({ gameId: 'game-2', team: 'Celtics' }),
    ]
    expect(detectCorrelations(legs)).toEqual([])
  })

  it('detects same-game correlation', () => {
    const legs = [
      makeLeg({ gameId: 'game-1', description: 'Lakers ML', team: 'Lakers' }),
      makeLeg({ gameId: 'game-1', description: 'Lakers -3.5', team: 'Lakers', market: 'spread' }),
    ]
    const warnings = detectCorrelations(legs)
    expect(warnings.some((w) => w.type === 'same-game')).toBe(true)
    expect(warnings[0].severity).toBe('high')
  })

  it('detects same team across different games', () => {
    const legs = [
      makeLeg({ gameId: 'game-1', team: 'Lakers' }),
      makeLeg({ gameId: 'game-2', team: 'Lakers' }),
    ]
    const warnings = detectCorrelations(legs)
    expect(warnings.some((w) => w.type === 'same-team')).toBe(true)
  })

  it('detects opposing sides (over/under)', () => {
    const legs = [
      makeLeg({ gameId: 'game-1', market: 'over' }),
      makeLeg({ gameId: 'game-1', market: 'under' }),
    ]
    const warnings = detectCorrelations(legs)
    expect(warnings.some((w) => w.type === 'opposing-sides')).toBe(true)
  })

  it('detects related props in same game', () => {
    const legs = [
      makeLeg({ gameId: 'game-1', market: 'prop', description: 'LeBron O25.5 pts' }),
      makeLeg({ gameId: 'game-1', market: 'prop', description: 'AD O10.5 reb' }),
    ]
    const warnings = detectCorrelations(legs)
    expect(warnings.some((w) => w.type === 'related-props')).toBe(true)
  })

  it('sorts by severity (high first)', () => {
    const legs = [
      makeLeg({ gameId: 'game-1', team: 'Lakers', market: 'moneyline' }),
      makeLeg({ gameId: 'game-1', team: 'Lakers', market: 'spread' }),
      makeLeg({ gameId: 'game-2', team: 'Lakers', market: 'moneyline' }),
    ]
    const warnings = detectCorrelations(legs)
    for (let i = 1; i < warnings.length; i++) {
      const order = { high: 0, medium: 1, low: 2 }
      expect(order[warnings[i - 1].severity]).toBeLessThanOrEqual(
        order[warnings[i].severity]
      )
    }
  })

  it('normalizes team names for matching', () => {
    const legs = [
      makeLeg({ gameId: 'game-1', team: '  Lakers  ' }),
      makeLeg({ gameId: 'game-2', team: 'lakers' }),
    ]
    const warnings = detectCorrelations(legs)
    expect(warnings.some((w) => w.type === 'same-team')).toBe(true)
  })

  it('does not flag null gameIds as same game', () => {
    const legs = [
      makeLeg({ gameId: null }),
      makeLeg({ gameId: null }),
    ]
    const warnings = detectCorrelations(legs)
    expect(warnings.some((w) => w.type === 'same-game')).toBe(false)
  })

  it('includes correct leg indices', () => {
    const legs = [
      makeLeg({ gameId: 'game-1', team: 'Lakers' }),
      makeLeg({ gameId: 'game-2', team: 'Celtics' }),
      makeLeg({ gameId: 'game-1', team: 'Warriors' }),
    ]
    const warnings = detectCorrelations(legs)
    const sameGame = warnings.find((w) => w.type === 'same-game')
    if (sameGame) {
      expect(sameGame.legIndices).toContain(0)
      expect(sameGame.legIndices).toContain(2)
    }
  })
})

describe('correlationScore', () => {
  it('returns 0 for no warnings', () => {
    expect(correlationScore([])).toBe(0)
  })

  it('returns higher score for high severity', () => {
    const highWarning: CorrelationWarning = {
      type: 'same-game',
      severity: 'high',
      message: 'test',
      legIndices: [0, 1],
    }
    expect(correlationScore([highWarning])).toBe(30)
  })

  it('returns medium score for medium severity', () => {
    const medWarning: CorrelationWarning = {
      type: 'related-props',
      severity: 'medium',
      message: 'test',
      legIndices: [0, 1],
    }
    expect(correlationScore([medWarning])).toBe(15)
  })

  it('returns low score for low severity', () => {
    const lowWarning: CorrelationWarning = {
      type: 'same-team',
      severity: 'low',
      message: 'test',
      legIndices: [0, 1],
    }
    expect(correlationScore([lowWarning])).toBe(5)
  })

  it('caps at 100', () => {
    const warnings: CorrelationWarning[] = Array.from({ length: 10 }, () => ({
      type: 'same-game' as const,
      severity: 'high' as const,
      message: 'test',
      legIndices: [0, 1],
    }))
    expect(correlationScore(warnings)).toBe(100)
  })

  it('sums multiple warnings', () => {
    const warnings: CorrelationWarning[] = [
      { type: 'same-game', severity: 'high', message: 'test', legIndices: [0, 1] },
      { type: 'same-team', severity: 'low', message: 'test', legIndices: [0, 2] },
    ]
    expect(correlationScore(warnings)).toBe(35)
  })
})
