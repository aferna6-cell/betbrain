/**
 * Bankroll history utilities.
 * Computes a running bankroll curve from resolved picks.
 */

export interface BankrollPoint {
  index: number
  date: string
  profit: number
  cumulative: number
}

interface PickForBankroll {
  outcome: string | null
  profit: number | null
  game_date: string
}

/**
 * Build a running bankroll curve from resolved picks, sorted by game_date.
 * Returns an array of cumulative profit points.
 */
export function buildBankrollCurve(picks: PickForBankroll[]): BankrollPoint[] {
  const resolved = picks
    .filter((p) => p.outcome && p.outcome !== 'pending' && p.profit !== null)
    .sort((a, b) => a.game_date.localeCompare(b.game_date))

  if (resolved.length === 0) return []

  let cumulative = 0
  return resolved.map((p, i) => {
    cumulative += p.profit ?? 0
    return {
      index: i,
      date: p.game_date.split('T')[0],
      profit: p.profit ?? 0,
      cumulative: Math.round(cumulative * 100) / 100,
    }
  })
}

/**
 * Compute home/away split statistics from picks.
 */
export interface HomeAwaySplit {
  side: 'home' | 'away'
  wins: number
  losses: number
  pushes: number
  total: number
  winRate: number | null
  profit: number
  units: number
  roi: number
}

interface PickForSplit {
  outcome: string | null
  profit: number | null
  units: number
  pick_team: string | null
  home_team?: string | null
  away_team?: string | null
}

/**
 * Calculate home vs away performance split.
 * Requires picks to have home_team/away_team fields to determine side.
 * Falls back to a heuristic based on pick_team matching if metadata is missing.
 */
export function calcHomeAwaySplit(
  picks: PickForSplit[],
  gameMetadata?: Map<string, { homeTeam: string; awayTeam: string }>
): HomeAwaySplit[] {
  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  if (resolved.length === 0) return []

  const home: HomeAwaySplit = { side: 'home', wins: 0, losses: 0, pushes: 0, total: 0, winRate: null, profit: 0, units: 0, roi: 0 }
  const away: HomeAwaySplit = { side: 'away', wins: 0, losses: 0, pushes: 0, total: 0, winRate: null, profit: 0, units: 0, roi: 0 }

  for (const pick of resolved) {
    let side: 'home' | 'away' | null = null

    // Try metadata first
    if (pick.home_team && pick.pick_team) {
      side = pick.pick_team === pick.home_team ? 'home' : 'away'
    } else if (gameMetadata && pick.pick_team) {
      // Check all games for a match
      for (const [, meta] of gameMetadata) {
        if (pick.pick_team === meta.homeTeam) { side = 'home'; break }
        if (pick.pick_team === meta.awayTeam) { side = 'away'; break }
      }
    }

    if (!side) continue // Can't determine side, skip

    const bucket = side === 'home' ? home : away
    bucket.total++
    bucket.units += pick.units
    bucket.profit += pick.profit ?? 0

    if (pick.outcome === 'win') bucket.wins++
    else if (pick.outcome === 'loss') bucket.losses++
    else if (pick.outcome === 'push') bucket.pushes++
  }

  // Calculate derived stats
  for (const bucket of [home, away]) {
    const decided = bucket.wins + bucket.losses
    bucket.winRate = decided > 0 ? Math.round((bucket.wins / decided) * 1000) / 10 : null
    bucket.roi = bucket.units > 0 ? Math.round((bucket.profit / bucket.units) * 10000) / 100 : 0
    bucket.profit = Math.round(bucket.profit * 100) / 100
  }

  return [home, away].filter((b) => b.total > 0)
}
