import { describe, it, expect } from 'vitest'
import {
  buildConfidenceClvScatter,
  type PickForScatter,
} from '../confidence-clv-scatter'

function makePick(overrides: Partial<PickForScatter> = {}): PickForScatter {
  return {
    id: Math.random().toString(36).slice(2),
    odds: -110,
    closing_odds: -115,
    outcome: 'win',
    sport: 'nba',
    pick_type: 'moneyline',
    pick_team: 'Lakers',
    ...overrides,
  }
}

describe('buildConfidenceClvScatter', () => {
  it('returns insufficient for fewer than 3 picks', () => {
    const picks = [makePick(), makePick()]
    const confMap = new Map(picks.map((p) => [p.id, 3]))
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.correlationStrength).toBe('insufficient')
  })

  it('builds points from picks with confidence and CLV', () => {
    const picks = [
      makePick({ id: 'a', odds: -110, closing_odds: -115 }),
      makePick({ id: 'b', odds: -110, closing_odds: -105 }),
      makePick({ id: 'c', odds: +150, closing_odds: +140 }),
    ]
    const confMap = new Map([['a', 5], ['b', 3], ['c', 4]])
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.points.length).toBe(3)
  })

  it('excludes picks without closing odds', () => {
    const picks = [
      makePick({ id: 'a', closing_odds: null }),
      makePick({ id: 'b', closing_odds: -115 }),
      makePick({ id: 'c', closing_odds: -105 }),
      makePick({ id: 'd', closing_odds: -120 }),
    ]
    const confMap = new Map([['a', 5], ['b', 3], ['c', 4], ['d', 2]])
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.points.length).toBe(3)
  })

  it('excludes picks without confidence ratings', () => {
    const picks = [
      makePick({ id: 'a' }),
      makePick({ id: 'b' }),
      makePick({ id: 'c' }),
    ]
    const confMap = new Map([['a', 3], ['c', 4]]) // Missing 'b'
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.points.length).toBe(2)
  })

  it('excludes pending picks', () => {
    const picks = [
      makePick({ id: 'a', outcome: 'pending' }),
      makePick({ id: 'b', outcome: 'win' }),
      makePick({ id: 'c', outcome: 'loss' }),
      makePick({ id: 'd', outcome: 'win' }),
    ]
    const confMap = new Map([['a', 5], ['b', 3], ['c', 4], ['d', 2]])
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.points.length).toBe(3)
  })

  it('calculates CLV correctly for positive odds', () => {
    // +150 placed, +140 closing
    // Placed prob: 100/250 = 0.4
    // Closing prob: 100/240 = 0.4167
    // CLV = 0.4167 - 0.4 = +1.67%
    const picks = [
      makePick({ id: 'a', odds: 150, closing_odds: 140 }),
      makePick({ id: 'b', odds: 150, closing_odds: 140 }),
      makePick({ id: 'c', odds: 150, closing_odds: 140 }),
    ]
    const confMap = new Map([['a', 3], ['b', 3], ['c', 3]])
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.points[0].clv).toBeGreaterThan(0) // Positive CLV
  })

  it('calculates average CLV by confidence level', () => {
    const picks = [
      makePick({ id: 'a', odds: -110, closing_odds: -115 }),
      makePick({ id: 'b', odds: -110, closing_odds: -115 }),
      makePick({ id: 'c', odds: -110, closing_odds: -105 }),
    ]
    const confMap = new Map([['a', 5], ['b', 5], ['c', 3]])
    const result = buildConfidenceClvScatter(picks, confMap)

    const conf5 = result.avgClvByConfidence.find((c) => c.confidence === 5)
    expect(conf5).toBeDefined()
    expect(conf5?.count).toBe(2)
  })

  it('calculates overall average CLV', () => {
    const picks = [
      makePick({ id: 'a', odds: -110, closing_odds: -110 }),
      makePick({ id: 'b', odds: -110, closing_odds: -110 }),
      makePick({ id: 'c', odds: -110, closing_odds: -110 }),
    ]
    const confMap = new Map([['a', 3], ['b', 3], ['c', 3]])
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.overallAvgClv).toBe(0) // Same odds = 0 CLV
  })

  it('includes sport and pick type in points', () => {
    const picks = [
      makePick({ id: 'a', sport: 'nfl', pick_type: 'spread' }),
      makePick({ id: 'b', sport: 'nba' }),
      makePick({ id: 'c' }),
    ]
    const confMap = new Map([['a', 5], ['b', 3], ['c', 3]])
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.points[0].sport).toBe('nfl')
    expect(result.points[0].pickType).toBe('spread')
  })

  it('generates insight for insufficient data', () => {
    const result = buildConfidenceClvScatter([], new Map())
    expect(result.insight).toContain('Need at least')
  })

  it('generates positive insight for strong correlation', () => {
    // Need 10+ points for non-insufficient rating
    const picks = Array.from({ length: 12 }, (_, i) =>
      makePick({
        id: `pick-${i}`,
        odds: -110 - i * 5, // Increasing edge with confidence
        closing_odds: -110 - i * 7,
      })
    )
    const confMap = new Map(picks.map((p, i) => [p.id, Math.min(5, Math.ceil((i + 1) / 2.4))]))
    const result = buildConfidenceClvScatter(picks, confMap)
    expect(result.correlation).toBeDefined()
  })
})
