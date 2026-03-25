import { describe, it, expect } from 'vitest'
import {
  generateJournalDraft,
  inferMood,
  extractLessons,
  detectStreaks,
  summarizeWeek,
  type PickSummary,
  type ChecklistSummary,
  type ReviewSummary,
  type AutoJournalInput,
  type AutoJournalDraft,
} from '../journal-auto'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePick(overrides: Partial<PickSummary> = {}): PickSummary {
  return {
    gameId: 'g1',
    sport: 'nba',
    pickType: 'moneyline',
    pickTeam: 'Lakers',
    odds: -110,
    units: 1,
    outcome: 'win',
    profit: 0.91,
    notes: null,
    gameDate: '2026-03-25',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// inferMood
// ---------------------------------------------------------------------------

describe('inferMood', () => {
  it('returns neutral when no picks', () => {
    expect(inferMood(0, 0, 0)).toBe('neutral')
  })

  it('returns great for high win rate with profit', () => {
    expect(inferMood(5, 1, 3.5)).toBe('great')
  })

  it('returns good for modest profit', () => {
    expect(inferMood(3, 2, 1.0)).toBe('good')
  })

  it('returns bad for negative profit', () => {
    expect(inferMood(2, 3, -1.5)).toBe('bad')
  })

  it('returns terrible for big losing day', () => {
    expect(inferMood(0, 4, -4.0)).toBe('terrible')
  })

  it('uses review data when available — chased = bad', () => {
    const review: ReviewSummary = {
      processGrade: 'C', discipline: 3, bankrollDiscipline: 3,
      researchQuality: 3, chased: true, lesson: '',
    }
    expect(inferMood(5, 0, 5.0, review)).toBe('bad')
  })

  it('uses review data — high discipline + profit = great', () => {
    const review: ReviewSummary = {
      processGrade: 'A', discipline: 5, bankrollDiscipline: 5,
      researchQuality: 5, chased: false, lesson: '',
    }
    expect(inferMood(3, 1, 2.0, review)).toBe('great')
  })

  it('uses review data — low discipline = bad', () => {
    const review: ReviewSummary = {
      processGrade: 'D', discipline: 2, bankrollDiscipline: 2,
      researchQuality: 2, chased: false, lesson: '',
    }
    expect(inferMood(3, 1, 2.0, review)).toBe('bad')
  })
})

// ---------------------------------------------------------------------------
// generateJournalDraft
// ---------------------------------------------------------------------------

describe('generateJournalDraft', () => {
  it('generates a rest day entry when no picks', () => {
    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [],
    })

    expect(draft.title).toContain('Rest day')
    expect(draft.mood).toBe('neutral')
    expect(draft.tags).toContain('rest day')
    expect(draft.date).toBe('2026-03-25')
  })

  it('generates a winning day entry', () => {
    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [
        makePick({ outcome: 'win', profit: 0.91, odds: -110 }),
        makePick({ gameId: 'g2', outcome: 'win', profit: 1.5, odds: 150, pickTeam: 'Celtics' }),
        makePick({ gameId: 'g3', outcome: 'loss', profit: -1.0, odds: -120, pickTeam: 'Bucks' }),
      ],
    })

    expect(draft.title).toContain('2-1')
    expect(draft.title).toContain('+')
    expect(draft.mood).toBe('good')
    expect(draft.notes).toContain('2W-1L')
    expect(draft.notes).toContain('Wins')
    expect(draft.notes).toContain('Losses')
    expect(draft.tags).toContain('nba')
  })

  it('generates a losing day entry', () => {
    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [
        makePick({ outcome: 'loss', profit: -1.0 }),
        makePick({ gameId: 'g2', outcome: 'loss', profit: -1.5 }),
        makePick({ gameId: 'g3', outcome: 'loss', profit: -2.0 }),
      ],
    })

    expect(draft.title).toContain('0-3')
    expect(draft.mood).toBe('terrible')
    expect(draft.tags).toContain('sweep loss')
  })

  it('includes checklist data in notes', () => {
    const checklist: ChecklistSummary = {
      processScore: 85,
      checkedCount: 6,
      totalCount: 7,
      skippedRequired: ['injury-check'],
    }

    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [makePick()],
      checklist,
    })

    expect(draft.notes).toContain('6/7')
    expect(draft.notes).toContain('85')
    expect(draft.notes).toContain('injury-check')
  })

  it('includes review data in notes', () => {
    const review: ReviewSummary = {
      processGrade: 'B',
      discipline: 4,
      bankrollDiscipline: 4,
      researchQuality: 3,
      chased: false,
      lesson: 'Stick to NBA only',
    }

    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [makePick()],
      review,
    })

    expect(draft.notes).toContain('Grade: B')
    expect(draft.notes).toContain('Discipline: 4/5')
    expect(draft.notes).toContain('Stick to NBA only')
    expect(draft.lessons).toContain('Stick to NBA only')
  })

  it('includes bankroll in draft', () => {
    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [],
      bankroll: 1500,
    })
    expect(draft.bankroll).toBe(1500)
  })

  it('tags multi-sport days correctly', () => {
    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [
        makePick({ sport: 'nba' }),
        makePick({ gameId: 'g2', sport: 'nhl', pickTeam: 'Bruins' }),
      ],
    })

    expect(draft.tags).toContain('nba')
    expect(draft.tags).toContain('nhl')
  })

  it('handles push results', () => {
    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [
        makePick({ outcome: 'push', profit: 0 }),
      ],
    })

    expect(draft.title).toContain('0-0-1')
    expect(draft.mood).toBe('neutral')
  })

  it('handles pending picks', () => {
    const draft = generateJournalDraft({
      date: '2026-03-25',
      picks: [
        makePick({ outcome: 'win', profit: 1.0 }),
        makePick({ gameId: 'g2', outcome: 'pending', profit: null }),
      ],
    })

    expect(draft.notes).toContain('Pending')
    expect(draft.notes).toContain('1 pick still open')
  })

  it('tags high volume days', () => {
    const picks = Array.from({ length: 7 }, (_, i) =>
      makePick({ gameId: `g${i}`, pickTeam: `Team${i}`, outcome: 'win', profit: 0.5 })
    )

    const draft = generateJournalDraft({ date: '2026-03-25', picks })
    expect(draft.tags).toContain('high volume')
  })
})

