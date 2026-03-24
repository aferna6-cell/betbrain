/**
 * Consensus Line Tracker
 *
 * Tracks the market consensus line (median of bookmaker offerings) and
 * computes how far each bookmaker deviates. Useful for identifying
 * which books are ahead/behind the market and finding stale lines.
 *
 * For informational purposes only. Not financial advice.
 */

import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

export interface ConsensusLine {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  markets: {
    moneyline?: {
      consensusHome: number
      consensusAway: number
      /** Books deviating from consensus by more than threshold */
      deviations: Array<{
        bookmaker: string
        homeOdds: number
        awayOdds: number
        homeDeviation: number
        awayDeviation: number
        /** Direction: 'above' (better for bettor) or 'below' */
        direction: 'above' | 'below'
      }>
    }
    spread?: {
      consensusLine: number
      consensusHomeOdds: number
      consensusAwayOdds: number
      deviations: Array<{
        bookmaker: string
        line: number
        homeOdds: number
        awayOdds: number
        lineDeviation: number
        direction: 'above' | 'below'
      }>
    }
    total?: {
      consensusLine: number
      consensusOverOdds: number
      consensusUnderOdds: number
      deviations: Array<{
        bookmaker: string
        line: number
        overOdds: number
        underOdds: number
        lineDeviation: number
        direction: 'above' | 'below'
      }>
    }
  }
  /** Total number of deviating bookmakers across all markets */
  totalDeviations: number
}

export interface ConsensusTrackerResult {
  games: ConsensusLine[]
  totalGames: number
  gamesWithDeviations: number
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

const ODDS_DEVIATION_THRESHOLD = 8 // Points difference in American odds
const LINE_DEVIATION_THRESHOLD = 0.5 // Half point for spread/total lines

/**
 * Analyze consensus for a single game across all bookmakers.
 */
export function analyzeGameConsensus(game: NormalizedGame): ConsensusLine {
  const result: ConsensusLine = {
    gameId: game.id,
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    commenceTime: game.commenceTime,
    markets: {},
    totalDeviations: 0,
  }

  // Moneyline consensus
  const homeMLs: number[] = []
  const awayMLs: number[] = []
  for (const bk of game.bookmakers) {
    if (bk.moneyline?.home != null) homeMLs.push(bk.moneyline.home)
    if (bk.moneyline?.away != null) awayMLs.push(bk.moneyline.away)
  }

  if (homeMLs.length >= 2 && awayMLs.length >= 2) {
    const consensusHome = median(homeMLs)
    const consensusAway = median(awayMLs)
    const deviations: ConsensusLine['markets']['moneyline'] extends undefined ? never : NonNullable<ConsensusLine['markets']['moneyline']>['deviations'] = []

    for (const bk of game.bookmakers) {
      if (bk.moneyline?.home == null || bk.moneyline?.away == null) continue
      const homeDev = bk.moneyline.home - consensusHome
      const awayDev = bk.moneyline.away - consensusAway
      const maxDev = Math.max(Math.abs(homeDev), Math.abs(awayDev))

      if (maxDev >= ODDS_DEVIATION_THRESHOLD) {
        deviations.push({
          bookmaker: bk.bookmaker,
          homeOdds: bk.moneyline.home,
          awayOdds: bk.moneyline.away,
          homeDeviation: Math.round(homeDev),
          awayDeviation: Math.round(awayDev),
          direction: homeDev > 0 || awayDev > 0 ? 'above' : 'below',
        })
      }
    }

    result.markets.moneyline = {
      consensusHome: Math.round(consensusHome),
      consensusAway: Math.round(consensusAway),
      deviations,
    }
    result.totalDeviations += deviations.length
  }

  // Spread consensus
  const spreadLines: number[] = []
  const spreadHomeOdds: number[] = []
  const spreadAwayOdds: number[] = []
  for (const bk of game.bookmakers) {
    if (bk.spread?.homeLine != null) spreadLines.push(bk.spread.homeLine)
    if (bk.spread?.homeOdds != null) spreadHomeOdds.push(bk.spread.homeOdds)
    if (bk.spread?.awayOdds != null) spreadAwayOdds.push(bk.spread.awayOdds)
  }

  if (spreadLines.length >= 2) {
    const consensusLine = median(spreadLines)
    const consensusHomeOdds = median(spreadHomeOdds)
    const consensusAwayOdds = median(spreadAwayOdds)
    const deviations: NonNullable<ConsensusLine['markets']['spread']>['deviations'] = []

    for (const bk of game.bookmakers) {
      if (bk.spread?.homeLine == null) continue
      const lineDev = bk.spread.homeLine - consensusLine

      if (Math.abs(lineDev) >= LINE_DEVIATION_THRESHOLD) {
        deviations.push({
          bookmaker: bk.bookmaker,
          line: bk.spread.homeLine,
          homeOdds: bk.spread.homeOdds ?? 0,
          awayOdds: bk.spread.awayOdds ?? 0,
          lineDeviation: Math.round(lineDev * 10) / 10,
          direction: lineDev > 0 ? 'above' : 'below',
        })
      }
    }

    result.markets.spread = {
      consensusLine,
      consensusHomeOdds: Math.round(consensusHomeOdds),
      consensusAwayOdds: Math.round(consensusAwayOdds),
      deviations,
    }
    result.totalDeviations += deviations.length
  }

  // Total consensus
  const totalLines: number[] = []
  const overOdds: number[] = []
  const underOdds: number[] = []
  for (const bk of game.bookmakers) {
    if (bk.total?.line != null) totalLines.push(bk.total.line)
    if (bk.total?.overOdds != null) overOdds.push(bk.total.overOdds)
    if (bk.total?.underOdds != null) underOdds.push(bk.total.underOdds)
  }

  if (totalLines.length >= 2) {
    const consensusLine = median(totalLines)
    const consensusOver = median(overOdds)
    const consensusUnder = median(underOdds)
    const deviations: NonNullable<ConsensusLine['markets']['total']>['deviations'] = []

    for (const bk of game.bookmakers) {
      if (bk.total?.line == null) continue
      const lineDev = bk.total.line - consensusLine

      if (Math.abs(lineDev) >= LINE_DEVIATION_THRESHOLD) {
        deviations.push({
          bookmaker: bk.bookmaker,
          line: bk.total.line,
          overOdds: bk.total.overOdds ?? 0,
          underOdds: bk.total.underOdds ?? 0,
          lineDeviation: Math.round(lineDev * 10) / 10,
          direction: lineDev > 0 ? 'above' : 'below',
        })
      }
    }

    result.markets.total = {
      consensusLine,
      consensusOverOdds: Math.round(consensusOver),
      consensusUnderOdds: Math.round(consensusUnder),
      deviations,
    }
    result.totalDeviations += deviations.length
  }

  return result
}

/**
 * Track consensus across all games.
 */
export function trackConsensus(games: NormalizedGame[]): ConsensusTrackerResult {
  const results = games.map(g => analyzeGameConsensus(g))

  return {
    games: results.sort((a, b) => b.totalDeviations - a.totalDeviations),
    totalGames: games.length,
    gamesWithDeviations: results.filter(g => g.totalDeviations > 0).length,
  }
}
