/**
 * Game Script Predictor — Predict game flow patterns from odds data.
 *
 * Analyzes spread, total, and moneyline odds to estimate:
 * - Blowout probability (one-sided game)
 * - Close game probability (within 3 points / 1 run)
 * - Overtime probability
 * - Expected tempo / scoring environment
 * - Likely game flow narrative
 *
 * Pure functions, no side effects. Uses only odds data — no external API calls.
 */

import { americanToImplied, americanToDecimal } from '@/lib/odds'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'
import type { Sport } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameFlowType = 'blowout_home' | 'blowout_away' | 'comfortable_home' | 'comfortable_away' | 'close' | 'coin_flip' | 'overtime_candidate'

export interface GameScript {
  game: NormalizedGame
  /** Primary predicted flow */
  predictedFlow: GameFlowType
  /** Probability estimates */
  probabilities: {
    blowout: number    // one side wins by large margin
    comfortable: number // clear winner but not a blowout
    close: number      // within a possession / 1-2 runs
    overtime: number   // extra time
  }
  /** Scoring environment */
  scoring: {
    expectedTotal: number | null
    tempo: 'low' | 'medium' | 'high'
    scoringEnv: string  // e.g. "High-scoring shootout" or "Defensive grind"
  }
  /** Spread analysis */
  spreadAnalysis: {
    consensusSpread: number | null
    spreadRange: number  // how much books disagree on spread
    lopsided: boolean    // > 7 point spread
  }
  /** Narrative description of predicted game flow */
  narrative: string
  /** Confidence in prediction (0-100) */
  confidence: number
  /** Factors driving the prediction */
  factors: string[]
}

// ---------------------------------------------------------------------------
// Sport-specific thresholds
// ---------------------------------------------------------------------------

interface SportThresholds {
  blowoutSpread: number    // spread threshold for "blowout territory"
  comfortableSpread: number // spread threshold for "comfortable win"
  closeSpread: number      // spread threshold for "close game"
  highTotal: number        // total threshold for "high scoring"
  lowTotal: number         // total threshold for "low scoring"
  avgTotal: number         // average total for the sport
  otBaseRate: number       // base rate for overtime
}

const SPORT_THRESHOLDS: Record<Sport, SportThresholds> = {
  nba: {
    blowoutSpread: 10,
    comfortableSpread: 6,
    closeSpread: 3,
    highTotal: 230,
    lowTotal: 210,
    avgTotal: 220,
    otBaseRate: 0.06,
  },
  nfl: {
    blowoutSpread: 10,
    comfortableSpread: 6,
    closeSpread: 3,
    highTotal: 48,
    lowTotal: 40,
    avgTotal: 44,
    otBaseRate: 0.05,
  },
  mlb: {
    blowoutSpread: 3,
    comfortableSpread: 2,
    closeSpread: 1,
    highTotal: 9.5,
    lowTotal: 7,
    avgTotal: 8.5,
    otBaseRate: 0.08, // extra innings
  },
  nhl: {
    blowoutSpread: 2.5,
    comfortableSpread: 1.5,
    closeSpread: 1,
    highTotal: 6.5,
    lowTotal: 5,
    avgTotal: 5.5,
    otBaseRate: 0.23, // NHL has ~23% OT rate
  },
}

// ---------------------------------------------------------------------------
// Core analysis functions
// ---------------------------------------------------------------------------

/**
 * Calculate consensus spread from all bookmakers.
 * Returns the median spread value.
 */
export function getConsensusSpread(bookmakers: NormalizedBookmakerOdds[]): number | null {
  const spreads: number[] = []
  for (const bk of bookmakers) {
    if (bk.spread?.homeLine != null) {
      spreads.push(bk.spread.homeLine)
    }
  }
  if (spreads.length === 0) return null
  spreads.sort((a, b) => a - b)
  const mid = Math.floor(spreads.length / 2)
  return spreads.length % 2 === 0
    ? (spreads[mid - 1] + spreads[mid]) / 2
    : spreads[mid]
}

/**
 * Calculate consensus total from all bookmakers.
 */
export function getConsensusTotal(bookmakers: NormalizedBookmakerOdds[]): number | null {
  const totals: number[] = []
  for (const bk of bookmakers) {
    if (bk.total?.line != null) {
      totals.push(bk.total.line)
    }
  }
  if (totals.length === 0) return null
  totals.sort((a, b) => a - b)
  const mid = Math.floor(totals.length / 2)
  return totals.length % 2 === 0
    ? (totals[mid - 1] + totals[mid]) / 2
    : totals[mid]
}

/**
 * Calculate how much bookmakers disagree on the spread.
 */
export function getSpreadRange(bookmakers: NormalizedBookmakerOdds[]): number {
  const spreads: number[] = []
  for (const bk of bookmakers) {
    if (bk.spread?.homeLine != null) {
      spreads.push(bk.spread.homeLine)
    }
  }
  if (spreads.length < 2) return 0
  return Math.max(...spreads) - Math.min(...spreads)
}

/**
 * Estimate overtime probability from spread and sport.
 * Close games in sports with OT mechanisms have higher OT rates.
 */
