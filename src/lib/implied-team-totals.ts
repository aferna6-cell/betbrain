/**
 * Implied Team Totals
 *
 * Derives expected points per team from the game total and point spread.
 * Formula: homeTotal = (total + spread) / 2, awayTotal = (total - spread) / 2
 * (where spread is home team's spread, negative means home is favored)
 *
 * This is a fundamental sports analytics calculation that helps assess
 * scoring environment expectations per team.
 *
 * For informational purposes only. Not financial advice.
 */

import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

export interface TeamTotal {
  team: string
  impliedTotal: number
  /** Which bookmaker's line this was derived from */
  bookmaker: string
}

export interface ImpliedTeamTotalResult {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  /** Game total (over/under line) used */
  gameTotal: number
  /** Home spread used */
  homeSpread: number
  /** Home team implied total */
  homeImplied: number
  /** Away team implied total */
  awayImplied: number
  /** Consensus across all bookmakers */
  consensus: {
    avgHomeTotal: number
    avgAwayTotal: number
    avgGameTotal: number
    avgSpread: number
    bookCount: number
  }
  /** Per-bookmaker breakdown */
  byBookmaker: Array<{
    bookmaker: string
    gameTotal: number
    homeSpread: number
    homeImplied: number
    awayImplied: number
  }>
  /** Highest projected team total across all bookmakers */
  highestTeamTotal: TeamTotal
  /** Lowest projected team total across all bookmakers */
  lowestTeamTotal: TeamTotal
  /** Spread between max and min implied totals (indicates disagreement) */
  maxDisagreement: number
}

/**
 * Calculate implied team totals from spread and total for a single bookmaker.
 * Returns null if either spread or total is missing.
 */
export function calcImpliedTeamTotals(
  homeSpread: number,
  gameTotal: number
): { home: number; away: number } {
  // homeTotal = (total - spread) / 2
  // awayTotal = (total + spread) / 2
  // Note: if home spread is -3.5, home is favored → home expected to score MORE
  // home = (total + abs(spread)) / 2 = (total - spread) / 2 when spread is negative
  const home = (gameTotal - homeSpread) / 2
  const away = (gameTotal + homeSpread) / 2
  return { home: Math.round(home * 100) / 100, away: Math.round(away * 100) / 100 }
}

/**
 * Analyze implied team totals across all bookmakers for a game.
 */
export function analyzeImpliedTeamTotals(game: NormalizedGame): ImpliedTeamTotalResult | null {
  const byBookmaker: ImpliedTeamTotalResult['byBookmaker'] = []

  for (const bk of game.bookmakers) {
    if (bk.spread?.homeLine == null || bk.total?.line == null) continue
    const { home, away } = calcImpliedTeamTotals(bk.spread.homeLine, bk.total.line)
    byBookmaker.push({
      bookmaker: bk.bookmaker,
      gameTotal: bk.total.line,
      homeSpread: bk.spread.homeLine,
      homeImplied: home,
      awayImplied: away,
    })
  }

  if (byBookmaker.length === 0) return null

  // Consensus averages
  const avgHomeTotal = byBookmaker.reduce((s, b) => s + b.homeImplied, 0) / byBookmaker.length
  const avgAwayTotal = byBookmaker.reduce((s, b) => s + b.awayImplied, 0) / byBookmaker.length
  const avgGameTotal = byBookmaker.reduce((s, b) => s + b.gameTotal, 0) / byBookmaker.length
  const avgSpread = byBookmaker.reduce((s, b) => s + b.homeSpread, 0) / byBookmaker.length

  // Find extremes
  let highestTeamTotal: TeamTotal = { team: game.homeTeam, impliedTotal: -Infinity, bookmaker: '' }
  let lowestTeamTotal: TeamTotal = { team: game.homeTeam, impliedTotal: Infinity, bookmaker: '' }

  for (const b of byBookmaker) {
    if (b.homeImplied > highestTeamTotal.impliedTotal) {
      highestTeamTotal = { team: game.homeTeam, impliedTotal: b.homeImplied, bookmaker: b.bookmaker }
    }
    if (b.awayImplied > highestTeamTotal.impliedTotal) {
      highestTeamTotal = { team: game.awayTeam, impliedTotal: b.awayImplied, bookmaker: b.bookmaker }
    }
    if (b.homeImplied < lowestTeamTotal.impliedTotal) {
      lowestTeamTotal = { team: game.homeTeam, impliedTotal: b.homeImplied, bookmaker: b.bookmaker }
    }
    if (b.awayImplied < lowestTeamTotal.impliedTotal) {
      lowestTeamTotal = { team: game.awayTeam, impliedTotal: b.awayImplied, bookmaker: b.bookmaker }
    }
  }

  const allTotals = byBookmaker.flatMap(b => [b.homeImplied, b.awayImplied])
  const maxDisagreement = Math.max(...allTotals) - Math.min(...allTotals)

  return {
    gameId: game.id,
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    commenceTime: game.commenceTime,
    gameTotal: byBookmaker[0].gameTotal,
    homeSpread: byBookmaker[0].homeSpread,
    homeImplied: byBookmaker[0].homeImplied,
    awayImplied: byBookmaker[0].awayImplied,
    consensus: {
      avgHomeTotal: Math.round(avgHomeTotal * 100) / 100,
      avgAwayTotal: Math.round(avgAwayTotal * 100) / 100,
      avgGameTotal: Math.round(avgGameTotal * 100) / 100,
      avgSpread: Math.round(avgSpread * 100) / 100,
      bookCount: byBookmaker.length,
    },
    byBookmaker,
    highestTeamTotal,
    lowestTeamTotal,
    maxDisagreement: Math.round(maxDisagreement * 100) / 100,
  }
}

/**
 * Analyze implied team totals for all games.
 * Returns games sorted by highest team total (most offense expected).
 */
export function analyzeAllImpliedTotals(games: NormalizedGame[]): ImpliedTeamTotalResult[] {
  const results: ImpliedTeamTotalResult[] = []
  for (const game of games) {
    const result = analyzeImpliedTeamTotals(game)
    if (result) results.push(result)
  }
  return results.sort((a, b) => {
    const aMax = Math.max(a.consensus.avgHomeTotal, a.consensus.avgAwayTotal)
    const bMax = Math.max(b.consensus.avgHomeTotal, b.consensus.avgAwayTotal)
    return bMax - aMax
  })
}

/**
 * Sport-specific context for implied team totals.
 * Provides benchmark data for what constitutes high/low scoring.
 */
export const SCORING_BENCHMARKS: Record<string, { avgTotal: number; highScoring: number; lowScoring: number; unit: string }> = {
  nba: { avgTotal: 224, highScoring: 235, lowScoring: 210, unit: 'points' },
  nfl: { avgTotal: 44, highScoring: 50, lowScoring: 38, unit: 'points' },
  mlb: { avgTotal: 8.5, highScoring: 10, lowScoring: 7, unit: 'runs' },
  nhl: { avgTotal: 6, highScoring: 6.5, lowScoring: 5.5, unit: 'goals' },
}

/**
 * Classify scoring environment based on sport benchmarks.
 */
export function classifyScoringEnvironment(
  sport: string,
  gameTotal: number
): 'high' | 'average' | 'low' {
  const benchmark = SCORING_BENCHMARKS[sport]
  if (!benchmark) return 'average'
  if (gameTotal >= benchmark.highScoring) return 'high'
  if (gameTotal <= benchmark.lowScoring) return 'low'
  return 'average'
}
