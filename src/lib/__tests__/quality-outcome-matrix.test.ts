import { describe, it, expect } from 'vitest'
import {
  buildQualityOutcomeMatrix,
  getQuadrantPercentages,
  type MatrixPick,
} from '../quality-outcome-matrix'

function makePick(overrides: Partial<MatrixPick> & { processScore: number; outcome: 'win' | 'loss' }): MatrixPick {
  return {
    id: Math.random().toString(36).slice(2),
    profit: overrides.outcome === 'win' ? 1 : -1,
    ...overrides,
  }
}

describe('buildQualityOutcomeMatrix', () => {
  it('returns empty matrix with no picks', () => {
    const matrix = buildQualityOutcomeMatrix([])
    expect(matrix.totalPicks).toBe(0)
    expect(matrix.quadrants['earned-win'].count).toBe(0)
    expect(matrix.quadrants['bad-beat'].count).toBe(0)
    expect(matrix.quadrants['got-lucky'].count).toBe(0)
    expect(matrix.quadrants['expected-loss'].count).toBe(0)
  })

  it('classifies good process + win as earned-win', () => {
    const picks = [makePick({ processScore: 80, outcome: 'win' })]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.quadrants['earned-win'].count).toBe(1)
    expect(matrix.quadrants['bad-beat'].count).toBe(0)
  })

  it('classifies good process + loss as bad-beat', () => {
    const picks = [makePick({ processScore: 75, outcome: 'loss' })]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.quadrants['bad-beat'].count).toBe(1)
  })

  it('classifies bad process + win as got-lucky', () => {
    const picks = [makePick({ processScore: 40, outcome: 'win' })]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.quadrants['got-lucky'].count).toBe(1)
  })

  it('classifies bad process + loss as expected-loss', () => {
    const picks = [makePick({ processScore: 30, outcome: 'loss' })]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.quadrants['expected-loss'].count).toBe(1)
  })

  it('uses custom process threshold', () => {
    const picks = [makePick({ processScore: 60, outcome: 'win' })]
    // Default threshold=65, so 60 is bad process
    const matrixDefault = buildQualityOutcomeMatrix(picks)
    expect(matrixDefault.quadrants['got-lucky'].count).toBe(1)

    // Lower threshold=50, so 60 is good process
    const matrixCustom = buildQualityOutcomeMatrix(picks, 50)
    expect(matrixCustom.quadrants['earned-win'].count).toBe(1)
  })

  it('calculates sustainability score correctly', () => {
    const picks = [
      makePick({ processScore: 80, outcome: 'win' }),
      makePick({ processScore: 80, outcome: 'win' }),
      makePick({ processScore: 80, outcome: 'win' }),
      makePick({ processScore: 30, outcome: 'win' }), // lucky
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.sustainabilityScore).toBe(75) // 3/4 wins are earned
  })

  it('calculates luck factor correctly', () => {
    const picks = [
      makePick({ processScore: 30, outcome: 'win' }),
      makePick({ processScore: 30, outcome: 'win' }),
      makePick({ processScore: 80, outcome: 'win' }),
      makePick({ processScore: 80, outcome: 'loss' }),
      makePick({ processScore: 30, outcome: 'loss' }),
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.luckFactor).toBe(40) // 2/5 are got-lucky
  })

  it('calculates discipline score correctly', () => {
    const picks = [
      makePick({ processScore: 80, outcome: 'loss' }), // bad beat (disciplined)
      makePick({ processScore: 80, outcome: 'loss' }),
      makePick({ processScore: 30, outcome: 'loss' }), // expected loss (undisciplined)
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.disciplineScore).toBe(67) // 2/3 losses are bad beats
  })

  it('calculates average process scores per quadrant', () => {
    const picks = [
      makePick({ processScore: 80, outcome: 'win' }),
      makePick({ processScore: 90, outcome: 'win' }),
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.quadrants['earned-win'].avgProcessScore).toBe(85)
  })

  it('tracks total profit per quadrant', () => {
    const picks = [
      makePick({ processScore: 80, outcome: 'win', profit: 2.5 }),
      makePick({ processScore: 80, outcome: 'win', profit: 1.5 }),
      makePick({ processScore: 30, outcome: 'loss', profit: -1 }),
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.quadrants['earned-win'].totalProfit).toBe(4)
    expect(matrix.quadrants['expected-loss'].totalProfit).toBe(-1)
  })

  it('generates warning insight when luck factor is high', () => {
    const picks = [
      ...Array.from({ length: 4 }, () => makePick({ processScore: 30, outcome: 'win' })),
      ...Array.from({ length: 6 }, () => makePick({ processScore: 80, outcome: 'loss' })),
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.insight).toContain('lucky wins')
  })

  it('generates positive insight when sustainability is high', () => {
    const picks = [
      ...Array.from({ length: 8 }, () => makePick({ processScore: 85, outcome: 'win' })),
      ...Array.from({ length: 2 }, () => makePick({ processScore: 80, outcome: 'loss' })),
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.insight).toContain('sustainable')
  })

  it('returns early insight message for fewer than 5 picks', () => {
    const picks = [
      makePick({ processScore: 80, outcome: 'win' }),
      makePick({ processScore: 80, outcome: 'loss' }),
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.insight).toContain('at least 5')
  })

  it('picks at threshold are classified as good process', () => {
    const picks = [makePick({ processScore: 65, outcome: 'win' })]
    const matrix = buildQualityOutcomeMatrix(picks)
    expect(matrix.quadrants['earned-win'].count).toBe(1)
  })
})

describe('getQuadrantPercentages', () => {
  it('returns zero percentages for empty matrix', () => {
    const matrix = buildQualityOutcomeMatrix([])
    const pcts = getQuadrantPercentages(matrix)
    expect(pcts['earned-win']).toBe(0)
    expect(pcts['bad-beat']).toBe(0)
    expect(pcts['got-lucky']).toBe(0)
    expect(pcts['expected-loss']).toBe(0)
  })

  it('returns correct percentages', () => {
    const picks = [
      makePick({ processScore: 80, outcome: 'win' }),
      makePick({ processScore: 80, outcome: 'win' }),
      makePick({ processScore: 30, outcome: 'win' }),
      makePick({ processScore: 30, outcome: 'loss' }),
    ]
    const matrix = buildQualityOutcomeMatrix(picks)
    const pcts = getQuadrantPercentages(matrix)
    expect(pcts['earned-win']).toBe(50)
    expect(pcts['got-lucky']).toBe(25)
    expect(pcts['expected-loss']).toBe(25)
  })
})
