/**
 * Bet Grading System — Rate bet quality separate from outcome.
 *
 * Grades the PROCESS, not the RESULT. A losing bet can get an A
 * if the process was sound, and a winning bet can get a D if it
 * was a bad process that got lucky.
 *
 * Pure functions — no side effects, no API calls.
 */

export type LetterGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'

export interface BetGrade {
  /** Overall letter grade */
  grade: LetterGrade
  /** Overall numeric score (0-100) */
  score: number
  /** Individual criteria scores */
  criteria: GradingCriterion[]
  /** Process quality label */
  processLabel: string
  /** Whether outcome aligned with process quality */
  outcomeAlignment: 'aligned' | 'lucky' | 'unlucky' | 'pending'
}

export interface GradingCriterion {
  name: string
  score: number // 0-100
  maxScore: number
  weight: number
  detail: string
}

export interface BetForGrading {
  /** Did the bettor have a clear thesis? */
  hasThesis: boolean
  /** Was the line shopped across multiple books? */
  lineShopped: boolean
  /** Was the closing line beaten? (CLV positive) */
  beatClosingLine: boolean | null
  /** Confidence level when placed (1-5) */
  confidence: number
  /** Unit sizing relative to recommended (0.5-2.0, 1.0 = exact) */
  sizingAccuracy: number
  /** Time before game start when bet was placed (hours) */
  hoursBeforeGame: number
  /** Was this a chase bet (after a loss)? */
  isChaseBet: boolean
  /** Did the bettor follow their system/rules? */
  followedSystem: boolean
  /** Outcome, if known */
  outcome: 'win' | 'loss' | 'push' | 'pending' | null
}

/**
 * Grade a bet on process quality.
 */
export function gradeBet(bet: BetForGrading): BetGrade {
  const criteria: GradingCriterion[] = []

  // 1. Thesis/Research (25%)
  const thesisScore = bet.hasThesis ? 90 : 20
  criteria.push({
    name: 'Research & Thesis',
    score: thesisScore,
    maxScore: 100,
    weight: 0.25,
    detail: bet.hasThesis
      ? 'Clear thesis documented before placing bet'
      : 'No thesis documented — gambling, not betting',
  })

  // 2. Line Shopping (20%)
  const lineScore = bet.lineShopped ? 85 : 30
  criteria.push({
    name: 'Line Shopping',
    score: lineScore,
    maxScore: 100,
    weight: 0.2,
    detail: bet.lineShopped
      ? 'Line was compared across multiple books'
      : 'No line shopping — may have taken worse odds',
  })

  // 3. CLV (15%)
  let clvScore = 50 // Unknown baseline
  if (bet.beatClosingLine === true) clvScore = 90
  else if (bet.beatClosingLine === false) clvScore = 30
  criteria.push({
    name: 'Closing Line Value',
    score: clvScore,
    maxScore: 100,
    weight: 0.15,
    detail: bet.beatClosingLine === true
      ? 'Beat the closing line — strong edge indicator'
      : bet.beatClosingLine === false
        ? 'Closing line moved against you'
        : 'CLV not yet available',
  })

  // 4. Sizing Discipline (15%)
  const sizingDeviation = Math.abs(bet.sizingAccuracy - 1.0)
  let sizingScore: number
  if (sizingDeviation <= 0.1) sizingScore = 95
  else if (sizingDeviation <= 0.25) sizingScore = 75
  else if (sizingDeviation <= 0.5) sizingScore = 50
  else sizingScore = 20
  criteria.push({
    name: 'Sizing Discipline',
    score: sizingScore,
    maxScore: 100,
    weight: 0.15,
    detail: sizingDeviation <= 0.1
      ? 'Unit sizing matches recommended'
      : `Sizing ${bet.sizingAccuracy > 1 ? 'over' : 'under'} recommended by ${(sizingDeviation * 100).toFixed(0)}%`,
  })

  // 5. Discipline (15%)
  let disciplineScore = 50
  if (bet.followedSystem && !bet.isChaseBet) disciplineScore = 90
  else if (bet.followedSystem && bet.isChaseBet) disciplineScore = 50
  else if (!bet.followedSystem && !bet.isChaseBet) disciplineScore = 40
  else disciplineScore = 15 // Chase bet and didn't follow system
  criteria.push({
    name: 'Discipline',
    score: disciplineScore,
    maxScore: 100,
    weight: 0.15,
    detail: bet.isChaseBet
      ? 'Chase bet detected — betting to recover losses'
      : bet.followedSystem
        ? 'Followed system rules'
        : 'Deviated from system',
  })

  // 6. Timing (10%)
  let timingScore: number
  if (bet.hoursBeforeGame >= 24) timingScore = 85 // Early bird
  else if (bet.hoursBeforeGame >= 4) timingScore = 70
  else if (bet.hoursBeforeGame >= 1) timingScore = 50
  else timingScore = 30 // Last minute
  criteria.push({
    name: 'Timing',
    score: timingScore,
    maxScore: 100,
    weight: 0.1,
    detail: bet.hoursBeforeGame >= 24
      ? `Placed ${Math.round(bet.hoursBeforeGame)}h before game — good market timing`
      : bet.hoursBeforeGame >= 1
        ? `Placed ${Math.round(bet.hoursBeforeGame)}h before game`
        : 'Last-minute bet — limited analysis time',
  })

  // Calculate composite score
  const score = Math.round(
    criteria.reduce((sum, c) => sum + c.score * c.weight, 0)
  )

  const grade = scoreToGrade(score)
  const processLabel = getProcessLabel(score)

  // Determine outcome alignment
  let outcomeAlignment: BetGrade['outcomeAlignment'] = 'pending'
  if (bet.outcome && bet.outcome !== 'pending') {
    if (bet.outcome === 'push') {
      outcomeAlignment = 'aligned'
    } else if (score >= 70 && bet.outcome === 'win') {
      outcomeAlignment = 'aligned'
    } else if (score >= 70 && bet.outcome === 'loss') {
      outcomeAlignment = 'unlucky'
    } else if (score < 50 && bet.outcome === 'win') {
      outcomeAlignment = 'lucky'
    } else if (score < 50 && bet.outcome === 'loss') {
      outcomeAlignment = 'aligned'
    } else {
      outcomeAlignment = 'aligned'
    }
  }

  return { grade, score, criteria, processLabel, outcomeAlignment }
}

