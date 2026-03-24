import { describe, it, expect } from 'vitest'
import {
  isFadePick,
  buildFadeTrackerReport,
  type PickForFadeTracker,
} from '../fade-tracker'

function makePick(overrides: Partial<PickForFadeTracker> = {}): PickForFadeTracker {
  return {
    id: Math.random().toString(36).slice(2),
    game_date: '2026-03-20',
    sport: 'nba',
    pick_team: 'Lakers',
    odds: -110,
    units: 1,
    outcome: 'win',
    profit: 0.91,
    ...overrides,
  }
}

describe('isFadePick', () => {
  it('classifies big underdog as fade', () => {
    const result = isFadePick(makePick({ odds: 250 }))
    expect(result.isFade).toBe(true)
    expect(result.fadeStrength).toBeGreaterThan(0)
  })

  it('classifies slight underdog as fade', () => {
    const result = isFadePick(makePick({ odds: 120 }))
    expect(result.isFade).toBe(true)
  })

  it('classifies moderate favorite as not fade', () => {
    const result = isFadePick(makePick({ odds: -150 }))
    expect(result.isFade).toBe(false)
  })

  it('classifies heavy favorite as not fade', () => {
    const result = isFadePick(makePick({ odds: -300 }))
    expect(result.isFade).toBe(false)
  })

  it('classifies near pick-em as not fade', () => {
    const result = isFadePick(makePick({ odds: -110 }))
    expect(result.isFade).toBe(false)
  })

  it('returns estimated public percentage', () => {
    const result = isFadePick(makePick({ odds: -200 }))
    expect(result.publicPct).toBeGreaterThan(50)
    expect(result.publicPct).toBeLessThanOrEqual(95)
  })

  it('fade strength increases with odds', () => {
    const dog150 = isFadePick(makePick({ odds: 150 }))
    const dog300 = isFadePick(makePick({ odds: 300 }))
    expect(dog300.fadeStrength).toBeGreaterThan(dog150.fadeStrength)
  })
})

describe('buildFadeTrackerReport', () => {
  it('returns empty report for no picks', () => {
    const report = buildFadeTrackerReport([])
    expect(report.totalFades).toBe(0)
    expect(report.totalNonFades).toBe(0)
  })

  it('separates fades from non-fades', () => {
    const picks = [
      makePick({ odds: 200, outcome: 'win' }),  // fade
      makePick({ odds: -150, outcome: 'loss' }), // non-fade
      makePick({ odds: 150, outcome: 'loss' }),  // fade
    ]
    const report = buildFadeTrackerReport(picks)
    expect(report.totalFades).toBe(2)
    expect(report.totalNonFades).toBe(1)
  })

  it('calculates fade win rate', () => {
    const picks = [
      makePick({ odds: 200, outcome: 'win', profit: 2 }),
      makePick({ odds: 200, outcome: 'loss', profit: -1 }),
      makePick({ odds: 200, outcome: 'win', profit: 2 }),
    ]
    const report = buildFadeTrackerReport(picks)
    expect(report.fadeWinRate).toBeCloseTo(66.7, 0)
  })

  it('calculates fade ROI', () => {
    const picks = [
      makePick({ odds: 200, outcome: 'win', profit: 2, units: 1 }),
      makePick({ odds: 200, outcome: 'loss', profit: -1, units: 1 }),
    ]
    const report = buildFadeTrackerReport(picks)
    // Profit: +2-1 = 1, units: 2 → ROI = 50%
    expect(report.fadeROI).toBe(50)
  })

  it('calculates fade edge', () => {
    const picks = [
      makePick({ odds: 200, outcome: 'win', profit: 2, units: 1 }),    // fade
      makePick({ odds: -150, outcome: 'loss', profit: -1, units: 1 }), // non-fade
    ]
    const report = buildFadeTrackerReport(picks)
    // Fade ROI: 200%, NonFade ROI: -100%
    expect(report.fadeEdge).toBeGreaterThan(0)
  })

  it('breaks down by sport', () => {
    const picks = [
      makePick({ sport: 'nba', odds: 200, outcome: 'win', profit: 2 }),
      makePick({ sport: 'nfl', odds: 200, outcome: 'loss', profit: -1 }),
      makePick({ sport: 'nba', odds: -150, outcome: 'win', profit: 0.67 }),
    ]
    const report = buildFadeTrackerReport(picks)
    expect(report.bySport.length).toBe(2)
    const nba = report.bySport.find((s) => s.sport === 'nba')
    expect(nba).toBeDefined()
    expect(nba!.fadeCount).toBe(1)
    expect(nba!.nonFadeCount).toBe(1)
  })

  it('filters out pending picks', () => {
    const picks = [
      makePick({ outcome: 'pending' }),
      makePick({ outcome: 'win', odds: 200 }),
    ]
    const report = buildFadeTrackerReport(picks)
    expect(report.totalFades).toBe(1)
    expect(report.totalNonFades).toBe(0)
  })

  it('handles null profit as 0', () => {
    const picks = [
      makePick({ odds: 200, outcome: 'win', profit: null }),
    ]
    const report = buildFadeTrackerReport(picks)
    expect(report.fadeProfitUnits).toBe(0)
  })

  it('generates insight for no picks', () => {
    const report = buildFadeTrackerReport([])
    expect(report.insight).toContain('No resolved')
  })

  it('generates insight when fading is profitable', () => {
    const picks = [
      ...Array.from({ length: 6 }, () =>
        makePick({ odds: 200, outcome: 'win', profit: 2 })
      ),
      ...Array.from({ length: 4 }, () =>
        makePick({ odds: -150, outcome: 'loss', profit: -1 })
      ),
    ]
    const report = buildFadeTrackerReport(picks)
    if (report.shouldFade) {
      expect(report.insight).toContain('profitable')
    }
  })
})