export function estimateOTProbability(
  spread: number | null,
  sport: Sport
): number {
  const thresholds = SPORT_THRESHOLDS[sport]
  const baseRate = thresholds.otBaseRate

  if (spread === null) return baseRate

  const absSpread = Math.abs(spread)

  // Closer spreads → higher OT probability
  if (absSpread <= thresholds.closeSpread) {
    // Very close game: OT is 2-3x base rate
    return Math.min(baseRate * 2.5, 0.35)
  }
  if (absSpread <= thresholds.comfortableSpread) {
    return baseRate * 1.3
  }
  // Large spreads make OT very unlikely
  if (absSpread >= thresholds.blowoutSpread) {
    return baseRate * 0.3
  }
  return baseRate
}

/**
 * Determine the scoring environment description.
 */
export function describeScoringEnv(
  total: number | null,
  sport: Sport
): { tempo: 'low' | 'medium' | 'high'; description: string } {
  const thresholds = SPORT_THRESHOLDS[sport]

  if (total === null) {
    return { tempo: 'medium', description: 'Average scoring environment expected' }
  }

  if (total >= thresholds.highTotal) {
    return { tempo: 'high', description: 'High-scoring shootout expected' }
  }
  if (total <= thresholds.lowTotal) {
    return { tempo: 'low', description: 'Defensive grind — low-scoring affair' }
  }
  return { tempo: 'medium', description: 'Average scoring pace expected' }
}

/**
 * Calculate probability distribution for game flow outcomes.
 */
export function calculateFlowProbabilities(
  spread: number | null,
  sport: Sport
): { blowout: number; comfortable: number; close: number; overtime: number } {
  const thresholds = SPORT_THRESHOLDS[sport]
  const ot = estimateOTProbability(spread, sport)

  if (spread === null) {
    // No spread info — use even distribution
    return { blowout: 0.15, comfortable: 0.30, close: 0.35, overtime: 0.20 }
  }

  const absSpread = Math.abs(spread)
  let blowout: number
  let comfortable: number
  let close: number

  if (absSpread >= thresholds.blowoutSpread) {
    // Heavy favorite — blowout is most likely
    blowout = 0.40
    comfortable = 0.35
    close = 0.15
  } else if (absSpread >= thresholds.comfortableSpread) {
    // Moderate favorite
    blowout = 0.20
    comfortable = 0.40
    close = 0.25
  } else if (absSpread >= thresholds.closeSpread) {
    // Slight favorite
    blowout = 0.10
    comfortable = 0.30
    close = 0.40
  } else {
    // Coin flip
    blowout = 0.08
    comfortable = 0.25
    close = 0.45
  }

  // Normalize remaining probability after OT
  const remaining = 1 - ot
  const total = blowout + comfortable + close
  blowout = Math.round((blowout / total) * remaining * 100) / 100
  comfortable = Math.round((comfortable / total) * remaining * 100) / 100
  close = Math.round((1 - blowout - comfortable - ot) * 100) / 100

  return { blowout, comfortable, close, overtime: Math.round(ot * 100) / 100 }
}

/**
 * Determine the primary game flow prediction.
 */
export function determinePrimaryFlow(
  spread: number | null,
  probs: { blowout: number; comfortable: number; close: number; overtime: number }
): GameFlowType {
  if (spread === null) return 'coin_flip'

  // Find highest probability
  const max = Math.max(probs.blowout, probs.comfortable, probs.close, probs.overtime)

  if (max === probs.overtime && probs.overtime >= 0.20) {
    return 'overtime_candidate'
  }
  if (max === probs.blowout) {
    return spread < 0 ? 'blowout_home' : 'blowout_away'
  }
  if (max === probs.comfortable) {
    return spread < 0 ? 'comfortable_home' : 'comfortable_away'
  }
  if (Math.abs(spread) <= 1) {
    return 'coin_flip'
  }
  return 'close'
}

/**
 * Generate a narrative description of the predicted game flow.
 */
export function generateNarrative(
  game: NormalizedGame,
  flow: GameFlowType,
  scoring: { tempo: 'low' | 'medium' | 'high'; description: string },
  spread: number | null,
  probs: { blowout: number; comfortable: number; close: number; overtime: number }
): string {
  const away = game.awayTeam
  const home = game.homeTeam

  const tempoText = scoring.tempo === 'high'
    ? 'in a high-scoring affair'
    : scoring.tempo === 'low'
    ? 'in a low-scoring defensive battle'
    : 'at a standard pace'

  switch (flow) {
    case 'blowout_home':
      return `${home} are heavy favorites and could pull away early. Expect ${home} to control ${tempoText}. The spread suggests a double-digit win is plausible (${(probs.blowout * 100).toFixed(0)}% chance).`
    case 'blowout_away':
      return `${away} are heavy road favorites and could dominate this matchup ${tempoText}. Blowout probability sits at ${(probs.blowout * 100).toFixed(0)}%.`
    case 'comfortable_home':
      return `${home} should control this game at home ${tempoText}. Not a blowout, but ${home} are expected to maintain a steady lead throughout (${(probs.comfortable * 100).toFixed(0)}% comfortable win).`
    case 'comfortable_away':
      return `${away} look positioned for a road victory ${tempoText}. Expect them to build and maintain a workable lead (${(probs.comfortable * 100).toFixed(0)}% comfortable win).`
    case 'close':
      return `This shapes up as a tight contest ${tempoText}. Neither side has a decisive edge — expect lead changes and a competitive finish (${(probs.close * 100).toFixed(0)}% close game).`
    case 'coin_flip':
      return `A true toss-up — the odds barely favor either side. This game could go either way ${tempoText}. Both teams are evenly matched on paper.`
    case 'overtime_candidate':
      return `With a tight spread and ${game.sport === 'nhl' ? 'the NHL\'s high OT rate' : 'evenly matched teams'}, this game has an elevated chance of going to overtime (${(probs.overtime * 100).toFixed(0)}%). Plan accordingly for potential extra time.`
  }
}

