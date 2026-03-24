import { describe, it, expect } from 'vitest'
import {
  gradeBet,
  getGradeColor,
  getAlignmentInfo,
  averageGrade,
  type BetForGrading,
} from '../bet-grading'

const perfectBet: BetForGrading = {
  hasThesis: true,
  lineShopped: true,
  beatClosingLine: true,
  confidence: 4,
  sizingAccuracy: 1.0,
  hoursBeforeGame: 36,
  isChaseBet: false,
  followedSystem: true,
  outcome: 'win',
}

const terribleBet: BetForGrading = {
  hasThesis: false,
  lineShopped: false,
  beatClosingLine: false,
  confidence: 1,
  sizingAccuracy: 2.0,
  hoursBeforeGame: 0.5,
  isChaseBet: true,
  followedSystem: false,
  outcome: 'loss',
}

describe('gradeBet', () => {
  it('gives high grade for perfect process', () => {
    const result = gradeBet(perfectBet)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(['A+', 'A']).toContain(result.grade)
    expect(result.processLabel).toContain('Excellent')
  })

  it('gives low grade for terrible process', () => {
    const result = gradeBet(terribleBet)
    expect(result.score).toBeLessThan(35)
    expect(['D', 'F']).toContain(result.grade)
  })

  it('returns 6 criteria', () => {
    const result = gradeBet(perfectBet)
    expect(result.criteria).toHaveLength(6)
  })

  it('weights sum to 1.0', () => {
    const result = gradeBet(perfectBet)
    const totalWeight = result.criteria.reduce((sum, c) => sum + c.weight, 0)
    expect(totalWeight).toBeCloseTo(1.0, 2)
  })

  it('detects chase bets in discipline', () => {
    const chaseBet: BetForGrading = { ...perfectBet, isChaseBet: true }
    const normal = gradeBet(perfectBet)
    const chase = gradeBet(chaseBet)
    expect(chase.score).toBeLessThan(normal.score)
  })

  it('rewards line shopping', () => {
    const noShop: BetForGrading = { ...perfectBet, lineShopped: false }
    const withShop = gradeBet(perfectBet)
    const withoutShop = gradeBet(noShop)
    expect(withShop.score).toBeGreaterThan(withoutShop.score)
  })

  it('scores CLV as neutral when unknown', () => {
    const unknownCLV: BetForGrading = { ...perfectBet, beatClosingLine: null }
    const result = gradeBet(unknownCLV)
    const clvCriterion = result.criteria.find((c) => c.name === 'Closing Line Value')
    expect(clvCriterion!.score).toBe(50)
  })

  it('rewards early bets on timing', () => {
    const earlyBet: BetForGrading = { ...perfectBet, hoursBeforeGame: 48 }
    const lateBet: BetForGrading = { ...perfectBet, hoursBeforeGame: 0.2 }
    expect(gradeBet(earlyBet).score).toBeGreaterThan(gradeBet(lateBet).score)
  })

  it('detects outcome alignment — good process, bad result', () => {
    const goodProcessLoss: BetForGrading = { ...perfectBet, outcome: 'loss' }
    const result = gradeBet(goodProcessLoss)
    expect(result.outcomeAlignment).toBe('unlucky')
  })

  it('detects outcome alignment — bad process, good result', () => {
    const badProcessWin: BetForGrading = { ...terribleBet, outcome: 'win' }
    const result = gradeBet(badProcessWin)
    expect(result.outcomeAlignment).toBe('lucky')
  })

  it('handles pending outcome', () => {
    const pending: BetForGrading = { ...perfectBet, outcome: 'pending' }
    const result = gradeBet(pending)
    expect(result.outcomeAlignment).toBe('pending')
  })

  it('penalizes oversizing', () => {
    const oversized: BetForGrading = { ...perfectBet, sizingAccuracy: 2.0 }
    const properly: BetForGrading = { ...perfectBet, sizingAccuracy: 1.0 }
    expect(gradeBet(properly).score).toBeGreaterThan(gradeBet(oversized).score)
  })
})

describe('getGradeColor', () => {
  it('returns green for A grades', () => {
    expect(getGradeColor('A+')).toContain('green')
    expect(getGradeColor('A')).toContain('green')
  })

  it('returns blue for B grades', () => {
    expect(getGradeColor('B+')).toContain('blue')
    expect(getGradeColor('B')).toContain('blue')
  })

  it('returns amber for C grades', () => {
    expect(getGradeColor('C+')).toContain('amber')
  })

  it('returns red for F', () => {
    expect(getGradeColor('F')).toContain('red')
  })
})

describe('getAlignmentInfo', () => {
  it('returns correct info for each alignment', () => {
    expect(getAlignmentInfo('aligned').label).toContain('Process')
    expect(getAlignmentInfo('lucky').label).toContain('Lucky')
    expect(getAlignmentInfo('unlucky').label).toContain('Bad Luck')
    expect(getAlignmentInfo('pending').label).toBe('Pending')
  })
})

describe('averageGrade', () => {
  it('returns F for empty array', () => {
    expect(averageGrade([]).avgGrade).toBe('F')
  })

  it('averages scores correctly', () => {
    const grades = [
      gradeBet(perfectBet),
      gradeBet(terribleBet),
    ]
    const avg = averageGrade(grades)
    expect(avg.avgScore).toBeGreaterThan(0)
    expect(avg.avgScore).toBeLessThan(100)
  })
})
