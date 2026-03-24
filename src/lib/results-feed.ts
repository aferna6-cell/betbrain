/**
 * Results Feed — Recent game results with pick outcome matching.
 *
 * Aggregates resolved picks into a timeline feed showing
 * game results as they come in, with your pick outcomes.
 *
 * Pure functions — no side effects, no API calls.
 */

export type ResultStatus = 'win' | 'loss' | 'push' | 'no-pick'

export interface GameResult {
  id: string
  externalGameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  gameDate: string
  /** Final score if available */
  homeScore: number | null
  awayScore: number | null
  /** User's pick on this game, if any */
  pick: PickResult | null
  /** Timestamp for sorting */
  resolvedAt: string
}

export interface PickResult {
  pickId: string
  pickType: string
  pickTeam: string | null
  pickLine: number | null
  odds: number
  units: number
  outcome: ResultStatus
  profit: number
}

export interface ResultsFeedData {
  results: GameResult[]
  /** Today's running P/L */
  todayPnL: number
  /** Today's record */
  todayWins: number
  todayLosses: number
  todayPushes: number
  /** Games with picks that are still pending */
  pendingCount: number
}

interface PickForFeed {
  id: string
  external_game_id: string
  sport: string
  pick_type: string
  pick_team: string | null
  pick_line: number | null
  odds: number
  units: number
  outcome: string | null
  profit: number | null
  game_date: string
  resolved_at: string | null
}

interface GameForFeed {
  externalGameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
}

/**
 * Build a results feed from picks and game data.
 */
export function buildResultsFeed(
  picks: PickForFeed[],
  games: GameForFeed[],
  targetDate: string // YYYY-MM-DD
): ResultsFeedData {
  // Index games by external ID
  const gameMap = new Map<string, GameForFeed>()
  for (const game of games) {
    gameMap.set(game.externalGameId, game)
  }

  // Filter picks for target date
  const dayPicks = picks.filter((p) => p.game_date.startsWith(targetDate))

  // Build results
  const results: GameResult[] = []
  const seen = new Set<string>()

  let todayPnL = 0
  let todayWins = 0
  let todayLosses = 0
  let todayPushes = 0
  let pendingCount = 0

  for (const pick of dayPicks) {
    const game = gameMap.get(pick.external_game_id)

    if (pick.outcome === 'pending' || !pick.outcome) {
      pendingCount++
      continue
    }

    const pickResult: PickResult = {
      pickId: pick.id,
      pickType: pick.pick_type,
      pickTeam: pick.pick_team,
      pickLine: pick.pick_line,
      odds: pick.odds,
      units: pick.units,
      outcome: pick.outcome as ResultStatus,
      profit: pick.profit ?? 0,
    }

    todayPnL += pickResult.profit
    if (pick.outcome === 'win') todayWins++
    else if (pick.outcome === 'loss') todayLosses++
    else if (pick.outcome === 'push') todayPushes++

    const resultId = pick.external_game_id

    if (seen.has(resultId)) {
      // Multiple picks on same game — merge
      const existing = results.find((r) => r.externalGameId === resultId)
      if (existing && existing.pick) {
        // Keep the more impactful pick (higher absolute profit)
        if (Math.abs(pickResult.profit) > Math.abs(existing.pick.profit)) {
          existing.pick = pickResult
        }
      }
    } else {
      seen.add(resultId)
      results.push({
        id: `result-${pick.id}`,
        externalGameId: pick.external_game_id,
        sport: pick.sport,
        homeTeam: game?.homeTeam ?? 'Unknown',
        awayTeam: game?.awayTeam ?? 'Unknown',
        gameDate: pick.game_date,
        homeScore: null,
        awayScore: null,
        pick: pickResult,
        resolvedAt: pick.resolved_at ?? pick.game_date,
      })
    }
  }

  // Sort by resolved time (most recent first)
  results.sort((a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime())

  return {
    results,
    todayPnL: Math.round(todayPnL * 100) / 100,
    todayWins,
    todayLosses,
    todayPushes,
    pendingCount,
  }
}

/**
 * Format a pick type for display.
 */
export function formatPickType(type: string, team: string | null, line: number | null): string {
  switch (type) {
    case 'moneyline':
      return team ? `ML: ${team}` : 'Moneyline'
    case 'spread':
      return team
        ? `${team} ${line !== null ? (line > 0 ? `+${line}` : String(line)) : ''}`
        : 'Spread'
    case 'over':
      return line !== null ? `Over ${line}` : 'Over'
    case 'under':
      return line !== null ? `Under ${line}` : 'Under'
    case 'prop':
      return 'Prop'
    default:
      return type
  }
}

/**
 * Get result color class.
 */
export function getResultColor(status: ResultStatus): string {
  switch (status) {
    case 'win': return 'text-green-400'
    case 'loss': return 'text-red-400'
    case 'push': return 'text-zinc-400'
    case 'no-pick': return 'text-zinc-600'
  }
}

/**
 * Get result background class.
 */
export function getResultBg(status: ResultStatus): string {
  switch (status) {
    case 'win': return 'bg-green-500/10 border-green-500/30'
    case 'loss': return 'bg-red-500/10 border-red-500/30'
    case 'push': return 'bg-zinc-500/10 border-zinc-500/30'
    case 'no-pick': return 'bg-zinc-900 border-border'
  }
}
