/**
 * Reverse Line Movement (RLM) Alerts
 *
 * Detects when the line moves in the opposite direction from where the
 * majority of public money is expected. This is the strongest indicator
 * of sharp action — pros betting the unpopular side with enough volume
 * to move the line against public sentiment.
 *
 * Uses current odds data (no history required) by comparing bookmaker
 * odds variance patterns to infer where the line has been pressured.
 *
 * For informational purposes only. Not financial advice.
 */

import { americanToImplied } from '@/lib/odds'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RLMStrength = 'strong' | 'moderate' | 'weak'

export interface RLMAlert {
  game: NormalizedGame
  /** Side where sharp money appears to be */
  sharpSide: 'home' | 'away'
  sharpTeam: string
  /** Estimated public side */
  publicSide: 'home' | 'away'
  publicTeam: string
  /** Signal strength */
  strength: RLMStrength
  /** Confidence score 0-100 */
  confidence: number
  /** Human-readable description of the RLM signal */
  description: string
  /** Contributing factors */
  factors: string[]
  /** Best available odds on the sharp side */
  bestSharpOdds: number | null
  /** Bookmaker offering best sharp-side odds */
  bestSharpBook: string | null
}

export interface RLMScanResult {
  alerts: RLMAlert[]
  gamesScanned: number
  strongCount: number
  moderateCount: number
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MIN_BOOKMAKERS = 3

/** Minimum odds variance (in probability points) to consider significant */
const VARIANCE_THRESHOLD = 0.02

/** Heavy favorite threshold (implied prob) */
const HEAVY_FAVORITE_THRESHOLD = 0.65

// ---------------------------------------------------------------------------
// Core detection (pure functions)
// ---------------------------------------------------------------------------

/**
 * Determine which side is likely the "public" side based on odds patterns.
 *
 * Public tends to bet:
 * - Favorites (especially heavy ones)
 * - Home teams in close matchups
 * - Popular large-market teams
 */
function estimatePublicSide(
  game: NormalizedGame
): { publicSide: 'home' | 'away'; confidence: number; factors: string[] } | null {
  const bookmakers = game.bookmakers
  if (bookmakers.length < MIN_BOOKMAKERS) return null

  const homeImplied: number[] = []
  const awayImplied: number[] = []

  for (const bk of bookmakers) {
    if (bk.moneyline?.home != null) homeImplied.push(americanToImplied(bk.moneyline.home))
    if (bk.moneyline?.away != null) awayImplied.push(americanToImplied(bk.moneyline.away))
  }

  if (homeImplied.length < MIN_BOOKMAKERS || awayImplied.length < MIN_BOOKMAKERS) return null

  const avgHomeProb = homeImplied.reduce((s, v) => s + v, 0) / homeImplied.length
  const avgAwayProb = awayImplied.reduce((s, v) => s + v, 0) / awayImplied.length

  const factors: string[] = []
  let homePublicScore = 0

  // Factor 1: Favorites attract public money
  if (avgHomeProb > avgAwayProb) {
    const diff = avgHomeProb - avgAwayProb
    homePublicScore += diff > 0.2 ? 3 : diff > 0.1 ? 2 : 1
    factors.push(`Home is ${(avgHomeProb * 100).toFixed(0)}% favorite — public leans favorites`)
  } else {
    const diff = avgAwayProb - avgHomeProb
    homePublicScore -= diff > 0.2 ? 3 : diff > 0.1 ? 2 : 1
    factors.push(`Away is ${(avgAwayProb * 100).toFixed(0)}% favorite — public leans favorites`)
  }

  // Factor 2: Home bias — public slightly prefers home teams in close games
  if (Math.abs(avgHomeProb - avgAwayProb) < 0.1) {
    homePublicScore += 1
    factors.push('Close matchup — mild home team public bias')
  }

  // Factor 3: Heavy favorites get disproportionate public action
  if (avgHomeProb > HEAVY_FAVORITE_THRESHOLD) {
    homePublicScore += 2
    factors.push('Heavy home favorite — strong public bias')
  } else if (avgAwayProb > HEAVY_FAVORITE_THRESHOLD) {
    homePublicScore -= 2
    factors.push('Heavy away favorite — strong public bias')
  }

  const publicSide: 'home' | 'away' = homePublicScore > 0 ? 'home' : 'away'
  const confidence = Math.min(90, 50 + Math.abs(homePublicScore) * 10)

  return { publicSide, confidence, factors }
}

/**
 * Detect if odds patterns suggest the line has been pressured against public direction.
 *
 * Without historical data, we infer from:
 * - Book-to-book variance on the expected sharp side being tighter (consensus)
 * - Outlier books on the public side (stale lines not yet adjusted)
 * - Sharp books offering better prices on the unpopular side
 */
function detectLineMovementAgainstPublic(
  bookmakers: NormalizedBookmakerOdds[],
  publicSide: 'home' | 'away'
): { detected: boolean; sharpEvidence: string[]; sharpSideVariance: number; publicSideVariance: number } {
  const sharpSide = publicSide === 'home' ? 'away' : 'home'

  const publicOdds: number[] = []
  const sharpOdds: number[] = []

  for (const bk of bookmakers) {
    const pub = publicSide === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    const shrp = sharpSide === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (pub != null) publicOdds.push(americanToImplied(pub))
    if (shrp != null) sharpOdds.push(americanToImplied(shrp))
  }

  if (publicOdds.length < MIN_BOOKMAKERS || sharpOdds.length < MIN_BOOKMAKERS) {
    return { detected: false, sharpEvidence: [], sharpSideVariance: 0, publicSideVariance: 0 }
  }

  const publicVariance = getVariance(publicOdds)
  const sharpVariance = getVariance(sharpOdds)

  const evidence: string[] = []

  // Signal 1: Sharp side has wider variance — some books adjusted, others haven't
  if (sharpVariance > publicVariance && sharpVariance > VARIANCE_THRESHOLD) {
    evidence.push(`Sharp side variance (${(sharpVariance * 100).toFixed(1)}%) > public side (${(publicVariance * 100).toFixed(1)}%) — books adjusting unevenly`)
  }

  // Signal 2: Public side variance is tight — no pressure from public
  if (publicVariance < VARIANCE_THRESHOLD && sharpVariance > VARIANCE_THRESHOLD) {
    evidence.push('Public side odds are tight — no heavy public action pushing the line')
  }

  // Signal 3: Look for outlier books on sharp side
  const sharpMean = sharpOdds.reduce((s, v) => s + v, 0) / sharpOdds.length
  const outliers = sharpOdds.filter((o) => Math.abs(o - sharpMean) > 0.03)
  if (outliers.length > 0) {
    evidence.push(`${outliers.length} book(s) have outlier odds on sharp side — line in motion`)
  }

  return {
    detected: evidence.length >= 1,
    sharpEvidence: evidence,
    sharpSideVariance: sharpVariance,
    publicSideVariance: publicVariance,
  }
}

function getVariance(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return Math.max(...values) - Math.min(...values)
}

/**
 * Find the best available odds on the sharp side.
 */
function getBestSharpOdds(
  bookmakers: NormalizedBookmakerOdds[],
  sharpSide: 'home' | 'away'
): { odds: number; bookmaker: string } | null {
  let best: number | null = null
  let bestBook = ''

  for (const bk of bookmakers) {
    const val = sharpSide === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (val == null) continue
    if (best === null || val > best) {
      best = val
      bestBook = bk.bookmaker
    }
  }

  return best !== null ? { odds: best, bookmaker: bestBook } : null
}

// ---------------------------------------------------------------------------
// Main scanner
// ---------------------------------------------------------------------------

/**
 * Scan all games for reverse line movement signals.
 */
export function scanForRLM(games: NormalizedGame[]): RLMScanResult {
  const alerts: RLMAlert[] = []

  for (const game of games) {
    if (game.bookmakers.length < MIN_BOOKMAKERS) continue

    const publicEstimate = estimatePublicSide(game)
    if (!publicEstimate) continue

    const sharpSide = publicEstimate.publicSide === 'home' ? 'away' : 'home'
    const rlm = detectLineMovementAgainstPublic(game.bookmakers, publicEstimate.publicSide)
    if (!rlm.detected) continue

    const bestSharp = getBestSharpOdds(game.bookmakers, sharpSide)
    const allFactors = [...publicEstimate.factors, ...rlm.sharpEvidence]

    // Determine strength
    const evidenceCount = rlm.sharpEvidence.length
    const strength: RLMStrength =
      evidenceCount >= 3 ? 'strong' : evidenceCount >= 2 ? 'moderate' : 'weak'

    const confidence = Math.min(
      95,
      publicEstimate.confidence + evidenceCount * 5
    )

    const sharpTeam = sharpSide === 'home' ? game.homeTeam : game.awayTeam
    const publicTeam = publicEstimate.publicSide === 'home' ? game.homeTeam : game.awayTeam

    alerts.push({
      game,
      sharpSide,
      sharpTeam,
      publicSide: publicEstimate.publicSide,
      publicTeam,
      strength,
      confidence,
      description: `RLM detected: Line moving toward ${sharpTeam} despite estimated public money on ${publicTeam}`,
      factors: allFactors,
      bestSharpOdds: bestSharp?.odds ?? null,
      bestSharpBook: bestSharp?.bookmaker ?? null,
    })
  }

  // Sort by strength then confidence
  const strengthOrder: Record<RLMStrength, number> = { strong: 3, moderate: 2, weak: 1 }
  alerts.sort((a, b) =>
    strengthOrder[b.strength] - strengthOrder[a.strength] || b.confidence - a.confidence
  )

  return {
    alerts,
    gamesScanned: games.length,
    strongCount: alerts.filter((a) => a.strength === 'strong').length,
    moderateCount: alerts.filter((a) => a.strength === 'moderate').length,
  }
}