// ---------------------------------------------------------------------------
// extractLessons
// ---------------------------------------------------------------------------

describe('extractLessons', () => {
  it('includes review lesson', () => {
    const review: ReviewSummary = {
      processGrade: 'B', discipline: 4, bankrollDiscipline: 4,
      researchQuality: 4, chased: false, lesson: 'Bet fewer totals',
    }
    const lessons = extractLessons([], [], null, review)
    expect(lessons).toContain('Bet fewer totals')
  })

  it('detects chase behavior', () => {
    const review: ReviewSummary = {
      processGrade: 'D', discipline: 2, bankrollDiscipline: 2,
      researchQuality: 2, chased: true, lesson: '',
    }
    const lessons = extractLessons([], [], null, review)
    expect(lessons.some((l) => l.includes('Chased'))).toBe(true)
  })

  it('detects low process score', () => {
    const checklist: ChecklistSummary = {
      processScore: 40, checkedCount: 3, totalCount: 7, skippedRequired: ['thesis'],
    }
    const lessons = extractLessons([], [], checklist)
    expect(lessons.some((l) => l.includes('Low process score'))).toBe(true)
  })

  it('recognizes good process with bad outcome', () => {
    const checklist: ChecklistSummary = {
      processScore: 95, checkedCount: 7, totalCount: 7, skippedRequired: [],
    }
    const lessons = extractLessons([], [makePick({ outcome: 'loss' })], checklist, null, -2)
    expect(lessons.some((l) => l.includes('Good process but bad results'))).toBe(true)
  })

  it('detects underdog wins', () => {
    const wins = [
      makePick({ odds: 250, outcome: 'win' }),
      makePick({ gameId: 'g2', odds: 300, outcome: 'win', pickTeam: 'Underdog' }),
    ]
    const lessons = extractLessons(wins, [])
    expect(lessons.some((l) => l.includes('underdog'))).toBe(true)
  })

  it('detects heavy favorite losses', () => {
    const losses = [
      makePick({ odds: -250, outcome: 'loss' }),
    ]
    const lessons = extractLessons([], losses)
    expect(lessons.some((l) => l.includes('heavy favorite'))).toBe(true)
  })

  it('detects profit with losing record', () => {
    const wins = [makePick({ odds: 300, outcome: 'win', profit: 3.0 })]
    const losses = [
      makePick({ gameId: 'g2', outcome: 'loss', profit: -1.0 }),
      makePick({ gameId: 'g3', outcome: 'loss', profit: -1.0 }),
    ]
    const lessons = extractLessons(wins, losses, null, null, 1.0)
    expect(lessons.some((l) => l.includes('good unit sizing'))).toBe(true)
  })

  it('detects loss with winning record', () => {
    const wins = [
      makePick({ outcome: 'win', profit: 0.5 }),
      makePick({ gameId: 'g2', outcome: 'win', profit: 0.5 }),
    ]
    const losses = [makePick({ gameId: 'g3', outcome: 'loss', profit: -3.0 })]
    const lessons = extractLessons(wins, losses, null, null, -2.0)
    expect(lessons.some((l) => l.includes('check unit sizing'))).toBe(true)
  })

  it('detects high volume', () => {
    const wins = Array.from({ length: 5 }, (_, i) =>
      makePick({ gameId: `g${i}`, outcome: 'win', profit: 0.5, pickTeam: `T${i}` })
    )
    const losses = Array.from({ length: 4 }, (_, i) =>
      makePick({ gameId: `l${i}`, outcome: 'loss', profit: -1.0, pickTeam: `L${i}` })
    )
    const lessons = extractLessons(wins, losses)
    expect(lessons.some((l) => l.includes('High volume'))).toBe(true)
  })

  it('caps lessons at 5', () => {
    const review: ReviewSummary = {
      processGrade: 'D', discipline: 2, bankrollDiscipline: 2,
      researchQuality: 2, chased: true, lesson: 'Test lesson',
    }
    const checklist: ChecklistSummary = {
      processScore: 30, checkedCount: 2, totalCount: 7, skippedRequired: ['thesis'],
    }
    const wins = Array.from({ length: 5 }, (_, i) =>
      makePick({ gameId: `g${i}`, odds: 250, outcome: 'win', profit: 2.5, pickTeam: `T${i}` })
    )
    const losses = Array.from({ length: 5 }, (_, i) =>
      makePick({ gameId: `l${i}`, odds: -300, outcome: 'loss', profit: -1.0, pickTeam: `L${i}` })
    )
    const lessons = extractLessons(wins, losses, checklist, review, -1.0)
    expect(lessons.length).toBeLessThanOrEqual(5)
  })
})

