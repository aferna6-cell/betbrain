/**
 * Steam move detection — identifies rapid line movement.
 *
 * A "steam move" occurs when a line moves significantly in a short time window,
 * typically driven by sharp money or syndicate action. These moves signal that
 * well-informed bettors have found value on one side.
 *
 * Pure functions — no API calls. Works on odds history data.
 */

export interface OddsSnapshot {
  external_game_id: string
  bookmaker: string
  market: string
  home_odds: number | null
  away_odds: number | null
  spread_home: number | null
  spread_away: number | null
  spread_line: number | null
  total_over: number | null
  total_under: number | null
  total_line: number | null
  fetched_at: string
}

export interface SteamMove {
  gameId: string
  market: 'moneyline' | 'spread' | 'total'
  direction: string // e.g. "Home ML moved from -150 to -180"
  side: 'home' | 'away' | 'over' | 'under'
  bookmaker: string
  /** Magnitude of move in implied probability points (e.g. 5.2 = 5.2 pp shift) */
  magnitudePP: number
  /** Time window in minutes over which the move occurred */
  windowMinutes: number
  /** Velocity: probability points per hour */
  velocityPPH: number
  fromValue: number
  toValue: number
  detectedAt: string
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Minimum probability point shift to qualify as a steam move */
const MIN_PP_SHIFT = 3.0
/** Minimum velocity (pp/hour) to qualify — must be fast */
const MIN_VELOCITY_PPH = 6.0
/** Maximum lookback window in minutes */
const MAX_WINDOW_MINUTES = 60
/** Minimum spread line shift to qualify */
const MIN_SPREAD_SHIFT = 1.0
/** Minimum total line shift to qualify */
const MIN_TOTAL_SHIFT = 1.5

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function americanToImplied(odds: number): number {
  if (odds >= 100) return 100 / (odds + 100)
  if (odds <= -100) return Math.abs(odds) / (Math.abs(odds) + 100)
  return 0.5
}

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

/**
 * Detect steam moves from a list of odds history snapshots for a single game.
 * Snapshots should be sorted by fetched_at ascending.
 */
export function detectSteamMoves(snapshots: OddsSnapshot[]): SteamMove[] {
  if (snapshots.length < 2) return []

  const moves: SteamMove[] = []
  const now = new Date()

  // Group by bookmaker
  const byBookmaker = new Map<string, OddsSnapshot[]>()
  for (const snap of snapshots) {
    const key = snap.bookmaker
    if (!byBookmaker.has(key)) byBookmaker.set(key, [])
    byBookmaker.get(key)!.push(snap)
  }

  for (const [bookmaker, snaps] of byBookmaker) {
    // Sort by time ascending
    const sorted = snaps.sort(
      (a, b) => new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime()
    )

    if (sorted.length < 2) continue

    const latest = sorted[sorted.length - 1]
    const latestTime = new Date(latest.fetched_at).getTime()

    // Look back within the window
    for (let i = sorted.length - 2; i >= 0; i--) {
      const earlier = sorted[i]
      const earlierTime = new Date(earlier.fetched_at).getTime()
      const windowMs = latestTime - earlierTime
      const windowMinutes = windowMs / (1000 * 60)

      if (windowMinutes > MAX_WINDOW_MINUTES) break
      if (windowMinutes < 1) continue // Too close in time

      // Check moneyline moves
      if (latest.home_odds != null && earlier.home_odds != null) {
        const move = checkMoneylineMove(
          earlier.home_odds,
          latest.home_odds,
          'home',
          windowMinutes,
          latest.external_game_id,
          bookmaker,
          latest.fetched_at
        )
        if (move) moves.push(move)
      }

      if (latest.away_odds != null && earlier.away_odds != null) {
        const move = checkMoneylineMove(
          earlier.away_odds,
          latest.away_odds,
          'away',
          windowMinutes,
          latest.external_game_id,
          bookmaker,
          latest.fetched_at
        )
        if (move) moves.push(move)
      }

      // Check spread line moves
      if (latest.spread_line != null && earlier.spread_line != null) {
        const shift = Math.abs(latest.spread_line - earlier.spread_line)
        if (shift >= MIN_SPREAD_SHIFT) {
          const direction =
            latest.spread_line < earlier.spread_line
              ? `Spread moved from ${earlier.spread_line} to ${latest.spread_line} (home favored more)`
              : `Spread moved from ${earlier.spread_line} to ${latest.spread_line} (home favored less)`

          moves.push({
            gameId: latest.external_game_id,
            market: 'spread',
            direction,
            side: latest.spread_line < earlier.spread_line ? 'home' : 'away',
            bookmaker,
            magnitudePP: shift,
            windowMinutes: Math.round(windowMinutes),
            velocityPPH: (shift / windowMinutes) * 60,
            fromValue: earlier.spread_line,
            toValue: latest.spread_line,
            detectedAt: latest.fetched_at,
          })
        }
      }

      // Check total line moves
      if (latest.total_line != null && earlier.total_line != null) {
        const shift = Math.abs(latest.total_line - earlier.total_line)
        if (shift >= MIN_TOTAL_SHIFT) {
          const direction =
            latest.total_line > earlier.total_line
              ? `Total moved from ${earlier.total_line} to ${latest.total_line} (up)`
              : `Total moved from ${earlier.total_line} to ${latest.total_line} (down)`

          moves.push({
            gameId: latest.external_game_id,
            market: 'total',
            direction,
            side: latest.total_line > earlier.total_line ? 'over' : 'under',
            bookmaker,
            magnitudePP: shift,
            windowMinutes: Math.round(windowMinutes),
            velocityPPH: (shift / windowMinutes) * 60,
            fromValue: earlier.total_line,
            toValue: latest.total_line,
            detectedAt: latest.fetched_at,
          })
        }
      }

      // Only compare latest to the most recent earlier snapshot
      break
    }
  }

  // Deduplicate: keep the highest magnitude per game+market+side
  const best = new Map<string, SteamMove>()
  for (const move of moves) {
    const key = `${move.gameId}-${move.market}-${move.side}`
    const existing = best.get(key)
    if (!existing || move.magnitudePP > existing.magnitudePP) {
      best.set(key, move)
    }
  }

  // Sort by magnitude descending
  return Array.from(best.values()).sort((a, b) => b.magnitudePP - a.magnitudePP)
}

function checkMoneylineMove(
  fromOdds: number,
  toOdds: number,
  side: 'home' | 'away',
  windowMinutes: number,
  gameId: string,
  bookmaker: string,
  detectedAt: string
): SteamMove | null {
  const fromImplied = americanToImplied(fromOdds)
  const toImplied = americanToImplied(toOdds)
  const shiftPP = Math.abs(toImplied - fromImplied) * 100
  const velocityPPH = (shiftPP / windowMinutes) * 60

  if (shiftPP < MIN_PP_SHIFT || velocityPPH < MIN_VELOCITY_PPH) return null

  const direction = `${side === 'home' ? 'Home' : 'Away'} ML moved from ${formatOdds(fromOdds)} to ${formatOdds(toOdds)}`

  return {
    gameId,
    market: 'moneyline',
    direction,
    side,
    bookmaker,
    magnitudePP: Math.round(shiftPP * 10) / 10,
    windowMinutes: Math.round(windowMinutes),
    velocityPPH: Math.round(velocityPPH * 10) / 10,
    fromValue: fromOdds,
    toValue: toOdds,
    detectedAt,
  }
}

/**
 * Summarize steam moves for display.
 */
export function formatSteamMoveSummary(move: SteamMove): string {
  const speed =
    move.velocityPPH >= 12 ? 'Very fast' : move.velocityPPH >= 8 ? 'Fast' : 'Moderate'
  return `${speed} ${move.market} move at ${move.bookmaker.replace(/_/g, ' ')}: ${move.direction} (${move.magnitudePP}pp in ${move.windowMinutes}min)`
}
