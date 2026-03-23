/**
 * Consensus vs. Contrarian indicator.
 *
 * Estimates which side the public ("squares") is on vs. which side the
 * "sharp money" is on, using line movement as a proxy.
 *
 * Methodology:
 * 1. If the line moves TOWARD a team → sharps are betting that side (books adjust)
 * 2. If volume is on one side but the line moves the OTHER way → sharp/public split
 * 3. "Reverse line movement" = classic sharp money indicator
 *
 * Without access to actual public betting percentages, we use:
 * - Opening vs current line direction → proxy for money flow
 * - Bookmaker consensus → when books agree, it's the "public" side
 * - Outlier books → disagreement suggests information asymmetry
 *
 * Pure functions — no API calls.
 */

import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'
import { americanToImplied } from '@/lib/odds'

export interface ConsensusIndicator {
  gameId: string
  homeTeam: string
  awayTeam: string
  /** Estimated public side based on book consensus */
  publicSide: 'home' | 'away' | 'split'
  /** Estimated sharp side based on line outliers and movement */
  sharpSide: 'home' | 'away' | 'unclear'
  /** Whether there's a sharp/public divergence */
  divergence: boolean
  /** Confidence in the estimate (0-100) */
  confidence: number
  /** Human-readable reasoning */
  reasoning: string
  /** Average implied probability across books for each side */
  avgImplied: { home: number; away: number }
  /** Standard deviation of implied probabilities — higher = more disagreement */
  impliedStdDev: { home: number; away: number }
}

/**
 * Analyze a single game's bookmaker odds to estimate consensus vs contrarian sides.
 */
export function analyzeConsensus(game: NormalizedGame): ConsensusIndicator | null {
  const booksWithML = game.bookmakers.filter(
    (bk) => bk.moneyline?.home != null && bk.moneyline?.away != null
  )

  if (booksWithML.length < 3) return null

  // Collect implied probabilities
  const homeImplieds: number[] = []
  const awayImplieds: number[] = []

  for (const bk of booksWithML) {
    const homeImpl = americanToImplied(bk.moneyline!.home!)
    const awayImpl = americanToImplied(bk.moneyline!.away!)
    homeImplieds.push(homeImpl)
    awayImplieds.push(awayImpl)
  }

  const avgHome = mean(homeImplieds)
  const avgAway = mean(awayImplieds)
  const stdHome = stdDev(homeImplieds)
  const stdAway = stdDev(awayImplieds)

  // Determine public side: the favorite (higher implied probability) is usually the public side
  // unless the game is very close
  const impliedDiff = Math.abs(avgHome - avgAway)
  let publicSide: ConsensusIndicator['publicSide'] = 'split'
  if (impliedDiff > 0.05) {
    publicSide = avgHome > avgAway ? 'home' : 'away'
  }

  // Determine sharp side: look for book disagreement
  // If some books have significantly different odds, the outlier direction suggests sharp info
  let sharpSide: ConsensusIndicator['sharpSide'] = 'unclear'
  const maxDisagreement = Math.max(stdHome, stdAway)

  if (maxDisagreement > 0.02) {
    // Significant disagreement — find which direction outliers lean
    const homeOutliers = homeImplieds.filter((ip) => Math.abs(ip - avgHome) > stdHome)
    const awayOutliers = awayImplieds.filter((ip) => Math.abs(ip - avgAway) > stdAway)

    // If outlier books give LOWER implied prob to home → they think home is overvalued → sharp on away
    const homeOutlierDirection = homeOutliers.length > 0
      ? mean(homeOutliers) < avgHome ? 'away' : 'home'
      : null

    if (homeOutlierDirection) {
      sharpSide = homeOutlierDirection as 'home' | 'away'
    }
  }

  // Check for reverse line movement (sharp/public divergence)
  const divergence = publicSide !== 'split' && sharpSide !== 'unclear' && publicSide !== sharpSide

  // Build confidence
  let confidence = 30 // Base
  if (booksWithML.length >= 5) confidence += 15
  if (maxDisagreement > 0.03) confidence += 20
  if (divergence) confidence += 15
  if (impliedDiff > 0.1) confidence += 10
  confidence = Math.min(85, confidence) // Cap — we're estimating without real data

  // Build reasoning
  const reasons: string[] = []
  if (publicSide !== 'split') {
    const publicTeam = publicSide === 'home' ? game.homeTeam : game.awayTeam
    reasons.push(`${publicTeam} is the consensus favorite (${(avgHome > avgAway ? avgHome : avgAway * 100).toFixed(0)}% avg implied)`)
  } else {
    reasons.push('Near coin-flip — no clear public side')
  }

  if (maxDisagreement > 0.02) {
    reasons.push(`Books disagree: ${(maxDisagreement * 100).toFixed(1)}pp std dev in implied probabilities`)
  }

  if (divergence) {
    const sharpTeam = sharpSide === 'home' ? game.homeTeam : game.awayTeam
    reasons.push(`Potential sharp money on ${sharpTeam} — outlier book odds suggest contrarian value`)
  }

  return {
    gameId: game.id,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    publicSide,
    sharpSide,
    divergence,
    confidence,
    reasoning: reasons.join('. ') + '.',
    avgImplied: {
      home: Math.round(avgHome * 1000) / 10,
      away: Math.round(avgAway * 1000) / 10,
    },
    impliedStdDev: {
      home: Math.round(stdHome * 1000) / 10,
      away: Math.round(stdAway * 1000) / 10,
    },
  }
}

/**
 * Analyze all games and return only those with meaningful indicators.
 */
export function analyzeAllConsensus(games: NormalizedGame[]): ConsensusIndicator[] {
  return games
    .map(analyzeConsensus)
    .filter((c): c is ConsensusIndicator => c !== null && c.confidence >= 40)
    .sort((a, b) => {
      // Divergences first, then by confidence
      if (a.divergence !== b.divergence) return a.divergence ? -1 : 1
      return b.confidence - a.confidence
    })
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const squaredDiffs = values.map((v) => (v - m) ** 2)
  return Math.sqrt(mean(squaredDiffs))
}