function scoreToGrade(score: number): LetterGrade {
  if (score >= 95) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 78) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 62) return 'C+'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function getProcessLabel(score: number): string {
  if (score >= 85) return 'Excellent process'
  if (score >= 70) return 'Good process'
  if (score >= 55) return 'Acceptable process'
  if (score >= 40) return 'Needs improvement'
  return 'Poor process'
}

/**
 * Get grade color class.
 */
export function getGradeColor(grade: LetterGrade): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-green-400'
    case 'B+':
    case 'B':
      return 'text-blue-400'
    case 'C+':
    case 'C':
      return 'text-amber-400'
    case 'D':
      return 'text-orange-400'
    case 'F':
      return 'text-red-400'
  }
}

/**
 * Get outcome alignment color and label.
 */
export function getAlignmentInfo(alignment: BetGrade['outcomeAlignment']): {
  label: string
  color: string
  icon: string
} {
  switch (alignment) {
    case 'aligned':
      return { label: 'Process = Outcome', color: 'text-green-400', icon: '=' }
    case 'lucky':
      return { label: 'Got Lucky', color: 'text-amber-400', icon: '!' }
    case 'unlucky':
      return { label: 'Good Process, Bad Luck', color: 'text-blue-400', icon: '*' }
    case 'pending':
      return { label: 'Pending', color: 'text-zinc-400', icon: '?' }
  }
}

/**
 * Calculate average process grade from multiple bets.
 */
export function averageGrade(grades: BetGrade[]): { avgScore: number; avgGrade: LetterGrade } {
  if (grades.length === 0) return { avgScore: 0, avgGrade: 'F' }
  const avgScore = Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
  return { avgScore, avgGrade: scoreToGrade(avgScore) }
}