// ---------------------------------------------------------------------------
// detectStreaks
// ---------------------------------------------------------------------------

describe('detectStreaks', () => {
  it('returns zeros for empty picks', () => {
    const result = detectStreaks([])
    expect(result.currentWinStreak).toBe(0)
    expect(result.currentLossStreak).toBe(0)
  })

  it('detects current win streak', () => {
    const picks = [
      makePick({ gameDate: '2026-03-20', outcome: 'loss' }),
      makePick({ gameId: 'g2', gameDate: '2026-03-21', outcome: 'win' }),
      makePick({ gameId: 'g3', gameDate: '2026-03-22', outcome: 'win' }),
      makePick({ gameId: 'g4', gameDate: '2026-03-23', outcome: 'win' }),
    ]
    const result = detectStreaks(picks)
    expect(result.currentWinStreak).toBe(3)
    expect(result.currentLossStreak).toBe(0)
    expect(result.longestWinStreak).toBe(3)
  })

  it('detects current loss streak', () => {
    const picks = [
      makePick({ gameDate: '2026-03-20', outcome: 'win' }),
      makePick({ gameId: 'g2', gameDate: '2026-03-21', outcome: 'loss' }),
      makePick({ gameId: 'g3', gameDate: '2026-03-22', outcome: 'loss' }),
    ]
    const result = detectStreaks(picks)
    expect(result.currentLossStreak).toBe(2)
    expect(result.currentWinStreak).toBe(0)
  })

  it('skips pending and push outcomes', () => {
    const picks = [
      makePick({ gameDate: '2026-03-20', outcome: 'win' }),
      makePick({ gameId: 'g2', gameDate: '2026-03-21', outcome: 'push' }),
      makePick({ gameId: 'g3', gameDate: '2026-03-22', outcome: 'pending' }),
      makePick({ gameId: 'g4', gameDate: '2026-03-23', outcome: 'win' }),
    ]
    const result = detectStreaks(picks)
    expect(result.currentWinStreak).toBe(2)
    expect(result.longestWinStreak).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// summarizeWeek
// ---------------------------------------------------------------------------

describe('summarizeWeek', () => {
  it('handles empty weeks', () => {
    const result = summarizeWeek([])
    expect(result.totalProfit).toBe('0.0')
    expect(result.bestDay).toBeNull()
    expect(result.avgMood).toBe('neutral')
  })

  it('summarizes a week of drafts', () => {
    const drafts: AutoJournalDraft[] = [
      { date: '2026-03-23', mood: 'great', bankroll: 1500, title: 'Solid day: 3-0 (+2.5u)', notes: '', lessons: ['Lesson 1'], tags: [] },
      { date: '2026-03-24', mood: 'bad', bankroll: 1450, title: 'Down day: 1-3 (-1.5u)', notes: '', lessons: ['Lesson 2', 'Lesson 3'], tags: [] },
      { date: '2026-03-25', mood: 'good', bankroll: 1520, title: 'Green day: 2-1 (+1.0u)', notes: '', lessons: [], tags: [] },
    ]

    const result = summarizeWeek(drafts)
    expect(result.totalProfit).toBe('+2.0')
    expect(result.bestDay).toBe('2026-03-23')
    expect(result.worstDay).toBe('2026-03-24')
    expect(result.totalLessons).toBe(3)
  })

  it('handles break-even titles (no profit in title)', () => {
    const drafts: AutoJournalDraft[] = [
      { date: '2026-03-25', mood: 'neutral', bankroll: null, title: 'Break-even: 1-1', notes: '', lessons: [], tags: [] },
    ]
    const result = summarizeWeek(drafts)
    expect(result.totalProfit).toBe('+0.0')
  })
})
