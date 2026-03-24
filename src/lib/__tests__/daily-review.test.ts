/**
 * Daily Review tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateReviewStats, type DailyReview } from '@/lib/daily-review'

function makeReview(overrides: Partial<DailyReview> = {}): DailyReview {
  return {
    date: '2026-03-24',
    processGrade: 'B',
    discipline: 3,
    bankrollDiscipline: 3,
    researchQuality: 3,
    chased: false,
    pickCount: 5,
    lesson: 'Should have waited for better line',
    notes: '',
    tags: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('calculateReviewStats', () => {
  it('returns defaults for empty reviews', () => {
    const stats = calculateReviewStats([])
    expect(stats.totalReviews).toBe(0)
    expect(stats.avgProcessGrade).toBe('--')
    expect(stats.recentTrend).toBe('stable')
  })

  it('calculates total reviews', () => {
    const reviews = [makeReview(), makeReview({ date: '2026-03-23' })]
    const stats = calculateReviewStats(reviews)
    expect(stats.totalReviews).toBe(2)
  })

  it('calculates average grade', () => {
    const reviews = [
      makeReview({ processGrade: 'A' }),
      makeReview({ date: '2026-03-23', processGrade: 'A' }),
    ]
    const stats = calculateReviewStats(reviews)
    expect(stats.avgProcessGrade).toBe('A')
  })

  it('calculates mixed average grade', () => {
    const reviews = [
      makeReview({ processGrade: 'A' }),
      makeReview({ date: '2026-03-23', processGrade: 'C' }),
    ]
    const stats = calculateReviewStats(reviews)
    // Average of A(4) and C(2) = 3 = B
    expect(stats.avgProcessGrade).toBe('B')
  })

  it('calculates average discipline', () => {
    const reviews = [
      makeReview({ discipline: 5 }),
      makeReview({ date: '2026-03-23', discipline: 3 }),
    ]
    const stats = calculateReviewStats(reviews)
    expect(stats.avgDiscipline).toBe(4)
  })

  it('calculates chase rate', () => {
    const reviews = [
      makeReview({ chased: true }),
      makeReview({ date: '2026-03-23', chased: false }),
      makeReview({ date: '2026-03-22', chased: true }),
      makeReview({ date: '2026-03-21', chased: false }),
    ]
    const stats = calculateReviewStats(reviews)
    expect(stats.chaseRate).toBe(50)
  })

  it('returns stable trend with few reviews', () => {
    const reviews = [makeReview()]
    const stats = calculateReviewStats(reviews)
    expect(stats.recentTrend).toBe('stable')
  })

  it('detects improving trend', () => {
    const reviews: DailyReview[] = []
    // Recent 5: all A
    for (let i = 0; i < 5; i++) {
      reviews.push(makeReview({
        date: `2026-03-${24 - i}`,
        processGrade: 'A',
      }))
    }
    // Previous 5: all D
    for (let i = 5; i < 10; i++) {
      reviews.push(makeReview({
        date: `2026-03-${24 - i}`,
        processGrade: 'D',
      }))
    }
    const stats = calculateReviewStats(reviews)
    expect(stats.recentTrend).toBe('improving')
  })

  it('detects declining trend', () => {
    const reviews: DailyReview[] = []
    // Recent 5: all D
    for (let i = 0; i < 5; i++) {
      reviews.push(makeReview({
        date: `2026-03-${24 - i}`,
        processGrade: 'D',
      }))
    }
    // Previous 5: all A
    for (let i = 5; i < 10; i++) {
      reviews.push(makeReview({
        date: `2026-03-${24 - i}`,
        processGrade: 'A',
      }))
    }
    const stats = calculateReviewStats(reviews)
    expect(stats.recentTrend).toBe('declining')
  })

  it('collects top lessons', () => {
    const reviews = [
      makeReview({ lesson: 'Lesson 1' }),
      makeReview({ date: '2026-03-23', lesson: 'Lesson 2' }),
      makeReview({ date: '2026-03-22', lesson: '' }),
    ]
    const stats = calculateReviewStats(reviews)
    expect(stats.topLessons).toEqual(['Lesson 1', 'Lesson 2'])
  })

  it('limits top lessons to 5', () => {
    const reviews = Array.from({ length: 10 }, (_, i) =>
      makeReview({ date: `2026-03-${24 - i}`, lesson: `Lesson ${i}` })
    )
    const stats = calculateReviewStats(reviews)
    expect(stats.topLessons.length).toBeLessThanOrEqual(5)
  })

  it('calculates average research quality', () => {
    const reviews = [
      makeReview({ researchQuality: 5 }),
      makeReview({ date: '2026-03-23', researchQuality: 1 }),
    ]
    const stats = calculateReviewStats(reviews)
    expect(stats.avgResearch).toBe(3)
  })
})
