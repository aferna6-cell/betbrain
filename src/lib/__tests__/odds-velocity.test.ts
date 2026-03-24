import { describe, it, expect } from 'vitest'
import { detectOddsVelocity, calcLineMovement, type OddsSnapshot } from '../odds-velocity'

const META = new Map([
  ['game1', { homeTeam: 'Lakers', awayTeam: 'Celtics', sport: 'nba' }],
  ['game2', { homeTeam: 'Warriors', awayTeam: 'Nets', sport: 'nba' }],
])

function snap(overrides: Partial<OddsSnapshot> = {}): OddsSnapshot {
  return {
    gameId: 'game1',
    bookmaker: 'draftkings',
    market: 'moneyline',
    side: 'home',
    odds: -110,
    timestamp: '2026-03-24T10:00:00Z',
    ...overrides,
  }
}

describe('detectOddsVelocity', () => {
  it('returns empty for no data', () => {
    expect(detectOddsVelocity([], [], META)).toEqual([])
  })

  it('returns empty when movement is below threshold', () => {
    const before = [snap({ bookmaker: 'dk', odds: -110 }), snap({ bookmaker: 'fd', odds: -112 })]
    const after = [snap({ bookmaker: 'dk', odds: -113 }), snap({ bookmaker: 'fd', odds: -115 })]
    expect(detectOddsVelocity(before, after, META)).toEqual([])
  })

  it('detects coordinated downward movement', () => {
    const before = [
      snap({ bookmaker: 'dk', odds: -110 }),
      snap({ bookmaker: 'fd', odds: -112 }),
      snap({ bookmaker: 'mgm', odds: -108 }),
    ]
    const after = [
      snap({ bookmaker: 'dk', odds: -130 }),
      snap({ bookmaker: 'fd', odds: -135 }),
      snap({ bookmaker: 'mgm', odds: -125 }),
    ]
    const alerts = detectOddsVelocity(before, after, META)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].direction).toBe('down')
    expect(alerts[0].bookCount).toBe(3)
    expect(alerts[0].severity).toBe('sharp')
  })

  it('detects upward movement', () => {
    const before = [
      snap({ bookmaker: 'dk', odds: -150 }),
      snap({ bookmaker: 'fd', odds: -145 }),
    ]
    const after = [
      snap({ bookmaker: 'dk', odds: -130 }),
      snap({ bookmaker: 'fd', odds: -128 }),
    ]
    const alerts = detectOddsVelocity(before, after, META)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].direction).toBe('up')
  })

  it('requires 2+ books moving in same direction', () => {
    const before = [
      snap({ bookmaker: 'dk', odds: -110 }),
      snap({ bookmaker: 'fd', odds: -112 }),
    ]
    const after = [
      snap({ bookmaker: 'dk', odds: -130 }),
      snap({ bookmaker: 'fd', odds: -100 }), // moved opposite
    ]
    const alerts = detectOddsVelocity(before, after, META)
    expect(alerts).toEqual([])
  })

  it('classifies extreme moves', () => {
    const before = [
      snap({ bookmaker: 'dk', odds: -110 }),
      snap({ bookmaker: 'fd', odds: -112 }),
      snap({ bookmaker: 'mgm', odds: -108 }),
      snap({ bookmaker: 'czr', odds: -111 }),
    ]
    const after = [
      snap({ bookmaker: 'dk', odds: -155 }),
      snap({ bookmaker: 'fd', odds: -160 }),
      snap({ bookmaker: 'mgm', odds: -150 }),
      snap({ bookmaker: 'czr', odds: -158 }),
    ]
    const alerts = detectOddsVelocity(before, after, META)
    expect(alerts[0].severity).toBe('extreme')
  })

  it('skips games without metadata', () => {
    const before = [snap({ gameId: 'unknown', bookmaker: 'dk', odds: -110 })]
    const after = [snap({ gameId: 'unknown', bookmaker: 'dk', odds: -140 })]
    const alerts = detectOddsVelocity(before, after, META)
    expect(alerts).toEqual([])
  })

  it('handles multiple games', () => {
    const before = [
      snap({ gameId: 'game1', bookmaker: 'dk', odds: -110 }),
      snap({ gameId: 'game1', bookmaker: 'fd', odds: -112 }),
      snap({ gameId: 'game2', bookmaker: 'dk', odds: +150 }),
      snap({ gameId: 'game2', bookmaker: 'fd', odds: +145 }),
    ]
    const after = [
      snap({ gameId: 'game1', bookmaker: 'dk', odds: -130 }),
      snap({ gameId: 'game1', bookmaker: 'fd', odds: -135 }),
      snap({ gameId: 'game2', bookmaker: 'dk', odds: +180 }),
      snap({ gameId: 'game2', bookmaker: 'fd', odds: +175 }),
    ]
    const alerts = detectOddsVelocity(before, after, META)
    expect(alerts).toHaveLength(2)
  })

  it('sorts by severity then bookCount', () => {
    const before = [
      snap({ gameId: 'game1', bookmaker: 'dk', odds: -110 }),
      snap({ gameId: 'game1', bookmaker: 'fd', odds: -112 }),
      snap({ gameId: 'game2', bookmaker: 'dk', side: 'away', odds: +150 }),
      snap({ gameId: 'game2', bookmaker: 'fd', side: 'away', odds: +145 }),
      snap({ gameId: 'game2', bookmaker: 'mgm', side: 'away', odds: +148 }),
      snap({ gameId: 'game2', bookmaker: 'czr', side: 'away', odds: +147 }),
    ]
    const after = [
      snap({ gameId: 'game1', bookmaker: 'dk', odds: -130 }),
      snap({ gameId: 'game1', bookmaker: 'fd', odds: -132 }),
      snap({ gameId: 'game2', bookmaker: 'dk', side: 'away', odds: +200 }),
      snap({ gameId: 'game2', bookmaker: 'fd', side: 'away', odds: +195 }),
      snap({ gameId: 'game2', bookmaker: 'mgm', side: 'away', odds: +198 }),
      snap({ gameId: 'game2', bookmaker: 'czr', side: 'away', odds: +197 }),
    ]
    const alerts = detectOddsVelocity(before, after, META)
    // game2 should be first (extreme: 4 books + 50pt avg move)
    expect(alerts[0].gameId).toBe('game2')
    expect(alerts[0].severity).toBe('extreme')
  })

  it('respects custom minMagnitude', () => {
    const before = [
      snap({ bookmaker: 'dk', odds: -110 }),
      snap({ bookmaker: 'fd', odds: -112 }),
    ]
    const after = [
      snap({ bookmaker: 'dk', odds: -125 }),
      snap({ bookmaker: 'fd', odds: -127 }),
    ]
    // With default minMagnitude=10, should detect
    expect(detectOddsVelocity(before, after, META)).toHaveLength(1)
    // With minMagnitude=20, should not detect
    expect(detectOddsVelocity(before, after, META, 20)).toHaveLength(0)
  })
})

describe('calcLineMovement', () => {
  it('returns no movement for null values', () => {
    expect(calcLineMovement(null, null)).toEqual({ moved: false, direction: 'none', amount: 0 })
    expect(calcLineMovement(-3.5, null)).toEqual({ moved: false, direction: 'none', amount: 0 })
    expect(calcLineMovement(null, -3.5)).toEqual({ moved: false, direction: 'none', amount: 0 })
  })

  it('returns no movement when unchanged', () => {
    expect(calcLineMovement(-3.5, -3.5)).toEqual({ moved: false, direction: 'none', amount: 0 })
  })

  it('detects upward movement', () => {
    const result = calcLineMovement(-3.5, -2.5)
    expect(result.moved).toBe(true)
    expect(result.direction).toBe('up')
    expect(result.amount).toBe(1)
  })

  it('detects downward movement', () => {
    const result = calcLineMovement(210.5, 208)
    expect(result.moved).toBe(true)
    expect(result.direction).toBe('down')
    expect(result.amount).toBe(2.5)
  })
})
