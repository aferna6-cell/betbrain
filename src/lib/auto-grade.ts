/**
 * Auto-Grade — Infer bet grading criteria from pick metadata.
 *
 * When a user hasn't manually graded a bet, we can infer some criteria
 * from the data we have: timing, CLV, unit sizing, odds, etc.
 *
 * Pure functions — no side effects, no API calls.
 */

import { gradeBet, type BetForGrading, type BetGrade } from './bet-grading'

export interface PickForAutoGrade {
  id: string
  odds: number
  units: number
  outcome: string | null
  profit: number | null
  closing_odds: number | null
  created_at: string
  game_date: string
  notes: string | null
  pick_type: string
  pick_line: number | null
  pick_team: string | null
  sport: string
}

export interface AutoGradeResult {
  pickId: string
  grade: BetGrade
  inferred: InferredCriteria
  confidence: 'high' | 'medium' | 'low'
  confidenceReason: string
}

export interface InferredCriteria {
  hasThesis: boolean
  thesisReason: string
  lineShopped: boolean
  lineShopReason: string
  beatClosingLine: boolean | null
  clvReason: string
  sizingAccuracy: number
  sizingReason: string
  hoursBeforeGame: number
  timingReason: string
  isChaseBet: boolean
  chaseReason: string
  followedSystem: boolean
  systemReason: string
}

/**
 * Auto-grade a single pick by inferring criteria from metadata.
 *
 * @param pick - The pick to grade
 * @param recentPicks - Recent picks before this one (for chase detection, sizing context)
 * @param recommendedUnits - Recommended unit size (default: 1)
 */
export function autoGradePick(
  pick: PickForAutoGrade,
  recentPicks: PickForAutoGrade[] = [],
  recommendedUnits = 1
): AutoGradeResult {
  const inferred = inferCriteria(pick, recentPicks, recommendedUnits)
  const confidenceFactors: number[] = []

  // Confidence in our inference
  if (pick.closing_odds !== null) confidenceFactors.push(1) // Have CLV data
  else confidenceFactors.push(0)

  if (pick.notes && pick.notes.length > 10) confidenceFactors.push(1) // Have notes to check
  else confidenceFactors.push(0)

  if (recentPicks.length >= 3) confidenceFactors.push(1) // Can detect chasing
  else confidenceFactors.push(0)

  const avgConfidence = confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length

  let confidence: AutoGradeResult['confidence']
  let confidenceReason: string
  if (avgConfidence >= 0.7) {
    confidence = 'high'
    confidenceReason = 'CLV data, notes, and betting history available for accurate grading.'
  } else if (avgConfidence >= 0.4) {
    confidence = 'medium'
    confidenceReason = 'Some data available but missing CLV or recent history.'
  } else {
    confidence = 'low'
    confidenceReason = 'Limited data — grade is estimated. Add notes and CLV for better accuracy.'
  }

  const betForGrading: BetForGrading = {
    hasThesis: inferred.hasThesis,
    lineShopped: inferred.lineShopped,
    beatClosingLine: inferred.beatClosingLine,
    confidence: 3, // default mid-confidence
    sizingAccuracy: inferred.sizingAccuracy,
    hoursBeforeGame: inferred.hoursBeforeGame,
    isChaseBet: inferred.isChaseBet,
    followedSystem: inferred.followedSystem,
    outcome: pick.outcome as BetForGrading['outcome'],
  }

  const grade = gradeBet(betForGrading)

  return {
    pickId: pick.id,
    grade,
    inferred,
    confidence,
    confidenceReason,
  }
}

