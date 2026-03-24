import { describe, it, expect } from 'vitest'
import { autoGradePick, autoGradeAllPicks, type PickForAutoGrade } from '../auto-grade'

function makePick(overrides: Partial<PickForAutoGrade> = {}): PickForAutoGrade {
  return {
    id: Math.random().toString(36).slice(2),
    odds: -110,
    units: 1,
    outcome: 'win',
    profit: 0.91,
    closing_odds: null,
    created_at: '2026-03-20T10:00:00Z',
    game_date: '2026-03-21',
    notes: null,
    pick_type: 'moneyline',
    pick_line: null,
    pick_team: null,
    sport: 'nba',
    ...overrides,
  }
}

describe('autoGradePick', () => {
  it('grades a basic pick', () => {
    const result = autoGradePick(makePick())
    expect(result.grade).toBeDefined()
    expect(result.grade.score).toBeGreaterThanOrEqual(0)
    expect(result.grade.score).toBeLessThanOrEqual(100)
    expect(result.pickId).toBeDefined()
  })

  it('infers thesis from notes', () => {
    const withNotes = makePick({ notes: 'Lakers have a strong matchup advantage here based on recent form' })
    const withoutNotes = makePick({ notes: null })

    const resultWith = autoGradePick(withNotes)
    const resultWithout = autoGradePick(withoutNotes)

    expect(resultWith.inferred.hasThesis).toBe(true)
    expect(resultWithout.inferred.hasThesis).toBe(false)
  })

  it('infers thesis requires minimum note length', () => {
    const shortNotes = makePick({ notes: 'Good pick' })
    const result = autoGradePick(shortNotes)
    expect(result.inferred.hasThesis).toBe(false) // Too short
  })

  it('detects positive CLV', () => {
    const pick = makePick({ odds: +150, closing_odds: +130 })
    const result = autoGradePick(pick)
    expect(result.inferred.beatClosingLine).toBe(true)
    expect(result.inferred.clvReason).toContain('Beat')
  })

  it('detects negative CLV', () => {
    const pick = makePick({ odds: -150, closing_odds: -130 })
    const result = autoGradePick(pick)
    expect(result.inferred.beatClosingLine).toBe(false)
    expect(result.inferred.clvReason).toContain('against')
  })

  it('handles missing CLV data', () => {
    const pick = makePick({ closing_odds: null })
    const result = autoGradePick(pick)
    expect(result.inferred.beatClosingLine).toBeNull()
    expect(result.inferred.clvReason).toContain('No closing odds')
  })

  it('calculates sizing accuracy', () => {
    const oversized = makePick({ units: 3 })
    const result = autoGradePick(oversized, [], 1)
    expect(result.inferred.sizingAccuracy).toBe(3)
    expect(result.inferred.sizingReason).toContain('over')
  })

  it('detects sizing at recommended level', () => {
    const pick = makePick({ units: 1 })
    const result = autoGradePick(pick, [], 1)
    expect(result.inferred.sizingAccuracy).toBe(1)
    expect(result.inferred.sizingReason).toContain('matches')
  })

  it('calculates hours before game', () => {
    const pick = makePick({
      created_at: '2026-03-20T10:00:00Z',
      game_date: '2026-03-21',
    })
    const result = autoGradePick(pick)
    expect(result.inferred.hoursBeforeGame).toBeGreaterThan(20)
    expect(result.inferred.timingReason).toContain('early')
  })

  it('detects chase bet pattern', () => {
    const losingPick = makePick({
      id: '1',
      outcome: 'loss',
      created_at: '2026-03-20T10:00:00Z',
      units: 1,
    })
    const chasePick = makePick({
      id: '2',
      created_at: '2026-03-20T11:00:00Z', // 1 hour later
      units: 2, // Elevated units
    })

    const result = autoGradePick(chasePick, [losingPick])
    expect(result.inferred.isChaseBet).toBe(true)
    expect(result.inferred.chaseReason).toContain('chase')
  })

  it('does not flag chase when time gap is large', () => {
    const losingPick = makePick({
      outcome: 'loss',
      created_at: '2026-03-19T10:00:00Z',
      units: 1,
    })
    const laterPick = makePick({
      created_at: '2026-03-20T10:00:00Z', // 24 hours later
      units: 2,
    })

    const result = autoGradePick(laterPick, [losingPick])
    expect(result.inferred.isChaseBet).toBe(false)
  })

  it('does not flag chase when previous pick was a win', () => {
    const winPick = makePick({
      outcome: 'win',
      created_at: '2026-03-20T10:00:00Z',
    })
    const nextPick = makePick({
      created_at: '2026-03-20T11:00:00Z',
      units: 3,
    })

    const result = autoGradePick(nextPick, [winPick])
    expect(result.inferred.isChaseBet).toBe(false)
  })

  it('has high confidence with CLV + notes + history', () => {
    const pick = makePick({
      closing_odds: -115,
      notes: 'Strong matchup advantage with Lakers resting bench',
    })
    const recent = Array.from({ length: 5 }, () => makePick())
    const result = autoGradePick(pick, recent)
    expect(result.confidence).toBe('high')
  })

  it('has low confidence with no CLV, no notes, no history', () => {
    const pick = makePick({ closing_odds: null, notes: null })
    const result = autoGradePick(pick, [])
    expect(result.confidence).toBe('low')
  })

  it('infers followed system when disciplined', () => {
    const pick = makePick({ units: 1 })
    const result = autoGradePick(pick, [], 1)
    expect(result.inferred.followedSystem).toBe(true)
  })

  it('infers line shopping from favorable odds', () => {
    const pick = makePick({ odds: -105 })
    const result = autoGradePick(pick)
    expect(result.inferred.lineShopped).toBe(true)
  })

  it('does not infer line shopping from standard odds', () => {
    const pick = makePick({ odds: -110 })
    const result = autoGradePick(pick)
    expect(result.inferred.lineShopped).toBe(false)
  })
})

