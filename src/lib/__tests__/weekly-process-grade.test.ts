import { describe, it, expect } from 'vitest'
import {
  buildWeeklyGradeReport,
  type GradedPickForWeekly,
} from '../weekly-process-grade'

function makePick(overrides: Partial<GradedPickForWeekly> = {}): GradedPickForWeekly {
  return {
    game_date: '2026-03-20',
    score: 70,
    grade: 'B',
    isChaseBet: false,
    beatClosingLine: null,
    ...overrides,
  }
}

describe('buildWeeklyGradeReport', () => {
  it('returns empty report for no picks', () => {
    const report = buildWeeklyGradeReport([])
    expect(report.weeks.length).toBe(0)
    expect(report.trend).toBe('insufficient')
    expect(report.overallAvg).toBe(0)
  })

  it('groups picks by week', () => {
    const picks = [
      makePick({ game_date: '2026-03-17', score: 80 }), // Mon
      makePick({ game_date: '2026-03-18', score: 70 }), // Tue (same week)
      makePick({ game_date: '2026-03-24', score: 60 }), // Mon (next week)
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.weeks.length).toBe(2)
  })

  it('calculates average score per week', () => {
    const picks = [
      makePick({ game_date: '2026-03-17', score: 80 }),
      makePick({ game_date: '2026-03-18', score: 60 }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.weeks[0].avgScore).toBe(70)
  })

  it('calculates overall average', () => {
    const picks = [
      makePick({ score: 80 }),
      makePick({ score: 60 }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.overallAvg).toBe(70)
  })

  it('identifies best and worst weeks', () => {
    const picks = [
      makePick({ game_date: '2026-03-10', score: 90 }), // Week 1
      makePick({ game_date: '2026-03-17', score: 50 }), // Week 2
      makePick({ game_date: '2026-03-24', score: 70 }), // Week 3
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.bestWeek?.avgScore).toBe(90)
    expect(report.worstWeek?.avgScore).toBe(50)
  })

  it('counts chase bets per week', () => {
    const picks = [
      makePick({ game_date: '2026-03-17', isChaseBet: true }),
      makePick({ game_date: '2026-03-18', isChaseBet: false }),
      makePick({ game_date: '2026-03-19', isChaseBet: true }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.weeks[0].chaseBets).toBe(2)
  })

  it('counts CLV stats per week', () => {
    const picks = [
      makePick({ game_date: '2026-03-17', beatClosingLine: true }),
      makePick({ game_date: '2026-03-18', beatClosingLine: false }),
      makePick({ game_date: '2026-03-19', beatClosingLine: null }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.weeks[0].beatCLV).toBe(1)
    expect(report.weeks[0].totalCLV).toBe(2)
  })

  it('builds grade distribution per week', () => {
    const picks = [
      makePick({ game_date: '2026-03-17', grade: 'A' }),
      makePick({ game_date: '2026-03-18', grade: 'A+' }),
      makePick({ game_date: '2026-03-19', grade: 'B' }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.weeks[0].gradeDistribution['A']).toBe(2) // A and A+ both → A
    expect(report.weeks[0].gradeDistribution['B']).toBe(1)
  })

  it('detects improving trend', () => {
    const picks = [
      makePick({ game_date: '2026-03-03', score: 40 }),
      makePick({ game_date: '2026-03-10', score: 55 }),
      makePick({ game_date: '2026-03-17', score: 70 }),
      makePick({ game_date: '2026-03-24', score: 85 }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.trend).toBe('improving')
  })

  it('detects declining trend', () => {
    const picks = [
      makePick({ game_date: '2026-03-03', score: 85 }),
      makePick({ game_date: '2026-03-10', score: 70 }),
      makePick({ game_date: '2026-03-17', score: 55 }),
      makePick({ game_date: '2026-03-24', score: 40 }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.trend).toBe('declining')
  })

  it('detects stable trend', () => {
    const picks = [
      makePick({ game_date: '2026-03-03', score: 70 }),
      makePick({ game_date: '2026-03-10', score: 71 }),
      makePick({ game_date: '2026-03-17', score: 70 }),
      makePick({ game_date: '2026-03-24', score: 71 }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.trend).toBe('stable')
  })

  it('returns insufficient trend with fewer than 3 weeks', () => {
    const picks = [
      makePick({ game_date: '2026-03-17', score: 70 }),
      makePick({ game_date: '2026-03-24', score: 80 }),
    ]
    const report = buildWeeklyGradeReport(picks)
    expect(report.trend).toBe('insufficient')
  })

  it('formats week labels correctly', () => {
    const picks = [makePick({ game_date: '2026-03-20' })] // Friday
    const report = buildWeeklyGradeReport(picks)
    // Week should be Mar 16-22
    expect(report.weeks[0].weekLabel).toContain('Mar')
  })

  it('handles Sunday correctly (end of week)', () => {
    const picks = [makePick({ game_date: '2026-03-22' })] // Sunday
    const report = buildWeeklyGradeReport(picks)
    expect(report.weeks.length).toBe(1)
  })
})
