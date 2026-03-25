/**
 * Portfolio Risk Gauge tests.
 */

import { describe, it, expect } from 'vitest'
import {
  analyzePortfolioRisk,
  calculatePotentialPayout,
  calculateSportExposure,
  calculateTypeExposure,
  findCorrelationGroups,
  type PickForRisk,
} from '@/lib/portfolio-risk'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePick(overrides: Partial<PickForRisk> = {}): PickForRisk {
  return {
    id: 'pick-1',
    sport: 'nba',
    pick_type: 'moneyline',
    pick_team: 'Lakers',
    odds: -150,
    units: 1,
    game_date: '2026-03-25T20:00:00Z',
    external_game_id: 'game-1',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// calculatePotentialPayout
// ---------------------------------------------------------------------------

describe('calculatePotentialPayout', () => {
  it('calculates payout for positive odds', () => {
    expect(calculatePotentialPayout(200, 1)).toBeCloseTo(2)
    expect(calculatePotentialPayout(150, 2)).toBeCloseTo(3)
  })

  it('calculates payout for negative odds', () => {
    expect(calculatePotentialPayout(-150, 1)).toBeCloseTo(0.667, 2)
    expect(calculatePotentialPayout(-200, 2)).toBeCloseTo(1)
  })

  it('handles even money', () => {
    expect(calculatePotentialPayout(100, 1)).toBe(1)
    expect(calculatePotentialPayout(-100, 1)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// calculateSportExposure
// ---------------------------------------------------------------------------

describe('calculateSportExposure', () => {
  it('returns empty for no picks', () => {
    expect(calculateSportExposure([])).toEqual([])
  })

  it('groups picks by sport', () => {
    const picks = [
      makePick({ sport: 'nba', units: 2 }),
      makePick({ sport: 'nba', units: 1, id: 'p2' }),
      makePick({ sport: 'nfl', units: 3, id: 'p3' }),
    ]
    const result = calculateSportExposure(picks)
    expect(result.length).toBe(2)

    const nba = result.find((r) => r.sport === 'nba')!
    expect(nba.pickCount).toBe(2)
    expect(nba.totalUnits).toBe(3)
    expect(nba.percentOfPortfolio).toBe(50) // 3 of 6

    const nfl = result.find((r) => r.sport === 'nfl')!
    expect(nfl.pickCount).toBe(1)
    expect(nfl.totalUnits).toBe(3)
    expect(nfl.percentOfPortfolio).toBe(50)
  })

  it('sorts by total units descending', () => {
    const picks = [
      makePick({ sport: 'nba', units: 1 }),
      makePick({ sport: 'nfl', units: 5, id: 'p2' }),
    ]
    const result = calculateSportExposure(picks)
    expect(result[0].sport).toBe('nfl')
  })
})

// ---------------------------------------------------------------------------
// calculateTypeExposure
// ---------------------------------------------------------------------------

describe('calculateTypeExposure', () => {
  it('returns empty for no picks', () => {
    expect(calculateTypeExposure([])).toEqual([])
  })

  it('groups by bet type', () => {
    const picks = [
      makePick({ pick_type: 'moneyline', units: 2 }),
      makePick({ pick_type: 'spread', units: 3, id: 'p2' }),
      makePick({ pick_type: 'moneyline', units: 1, id: 'p3' }),
    ]
    const result = calculateTypeExposure(picks)
    expect(result.length).toBe(2)

    const ml = result.find((r) => r.type === 'moneyline')!
    expect(ml.pickCount).toBe(2)
    expect(ml.totalUnits).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// findCorrelationGroups
// ---------------------------------------------------------------------------

describe('findCorrelationGroups', () => {
  it('returns empty when no games have multiple bets', () => {
    const picks = [
      makePick({ external_game_id: 'g1' }),
      makePick({ external_game_id: 'g2', id: 'p2' }),
    ]
    expect(findCorrelationGroups(picks)).toEqual([])
  })

  it('groups picks on same game', () => {
    const picks = [
      makePick({ external_game_id: 'g1', pick_type: 'moneyline', units: 1 }),
      makePick({ external_game_id: 'g1', pick_type: 'spread', units: 2, id: 'p2' }),
    ]
    const groups = findCorrelationGroups(picks)
    expect(groups.length).toBe(1)
    expect(groups[0].picks.length).toBe(2)
    expect(groups[0].totalUnits).toBe(3)
    expect(groups[0].riskLevel).toBe('medium')
  })

  it('marks 3+ picks on same game as high risk', () => {
    const picks = [
      makePick({ external_game_id: 'g1', id: 'p1', units: 1 }),
      makePick({ external_game_id: 'g1', id: 'p2', units: 1 }),
      makePick({ external_game_id: 'g1', id: 'p3', units: 1 }),
    ]
    const groups = findCorrelationGroups(picks)
    expect(groups[0].riskLevel).toBe('high')
  })

  it('sorts by total units descending', () => {
    const picks = [
      makePick({ external_game_id: 'g1', id: 'p1', units: 1 }),
      makePick({ external_game_id: 'g1', id: 'p2', units: 1 }),
      makePick({ external_game_id: 'g2', id: 'p3', units: 5 }),
      makePick({ external_game_id: 'g2', id: 'p4', units: 5 }),
    ]
    const groups = findCorrelationGroups(picks)
    expect(groups[0].gameId).toBe('g2')
  })
})

// ---------------------------------------------------------------------------
// analyzePortfolioRisk
// ---------------------------------------------------------------------------

describe('analyzePortfolioRisk', () => {
  it('returns low risk for empty portfolio', () => {
    const result = analyzePortfolioRisk([])
    expect(result.overallRisk).toBe('low')
    expect(result.riskScore).toBe(0)
    expect(result.openPickCount).toBe(0)
    expect(result.totalUnitsAtRisk).toBe(0)
  })

  it('returns low risk for small balanced portfolio', () => {
    const picks = [
      makePick({ units: 1, sport: 'nba' }),
      makePick({ units: 1, sport: 'nfl', id: 'p2', external_game_id: 'g2' }),
    ]
    const result = analyzePortfolioRisk(picks)
    expect(result.overallRisk).toBe('low')
    expect(result.totalUnitsAtRisk).toBe(2)
    expect(result.openPickCount).toBe(2)
  })

  it('detects sport concentration risk', () => {
    const picks = [
      makePick({ units: 5, sport: 'nba', id: 'p1', external_game_id: 'g1' }),
      makePick({ units: 5, sport: 'nba', id: 'p2', external_game_id: 'g2' }),
      makePick({ units: 1, sport: 'nfl', id: 'p3', external_game_id: 'g3' }),
    ]
    const result = analyzePortfolioRisk(picks)
    expect(result.riskFactors.some((f) => f.includes('concentrated'))).toBe(true)
  })

  it('detects correlated bet risk', () => {
    const picks = [
      makePick({ external_game_id: 'g1', id: 'p1', units: 2 }),
      makePick({ external_game_id: 'g1', id: 'p2', units: 2 }),
      makePick({ external_game_id: 'g1', id: 'p3', units: 2 }),
    ]
    const result = analyzePortfolioRisk(picks)
    expect(result.correlationGroups.length).toBe(1)
    expect(result.riskFactors.some((f) => f.includes('correlated'))).toBe(true)
  })

  it('detects large individual bets', () => {
    const picks = [
      makePick({ units: 6, id: 'p1', external_game_id: 'g1' }),
      makePick({ units: 1, id: 'p2', external_game_id: 'g2' }),
    ]
    const result = analyzePortfolioRisk(picks)
    expect(result.riskFactors.some((f) => f.includes('large individual'))).toBe(true)
  })

  it('detects heavy favorite risk', () => {
    const picks = [
      makePick({ odds: -300, id: 'p1', external_game_id: 'g1' }),
      makePick({ odds: -250, id: 'p2', external_game_id: 'g2' }),
      makePick({ odds: -400, id: 'p3', external_game_id: 'g3' }),
    ]
    const result = analyzePortfolioRisk(picks)
    expect(result.riskFactors.some((f) => f.includes('heavy favorite'))).toBe(true)
  })

  it('calculates max loss and max win', () => {
    const picks = [
      makePick({ odds: 200, units: 1 }),
      makePick({ odds: -150, units: 2, id: 'p2', external_game_id: 'g2' }),
    ]
    const result = analyzePortfolioRisk(picks)
    expect(result.maxLoss).toBe(3) // 1 + 2 units
    expect(result.maxWin).toBeGreaterThan(0)
  })

  it('caps risk score at 100', () => {
    // Create a very risky portfolio
    const picks = Array.from({ length: 25 }, (_, i) =>
      makePick({
        id: `p${i}`,
        external_game_id: 'g1', // All same game!
        units: 6,
        odds: -300,
        sport: 'nba',
      })
    )
    const result = analyzePortfolioRisk(picks)
    expect(result.riskScore).toBeLessThanOrEqual(100)
    expect(result.overallRisk).toBe('critical')
  })

  it('includes sport and type breakdowns', () => {
    const picks = [
      makePick({ sport: 'nba', pick_type: 'moneyline', id: 'p1', external_game_id: 'g1' }),
      makePick({ sport: 'nfl', pick_type: 'spread', id: 'p2', external_game_id: 'g2' }),
    ]
    const result = analyzePortfolioRisk(picks)
    expect(result.sportExposure.length).toBe(2)
    expect(result.typeExposure.length).toBe(2)
  })

  it('provides a summary string', () => {
    const picks = [makePick()]
    const result = analyzePortfolioRisk(picks)
    expect(result.summary.length).toBeGreaterThan(0)
    expect(result.summary).toContain('1 open pick')
  })
})