describe('autoGradeAllPicks', () => {
  it('grades all picks with context', () => {
    const picks = [
      makePick({ id: '1', created_at: '2026-03-18T10:00:00Z' }),
      makePick({ id: '2', created_at: '2026-03-19T10:00:00Z' }),
      makePick({ id: '3', created_at: '2026-03-20T10:00:00Z' }),
    ]
    const results = autoGradeAllPicks(picks)
    expect(results.length).toBe(3)
    // First pick has no prior context
    expect(results[0].pickId).toBe('1')
  })

  it('provides recent picks as context for each grade', () => {
    const picks = [
      makePick({ id: '1', outcome: 'loss', created_at: '2026-03-20T10:00:00Z', units: 1 }),
      makePick({ id: '2', created_at: '2026-03-20T11:00:00Z', units: 2 }),
    ]
    const results = autoGradeAllPicks(picks)
    // Second pick should detect chase from first pick
    expect(results[1].inferred.isChaseBet).toBe(true)
  })

  it('sorts picks chronologically', () => {
    const picks = [
      makePick({ id: 'c', created_at: '2026-03-22T10:00:00Z' }),
      makePick({ id: 'a', created_at: '2026-03-20T10:00:00Z' }),
      makePick({ id: 'b', created_at: '2026-03-21T10:00:00Z' }),
    ]
    const results = autoGradeAllPicks(picks)
    expect(results[0].pickId).toBe('a')
    expect(results[1].pickId).toBe('b')
    expect(results[2].pickId).toBe('c')
  })

  it('uses recommended units for sizing accuracy', () => {
    const picks = [makePick({ units: 2 })]
    const results = autoGradeAllPicks(picks, 2) // 2 is recommended
    expect(results[0].inferred.sizingAccuracy).toBe(1) // Exactly on target
  })
})
