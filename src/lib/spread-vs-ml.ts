/**
 * Spread vs Moneyline Value Calculator
 *
 * Determines when it's more profitable to bet the spread vs moneyline
 * for the same side. Key insight: for moderate favorites (-3 to -7),
 * the ML often offers better value; for heavy favorites, the spread
 * offers better risk/reward. For underdogs, ML usually provides
 * more upside but less probability.
 *
 * For informational purposes only. Not financial advice.
 */

import { americanToDecimal, americanToImplied } from '@/lib/odds'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

export type Side = 'home' | 'away'

export interface SpreadVsMLComparison {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  bookmaker: string
  side: Side
  team: string
  /** The moneyline odds for this side */
  mlOdds: number
  /** Decimal payout for ML */
  mlDecimal: number
  /** Implied probability from ML */
  mlImplied: number
  /** The spread line for this side (e.g., -3.5 or +3.5) */
  spreadLine: number
  /** The spread odds (juice) */
  spreadOdds: number
  /** Decimal payout for spread */
  spreadDecimal: number
  /** Implied probability from spread */
  spreadImplied: number
  /** "ml" or "spread" — which market offers better expected value */
  recommendation: 'ml' | 'spread' | 'either'
  /** Why this recommendation was made */
  reason: string
  /** Expected value advantage of recommended market (percentage points) */
  edgePercent: number
  /** Break-even frequency needed for ML to be profitable */
  mlBreakEven: number
  /** Break-even frequency needed for spread to be profitable */
  spreadBreakEven: number
}

export interface SpreadVsMLResult {
  comparisons: SpreadVsMLComparison[]
  gamesAnalyzed: number
  /** Games where ML is better for at least one side */
  mlBetterCount: number
  /** Games where spread is better for at least one side */
  spreadBetterCount: number
}

/**
 * Compare spread vs ML value for a single side at a single bookmaker.
 */
export function compareSpreadVsML(
  game: NormalizedGame,
  bk: NormalizedBookmakerOdds,
  side: Side
): SpreadVsMLComparison | null {
  const ml = side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
  const spreadLine = side === 'home' ? bk.spread?.homeLine : bk.spread?.awayLine
  const spreadOdds = side === 'home' ? bk.spread?.homeOdds : bk.spread?.awayOdds

  if (ml == null || spreadLine == null || spreadOdds == null) return null

  const mlDecimal = americanToDecimal(ml)
  const spreadDecimal = americanToDecimal(spreadOdds)
  const mlImplied = americanToImplied(ml)
  const spreadImplied = americanToImplied(spreadOdds)

  const team = side === 'home' ? game.homeTeam : game.awayTeam

  // The key analysis: comparing the "coverage cost" of the spread
  // with the ML price premium/discount.
  //
  // For favorites (negative spread):
  //   ML costs more (higher implied prob) but wins outright
  //   Spread is cheaper but requires covering the number
  //
  // For underdogs (positive spread):
  //   ML is cheaper but requires outright win
  //   Spread is more expensive but gets the cushion

  const isFavorite = spreadLine < 0

  let recommendation: 'ml' | 'spread' | 'either'
  let reason: string
  let edgePercent: number

  // Calculate the "spread tax" — how much extra probability do you pay
  // for the spread vs ML, relative to the added coverage
  const probDifference = Math.abs(spreadImplied - mlImplied)

  if (isFavorite) {
    // Favorite side analysis
    const absSpresd = Math.abs(spreadLine)

    if (absSpresd <= 2.5 && mlDecimal > spreadDecimal * 0.85) {
      // Small favorite: ML and spread have similar payouts
      // ML is often better because you don't need to cover
      recommendation = 'ml'
      reason = `Small favorite (${spreadLine}): ML pays ${mlDecimal.toFixed(2)}x vs spread ${spreadDecimal.toFixed(2)}x — ML doesn't need to cover the number`
      edgePercent = (mlDecimal - spreadDecimal) / spreadDecimal * 100
    } else if (absSpresd >= 7) {
      // Big favorite: ML is very expensive (high implied prob)
      // Spread gives much better payout for similar probability
      recommendation = 'spread'
      reason = `Big favorite (${spreadLine}): ML implied ${(mlImplied * 100).toFixed(1)}% vs spread ${(spreadImplied * 100).toFixed(1)}% — spread pays significantly more`
      edgePercent = (spreadDecimal - mlDecimal) / mlDecimal * 100
    } else {
      // Mid-range favorite: depends on the specific numbers
      if (spreadDecimal > mlDecimal * 1.15) {
        recommendation = 'spread'
        reason = `Mid favorite (${spreadLine}): Spread pays ${((spreadDecimal / mlDecimal - 1) * 100).toFixed(0)}% more — worth covering the number`
        edgePercent = (spreadDecimal - mlDecimal) / mlDecimal * 100
      } else if (mlDecimal > spreadDecimal * 0.9) {
        recommendation = 'ml'
        reason = `Mid favorite (${spreadLine}): ML pays ${mlDecimal.toFixed(2)}x, close to spread ${spreadDecimal.toFixed(2)}x — prefer outright win`
        edgePercent = (mlDecimal - spreadDecimal) / spreadDecimal * 100
      } else {
        recommendation = 'either'
        reason = `Mid favorite (${spreadLine}): ML ${mlDecimal.toFixed(2)}x vs spread ${spreadDecimal.toFixed(2)}x — no clear edge either way`
        edgePercent = 0
      }
    }
  } else {
    // Underdog side analysis
    if (spreadLine <= 3 && spreadDecimal > 1.5) {
      // Small underdog: spread cushion is small, ML pays more
      recommendation = 'ml'
      reason = `Small underdog (+${spreadLine}): ML pays ${mlDecimal.toFixed(2)}x vs spread ${spreadDecimal.toFixed(2)}x — more upside for similar chance`
      edgePercent = (mlDecimal - spreadDecimal) / spreadDecimal * 100
    } else if (spreadLine >= 7) {
      // Big underdog: spread cushion is huge, much safer bet
      recommendation = 'spread'
      reason = `Big underdog (+${spreadLine}): Large spread cushion makes cover much more likely than outright win`
      edgePercent = (spreadImplied - mlImplied) / mlImplied * 100
    } else {
      // Mid-range underdog
      const payoutRatio = mlDecimal / spreadDecimal
      if (payoutRatio > 1.5) {
        recommendation = 'ml'
        reason = `Mid underdog (+${spreadLine}): ML pays ${payoutRatio.toFixed(1)}x the spread payout — strong upside`
        edgePercent = (payoutRatio - 1) * 100
      } else {
        recommendation = 'spread'
        reason = `Mid underdog (+${spreadLine}): Spread cushion worth the lower payout`
        edgePercent = probDifference * 100
      }
    }
  }

  return {
    gameId: game.id,
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    commenceTime: game.commenceTime,
    bookmaker: bk.bookmaker,
    side,
    team,
    mlOdds: ml,
    mlDecimal,
    mlImplied,
    spreadLine,
    spreadOdds,
    spreadDecimal,
    spreadImplied,
    recommendation,
    reason,
    edgePercent: Math.round(Math.abs(edgePercent) * 100) / 100,
    mlBreakEven: Math.round(mlImplied * 10000) / 100,
    spreadBreakEven: Math.round(spreadImplied * 10000) / 100,
  }
}

