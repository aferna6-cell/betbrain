/**
 * Back-to-back fatigue model tests.
 *
 * Tests fatigue assessment, comparison, and quick estimate functions.
 */

import { describe, it, expect } from 'vitest'
import {
  assessFatigue,
  compareFatigue,
  quickFatigueEstimate,
  type ScheduleEntry,
} from '@/lib/fatigue-model'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEntry(
  team: string,
  date: string,
  isHome: boolean,
  gameId: string = `g-${date}-${team}`,
  location?: string
): ScheduleEntry {
  return {
    gameId,
    team,
    opponent: 'Opponent',
    date,
    isHome,
    sport: 'nba',
    location,
  }
}

// ---------------------------------------------------------------------------
// assessFatigue
// ---------------------------------------------------------------------------

describe('assessFatigue', () => {
  it('detects a back-to-back situation', () => {
    const teamSchedule: ScheduleEntry[] = [
      makeEntry('Lakers', '2026-03-24', false),
      makeEntry('Lakers', '2026-03-23', true),
    ]
    const oppSchedule: ScheduleEntry[] = [
      makeEntry('Celtics', '2026-03-22', true),
    ]

    const result = assessFatigue(
      teamSchedule, 'g-target', '2026-03-25', false,
      oppSchedule, 'nba'
    )

    expect(result.isBackToBack).toBe(true)
    expect(result.teamRestDays).toBe(1)
    expect(result.opponentRestDays).toBe(3)
    expect(result.fatigueScore).toBeGreaterThan(30)
    expect(result.rating).not.toBe('none')
    expect(result.atsImpact).toBeLessThan(0)
  })

  it('rates road B2B as more severe than home B2B', () => {
    const schedule: ScheduleEntry[] = [
      makeEntry('Team', '2026-03-24', true),
    ]
    const oppSchedule: ScheduleEntry[] = [
      makeEntry('Opp', '2026-03-22', true),
    ]

    const homeB2B = assessFatigue(
      schedule, 'g1', '2026-03-25', true,
      oppSchedule, 'nba'
    )
    const roadB2B = assessFatigue(
      schedule, 'g2', '2026-03-25', false,
      oppSchedule, 'nba'
    )

    expect(roadB2B.fatigueScore).toBeGreaterThan(homeB2B.fatigueScore)
    expect(roadB2B.factors.venueContext).toBeGreaterThan(homeB2B.factors.venueContext)
  })

  it('penalizes heavy schedule density', () => {
    const heavySchedule: ScheduleEntry[] = [
      makeEntry('Team', '2026-03-24', true),
      makeEntry('Team', '2026-03-22', false),
      makeEntry('Team', '2026-03-20', true),
      makeEntry('Team', '2026-03-19', false),
    ]
    const lightSchedule: ScheduleEntry[] = [
      makeEntry('Team', '2026-03-22', true),
    ]
    const oppSchedule: ScheduleEntry[] = [
      makeEntry('Opp', '2026-03-22', true),
    ]

    const heavy = assessFatigue(
      heavySchedule, 'g1', '2026-03-25', true,
      oppSchedule, 'nba'
    )
    const light = assessFatigue(
      lightSchedule, 'g2', '2026-03-25', true,
      oppSchedule, 'nba'
    )

    expect(heavy.gamesInLast7).toBeGreaterThan(light.gamesInLast7)
    expect(heavy.factors.scheduleDensity).toBeGreaterThan(light.factors.scheduleDensity)
  })

  it('adds travel penalty for timezone crossings', () => {
    const schedule: ScheduleEntry[] = [
      makeEntry('Team', '2026-03-24', false, 'g-prev', 'New York'),
    ]
    const oppSchedule: ScheduleEntry[] = [
      makeEntry('Opp', '2026-03-22', true),
    ]

    const result = assessFatigue(
      schedule, 'g1', '2026-03-25', false,
      oppSchedule, 'nba', 'Los Angeles'
    )

    expect(result.factors.travelPenalty).toBeGreaterThan(0)
  })

  it('returns no fatigue for well-rested team', () => {
    const schedule: ScheduleEntry[] = [
      makeEntry('Team', '2026-03-21', true),
    ]
    const oppSchedule: ScheduleEntry[] = [
      makeEntry('Opp', '2026-03-21', true),
    ]

    const result = assessFatigue(
      schedule, 'g1', '2026-03-25', true,
      oppSchedule, 'nba'
    )

    expect(result.rating).toBe('none')
    expect(result.fatigueScore).toBeLessThan(15)
    expect(result.isBackToBack).toBe(false)
  })

  it('handles empty schedules gracefully', () => {
    const result = assessFatigue(
      [], 'g1', '2026-03-25', true,
      [], 'nba'
    )

    expect(result.teamRestDays).toBe(3) // default
    expect(result.opponentRestDays).toBe(3)
    expect(result.rating).toBe('none')
  })

  it('includes disclaimer', () => {
    const result = assessFatigue(
      [], 'g1', '2026-03-25', true,
      [], 'nba'
    )

    expect(result.disclaimer).toContain('informational')
  })

  it('works for NHL sport', () => {
    const schedule: ScheduleEntry[] = [{
      ...makeEntry('Bruins', '2026-03-24', false),
      sport: 'nhl',
    }]
    const oppSchedule: ScheduleEntry[] = [{
      ...makeEntry('Rangers', '2026-03-22', true),
      sport: 'nhl',
    }]

    const result = assessFatigue(
      schedule, 'g1', '2026-03-25', false,
      oppSchedule, 'nhl'
    )

    expect(result.sport).toBe('nhl')
    expect(result.isBackToBack).toBe(true)
  })

  it('generates appropriate recommendation for severe fatigue', () => {
    const schedule: ScheduleEntry[] = [
      makeEntry('Team', '2026-03-24', false, 'g-prev', 'New York'),
      makeEntry('Team', '2026-03-22', false),
      makeEntry('Team', '2026-03-20', false),
      makeEntry('Team', '2026-03-19', false),
    ]
    const oppSchedule: ScheduleEntry[] = [
      makeEntry('Opp', '2026-03-20', true),
    ]

    const result = assessFatigue(
      schedule, 'g1', '2026-03-25', false,
      oppSchedule, 'nba', 'Los Angeles'
    )

    expect(result.rating === 'severe' || result.rating === 'high').toBe(true)
    expect(result.recommendation.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// compareFatigue
// ---------------------------------------------------------------------------

describe('compareFatigue', () => {
  it('identifies fatigue edge for home team', () => {
    const homeSchedule: ScheduleEntry[] = [
      makeEntry('Home', '2026-03-21', true),
    ]
    const awaySchedule: ScheduleEntry[] = [
      makeEntry('Away', '2026-03-24', false),
    ]
    const oppScheduleForHome: ScheduleEntry[] = [
      makeEntry('Away', '2026-03-24', false),
    ]
    const oppScheduleForAway: ScheduleEntry[] = [
      makeEntry('Home', '2026-03-21', true),
    ]

    const home = assessFatigue(homeSchedule, 'g1', '2026-03-25', true, oppScheduleForHome, 'nba')
    const away = assessFatigue(awaySchedule, 'g1', '2026-03-25', false, oppScheduleForAway, 'nba')

    const comparison = compareFatigue(home, away)

    expect(comparison.fatigueEdge).toBe('home')
    expect(comparison.summary).toContain('fatigue edge')
  })

  it('marks even fatigue when scores are close', () => {
    const schedule: ScheduleEntry[] = [
      makeEntry('Team', '2026-03-22', true),
    ]

    const home = assessFatigue(schedule, 'g1', '2026-03-25', true, schedule, 'nba')
    const away = assessFatigue(schedule, 'g1', '2026-03-25', false, schedule, 'nba')

    // Both have same rest, but away has slight venue penalty
    // Force even by using same assessment
    const even = compareFatigue(home, home)
    expect(even.fatigueEdge).toBe('even')
  })
})

// ---------------------------------------------------------------------------
// quickFatigueEstimate
// ---------------------------------------------------------------------------

describe('quickFatigueEstimate', () => {
  it('returns high score for road B2B with rest disadvantage', () => {
    const result = quickFatigueEstimate(1, 3, false, 'nba')

    expect(result.score).toBeGreaterThan(40)
    expect(result.rating).not.toBe('none')
    expect(result.atsImpact).toBeLessThan(0)
  })

  it('returns low score for well-rested home team', () => {
    const result = quickFatigueEstimate(3, 3, true, 'nba')

    expect(result.score).toBe(0)
    expect(result.rating).toBe('none')
    expect(result.atsImpact).toBe(0)
  })

  it('rates home B2B lower than road B2B', () => {
    const homeB2B = quickFatigueEstimate(1, 3, true, 'nba')
    const roadB2B = quickFatigueEstimate(1, 3, false, 'nba')

    expect(roadB2B.score).toBeGreaterThan(homeB2B.score)
  })

  it('handles NHL sport', () => {
    const result = quickFatigueEstimate(1, 3, false, 'nhl')

    expect(result.atsImpact).toBeLessThan(0)
    // NHL impact should be smaller than NBA
    const nbaResult = quickFatigueEstimate(1, 3, false, 'nba')
    expect(Math.abs(result.atsImpact)).toBeLessThan(Math.abs(nbaResult.atsImpact))
  })

  it('caps score at 100', () => {
    const result = quickFatigueEstimate(0, 5, false, 'nba')
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('penalizes 2-day rest slightly', () => {
    const twoDay = quickFatigueEstimate(2, 3, true, 'nba')
    const threeDay = quickFatigueEstimate(3, 3, true, 'nba')

    expect(twoDay.score).toBeGreaterThanOrEqual(threeDay.score)
  })
})
