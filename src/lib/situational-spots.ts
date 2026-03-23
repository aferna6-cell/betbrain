/**
 * Situational Spots Detector
 *
 * Identifies situational angles that historically affect game outcomes:
 * - Back-to-back games (NBA, NHL)
 * - Rest advantage / disadvantage
 * - Travel considerations (cross-country, different time zones)
 * - Schedule spots (3-in-4 nights, long road trips)
 *
 * These are well-documented edges in sports betting that the market
 * often under-prices.
 *
 * Pure functions — works with game schedule data.
 */

export interface ScheduleGame {
  gameId: string
  homeTeam: string
  awayTeam: string
  date: string // ISO date
  sport: string
}

export interface SituationalSpot {
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: string
  date: string
  /** Which team has the situational edge */
  edgeSide: 'home' | 'away' | 'neutral'
  /** The team with the edge */
  edgeTeam: string | null
  /** Spot type */
  spotType: SpotType
  /** Human-readable description */
  description: string
  /** Impact rating (1-5, 5 = most impactful) */
  impact: number
  /** Historical ATS trend direction for this situation */
  historicalEdge: string
}

export type SpotType =
  | 'back_to_back'
  | 'rest_advantage'
  | 'three_in_four'
  | 'long_road_trip'
  | 'home_stand'
  | 'travel_fatigue'
  | 'schedule_loss'

export interface SituationalAnalysis {
  spots: SituationalSpot[]
  gamesAnalyzed: number
  spotsFound: number
}

/**
 * Days between two date strings.
 */
function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1)
  const date2 = new Date(d2)
  return Math.abs(Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)))
}

/**
 * Get a team's recent schedule (games before the target date).
 */