function inferCriteria(
  pick: PickForAutoGrade,
  recentPicks: PickForAutoGrade[],
  recommendedUnits: number
): InferredCriteria {
  // 1. Thesis: infer from notes
  const hasThesis = !!(pick.notes && pick.notes.length >= 15)
  const thesisReason = hasThesis
    ? 'Notes suggest pre-bet reasoning was documented'
    : 'No substantive notes found — thesis likely not documented'

  // 2. Line shopping: can't directly determine, use proxy
  // If they got better-than-standard odds, they may have shopped
  const lineShopped = estimateLineShopping(pick)
  const lineShopReason = lineShopped
    ? 'Odds suggest favorable line relative to market average'
    : 'Cannot confirm line shopping from available data'

  // 3. CLV
  let beatClosingLine: boolean | null = null
  let clvReason: string
  if (pick.closing_odds !== null) {
    // For favorites (negative odds), worse closing line means we beat it
    // For underdogs (positive odds), higher closing line means we beat it
    if (pick.odds > 0) {
      beatClosingLine = pick.odds > pick.closing_odds
    } else {
      beatClosingLine = pick.odds > pick.closing_odds // Less negative = better
    }
    const clv = pick.closing_odds !== 0
      ? Math.round(((pick.odds - pick.closing_odds) / Math.abs(pick.closing_odds)) * 10000) / 100
      : 0
    clvReason = beatClosingLine
      ? `Beat closing line by ${Math.abs(clv).toFixed(1)}%`
      : `Closing line moved against by ${Math.abs(clv).toFixed(1)}%`
  } else {
    clvReason = 'No closing odds available'
  }

  // 4. Sizing accuracy
  const sizingAccuracy = recommendedUnits > 0
    ? pick.units / recommendedUnits
    : 1
  const sizingDeviation = Math.abs(sizingAccuracy - 1)
  const sizingReason = sizingDeviation <= 0.1
    ? 'Sizing matches recommended'
    : sizingDeviation <= 0.5
      ? `Sizing ${sizingAccuracy > 1 ? 'above' : 'below'} recommended by ${Math.round(sizingDeviation * 100)}%`
      : `Sizing significantly ${sizingAccuracy > 1 ? 'over' : 'under'} recommended`

  // 5. Timing: hours between created_at and game_date
  const created = new Date(pick.created_at).getTime()
  const gameStart = new Date(pick.game_date + 'T19:00:00Z').getTime() // Assume 7pm start if no time
  const hoursBeforeGame = Math.max(0, (gameStart - created) / (1000 * 60 * 60))
  const timingReason = hoursBeforeGame >= 24
    ? `Placed ~${Math.round(hoursBeforeGame)}h before game — early market`
    : hoursBeforeGame >= 4
      ? `Placed ~${Math.round(hoursBeforeGame)}h before game`
      : 'Placed close to game time'

  // 6. Chase bet detection: was the previous bet a loss?
  const isChaseBet = detectChaseBet(pick, recentPicks)
  const chaseReason = isChaseBet
    ? 'Placed shortly after a loss with elevated sizing — possible chase bet'
    : 'No chase pattern detected'

  // 7. Followed system: infer from sizing discipline + not chasing
  const followedSystem = !isChaseBet && sizingDeviation <= 0.5
  const systemReason = followedSystem
    ? 'Sizing and timing suggest disciplined approach'
    : isChaseBet
      ? 'Chase behavior suggests deviation from system'
      : 'Sizing deviation suggests departure from system rules'

  return {
    hasThesis,
    thesisReason,
    lineShopped,
    lineShopReason,
    beatClosingLine,
    clvReason,
    sizingAccuracy: Math.round(sizingAccuracy * 100) / 100,
    sizingReason,
    hoursBeforeGame: Math.round(hoursBeforeGame * 10) / 10,
    timingReason,
    isChaseBet,
    chaseReason,
    followedSystem,
    systemReason,
  }
}

function estimateLineShopping(pick: PickForAutoGrade): boolean {
  // Heuristic: if odds are at common "sharp book" values
  // (e.g., -105, -108 instead of standard -110), they might have shopped
  const abs = Math.abs(pick.odds)
  if (abs >= 100 && abs <= 115) {
    return abs < 110 // Got better than -110 standard
  }
  return false
}

function detectChaseBet(
  pick: PickForAutoGrade,
  recentPicks: PickForAutoGrade[]
): boolean {
  if (recentPicks.length === 0) return false

  // Sort by created_at desc
  const sorted = [...recentPicks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Check if the most recent pick before this was a loss
  const lastPick = sorted[0]
  if (!lastPick || lastPick.outcome !== 'loss') return false

  // Check if this bet was placed within 2 hours of the loss
  const lastTime = new Date(lastPick.created_at).getTime()
  const thisTime = new Date(pick.created_at).getTime()
  const hoursBetween = (thisTime - lastTime) / (1000 * 60 * 60)
  if (hoursBetween > 2) return false

  // Check if units are elevated (above recommended or above previous)
  if (pick.units > lastPick.units * 1.2) return true

  return false
}

/**
 * Auto-grade an array of picks, providing context from adjacent picks.
 */
export function autoGradeAllPicks(
  picks: PickForAutoGrade[],
  recommendedUnits = 1
): AutoGradeResult[] {
  // Sort by created_at asc
  const sorted = [...picks].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return sorted.map((pick, index) => {
    const recentPicks = sorted.slice(Math.max(0, index - 5), index)
    return autoGradePick(pick, recentPicks, recommendedUnits)
  })
}