// ---------------------------------------------------------------------------
// Main predictor
// ---------------------------------------------------------------------------

/**
 * Predict game script for a single game.
 */
export function predictGameScript(game: NormalizedGame): GameScript {
  const thresholds = SPORT_THRESHOLDS[game.sport]
  const spread = getConsensusSpread(game.bookmakers)
  const total = getConsensusTotal(game.bookmakers)
  const spreadRange = getSpreadRange(game.bookmakers)

  const probs = calculateFlowProbabilities(spread, game.sport)
  const flow = determinePrimaryFlow(spread, probs)
  const scoringEnv = describeScoringEnv(total, game.sport)

  const narrative = generateNarrative(game, flow, scoringEnv, spread, probs)

  // Build factors list
  const factors: string[] = []
  if (spread !== null) {
    const absSpread = Math.abs(spread)
    if (absSpread >= thresholds.blowoutSpread) {
      factors.push(`Large spread (${spread > 0 ? '+' : ''}${spread}) suggests one-sided contest`)
    } else if (absSpread <= thresholds.closeSpread) {
      factors.push(`Tight spread (${spread > 0 ? '+' : ''}${spread}) indicates evenly matched`)
    }
  }
  if (total !== null) {
    if (total >= thresholds.highTotal) {
      factors.push(`High total (${total}) points to fast-paced, high-scoring game`)
    } else if (total <= thresholds.lowTotal) {
      factors.push(`Low total (${total}) suggests defensive battle`)
    }
  }
  if (spreadRange > 1) {
    factors.push(`Books disagree on spread by ${spreadRange} points — line is unsettled`)
  }
  if (probs.overtime >= 0.15) {
    factors.push(`Elevated OT probability (${(probs.overtime * 100).toFixed(0)}%) — consider OT impact on totals`)
  }
  if (game.bookmakers.length < 3) {
    factors.push('Limited bookmaker data — lower confidence in prediction')
  }

  // Calculate confidence
  let confidence = 60
  if (game.bookmakers.length >= 5) confidence += 10
  else if (game.bookmakers.length >= 3) confidence += 5
  if (spread !== null && Math.abs(spread) >= thresholds.comfortableSpread) confidence += 10
  if (spreadRange < 1) confidence += 10 // books agree
  if (spreadRange > 2) confidence -= 10 // books disagree
  if (total !== null) confidence += 5
  confidence = Math.max(20, Math.min(95, confidence))

  return {
    game,
    predictedFlow: flow,
    probabilities: probs,
    scoring: {
      expectedTotal: total,
      tempo: scoringEnv.tempo,
      scoringEnv: scoringEnv.description,
    },
    spreadAnalysis: {
      consensusSpread: spread,
      spreadRange,
      lopsided: spread !== null && Math.abs(spread) >= thresholds.blowoutSpread,
    },
    narrative,
    confidence,
    factors,
  }
}

/**
 * Predict game scripts for all games, sorted by confidence descending.
 */
export function predictAllGameScripts(games: NormalizedGame[]): GameScript[] {
  return games
    .map(predictGameScript)
    .sort((a, b) => b.confidence - a.confidence)
}

/**
 * Get flow type label for display.
 */
export function getFlowLabel(flow: GameFlowType): string {
  switch (flow) {
    case 'blowout_home': return 'Home Blowout'
    case 'blowout_away': return 'Away Blowout'
    case 'comfortable_home': return 'Home Comfortable'
    case 'comfortable_away': return 'Away Comfortable'
    case 'close': return 'Close Game'
    case 'coin_flip': return 'Coin Flip'
    case 'overtime_candidate': return 'OT Candidate'
  }
}

/**
 * Get flow type color class for display.
 */
export function getFlowColor(flow: GameFlowType): string {
  switch (flow) {
    case 'blowout_home':
    case 'blowout_away':
      return 'text-red-500'
    case 'comfortable_home':
    case 'comfortable_away':
      return 'text-orange-500'
    case 'close':
      return 'text-blue-500'
    case 'coin_flip':
      return 'text-yellow-500'
    case 'overtime_candidate':
      return 'text-purple-500'
  }
}
