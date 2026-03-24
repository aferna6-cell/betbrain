/**
 * Expected Wins Chart — Compare actual wins vs expected wins from implied probability.
 *
 * For each resolved pick, the implied probability from the odds tells us the
 * "expected" win probability. Summing these gives the expected wins. Comparing
 * to actual wins reveals whether you're running hot, cold, or close to expectation.
 *
 * Pure functions — no side effects, no API calls.
 */

import { americanToImplied } from './odds'

export interface ExpectedWinsData {
  /** Cumulative actual wins at each resolved pick */
  actualWins: number[]
  /** Cumulative expected wins at each resolved pick (sum of implied probabilities) */
  expectedWins: number[]
  /** Pick index labels (1, 2, 3...) */
  labels: number[]
  /** Current actual win count */
  totalActualWins: number
  /** Current expected win count (sum of implied probabilities) */
  totalExpectedWins: number
  /** Total resolved picks */
  totalPicks: number
  /** Difference: actual - expected. Positive = running hot */
  winDelta: number
  /** Win delta as a percentage of total expected */
  winDeltaPct: number | null
  /** Assessment: "hot", "cold", or "expected" */
  assessment: 'hot' | 'cold' | 'expected'
  /** Luck score: how far from expected in standard deviations */
  luckZScore: number | null
}

export interface ExpectedWinsBySport {
  sport: string
  actualWins: number
  expectedWins: number
  delta: number
  deltaPct: number | null
  totalPicks: number
  assessment: 'hot' | 'cold' | 'expected'
}

interface PickForExpectedWins {
  outcome: string | null
  odds: number
  sport?: string
  /** ISO date for ordering */
  created_at?: string
  game_date?: string
}

/**
 * Calculate expected vs actual wins from a set of picks.
 * Picks should be sorted chronologically (oldest first).
 */
export function calcExpectedWins(picks: PickForExpectedWins[]): ExpectedWinsData {
  // Only resolved picks
  const resolved = picks.filter(
    (p) => p.outcome === 'win' || p.outcome === 'loss' || p.outcome === 'push'
  )

  // Sort by date if available
  const sorted = [...resolved].sort((a, b) => {
    const dateA = a.created_at || a.game_date || ''
    const dateB = b.created_at || b.game_date || ''
    return dateA.localeCompare(dateB)
  })

  const actualWins: number[] = []
  const expectedWins: number[] = []
  const labels: number[] = []
  let cumActual = 0
  let cumExpected = 0

  for (let i = 0; i < sorted.length; i++) {
    const pick = sorted[i]
    const implied = americanToImplied(pick.odds)

    if (pick.outcome === 'win') cumActual += 1
    else if (pick.outcome === 'push') cumActual += 0.5

    cumExpected += implied

    actualWins.push(cumActual)
    expectedWins.push(Math.round(cumExpected * 100) / 100)
    labels.push(i + 1)
  }

  const winDelta = cumActual - cumExpected
  const winDeltaPct = cumExpected > 0 ? (winDelta / cumExpected) * 100 : null

  // Z-score: (actual - expected) / sqrt(sum of p*(1-p))
  let variance = 0
  for (const pick of sorted) {
    const p = americanToImplied(pick.odds)
    variance += p * (1 - p)
  }
  const stdDev = Math.sqrt(variance)
  const luckZScore = stdDev > 0 ? winDelta / stdDev : null

  let assessment: 'hot' | 'cold' | 'expected'
  if (luckZScore != null) {
    if (luckZScore > 1.5) assessment = 'hot'
    else if (luckZScore < -1.5) assessment = 'cold'
    else assessment = 'expected'
  } else {
    assessment = 'expected'
  }

  return {
    actualWins,
    expectedWins,
    labels,
    totalActualWins: cumActual,
    totalExpectedWins: Math.round(cumExpected * 100) / 100,
    totalPicks: sorted.length,
    winDelta: Math.round(winDelta * 100) / 100,
    winDeltaPct,
    assessment,
    luckZScore,
  }
}

/**
 * Calculate expected wins broken down by sport.
 */
export function calcExpectedWinsBySport(
  picks: PickForExpectedWins[]
): ExpectedWinsBySport[] {
  const resolved = picks.filter(
    (p) => p.outcome === 'win' || p.outcome === 'loss' || p.outcome === 'push'
  )

  const bySport = new Map<string, PickForExpectedWins[]>()
  for (const pick of resolved) {
    const sport = pick.sport || 'unknown'
    if (!bySport.has(sport)) bySport.set(sport, [])
    bySport.get(sport)!.push(pick)
  }

  const results: ExpectedWinsBySport[] = []
  for (const [sport, sportPicks] of bySport) {
    let actualWins = 0
    let expectedWins = 0

    for (const pick of sportPicks) {
      const implied = americanToImplied(pick.odds)
      if (pick.outcome === 'win') actualWins += 1
      else if (pick.outcome === 'push') actualWins += 0.5
      expectedWins += implied
    }

    const delta = actualWins - expectedWins
    const deltaPct = expectedWins > 0 ? (delta / expectedWins) * 100 : null

    // Z-score for assessment
    let variance = 0
    for (const pick of sportPicks) {
      const p = americanToImplied(pick.odds)
      variance += p * (1 - p)
    }
    const stdDev = Math.sqrt(variance)
    const z = stdDev > 0 ? delta / stdDev : 0

    let assessment: 'hot' | 'cold' | 'expected'
    if (z > 1.5) assessment = 'hot'
    else if (z < -1.5) assessment = 'cold'
    else assessment = 'expected'

    results.push({
      sport,
      actualWins: Math.round(actualWins * 100) / 100,
      expectedWins: Math.round(expectedWins * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      deltaPct,
      totalPicks: sportPicks.length,
      assessment,
    })
  }

  return results.sort((a, b) => b.totalPicks - a.totalPicks)
}

/**
 * Get a human-readable luck assessment.
 */
export function getLuckDescription(data: ExpectedWinsData): string {
  if (data.totalPicks < 10) {
    return 'Not enough data for a reliable assessment (need 10+ resolved picks).'
  }
  if (data.luckZScore == null) return 'Unable to calculate luck score.'

  const z = data.luckZScore
  const delta = data.winDelta

  if (z > 2) {
    return `Running very hot! ${delta.toFixed(1)} more wins than expected. Regression likely.`
  }
  if (z > 1) {
    return `Running a bit above expectation with ${delta.toFixed(1)} extra wins. Mildly lucky.`
  }
  if (z < -2) {
    return `Running very cold. ${Math.abs(delta).toFixed(1)} fewer wins than expected. Positive regression likely.`
  }
  if (z < -1) {
    return `Running below expectation by ${Math.abs(delta).toFixed(1)} wins. Slightly unlucky.`
  }
  return `Results are in line with expectations. Your edge appears sustainable.`
}