function getTeamRecentGames(
  team: string,
  targetDate: string,
  allGames: ScheduleGame[],
  lookbackDays: number = 7
): ScheduleGame[] {
  const target = new Date(targetDate)
  return allGames
    .filter((g) => {
      const gameDate = new Date(g.date)
      if (gameDate >= target) return false
      const diff = daysBetween(g.date, targetDate)
      if (diff > lookbackDays) return false
      return g.homeTeam === team || g.awayTeam === team
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Check if a team is playing on back-to-back nights.
 */
function isBackToBack(
  team: string,
  gameDate: string,
  allGames: ScheduleGame[]
): boolean {
  const recent = getTeamRecentGames(team, gameDate, allGames, 2)
  if (recent.length === 0) return false
  const lastGame = recent[0]
  return daysBetween(lastGame.date, gameDate) <= 1
}

/**
 * Count games in the last N days for a team.
 */
function gamesInLastNDays(
  team: string,
  gameDate: string,
  allGames: ScheduleGame[],
  days: number
): number {
  return getTeamRecentGames(team, gameDate, allGames, days).length
}

/**
 * Check if team is away from home for multiple consecutive games.
 */
function consecutiveAwayGames(
  team: string,
  gameDate: string,
  allGames: ScheduleGame[]
): number {
  const recent = getTeamRecentGames(team, gameDate, allGames, 14)
  let count = 0
  for (const g of recent) {
    if (g.awayTeam === team) {
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * Check if team has been home for multiple consecutive games.
 */
function consecutiveHomeGames(
  team: string,
  gameDate: string,
  allGames: ScheduleGame[]
): number {
  const recent = getTeamRecentGames(team, gameDate, allGames, 14)
  let count = 0
  for (const g of recent) {
    if (g.homeTeam === team) {
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * Get days of rest for a team before a game.
 */
function getDaysOfRest(
  team: string,
  gameDate: string,
  allGames: ScheduleGame[]
): number | null {
  const recent = getTeamRecentGames(team, gameDate, allGames, 10)
  if (recent.length === 0) return null
  return daysBetween(recent[0].date, gameDate)
}

/**
 * Analyze a set of games for situational spots.
 *
 * Requires a broader schedule context (allGames) to detect
 * back-to-backs, rest advantages, etc.
 */
export function detectSituationalSpots(
  targetGames: ScheduleGame[],
  allGames: ScheduleGame[]
): SituationalAnalysis {
  const spots: SituationalSpot[] = []

  for (const game of targetGames) {
    // Only NBA and NHL have meaningful back-to-back effects
    const supportsB2B = game.sport === 'nba' || game.sport === 'nhl'

    // Check back-to-back for each team
    if (supportsB2B) {
      const homeB2B = isBackToBack(game.homeTeam, game.date, allGames)
      const awayB2B = isBackToBack(game.awayTeam, game.date, allGames)

      if (homeB2B && !awayB2B) {
        spots.push({
          gameId: game.gameId,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          sport: game.sport,
          date: game.date,
          edgeSide: 'away',
          edgeTeam: game.awayTeam,
          spotType: 'back_to_back',
          description: `${game.homeTeam} on back-to-back — fatigue factor favors ${game.awayTeam}`,
          impact: 3,
          historicalEdge: 'Teams on B2B lose at higher rate, especially on the road',
        })
      } else if (awayB2B && !homeB2B) {
        spots.push({
          gameId: game.gameId,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          sport: game.sport,
          date: game.date,
          edgeSide: 'home',
          edgeTeam: game.homeTeam,
          spotType: 'back_to_back',
          description: `${game.awayTeam} on back-to-back away — significant fatigue disadvantage`,
          impact: 4,
          historicalEdge: 'Away teams on B2B cover the spread only ~44% of the time',
        })
      } else if (homeB2B && awayB2B) {
        spots.push({
          gameId: game.gameId,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          sport: game.sport,
          date: game.date,
          edgeSide: 'home',
          edgeTeam: game.homeTeam,
          spotType: 'back_to_back',
          description: 'Both teams on back-to-back — slight edge to home team (no travel)',
          impact: 2,
          historicalEdge: 'When both on B2B, home team has slight rest advantage',
        })
      }
    }

    // Rest advantage
    const homeRest = getDaysOfRest(game.homeTeam, game.date, allGames)
    const awayRest = getDaysOfRest(game.awayTeam, game.date, allGames)

    if (homeRest !== null && awayRest !== null) {
      const restDiff = homeRest - awayRest
      if (restDiff >= 3) {
        spots.push({
          gameId: game.gameId,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          sport: game.sport,
          date: game.date,
          edgeSide: 'home',
          edgeTeam: game.homeTeam,
          spotType: 'rest_advantage',
          description: `${game.homeTeam} has ${homeRest} days rest vs ${game.awayTeam}'s ${awayRest} days — significant rest edge`,
          impact: 3,
          historicalEdge: 'Teams with 3+ days more rest cover at ~55% historically',
        })
      } else if (restDiff <= -3) {
        spots.push({
          gameId: game.gameId,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          sport: game.sport,
          date: game.date,
          edgeSide: 'away',
          edgeTeam: game.awayTeam,
          spotType: 'rest_advantage',
          description: `${game.awayTeam} has ${awayRest} days rest vs ${game.homeTeam}'s ${homeRest} days — rest edge offsets road disadvantage`,
          impact: 3,
          historicalEdge: 'Well-rested road teams upset more frequently',
        })
      }
    }

    // 3-in-4 nights (NBA/NHL)
    if (supportsB2B) {
      const homeGamesIn4 = gamesInLastNDays(game.homeTeam, game.date, allGames, 4)
      const awayGamesIn4 = gamesInLastNDays(game.awayTeam, game.date, allGames, 4)

      if (homeGamesIn4 >= 3 && awayGamesIn4 < 3) {
        spots.push({
          gameId: game.gameId,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          sport: game.sport,
          date: game.date,
          edgeSide: 'away',
          edgeTeam: game.awayTeam,
          spotType: 'three_in_four',
          description: `${game.homeTeam} playing 3rd game in 4 nights — heavy fatigue`,
          impact: 4,
          historicalEdge: 'Teams in 3-in-4 situations show measurable performance decline',
        })
      } else if (awayGamesIn4 >= 3 && homeGamesIn4 < 3) {
        spots.push({
          gameId: game.gameId,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          sport: game.sport,
          date: game.date,
          edgeSide: 'home',
          edgeTeam: game.homeTeam,
          spotType: 'three_in_four',
          description: `${game.awayTeam} playing 3rd game in 4 nights on the road — major fatigue`,
          impact: 5,
          historicalEdge: 'Road teams in 3-in-4 are among the worst ATS performers',
        })
      }
    }

    // Long road trip (4+ consecutive away games)
    const awayConsecutive = consecutiveAwayGames(game.awayTeam, game.date, allGames)
    if (awayConsecutive >= 4) {
      spots.push({
        gameId: game.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        sport: game.sport,
        date: game.date,
        edgeSide: 'home',
        edgeTeam: game.homeTeam,
        spotType: 'long_road_trip',
        description: `${game.awayTeam} on game ${awayConsecutive + 1} of road trip — travel wear`,
        impact: 3,
        historicalEdge: 'Teams on 5+ game road trips show declining performance each game',
      })
    }

    // Home stand advantage (4+ consecutive home games)
    const homeConsecutive = consecutiveHomeGames(game.homeTeam, game.date, allGames)
    if (homeConsecutive >= 4) {
      spots.push({
        gameId: game.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        sport: game.sport,
        date: game.date,
        edgeSide: 'home',
        edgeTeam: game.homeTeam,
        spotType: 'home_stand',
        description: `${game.homeTeam} on extended home stand (game ${homeConsecutive + 1}) — comfort edge`,
        impact: 2,
        historicalEdge: 'Extended home stands provide rhythm and comfort advantages',
      })
    }

    // Schedule loss spot: coming off a big game / emotional letdown
    // (Approximated by rest days — teams playing very frequently are in schedule-loss territory)
    if (supportsB2B && homeRest !== null && homeRest === 0) {
      // Same day double is extremely rare but flag it
      spots.push({
        gameId: game.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        sport: game.sport,
        date: game.date,
        edgeSide: 'away',
        edgeTeam: game.awayTeam,
        spotType: 'schedule_loss',
        description: `${game.homeTeam} has zero rest — potential schedule loss spot`,
        impact: 5,
        historicalEdge: 'Zero-rest situations are the strongest fatigue indicator',
      })
    }
  }

  // Sort by impact (highest first), then by sport
  spots.sort((a, b) => b.impact - a.impact || a.sport.localeCompare(b.sport))

  return {
    spots,
    gamesAnalyzed: targetGames.length,
    spotsFound: spots.length,
  }
}
