/**
 * Sharp Money Flow Detector
 *
 * Detects Reverse Line Movement (RLM) — when a line moves OPPOSITE to
 * the expected public side. This is the strongest indicator of sharp action:
 *
 * Example: 70% of public is on the Lakers -5, but the line moves to -4.5.
 * Books are moving AGAINST the public, meaning sharp money is pushing the other way.
 *
 * Signals:
 * 1. Reverse line movement (line moves away from public side)
 * 2. Late steam (sharp money arriving close to game time)
 * 3. Opening line value (significant move from open)
 *
 * Pure functions — works on odds history + public money estimates.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SharpSignal {
  gameId: string
  type: 'rlm' | 'late-steam' | 'opening-value'
  side: 'home' | 'away' | 'over' | 'under'
  market: 'moneyline' | 'spread' | 'total'
  /** Strength 1-5 (5 = strongest) */
  strength: number
  description: string
  /** Bookmaker(s) where detected */
  bookmakers: string[]
  /** How many bookmakers confirmed the move */
  confirmations: number
  /** Estimated public side percentage (0-100) */
  publicPct: number
  /** Line movement detail */
  movement: {
    from: number
    to: number
    changePP: number // probability point change
  }
  detectedAt: string
}

export interface OddsPoint {
  bookmaker: string
  homeOdds: number
  awayOdds: number
  spreadHome: number | null
  spreadAway: number | null
  spreadLine: number | null
  totalOver: number | null
  totalUnder: number | null
  totalLine: number | null
  timestamp: string
}

export interface GameOddsTimeline {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  gameTime: string
  points: OddsPoint[]
}

