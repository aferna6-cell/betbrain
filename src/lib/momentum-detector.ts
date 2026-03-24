/**
 * Momentum Detector
 *
 * Identifies teams on significant winning or losing streaks and quantifies
 * how odds have shifted to reflect that momentum. Helps identify situations
 * where public overreaction to streaks may create value on the other side.
 *
 * For informational purposes only. Not financial advice.
 */

import { americanToImplied } from '@/lib/odds'
import type { NormalizedGame } from '@/lib/sports/config'

export interface TeamMomentum {
  team: string
  sport: string
  /** Recent results (W/L), most recent first */
  recentResults: ('W' | 'L')[]
  /** Current streak (positive = winning, negative = losing) */
  streak: number
  /** Overall win rate from recent results */
  winRate: number
  /** Momentum score (-100 to +100). Positive = hot, negative = cold */
  momentumScore: number
  /** Classification */
  momentum: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold'
  /** Upcoming game info */
  nextGame?: {
    gameId: string
    opponent: string
    commenceTime: string
    isHome: boolean
    impliedWinProb: number | null
    /** Whether they're favored */
    isFavored: boolean | null
  }
}

export interface MomentumResult {
  teams: TeamMomentum[]
  hotTeams: TeamMomentum[]
  coldTeams: TeamMomentum[]
}

/**
 * Detect current streak from results (most recent first).
 */
export function detectStreak(results: ('W' | 'L')[]): number {
  if (results.length === 0) return 0
  const first = results[0]
  let count = 0
  for (const r of results) {
    if (r === first) count++
    else break
  }
  return first === 'W' ? count : -count
}

/**
 * Calculate momentum score from recent results.
 * Weights more recent games more heavily.
 */
export function calculateMomentumScore(results: ('W' | 'L')[]): number {
  if (results.length === 0) return 0

  // Weight recent games more (geometric decay)
  let score = 0
  let totalWeight = 0
  for (let i = 0; i < results.length; i++) {
    const weight = Math.pow(0.8, i) // Most recent = 1.0, then 0.8, 0.64, etc.
    score += results[i] === 'W' ? weight : -weight
    totalWeight += weight
  }

  // Normalize to -100 to +100
  return Math.round((score / totalWeight) * 100)
}

/**
 * Classify momentum from score.
 */
export function classifyMomentum(score: number): TeamMomentum['momentum'] {
  if (score >= 60) return 'hot'
  if (score >= 20) return 'warm'
  if (score > -20) return 'neutral'
  if (score > -60) return 'cool'
  return 'cold'
}

/**
 * Build team momentum profiles from pick history and upcoming games.
 *
 * @param recentResultsByTeam Map of team name → recent results (most recent first)
 * @param upcomingGames Upcoming games with odds
 */
export function detectMomentum(
  recentResultsByTeam: Map<string, { sport: string; results: ('W' | 'L')[] }>,
  upcomingGames: NormalizedGame[]
): MomentumResult {
  const teams: TeamMomentum[] = []

  // Build game lookup by team
  const gameByTeam = new Map<string, { game: NormalizedGame; isHome: boolean }>()
  for (const game of upcomingGames) {
    gameByTeam.set(game.homeTeam, { game, isHome: true })
    gameByTeam.set(game.awayTeam, { game, isHome: false })
  }

  for (const [team, data] of recentResultsByTeam) {
    if (data.results.length < 3) continue // need at least 3 games

    const streak = detectStreak(data.results)
    const winRate = data.results.filter(r => r === 'W').length / data.results.length
    const momentumScore = calculateMomentumScore(data.results)
    const momentum = classifyMomentum(momentumScore)

    const nextGameInfo = gameByTeam.get(team)
    let nextGame: TeamMomentum['nextGame'] = undefined

    if (nextGameInfo) {
      const { game, isHome } = nextGameInfo
      const opponent = isHome ? game.awayTeam : game.homeTeam

      // Get implied win probability from consensus ML
      let impliedWinProb: number | null = null
      let isFavored: boolean | null = null

      const mlOdds: number[] = []
      for (const bk of game.bookmakers) {
        const odds = isHome ? bk.moneyline?.home : bk.moneyline?.away
        if (odds != null) mlOdds.push(odds)
      }

      if (mlOdds.length > 0) {
        const avgImplied = mlOdds.reduce((s, o) => s + americanToImplied(o), 0) / mlOdds.length
        impliedWinProb = Math.round(avgImplied * 100) / 100
        isFavored = avgImplied > 0.5
      }

      nextGame = {
        gameId: game.id,
        opponent,
        commenceTime: game.commenceTime,
        isHome,
        impliedWinProb,
        isFavored,
      }
    }

    teams.push({
      team,
      sport: data.sport,
      recentResults: data.results,
      streak,
      winRate: Math.round(winRate * 100) / 100,
      momentumScore,
      momentum,
      nextGame,
    })
  }

  // Sort by absolute momentum score
  teams.sort((a, b) => Math.abs(b.momentumScore) - Math.abs(a.momentumScore))

  return {
    teams,
    hotTeams: teams.filter(t => t.momentum === 'hot' || t.momentum === 'warm'),
    coldTeams: teams.filter(t => t.momentum === 'cold' || t.momentum === 'cool'),
  }
}

/**
 * Identify potential "fade the streak" opportunities.
 * When a team is extremely hot/cold and odds haven't fully adjusted,
 * there may be value going against the public reaction.
 */
export function findStreakFadeOpportunities(momentum: MomentumResult): TeamMomentum[] {
  return momentum.teams.filter(t => {
    if (!t.nextGame) return false
    const absStreak = Math.abs(t.streak)
    if (absStreak < 3) return false

    // Hot team that's underdog = public hasn't priced in the streak
    // Cold team that's favored = public hasn't sold off enough
    if (t.momentum === 'hot' && t.nextGame.isFavored === false) return true
    if (t.momentum === 'cold' && t.nextGame.isFavored === true) return true

    return false
  })
}
