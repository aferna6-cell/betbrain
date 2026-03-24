/**
 * Odds movement velocity detection.
 * Identifies lines that are moving unusually fast across bookmakers,
 * which often signals sharp action or breaking news.
 */

export interface OddsSnapshot {
  gameId: string
  bookmaker: string
  market: 'moneyline' | 'spread' | 'total'
  side: string // 'home', 'away', 'over', 'under'
  odds: number
  line?: number | null // spread/total line
  timestamp: string
}

export interface VelocityAlert {
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: string
  market: string
  side: string
  direction: 'up' | 'down'
  /** Movement in odds points (e.g., -110 to -130 = 20 point move) */
  magnitude: number
  /** Number of bookmakers that moved in the same direction */
  bookCount: number
  /** How fast the move happened (points per hour) */
  velocity: number
  /** Severity: 'moderate' | 'sharp' | 'extreme' */
  severity: 'moderate' | 'sharp' | 'extreme'
  timestamp: string
}

interface GameMeta {
  homeTeam: string
  awayTeam: string
  sport: string
}

/**
 * Detect rapid line movement from two snapshots of odds data.
 * Pure function for testability.
 *
 * @param before - Older odds snapshot
 * @param after - Newer odds snapshot
 * @param gameMeta - Map of gameId to team names
 * @param minMagnitude - Minimum odds movement to flag (default 10 points)
 */
export function detectOddsVelocity(
  before: OddsSnapshot[],
  after: OddsSnapshot[],
  gameMeta: Map<string, GameMeta>,
  minMagnitude: number = 10
): VelocityAlert[] {
  const alerts: VelocityAlert[] = []

  // Group "after" snapshots by game+market+side
  const afterMap = new Map<string, OddsSnapshot[]>()
  for (const snap of after) {
    const key = `${snap.gameId}|${snap.market}|${snap.side}`
    const arr = afterMap.get(key) ?? []
    arr.push(snap)
    afterMap.set(key, arr)
  }

  // Group "before" snapshots by game+market+side+bookmaker
  const beforeMap = new Map<string, OddsSnapshot>()
  for (const snap of before) {
    const key = `${snap.gameId}|${snap.market}|${snap.side}|${snap.bookmaker}`
    beforeMap.set(key, snap)
  }

  // Track movements per game+market+side
  const movements = new Map<string, { direction: 'up' | 'down'; magnitude: number; bookmaker: string }[]>()

  for (const [groupKey, afterSnaps] of afterMap) {
    for (const afterSnap of afterSnaps) {
      const beforeKey = `${groupKey}|${afterSnap.bookmaker}`
      const beforeSnap = beforeMap.get(beforeKey)
      if (!beforeSnap) continue

      const diff = afterSnap.odds - beforeSnap.odds
      if (Math.abs(diff) < minMagnitude) continue

      const arr = movements.get(groupKey) ?? []
      arr.push({
        direction: diff > 0 ? 'up' : 'down',
        magnitude: Math.abs(diff),
        bookmaker: afterSnap.bookmaker,
      })
      movements.set(groupKey, arr)
    }
  }

  // Build alerts for coordinated movements
  for (const [groupKey, moves] of movements) {
    const [gameId, market, side] = groupKey.split('|')
    const meta = gameMeta.get(gameId)
    if (!meta) continue

    // Count direction consensus
    const upMoves = moves.filter((m) => m.direction === 'up')
    const downMoves = moves.filter((m) => m.direction === 'down')
    const dominantDir = upMoves.length >= downMoves.length ? 'up' : 'down'
    const dominantMoves = dominantDir === 'up' ? upMoves : downMoves

    if (dominantMoves.length < 2) continue // Need 2+ books moving same way

    const avgMagnitude = dominantMoves.reduce((s, m) => s + m.magnitude, 0) / dominantMoves.length

    // Estimate velocity (assume snapshots are ~5 min apart for caching)
    const timeDiffHours = 5 / 60
    const velocity = Math.round(avgMagnitude / timeDiffHours)

    const severity: VelocityAlert['severity'] =
      dominantMoves.length >= 4 || avgMagnitude >= 30
        ? 'extreme'
        : dominantMoves.length >= 3 || avgMagnitude >= 20
          ? 'sharp'
          : 'moderate'

    alerts.push({
      gameId,
      homeTeam: meta.homeTeam,
      awayTeam: meta.awayTeam,
      sport: meta.sport,
      market,
      side,
      direction: dominantDir,
      magnitude: Math.round(avgMagnitude * 10) / 10,
      bookCount: dominantMoves.length,
      velocity,
      severity,
      timestamp: new Date().toISOString(),
    })
  }

  // Sort by severity (extreme first), then by book count
  return alerts.sort((a, b) => {
    const sevOrder = { extreme: 0, sharp: 1, moderate: 2 }
    if (sevOrder[a.severity] !== sevOrder[b.severity]) {
      return sevOrder[a.severity] - sevOrder[b.severity]
    }
    return b.bookCount - a.bookCount
  })
}

/**
 * Calculate the spread/total line movement (not odds movement).
 */
export function calcLineMovement(
  beforeLine: number | null | undefined,
  afterLine: number | null | undefined
): { moved: boolean; direction: 'up' | 'down' | 'none'; amount: number } {
  if (beforeLine == null || afterLine == null) {
    return { moved: false, direction: 'none', amount: 0 }
  }
  const diff = afterLine - beforeLine
  if (diff === 0) return { moved: false, direction: 'none', amount: 0 }
  return {
    moved: true,
    direction: diff > 0 ? 'up' : 'down',
    amount: Math.abs(Math.round(diff * 10) / 10),
  }
}
