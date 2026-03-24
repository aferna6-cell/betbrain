import { describe, it, expect } from 'vitest'
import { buildEVAttribution } from '../ev-attribution'

function makePick(overrides: Record<string, unknown> = {}) {
  return {
    odds: -110,
    outcome: 'win',
    profit: 91,
    units: 1,
    sport: 'NBA',
    bet_type: 'moneyline',
    ...overrides,
  }
}

function makeResolvedPicks(count: number, winRate = 0.55) {
  return Array.from({ length: count }, (_, i) => {
    const isWin = i / count < winRate
    return makePick({
      outcome: isWin ? 'win' : 'loss',
      profit: isWin ? 91 : -100,
      sport: i % 2 === 0 ? 'NBA' : 'NFL',
      bet_type: i % 3 === 0 ? 'moneyline' : i % 3 === 1 ? 'spread' : 'total',
      bookmaker: i % 2 === 0 ? 'DraftKings' : 'FanDuel',
      units: 1 + (i % 3),
    })
  })
}

describe('buildEVAttribution', () => {
  it('returns insufficient for < 10 resolved picks', () => {
    const picks = Array.from({ length: 5 }, () => makePick())
    const result = buildEVAttribution(picks)
    expect(result.overallEdge).toBe('insufficient')
    expect(result.factors).toEqual([])
    expect(result.summary).toContain('Need at least 10')
  })

  it('builds full attribution with 6 factors', () => {
    const picks = makeResolvedPicks(20)
    const result = buildEVAttribution(picks)
    expect(result.factors.length).toBe(6)
    expect(result.topFactor).toBeTruthy()
    expect(result.weakestFactor).toBeTruthy()
  })

  it('factors are sorted by score descending', () => {
    const picks = makeResolvedPicks(30)
    const result = buildEVAttribution(picks)
    for (let i = 0; i < result.factors.length - 1; i++) {
      expect(result.factors[i].score).toBeGreaterThanOrEqual(result.factors[i + 1].score)
    }
  })

  it('contributions sum to approximately 100%', () => {
    const picks = makeResolvedPicks(20)
    const result = buildEVAttribution(picks)
    const total = result.factors.reduce((s, f) => s + f.contribution, 0)
    expect(total).toBeCloseTo(100, 0)
  })

  it('each factor has required fields', () => {
    const picks = makeResolvedPicks(20)
    const result = buildEVAttribution(picks)
    for (const f of result.factors) {
      expect(f.name).toBeTruthy()
      expect(f.description).toBeTruthy()
      expect(f.evidence).toBeTruthy()
      expect(f.recommendation).toBeTruthy()
      expect(typeof f.score).toBe('number')
      expect(f.score).toBeGreaterThanOrEqual(0)
      expect(f.score).toBeLessThanOrEqual(100)
    }
  })

  it('detects CLV edge when closing odds present', () => {
    const picks = makeResolvedPicks(20).map((p, i) => ({
      ...p,
      closing_odds: i % 2 === 0 ? -130 : -105, // closing shorter = positive CLV when bet at -110
    }))
    const result = buildEVAttribution(picks)
    const clvFactor = result.factors.find((f) => f.name === 'Closing Line Value')
    expect(clvFactor).toBeTruthy()
    expect(clvFactor!.evidence).toContain('CLV')
  })

  it('handles picks with no closing odds gracefully', () => {
    const picks = makeResolvedPicks(20)
    const result = buildEVAttribution(picks)
    const clvFactor = result.factors.find((f) => f.name === 'Closing Line Value')
    expect(clvFactor?.evidence).toContain('picks with closing odds data')
  })

  it('detects sport-specific edge', () => {
    const picks = [
      ...Array.from({ length: 10 }, () => makePick({ sport: 'NBA', outcome: 'win', profit: 91 })),
      ...Array.from({ length: 10 }, () => makePick({ sport: 'NFL', outcome: 'loss', profit: -100 })),
    ]
    const result = buildEVAttribution(picks)
    const sportFactor = result.factors.find((f) => f.name === 'Sport Selection')
    expect(sportFactor).toBeTruthy()
    expect(sportFactor!.evidence).toContain('NBA')
    expect(sportFactor!.evidence).toContain('NFL')
  })

  it('detects bet type edge', () => {
    const picks = [
      ...Array.from({ length: 10 }, () => makePick({ bet_type: 'moneyline', outcome: 'win', profit: 91 })),
      ...Array.from({ length: 10 }, () => makePick({ bet_type: 'spread', outcome: 'loss', profit: -100 })),
    ]
    const result = buildEVAttribution(picks)
    const btFactor = result.factors.find((f) => f.name === 'Bet Type')
    expect(btFactor).toBeTruthy()
    expect(btFactor!.evidence).toContain('moneyline')
  })

  it('assesses overall edge level', () => {
    const picks = makeResolvedPicks(20)
    const result = buildEVAttribution(picks)
    expect(['strong', 'moderate', 'slight', 'negative']).toContain(result.overallEdge)
  })

  it('generates a meaningful summary', () => {
    const picks = makeResolvedPicks(20)
    const result = buildEVAttribution(picks)
    expect(result.summary).toContain(result.topFactor)
    expect(result.summary).toContain(result.weakestFactor)
  })

  it('handles all pending picks correctly', () => {
    const picks = Array.from({ length: 15 }, () => makePick({ outcome: 'pending', profit: null }))
    const result = buildEVAttribution(picks)
    expect(result.overallEdge).toBe('insufficient')
  })

  it('line shopping scores based on book diversity', () => {
    const picks = makeResolvedPicks(20).map((p) => ({
      ...p,
      bookmaker: 'DraftKings', // single book
    }))
    const result = buildEVAttribution(picks)
    const lsFactor = result.factors.find((f) => f.name === 'Line Shopping')
    expect(lsFactor).toBeTruthy()
    expect(lsFactor!.evidence).toContain('1 bookmaker')
  })

  it('sizing analysis detects calibrated sizing', () => {
    const picks = [
      ...Array.from({ length: 8 }, () => makePick({ units: 3, outcome: 'win', profit: 273 })),
      ...Array.from({ length: 4 }, () => makePick({ units: 1, outcome: 'loss', profit: -100 })),
    ]
    const result = buildEVAttribution(picks)
    const sizeFactor = result.factors.find((f) => f.name === 'Unit Sizing')
    expect(sizeFactor).toBeTruthy()
    // Bigger bets (3 units) win more = good calibration
    expect(sizeFactor!.score).toBeGreaterThan(50)
  })
})
