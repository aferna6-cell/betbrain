/**
 * Daily Review — End-of-day pick reflection and grading.
 *
 * Prompts users to review their picks from the day, grade their
 * decision-making process, and capture learnings.
 *
 * Stored in localStorage, no database dependency.
 * Pure functions for data manipulation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyReview {
  date: string // YYYY-MM-DD
  /** Overall process grade for the day (A-F) */
  processGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  /** How disciplined were you? (1-5) */
  discipline: number
  /** Did you follow your bankroll rules? (1-5) */
  bankrollDiscipline: number
  /** Were your picks well-researched? (1-5) */
  researchQuality: number
  /** Did you chase or tilt? */
  chased: boolean
  /** Number of picks today */
  pickCount: number
  /** Top lesson learned */
  lesson: string
  /** Free-form notes */
  notes: string
  /** Tags for categorization */
  tags: string[]
  /** Created timestamp */
  createdAt: string
}

export interface ReviewStats {
  totalReviews: number
  avgProcessGrade: string
  avgDiscipline: number
  avgResearch: number
  chaseRate: number
  recentTrend: 'improving' | 'declining' | 'stable'
  topLessons: string[]
}

const STORAGE_KEY = 'betbrain-daily-reviews'
const GRADE_VALUES: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 }
const VALUE_GRADES = ['F', 'D', 'C', 'B', 'A'] as const

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getAllReviews(): DailyReview[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

export function getReviewForDate(date: string): DailyReview | null {
  const reviews = getAllReviews()
  return reviews.find((r) => r.date === date) ?? null
}

export function saveReview(review: DailyReview): void {
  if (typeof window === 'undefined') return
  const reviews = getAllReviews()
  const idx = reviews.findIndex((r) => r.date === review.date)
  if (idx >= 0) {
    reviews[idx] = review
  } else {
    reviews.push(review)
  }
  // Sort by date descending
  reviews.sort((a, b) => b.date.localeCompare(a.date))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
}

export function deleteReview(date: string): void {
  if (typeof window === 'undefined') return
  const reviews = getAllReviews().filter((r) => r.date !== date)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function calculateReviewStats(reviews: DailyReview[]): ReviewStats {
  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      avgProcessGrade: '--',
      avgDiscipline: 0,
      avgResearch: 0,
      chaseRate: 0,
      recentTrend: 'stable',
      topLessons: [],
    }
  }

  const avgGradeValue = reviews.reduce((s, r) => s + (GRADE_VALUES[r.processGrade] ?? 2), 0) / reviews.length
  const avgGradeIdx = Math.round(avgGradeValue)
  const avgGrade = VALUE_GRADES[Math.min(avgGradeIdx, 4)]

  const avgDiscipline = Math.round(
    (reviews.reduce((s, r) => s + r.discipline, 0) / reviews.length) * 10
  ) / 10

  const avgResearch = Math.round(
    (reviews.reduce((s, r) => s + r.researchQuality, 0) / reviews.length) * 10
  ) / 10

  const chaseCount = reviews.filter((r) => r.chased).length
  const chaseRate = Math.round((chaseCount / reviews.length) * 100)

  // Trend: compare last 5 to previous 5
  const recentTrend = (() => {
    if (reviews.length < 6) return 'stable' as const
    const recent5 = reviews.slice(0, 5)
    const prev5 = reviews.slice(5, 10)
    if (prev5.length < 3) return 'stable' as const
    const recentAvg = recent5.reduce((s, r) => s + (GRADE_VALUES[r.processGrade] ?? 2), 0) / recent5.length
    const prevAvg = prev5.reduce((s, r) => s + (GRADE_VALUES[r.processGrade] ?? 2), 0) / prev5.length
    if (recentAvg > prevAvg + 0.3) return 'improving' as const
    if (recentAvg < prevAvg - 0.3) return 'declining' as const
    return 'stable' as const
  })()

  // Top lessons (most recent, unique, non-empty)
  const lessons = reviews
    .map((r) => r.lesson)
    .filter((l) => l.trim().length > 0)
    .slice(0, 5)

  return {
    totalReviews: reviews.length,
    avgProcessGrade: avgGrade,
    avgDiscipline,
    avgResearch,
    chaseRate,
    recentTrend,
    topLessons: lessons,
  }
}

/**
 * Check if today needs a review (has picks but no review yet).
 */
export function todayNeedsReview(todayPickCount: number): boolean {
  const today = new Date().toISOString().split('T')[0]
  const existing = getReviewForDate(today)
  return todayPickCount > 0 && !existing
}
