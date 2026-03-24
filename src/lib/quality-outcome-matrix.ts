/**
 * Pick Quality vs Outcome Matrix — 2x2 grid showing process quality against outcomes.
 *
 * Quadrants:
 * - Top-left: Good Process + Win → "Earned Win" (sustainable)
 * - Top-right: Good Process + Loss → "Bad Beat" (unlucky, keep going)
 * - Bottom-left: Bad Process + Win → "Got Lucky" (unsustainable)
 * - Bottom-right: Bad Process + Loss → "Expected Loss" (fix process)
 *
 * Pure functions — no side effects, no API calls.
 */

export type Quadrant = 'earned-win' | 'bad-beat' | 'got-lucky' | 'expected-loss'

export interface MatrixPick {
  id: string
  processScore: number // 0-100 (from bet grading)
  outcome: 'win' | 'loss'
  profit: number
  sport?: string
  pickType?: string
  label?: string // e.g. "LAL ML +120"
}

export interface QuadrantData {
  quadrant: Quadrant
  label: string
  description: string
  color: string
  picks: MatrixPick[]
  count: number
  totalProfit: number
  avgProcessScore: number
}

export interface QualityOutcomeMatrix {
  quadrants: Record<Quadrant, QuadrantData>
  totalPicks: number
  processThreshold: number
  /** Sustainability score: high earned-win % = sustainable */
  sustainabilityScore: number
  /** Luck factor: high got-lucky % means relying on luck */
  luckFactor: number
  /** Discipline score: low expected-loss % = disciplined */
  disciplineScore: number
  /** Key insight about the bettor's profile */
  insight: string
}

const QUADRANT_META: Record<Quadrant, { label: string; description: string; color: string }> = {
  'earned-win': {
    label: 'Earned Wins',
    description: 'Good process, winning outcome. This is sustainable betting.',
    color: 'text-green-400',
  },
  'bad-beat': {
    label: 'Bad Beats',
    description: 'Good process, losing outcome. Variance — keep trusting the process.',
    color: 'text-blue-400',
  },
  'got-lucky': {
    label: 'Got Lucky',
    description: 'Bad process, winning outcome. Unsustainable — will regress.',
    color: 'text-amber-400',
  },
  'expected-loss': {
    label: 'Expected Losses',
    description: 'Bad process, losing outcome. Fix the process first.',
    color: 'text-red-400',
  },
}

/**
 * Build a quality vs outcome matrix from graded picks.
 *
 * @param picks - Array of picks with process scores and outcomes
 * @param processThreshold - Score threshold for "good" process (default: 65)
 */
export function buildQualityOutcomeMatrix(
  picks: MatrixPick[],
  processThreshold = 65
): QualityOutcomeMatrix {
  const resolved = picks.filter((p) => p.outcome === 'win' || p.outcome === 'loss')

  const quadrants: Record<Quadrant, QuadrantData> = {
    'earned-win': { ...QUADRANT_META['earned-win'], quadrant: 'earned-win', picks: [], count: 0, totalProfit: 0, avgProcessScore: 0 },
    'bad-beat': { ...QUADRANT_META['bad-beat'], quadrant: 'bad-beat', picks: [], count: 0, totalProfit: 0, avgProcessScore: 0 },
    'got-lucky': { ...QUADRANT_META['got-lucky'], quadrant: 'got-lucky', picks: [], count: 0, totalProfit: 0, avgProcessScore: 0 },
    'expected-loss': { ...QUADRANT_META['expected-loss'], quadrant: 'expected-loss', picks: [], count: 0, totalProfit: 0, avgProcessScore: 0 },
  }

  for (const pick of resolved) {
    const goodProcess = pick.processScore >= processThreshold
    const won = pick.outcome === 'win'

    let quadrant: Quadrant
    if (goodProcess && won) quadrant = 'earned-win'
    else if (goodProcess && !won) quadrant = 'bad-beat'
    else if (!goodProcess && won) quadrant = 'got-lucky'
    else quadrant = 'expected-loss'

    quadrants[quadrant].picks.push(pick)
    quadrants[quadrant].count++
    quadrants[quadrant].totalProfit += pick.profit
  }

  // Calculate avg process scores
  for (const q of Object.values(quadrants)) {
    if (q.count > 0) {
      q.avgProcessScore = Math.round(
        q.picks.reduce((sum, p) => sum + p.processScore, 0) / q.count
      )
    }
  }

  const total = resolved.length

  // Sustainability: earned wins / total wins
  const totalWins = quadrants['earned-win'].count + quadrants['got-lucky'].count
  const sustainabilityScore = totalWins > 0
    ? Math.round((quadrants['earned-win'].count / totalWins) * 100)
    : 0

  // Luck factor: got lucky / total picks
  const luckFactor = total > 0
    ? Math.round((quadrants['got-lucky'].count / total) * 100)
    : 0

  // Discipline: 100 - (expected losses / total losses) * 100
  const totalLosses = quadrants['bad-beat'].count + quadrants['expected-loss'].count
  const disciplineScore = totalLosses > 0
    ? Math.round((quadrants['bad-beat'].count / totalLosses) * 100)
    : 100

  const insight = generateInsight(quadrants, total, sustainabilityScore, luckFactor)

  return {
    quadrants,
    totalPicks: total,
    processThreshold,
    sustainabilityScore,
    luckFactor,
    disciplineScore,
    insight,
  }
}

function generateInsight(
  quadrants: Record<Quadrant, QuadrantData>,
  total: number,
  sustainabilityScore: number,
  luckFactor: number
): string {
  if (total === 0) return 'No resolved picks yet. Start grading your bets to see insights.'
  if (total < 5) return 'Need at least 5 graded picks for meaningful insights.'

  const earnedPct = Math.round((quadrants['earned-win'].count / total) * 100)
  const expectedLossPct = Math.round((quadrants['expected-loss'].count / total) * 100)

  if (sustainabilityScore >= 80 && luckFactor <= 10) {
    return `Strong process — ${earnedPct}% of picks are earned wins. Your edge is sustainable.`
  }
  if (luckFactor >= 30) {
    return `Warning: ${luckFactor}% of picks are lucky wins with poor process. This win rate will regress.`
  }
  if (expectedLossPct >= 30) {
    return `${expectedLossPct}% of picks are expected losses from bad process. Focus on research and discipline.`
  }
  if (sustainabilityScore >= 60) {
    return `Solid foundation — ${sustainabilityScore}% of wins are earned. Room to tighten process on the rest.`
  }
  return `Mixed results. Focus on moving picks from "Got Lucky" to "Earned Win" by improving process.`
}

/**
 * Get quadrant percentages for display.
 */
export function getQuadrantPercentages(
  matrix: QualityOutcomeMatrix
): Record<Quadrant, number> {
  const total = matrix.totalPicks
  if (total === 0) {
    return { 'earned-win': 0, 'bad-beat': 0, 'got-lucky': 0, 'expected-loss': 0 }
  }
  return {
    'earned-win': Math.round((matrix.quadrants['earned-win'].count / total) * 100),
    'bad-beat': Math.round((matrix.quadrants['bad-beat'].count / total) * 100),
    'got-lucky': Math.round((matrix.quadrants['got-lucky'].count / total) * 100),
    'expected-loss': Math.round((matrix.quadrants['expected-loss'].count / total) * 100),
  }
}