export interface SharpFlowSummary {
  totalSignals: number
  rlmCount: number
  lateSteamCount: number
  openingValueCount: number
  strongSignals: SharpSignal[]
  /** Games with 2+ signal types = highest confidence */
  multiSignalGames: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum line movement (in implied probability points) to consider significant */
const MIN_MOVE_PP = 1.5

/** Minutes before game for "late steam" classification */
const LATE_STEAM_WINDOW_MINUTES = 120

/** Minimum number of bookmakers confirming move for strong signal */
const MIN_CONFIRMATIONS = 2

/** Public percentage threshold — above this we expect the line to move WITH public */
const PUBLIC_THRESHOLD = 55

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert American odds to implied probability (0-1)
 */
export function americanToImplied(odds: number): number {
  if (odds === 0) return 0.5
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

/**
 * Estimate which side is "public" based on odds.
 * Public tends to bet favorites and overs.
 * Returns estimated public percentage on home side (0-100).
 */
export function estimatePublicSide(homeOdds: number, awayOdds: number): number {
  const homeIP = americanToImplied(homeOdds)
  const awayIP = americanToImplied(awayOdds)

  // If home is bigger favorite, public leans home
  if (homeIP > awayIP) {
    // Scale: bigger favorite = more public
    const diff = homeIP - awayIP
    return Math.min(85, 50 + diff * 80)
  } else {
    const diff = awayIP - homeIP
    return Math.max(15, 50 - diff * 80)
  }
}

/**
 * Detect reverse line movement for moneyline
 */
function detectRLMMoneyline(
  timeline: GameOddsTimeline
): SharpSignal[] {
  const signals: SharpSignal[] = []
  if (timeline.points.length < 2) return signals

  // Group by bookmaker
  const byBook = new Map<string, OddsPoint[]>()
  for (const p of timeline.points) {
    if (!byBook.has(p.bookmaker)) byBook.set(p.bookmaker, [])
    byBook.get(p.bookmaker)!.push(p)
  }

  // For each bookmaker, check earliest vs latest
  const bookMoves: Array<{
    bookmaker: string
    fromHomeIP: number
    toHomeIP: number
    changeHomePP: number
    publicHomePct: number
  }> = []

  for (const [book, points] of byBook) {
    if (points.length < 2) continue

    const sorted = [...points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    const fromHomeIP = americanToImplied(first.homeOdds)
    const toHomeIP = americanToImplied(last.homeOdds)
    const changeHomePP = (toHomeIP - fromHomeIP) * 100
    const publicHomePct = estimatePublicSide(first.homeOdds, first.awayOdds)

    bookMoves.push({ bookmaker: book, fromHomeIP, toHomeIP, changeHomePP, publicHomePct })
  }

  if (bookMoves.length === 0) return signals

  // Average public percentage across books
  const avgPublicHome =
    bookMoves.reduce((s, m) => s + m.publicHomePct, 0) / bookMoves.length

  // Find books where line moved AGAINST public
  const rlmBooks: string[] = []

  for (const move of bookMoves) {
    const magnitude = Math.abs(move.changeHomePP)
    if (magnitude < MIN_MOVE_PP) continue

    const publicOnHome = move.publicHomePct >= PUBLIC_THRESHOLD
    const lineMovedAwayFromPublic =
      (publicOnHome && move.changeHomePP < 0) || // Public on home but home IP dropped
      (!publicOnHome && move.publicHomePct <= (100 - PUBLIC_THRESHOLD) && move.changeHomePP > 0) // Public on away but home IP rose

    if (lineMovedAwayFromPublic) {
      rlmBooks.push(move.bookmaker)
    }
  }

  if (rlmBooks.length >= 1) {
    const avgMove = bookMoves
      .filter((m) => rlmBooks.includes(m.bookmaker))
      .reduce((s, m) => s + m.changeHomePP, 0) / rlmBooks.length

    const publicOnHome = avgPublicHome >= PUBLIC_THRESHOLD
    const sharpSide = publicOnHome ? 'away' : 'home'

    const strength = Math.min(5, Math.ceil(
      (rlmBooks.length >= MIN_CONFIRMATIONS ? 2 : 1) +
      Math.min(2, Math.abs(avgMove) / 3) +
      (avgPublicHome > 65 || avgPublicHome < 35 ? 1 : 0)
    ))

    signals.push({
      gameId: timeline.gameId,
      type: 'rlm',
      side: sharpSide,
      market: 'moneyline',
      strength,
      description: `Reverse line movement on ML: public is ${Math.round(publicOnHome ? avgPublicHome : 100 - avgPublicHome)}% on ${publicOnHome ? timeline.homeTeam : timeline.awayTeam}, but line moved ${Math.abs(avgMove).toFixed(1)}pp toward ${sharpSide === 'home' ? timeline.homeTeam : timeline.awayTeam}`,
      bookmakers: rlmBooks,
      confirmations: rlmBooks.length,
      publicPct: Math.round(publicOnHome ? avgPublicHome : 100 - avgPublicHome),
      movement: {
        from: bookMoves[0].fromHomeIP * 100,
        to: bookMoves[0].toHomeIP * 100,
        changePP: Math.round(avgMove * 10) / 10,
      },
      detectedAt: new Date().toISOString(),
    })
  }

  return signals
}

/**
 * Detect reverse line movement for spread
 */
function detectRLMSpread(
  timeline: GameOddsTimeline
): SharpSignal[] {
  const signals: SharpSignal[] = []
  if (timeline.points.length < 2) return signals

  const byBook = new Map<string, OddsPoint[]>()
  for (const p of timeline.points) {
    if (p.spreadLine == null) continue
    if (!byBook.has(p.bookmaker)) byBook.set(p.bookmaker, [])
    byBook.get(p.bookmaker)!.push(p)
  }

  const bookMoves: Array<{
    bookmaker: string
    fromLine: number
    toLine: number
    lineChange: number
    fromHomeIP: number
  }> = []

  for (const [book, points] of byBook) {
    if (points.length < 2) continue
    const sorted = [...points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    if (first.spreadLine == null || last.spreadLine == null) continue

    const lineChange = last.spreadLine - first.spreadLine
    if (Math.abs(lineChange) < 0.5) continue

    bookMoves.push({
      bookmaker: book,
      fromLine: first.spreadLine,
      toLine: last.spreadLine,
      lineChange,
      fromHomeIP: americanToImplied(first.homeOdds),
    })
  }

  if (bookMoves.length === 0) return signals

  // Public typically bets the favorite on the spread
  const avgFromIP = bookMoves.reduce((s, m) => s + m.fromHomeIP, 0) / bookMoves.length
  const homeIsFavorite = avgFromIP > 0.5 // Home is favorite if their IP > 50%

  // If home is favorite, public is on home spread. Spread should get bigger (more negative).
  // RLM = spread gets smaller (less negative) despite public on home.
  const rlmBooks: string[] = []

  for (const move of bookMoves) {
    const publicOnHome = move.fromHomeIP > 0.5
    // Spread line is from home perspective (negative = home favorite)
    // Public bets favorite → spread should move MORE negative
    // RLM = spread moves LESS negative (toward home)
    const rlm = publicOnHome
      ? move.lineChange > 0  // Line went up (less negative) against home public
      : move.lineChange < 0  // Line went down (more negative) against away public

    if (rlm) rlmBooks.push(move.bookmaker)
  }

  if (rlmBooks.length >= 1) {
    const avgChange = bookMoves
      .filter((m) => rlmBooks.includes(m.bookmaker))
      .reduce((s, m) => s + m.lineChange, 0) / rlmBooks.length

    const publicSide = homeIsFavorite ? 'home' : 'away'
    const sharpSide = homeIsFavorite ? 'away' : 'home'

    const strength = Math.min(5, Math.ceil(
      (rlmBooks.length >= MIN_CONFIRMATIONS ? 2 : 1) +
      Math.min(2, Math.abs(avgChange)) +
      (Math.abs(avgFromIP - 0.5) > 0.15 ? 1 : 0)
    ))

    signals.push({
      gameId: timeline.gameId,
      type: 'rlm',
      side: sharpSide,
      market: 'spread',
      strength,
      description: `RLM on spread: public on ${publicSide === 'home' ? timeline.homeTeam : timeline.awayTeam} but line moved ${Math.abs(avgChange).toFixed(1)} pts toward ${sharpSide === 'home' ? timeline.homeTeam : timeline.awayTeam}`,
      bookmakers: rlmBooks,
      confirmations: rlmBooks.length,
      publicPct: Math.round(homeIsFavorite ? avgFromIP * 100 : (1 - avgFromIP) * 100),
      movement: {
        from: bookMoves[0].fromLine,
        to: bookMoves[0].toLine,
        changePP: Math.round(avgChange * 10) / 10,
      },
      detectedAt: new Date().toISOString(),
    })
  }

  return signals
}

/**
 * Detect reverse line movement for totals
 */
function detectRLMTotal(
  timeline: GameOddsTimeline
): SharpSignal[] {
  const signals: SharpSignal[] = []
  if (timeline.points.length < 2) return signals

  const byBook = new Map<string, OddsPoint[]>()
  for (const p of timeline.points) {
    if (p.totalLine == null) continue
    if (!byBook.has(p.bookmaker)) byBook.set(p.bookmaker, [])
    byBook.get(p.bookmaker)!.push(p)
  }

  const bookMoves: Array<{
    bookmaker: string
    fromLine: number
    toLine: number
    lineChange: number
  }> = []

  for (const [book, points] of byBook) {
    if (points.length < 2) continue
    const sorted = [...points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    if (first.totalLine == null || last.totalLine == null) continue

    const lineChange = last.totalLine - first.totalLine
    if (Math.abs(lineChange) < 0.5) continue

    bookMoves.push({
      bookmaker: book,
      fromLine: first.totalLine,
      toLine: last.totalLine,
      lineChange,
    })
  }

  if (bookMoves.length === 0) return signals

  // Public tends to bet overs. If total moves DOWN despite public on over, that's RLM.
  const rlmBooks: string[] = []
  for (const move of bookMoves) {
    if (move.lineChange < 0) {
      // Total went down — against public over tendency
      rlmBooks.push(move.bookmaker)
    }
  }

  if (rlmBooks.length >= 1) {
    const avgChange = bookMoves
      .filter((m) => rlmBooks.includes(m.bookmaker))
      .reduce((s, m) => s + m.lineChange, 0) / rlmBooks.length

    const strength = Math.min(5, Math.ceil(
      (rlmBooks.length >= MIN_CONFIRMATIONS ? 2 : 1) +
      Math.min(2, Math.abs(avgChange))
    ))

    signals.push({
      gameId: timeline.gameId,
      type: 'rlm',
      side: 'under',
      market: 'total',
      strength,
      description: `RLM on total: public leans over but total dropped ${Math.abs(avgChange).toFixed(1)} pts. Sharp money on under.`,
      bookmakers: rlmBooks,
      confirmations: rlmBooks.length,
      publicPct: 60, // estimated public over percentage
      movement: {
        from: bookMoves[0].fromLine,
        to: bookMoves[0].toLine,
        changePP: Math.round(avgChange * 10) / 10,
      },
      detectedAt: new Date().toISOString(),
    })
  }

  return signals
}

/**
 * Detect late steam — sharp money arriving close to game time
 */
function detectLateSteam(
  timeline: GameOddsTimeline
): SharpSignal[] {
  const signals: SharpSignal[] = []
  const gameTime = new Date(timeline.gameTime).getTime()

  // Filter points within the late window
  const latePoints = timeline.points.filter((p) => {
    const ts = new Date(p.timestamp).getTime()
    const minutesBefore = (gameTime - ts) / (1000 * 60)
    return minutesBefore > 0 && minutesBefore <= LATE_STEAM_WINDOW_MINUTES
  })

  if (latePoints.length < 2) return signals

  // Group by bookmaker
  const byBook = new Map<string, OddsPoint[]>()
  for (const p of latePoints) {
    if (!byBook.has(p.bookmaker)) byBook.set(p.bookmaker, [])
    byBook.get(p.bookmaker)!.push(p)
  }

  const lateMoves: Array<{
    bookmaker: string
    changeHomePP: number
    direction: 'home' | 'away'
  }> = []

  for (const [book, points] of byBook) {
    if (points.length < 2) continue
    const sorted = [...points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    const fromIP = americanToImplied(first.homeOdds)
    const toIP = americanToImplied(last.homeOdds)
    const changePP = (toIP - fromIP) * 100

    if (Math.abs(changePP) >= MIN_MOVE_PP) {
      lateMoves.push({
        bookmaker: book,
        changeHomePP: changePP,
        direction: changePP > 0 ? 'home' : 'away',
      })
    }
  }

  if (lateMoves.length === 0) return signals

  // Check if moves are coordinated (same direction)
  const homeCount = lateMoves.filter((m) => m.direction === 'home').length
  const awayCount = lateMoves.filter((m) => m.direction === 'away').length

  const dominantDir = homeCount > awayCount ? 'home' : 'away'
  const dominantBooks = lateMoves
    .filter((m) => m.direction === dominantDir)
    .map((m) => m.bookmaker)

  if (dominantBooks.length >= 1) {
    const avgChange = lateMoves
      .filter((m) => m.direction === dominantDir)
      .reduce((s, m) => s + Math.abs(m.changeHomePP), 0) / dominantBooks.length

    const strength = Math.min(5, Math.ceil(
      (dominantBooks.length >= MIN_CONFIRMATIONS ? 2 : 1) +
      Math.min(2, avgChange / 2) +
      1 // late steam gets +1 for urgency
    ))

    signals.push({
      gameId: timeline.gameId,
      type: 'late-steam',
      side: dominantDir,
      market: 'moneyline',
      strength,
      description: `Late steam (within ${LATE_STEAM_WINDOW_MINUTES / 60}hr of game): ${dominantBooks.length} book(s) moved ${avgChange.toFixed(1)}pp toward ${dominantDir === 'home' ? timeline.homeTeam : timeline.awayTeam}`,
      bookmakers: dominantBooks,
      confirmations: dominantBooks.length,
      publicPct: 0, // not applicable for late steam
      movement: {
        from: 0,
        to: 0,
        changePP: Math.round(avgChange * 10) / 10,
      },
      detectedAt: new Date().toISOString(),
    })
  }

  return signals
}

/**
 * Detect opening line value — significant deviation from open
 */
function detectOpeningValue(
  timeline: GameOddsTimeline
): SharpSignal[] {
  const signals: SharpSignal[] = []
  if (timeline.points.length < 2) return signals

  // Get earliest and latest points overall
  const sorted = [...timeline.points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const earliest = sorted[0]
  const latest = sorted[sorted.length - 1]

  const openIP = americanToImplied(earliest.homeOdds)
  const currentIP = americanToImplied(latest.homeOdds)
  const changePP = (currentIP - openIP) * 100

  if (Math.abs(changePP) >= 3) {
    const side = changePP > 0 ? 'home' : 'away'
    const strength = Math.min(5, Math.ceil(Math.abs(changePP) / 2))

    signals.push({
      gameId: timeline.gameId,
      type: 'opening-value',
      side,
      market: 'moneyline',
      strength,
      description: `Opening line moved ${Math.abs(changePP).toFixed(1)}pp toward ${side === 'home' ? timeline.homeTeam : timeline.awayTeam} since open. Significant market adjustment.`,
      bookmakers: [earliest.bookmaker, latest.bookmaker].filter((b, i, a) => a.indexOf(b) === i),
      confirmations: 1,
      publicPct: 0,
      movement: {
        from: Math.round(openIP * 1000) / 10,
        to: Math.round(currentIP * 1000) / 10,
        changePP: Math.round(changePP * 10) / 10,
      },
      detectedAt: new Date().toISOString(),
    })
  }

  return signals
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Detect all sharp money signals for a single game
 */
export function detectSharpSignals(
  timeline: GameOddsTimeline
): SharpSignal[] {
  const signals: SharpSignal[] = []

  signals.push(...detectRLMMoneyline(timeline))
  signals.push(...detectRLMSpread(timeline))
  signals.push(...detectRLMTotal(timeline))
  signals.push(...detectLateSteam(timeline))
  signals.push(...detectOpeningValue(timeline))

  // Sort by strength descending
  signals.sort((a, b) => b.strength - a.strength)
  return signals
}

/**
 * Detect signals across multiple games and produce a summary
 */
export function detectSharpFlow(
  timelines: GameOddsTimeline[]
): SharpFlowSummary {
  const allSignals: SharpSignal[] = []

  for (const timeline of timelines) {
    allSignals.push(...detectSharpSignals(timeline))
  }

  allSignals.sort((a, b) => b.strength - a.strength)

  const rlmCount = allSignals.filter((s) => s.type === 'rlm').length
  const lateSteamCount = allSignals.filter((s) => s.type === 'late-steam').length
  const openingValueCount = allSignals.filter((s) => s.type === 'opening-value').length

  // Games with multiple signal types
  const gameSignalTypes = new Map<string, Set<string>>()
  for (const s of allSignals) {
    if (!gameSignalTypes.has(s.gameId)) gameSignalTypes.set(s.gameId, new Set())
    gameSignalTypes.get(s.gameId)!.add(s.type)
  }
  const multiSignalGames = [...gameSignalTypes.entries()]
    .filter(([, types]) => types.size >= 2)
    .map(([gameId]) => gameId)

  return {
    totalSignals: allSignals.length,
    rlmCount,
    lateSteamCount,
    openingValueCount,
    strongSignals: allSignals.filter((s) => s.strength >= 3),
    multiSignalGames,
  }
}

/**
 * Get a human-readable strength label
 */
export function strengthLabel(strength: number): string {
  if (strength >= 5) return 'Extreme'
  if (strength >= 4) return 'Strong'
  if (strength >= 3) return 'Moderate'
  if (strength >= 2) return 'Mild'
  return 'Weak'
}

/**
 * Get strength color class
 */
export function strengthColor(strength: number): string {
  if (strength >= 5) return 'text-red-400'
  if (strength >= 4) return 'text-orange-400'
  if (strength >= 3) return 'text-yellow-400'
  if (strength >= 2) return 'text-blue-400'
  return 'text-muted-foreground'
}
