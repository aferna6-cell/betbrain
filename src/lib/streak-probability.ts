/**
 * Streak Probability Calculator — What are the odds of a streak continuing?
 *
 * Uses binomial probability and historical win rate to estimate:
 * - Probability of current streak extending by N more
 * - Expected length of a streak given your win rate
 * - Whether a streak is statistically unusual
 *
 * Pure functions — no side effects, no API calls.
 */

export interface StreakProbability {
  /** Current streak type */
  streakType: 'win' | 'loss' | 'none'
  /** Current streak length */
  currentLength: number
  /** Historical win rate used for calculation */
  winRate: number
  /** Probability of extending streak by 1 more */
  extendBy1: number
  /** Probability of extending streak by 3 more */
  extendBy3: number
  /** Probability of extending streak by 5 more */
  extendBy5: number
  /** Probability of a streak THIS long or longer occurring */
  probabilityOfStreak: number
  /** Expected average streak length given win rate */
  expectedStreakLength: number
  /** Is this streak statistically unusual? (<5% probability) */
  isUnusual: boolean
  /** Human-readable assessment */
  assessment: string
}

export interface PickForStreak {
  outcome: string | null
  game_date?: string
}

/**
 * Calculate streak continuation probabilities.
 *
 * @param picks - Array of picks sorted by date (most recent first)
 * @param overrideWinRate - Optional win rate override (0-1). If not provided, calculated from picks.
 */
export function calcStreakProbability(
  picks: PickForStreak[],
  overrideWinRate?: number
): StreakProbability {
  const resolved = picks.filter(
    (p) => p.outcome === 'win' || p.outcome === 'loss'
  )

  if (resolved.length === 0) {
    return {
      streakType: 'none',
      currentLength: 0,
      winRate: 0,
      extendBy1: 0,
      extendBy3: 0,
      extendBy5: 0,
      probabilityOfStreak: 1,
      expectedStreakLength: 0,
      isUnusual: false,
      assessment: 'No resolved picks yet.',
    }
  }

  // Calculate win rate
  const wins = resolved.filter((p) => p.outcome === 'win').length
  const winRate = overrideWinRate ?? wins / resolved.length

  // Find current streak (from most recent picks)
  let currentLength = 0
  const streakType = resolved[0].outcome as 'win' | 'loss'
  for (const pick of resolved) {
    if (pick.outcome === streakType) {
      currentLength++
    } else {
      break
    }
  }

  // Probability of streak continuing
  // P(extending by N) = p^N where p = win rate (for win streaks) or (1-win rate) (for loss streaks)
  const p = streakType === 'win' ? winRate : 1 - winRate

  const extendBy1 = p
  const extendBy3 = Math.pow(p, 3)
  const extendBy5 = Math.pow(p, 5)

  // Probability of a streak this long or longer occurring at some point
  // P(streak >= k) in N trials ≈ 1 - (1 - p^k)^(N/k) (approximate)
  // Simplified: probability of any single run of length k = p^k
  const probabilityOfStreak = Math.pow(p, currentLength)

  // Expected streak length: 1 / (1 - p) for geometric distribution
  const expectedStreakLength = p < 1 ? 1 / (1 - p) : Infinity

  // Is unusual if < 5% probability
  const isUnusual = probabilityOfStreak < 0.05

  const assessment = generateStreakAssessment(
    streakType,
    currentLength,
    winRate,
    extendBy1,
    isUnusual,
    expectedStreakLength
  )

  return {
    streakType,
    currentLength,
    winRate: Math.round(winRate * 1000) / 1000,
    extendBy1: Math.round(extendBy1 * 1000) / 1000,
    extendBy3: Math.round(extendBy3 * 1000) / 1000,
    extendBy5: Math.round(extendBy5 * 1000) / 1000,
    probabilityOfStreak: Math.round(probabilityOfStreak * 10000) / 10000,
    expectedStreakLength: Math.round(expectedStreakLength * 10) / 10,
    isUnusual,
    assessment,
  }
}

function generateStreakAssessment(
  type: 'win' | 'loss',
  length: number,
  winRate: number,
  extendBy1: number,
  isUnusual: boolean,
  expectedLength: number
): string {
  if (length === 0) return 'No current streak.'
  if (length === 1) {
    return type === 'win'
      ? `1 win. ${Math.round(extendBy1 * 100)}% chance it becomes a 2-win streak.`
      : `1 loss. ${Math.round(extendBy1 * 100)}% chance of another loss next.`
  }

  const streakLabel = `${length}-${type} streak`

  if (type === 'win') {
    if (isUnusual) {
      return `${streakLabel} is statistically unusual (expected avg: ${expectedLength.toFixed(1)}). Enjoy it but don't increase sizing.`
    }
    if (length >= expectedLength) {
      return `${streakLabel} has reached expected length. ${Math.round(extendBy1 * 100)}% chance of extending.`
    }
    return `${streakLabel}. ${Math.round(extendBy1 * 100)}% chance of extending to ${length + 1}.`
  }

  // Loss streak
  if (isUnusual) {
    return `${streakLabel} is statistically unusual given your ${Math.round(winRate * 100)}% win rate. Variance — don't chase.`
  }
  if (length >= 3) {
    return `${streakLabel}. ${Math.round((1 - extendBy1) * 100)}% chance it ends next bet. Stay disciplined.`
  }
  return `${streakLabel}. This is normal variance at ${Math.round(winRate * 100)}% win rate.`
}

/**
 * Calculate the probability of experiencing a streak of length K
 * at least once in N bets, given a single-bet probability p.
 *
 * Uses the approximation: 1 - (1 - p^k * (1-p))^(N-k+1)
 */
export function streakOccurrenceProbability(
  n: number,
  k: number,
  p: number
): number {
  if (k > n) return 0
  if (k <= 0) return 1
  if (p <= 0) return 0
  if (p >= 1) return 1

  // Probability of NOT seeing a run of k in N trials
  // Approximate using Flajolet–Sedgewick formula
  const pNotRun = Math.pow(1 - Math.pow(p, k) * (1 - p), Math.max(1, n - k + 1))
  return Math.round((1 - pNotRun) * 10000) / 10000
}

/**
 * Generate a table of streak probabilities for display.
 */
export function streakProbabilityTable(
  winRate: number,
  totalBets: number
): Array<{ streakLength: number; winStreakProb: number; lossStreakProb: number }> {
  const rows: Array<{ streakLength: number; winStreakProb: number; lossStreakProb: number }> = []
  for (let k = 2; k <= Math.min(15, totalBets); k++) {
    rows.push({
      streakLength: k,
      winStreakProb: streakOccurrenceProbability(totalBets, k, winRate),
      lossStreakProb: streakOccurrenceProbability(totalBets, k, 1 - winRate),
    })
  }
  return rows
}
