/**
 * Fade the Public Tool
 *
 * Identifies contrarian betting opportunities where going against the
 * estimated public side may have value.
 *
 * Key principles:
 * 1. The public tends to bet favorites and overs
 * 2. When most books agree on a heavy favorite, the contrarian side can have value
 * 3. "Reverse line movement" (line moves opposite to public money) = sharp money indicator
 * 4. Fading the public is profitable long-term in specific situations
 *
 * Pure functions — no API calls. Uses cached odds data.
 */

import type { NormalizedGame } from '@/lib/sports/config'
import { americanToImplied } from '@/lib/odds'
import { analyzeConsensus, type ConsensusIndicator } from '@/lib/consensus'

export interface FadeOpportunity {
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: string
  /** The side the public is estimated to be on */
  publicSide: 'home' | 'away'
  /** The team name on the public side */
  publicTeam: string
  /** The fade (contrarian) side */
  fadeSide: 'home' | 'away'
  /** The team name to fade to */
  fadeTeam: string
  /** Fade strength: how strong is the contrarian case (0-100) */
  fadeStrength: number
  /** Reasons this is a good fade opportunity */
  reasons: string[]
  /** Best available odds for the fade side */
  bestFadeOdds: number | null
  /** Best bookmaker for the fade side */
  bestFadeBook: string | null
  /** Implied probability of the fade side winning (market average) */
  fadeImplied: number
  /** Consensus data backing this fade */
  consensus: ConsensusIndicator
}

export interface FadeAnalysis {
  opportunities: FadeOpportunity[]
  gamesAnalyzed: number
  publicBias: PublicBiasStats
}

export interface PublicBiasStats {
  /** How many games have a clear public side */
  gamesWithPublicSide: number
  /** How many of those are on the favorite */
  publicOnFavorite: number
  /** How many have sharp/public divergence */
  divergenceCount: number
}

/**
 * Analyze games and find fade-the-public opportunities.
 */
export function findFadeOpportunities(games: NormalizedGame[]): FadeAnalysis {
  const opportunities: FadeOpportunity[] = []
  let gamesWithPublicSide = 0
  let publicOnFavorite = 0
  let divergenceCount = 0

  for (const game of games) {
    const consensus = analyzeConsensus(game)
    if (!consensus) continue

    if (consensus.publicSide === 'split') continue
    gamesWithPublicSide++

    // Check if public is on the favorite (typical)
    const publicIsOnFavorite =
      (consensus.publicSide === 'home' && consensus.avgImplied.home > consensus.avgImplied.away) ||
      (consensus.publicSide === 'away' && consensus.avgImplied.away > consensus.avgImplied.home)
    if (publicIsOnFavorite) publicOnFavorite++

    if (consensus.divergence) divergenceCount++

    // Calculate fade strength
    const reasons: string[] = []
    let fadeStrength = 0

    const fadeSide = consensus.publicSide === 'home' ? 'away' : 'home'
    const fadeTeam = fadeSide === 'home' ? game.homeTeam : game.awayTeam
    const publicTeam = consensus.publicSide === 'home' ? game.homeTeam : game.awayTeam

    // Factor 1: Public is on a heavy favorite (bigger spread = more value fading)
    const impliedDiff = Math.abs(consensus.avgImplied.home - consensus.avgImplied.away)
    if (publicIsOnFavorite && impliedDiff > 0.1) {
      fadeStrength += 20
      reasons.push(`${publicTeam} is a heavy favorite (${Math.max(consensus.avgImplied.home, consensus.avgImplied.away).toFixed(1)}% implied) — public loves favorites`)
    } else if (publicIsOnFavorite) {
      fadeStrength += 10
      reasons.push(`${publicTeam} is the favorite — typical public side`)
    }

    // Factor 2: Sharp/public divergence (strongest signal)
    if (consensus.divergence && consensus.sharpSide === fadeSide) {
      fadeStrength += 30
      reasons.push(`Sharp money indicator on ${fadeTeam} — books moving opposite to public`)
    } else if (consensus.divergence) {
      fadeStrength += 15
      reasons.push('Sharp/public divergence detected — potential value on contrarian side')
    }

    // Factor 3: Book disagreement on the fade side (information asymmetry)
    const fadeStdDev = fadeSide === 'home' ? consensus.impliedStdDev.home : consensus.impliedStdDev.away
    if (fadeStdDev > 2.0) {
      fadeStrength += 15
      reasons.push(`High book disagreement on ${fadeTeam} (${fadeStdDev.toFixed(1)}pp std dev) — some books see value`)
    }

    // Factor 4: Underdog value (public underrates underdogs)
    const fadeImplied = fadeSide === 'home' ? consensus.avgImplied.home : consensus.avgImplied.away
    if (fadeImplied < 40) {
      fadeStrength += 10
      reasons.push(`${fadeTeam} is a significant underdog (${fadeImplied.toFixed(1)}% implied) — public consistently undervalues underdogs`)
    }

    // Factor 5: Overall consensus confidence
    if (consensus.confidence >= 60) {
      fadeStrength += 10
      reasons.push('High confidence in public-side estimate')
    }

    // Only include meaningful fades
    if (fadeStrength < 25) continue

    // Find best fade odds
    let bestFadeOdds: number | null = null
    let bestFadeBook: string | null = null

    for (const bk of game.bookmakers) {
      const odds = fadeSide === 'home' ? bk.moneyline?.home : bk.moneyline?.away
      if (odds != null) {
        if (bestFadeOdds === null || odds > bestFadeOdds) {
          bestFadeOdds = odds
          bestFadeBook = bk.bookmaker
        }
      }
    }

    opportunities.push({
      gameId: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      sport: game.sport,
      publicSide: consensus.publicSide,
      publicTeam,
      fadeSide,
      fadeTeam,
      fadeStrength: Math.min(fadeStrength, 100),
      reasons,
      bestFadeOdds,
      bestFadeBook,
      fadeImplied,
      consensus,
    })
  }

  // Sort by fade strength (best opportunities first)
  opportunities.sort((a, b) => b.fadeStrength - a.fadeStrength)

  return {
    opportunities,
    gamesAnalyzed: games.length,
    publicBias: {
      gamesWithPublicSide,
      publicOnFavorite,
      divergenceCount,
    },
  }
}

/**
 * Format odds for display, handling positive/negative.
 */
export function formatFadeOdds(odds: number | null): string {
  if (odds === null) return 'N/A'
  return odds > 0 ? `+${odds}` : `${odds}`
}