/**
 * Analyze spread vs ML across all bookmakers for a game.
 * Returns the best comparison per side (most edge).
 */
export function analyzeSpreadVsML(game: NormalizedGame): SpreadVsMLComparison[] {
  const comparisons: SpreadVsMLComparison[] = []

  for (const bk of game.bookmakers) {
    for (const side of ['home', 'away'] as Side[]) {
      const cmp = compareSpreadVsML(game, bk, side)
      if (cmp) comparisons.push(cmp)
    }
  }

  return comparisons
}

/**
 * Find the best spread vs ML comparison per side across all bookmakers.
 * Returns at most 2 entries (home side best, away side best).
 */
export function bestSpreadVsML(game: NormalizedGame): SpreadVsMLComparison[] {
  const all = analyzeSpreadVsML(game)
  const bestPerSide: Record<Side, SpreadVsMLComparison | null> = { home: null, away: null }

  for (const c of all) {
    const current = bestPerSide[c.side]
    if (!current || c.edgePercent > current.edgePercent) {
      bestPerSide[c.side] = c
    }
  }

  return [bestPerSide.home, bestPerSide.away].filter(Boolean) as SpreadVsMLComparison[]
}

/**
 * Analyze all games and return spread vs ML recommendations.
 */
export function analyzeAllSpreadVsML(games: NormalizedGame[]): SpreadVsMLResult {
  const comparisons: SpreadVsMLComparison[] = []
  let mlBetterCount = 0
  let spreadBetterCount = 0

  for (const game of games) {
    const best = bestSpreadVsML(game)
    comparisons.push(...best)
    if (best.some(c => c.recommendation === 'ml')) mlBetterCount++
    if (best.some(c => c.recommendation === 'spread')) spreadBetterCount++
  }

  return {
    comparisons: comparisons.sort((a, b) => b.edgePercent - a.edgePercent),
    gamesAnalyzed: games.length,
    mlBetterCount,
    spreadBetterCount,
  }
}
