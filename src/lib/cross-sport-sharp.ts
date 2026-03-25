/**
 * Cross-Sport Sharp Correlation — Detect simultaneous sharp action across sports.
 *
 * When sharp bettors move multiple lines across different sports in the same
 * time window, it may indicate a large syndicate play or correlated information.
 * This module detects these patterns by analyzing concurrent line movements.
 *
 * Examples:
 *   - NBA and NHL lines both move toward the away team at the same time
 *   - Totals in NBA and MLB both drop simultaneously (weather, injury info?)
 *   - Multiple favorites move from -3 to -4.5 across sports (sharp money flood)
 *
 * Pure functions — no side effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LineMovementEvent {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  market: 'moneyline' | 'spread' | 'total'
  /** Direction of movement: toward home, toward away, over, under */
  direction: 'home' | 'away' | 'over' | 'under'
  /** Magnitude of movement (always positive) */
  magnitude: number
  /** ISO timestamp of when the movement was detected */
  timestamp: string
  /** Number of bookmakers that moved in the same direction */
  booksInAgreement: number
  /** Total bookmakers tracked */
  totalBooks: number
  /** Game commence time */
  commenceTime: string
}

export interface SharpCorrelation {
  /** Unique identifier for this correlation cluster */
  id: string
  /** All movements in this cluster */
  movements: LineMovementEvent[]
  /** Sports involved */
  sports: string[]
  /** Time window of the cluster (start and end ISO timestamps) */
  windowStart: string
  windowEnd: string
  /** Duration of the cluster in minutes */
  durationMinutes: number
  /** Correlation strength (0-100) */
  strength: number
  /** Type of pattern detected */
  pattern: SharpPattern
  /** Description for display */
  description: string
  /** Risk level */
  risk: 'high' | 'medium' | 'low'
}

export type SharpPattern =
  | 'synchronized-favorites'   // Multiple favorites move across sports
  | 'synchronized-underdogs'   // Multiple underdogs move across sports
  | 'coordinated-totals'       // Totals move same direction across sports
  | 'cross-sport-steam'        // Rapid movement across 3+ sports simultaneously
  | 'contrarian-cluster'       // Sharp money on underdogs across multiple sports

export interface CrossSportConfig {
  /** Time window to consider movements "simultaneous" (minutes) */
  windowMinutes: number
  /** Minimum number of sports to form a correlation */
  minSports: number
  /** Minimum number of movements in a cluster */
  minMovements: number
  /** Minimum book agreement percentage (0-1) to count as sharp */
  minBookAgreement: number
}

export const DEFAULT_CONFIG: CrossSportConfig = {
  windowMinutes: 30,
  minSports: 2,
  minMovements: 3,
  minBookAgreement: 0.5,
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

/**
 * Detect cross-sport sharp correlations from a set of line movements.
 */
export function detectCrossSportCorrelations(
  movements: LineMovementEvent[],
  config: CrossSportConfig = DEFAULT_CONFIG
): SharpCorrelation[] {
  if (movements.length < config.minMovements) return []

  // Filter for movements with sufficient book agreement (sharp indicator)
  const sharpMovements = movements.filter((m) =>
    m.totalBooks > 0 && m.booksInAgreement / m.totalBooks >= config.minBookAgreement
  )

  if (sharpMovements.length < config.minMovements) return []

  // Sort by timestamp
  const sorted = [...sharpMovements].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Sliding window to find clusters
  const clusters = findClusters(sorted, config)

  // Classify and score each cluster
  const correlations: SharpCorrelation[] = []
  for (const cluster of clusters) {
    const correlation = classifyCluster(cluster, config)
    if (correlation) {
      correlations.push(correlation)
    }
  }

  // Sort by strength (highest first)
  correlations.sort((a, b) => b.strength - a.strength)

  return correlations
}

/**
 * Find clusters of movements within the time window.
 */
function findClusters(
  sorted: LineMovementEvent[],
  config: CrossSportConfig
): LineMovementEvent[][] {
  const windowMs = config.windowMinutes * 60 * 1000
  const clusters: LineMovementEvent[][] = []
  const used = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue

    const cluster: LineMovementEvent[] = [sorted[i]]
    const windowEnd = new Date(sorted[i].timestamp).getTime() + windowMs

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue
      const jTime = new Date(sorted[j].timestamp).getTime()
      if (jTime <= windowEnd) {
        cluster.push(sorted[j])
      }
    }

    // Check if cluster meets minimum requirements
    const sports = new Set(cluster.map((m) => m.sport))
    if (cluster.length >= config.minMovements && sports.size >= config.minSports) {
      for (let k = 0; k < sorted.length; k++) {
        if (cluster.includes(sorted[k])) used.add(k)
      }
      clusters.push(cluster)
    }
  }

  return clusters
}

/**
 * Classify a cluster of movements into a pattern and score it.
 */
function classifyCluster(
  cluster: LineMovementEvent[],
  config: CrossSportConfig
): SharpCorrelation | null {
  const sports = [...new Set(cluster.map((m) => m.sport))]
  if (sports.length < config.minSports) return null

  const timestamps = cluster.map((m) => new Date(m.timestamp).getTime())
  const windowStart = new Date(Math.min(...timestamps)).toISOString()
  const windowEnd = new Date(Math.max(...timestamps)).toISOString()
  const durationMinutes = Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 60000)

  // Determine pattern
  const pattern = detectPattern(cluster)
  const strength = calculateStrength(cluster, durationMinutes)
  const risk = strength >= 70 ? 'high' : strength >= 40 ? 'medium' : 'low'
  const description = generateDescription(cluster, pattern, sports)

  return {
    id: `cs-${Math.min(...timestamps)}-${sports.join('-')}`,
    movements: cluster,
    sports,
    windowStart,
    windowEnd,
    durationMinutes,
    strength,
    pattern,
    description,
    risk,
  }
}

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

function detectPattern(cluster: LineMovementEvent[]): SharpPattern {
  const mlMoves = cluster.filter((m) => m.market === 'moneyline' || m.market === 'spread')
  const totalMoves = cluster.filter((m) => m.market === 'total')
  const sports = new Set(cluster.map((m) => m.sport))

  // Cross-sport steam: rapid moves across 3+ sports
  if (sports.size >= 3 && cluster.length >= 5) {
    return 'cross-sport-steam'
  }

  // Coordinated totals
  if (totalMoves.length >= 2) {
    const overCount = totalMoves.filter((m) => m.direction === 'over').length
    const underCount = totalMoves.filter((m) => m.direction === 'under').length
    if (overCount >= 2 || underCount >= 2) {
      return 'coordinated-totals'
    }
  }

  // Synchronized favorites/underdogs
  if (mlMoves.length >= 2) {
    const homeCount = mlMoves.filter((m) => m.direction === 'home').length
    const awayCount = mlMoves.filter((m) => m.direction === 'away').length

    // "Away" movement in ML/spread often indicates underdog money
    if (awayCount >= 2 && awayCount > homeCount) {
      return 'contrarian-cluster'
    }
    if (homeCount >= 2 && homeCount > awayCount) {
      return 'synchronized-favorites'
    }
    if (awayCount >= 2) {
      return 'synchronized-underdogs'
    }
  }

  // Default fallback
  return 'cross-sport-steam'
}

// ---------------------------------------------------------------------------
// Strength scoring
// ---------------------------------------------------------------------------

function calculateStrength(cluster: LineMovementEvent[], durationMinutes: number): number {
  let score = 0

  // Factor 1: Number of sports (0-25)
  const sports = new Set(cluster.map((m) => m.sport))
  score += Math.min(sports.size / 4, 1) * 25

  // Factor 2: Movement count (0-20)
  score += Math.min(cluster.length / 8, 1) * 20

  // Factor 3: Average book agreement (0-25)
  const avgAgreement = cluster.reduce((sum, m) =>
    sum + (m.totalBooks > 0 ? m.booksInAgreement / m.totalBooks : 0), 0
  ) / cluster.length
  score += avgAgreement * 25

  // Factor 4: Tightness of time window (0-15)
  // Tighter windows are more suspicious
  if (durationMinutes <= 5) score += 15
  else if (durationMinutes <= 10) score += 12
  else if (durationMinutes <= 15) score += 8
  else if (durationMinutes <= 30) score += 4

  // Factor 5: Magnitude (0-15)
  const avgMagnitude = cluster.reduce((sum, m) => sum + m.magnitude, 0) / cluster.length
  if (avgMagnitude >= 10) score += 15
  else if (avgMagnitude >= 5) score += 10
  else if (avgMagnitude >= 2) score += 5

  return Math.min(100, Math.round(score))
}

// ---------------------------------------------------------------------------
// Description generation
// ---------------------------------------------------------------------------

function generateDescription(
  cluster: LineMovementEvent[],
  pattern: SharpPattern,
  sports: string[]
): string {
  const sportList = sports.map((s) => s.toUpperCase()).join(', ')
  const count = cluster.length

  switch (pattern) {
    case 'cross-sport-steam':
      return `Steam alert: ${count} sharp movements across ${sportList} within minutes. Possible syndicate play.`
    case 'synchronized-favorites':
      return `Favorites moving across ${sportList} simultaneously — sharp money loading chalk.`
    case 'synchronized-underdogs':
      return `Underdogs gaining across ${sportList} — coordinated sharp action on dogs.`
    case 'contrarian-cluster':
      return `Contrarian cluster: sharp money against public favorites in ${sportList}.`
    case 'coordinated-totals':
      const overs = cluster.filter((m) => m.direction === 'over').length
      const unders = cluster.filter((m) => m.direction === 'under').length
      const dir = overs > unders ? 'overs' : 'unders'
      return `Coordinated ${dir} movement across ${sportList} — possible weather/injury correlation.`
  }
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Convert raw odds changes into LineMovementEvents.
 * Useful for bridging from the existing odds history data.
 */
export function createMovementEvent(
  gameId: string,
  sport: string,
  homeTeam: string,
  awayTeam: string,
  market: 'moneyline' | 'spread' | 'total',
  oldValue: number,
  newValue: number,
  timestamp: string,
  booksInAgreement: number,
  totalBooks: number,
  commenceTime: string
): LineMovementEvent | null {
  const diff = newValue - oldValue
  if (Math.abs(diff) < 0.5) return null // Ignore tiny movements

  let direction: 'home' | 'away' | 'over' | 'under'
  if (market === 'total') {
    direction = diff > 0 ? 'over' : 'under'
  } else {
    // For ML/spread, positive movement = toward home favorite
    direction = diff < 0 ? 'home' : 'away'
  }

  return {
    gameId,
    sport,
    homeTeam,
    awayTeam,
    market,
    direction,
    magnitude: Math.abs(diff),
    timestamp,
    booksInAgreement,
    totalBooks,
    commenceTime,
  }
}

/**
 * Get a summary of cross-sport activity for dashboard display.
 */
export function getCrossSportSummary(
  correlations: SharpCorrelation[]
): { total: number; high: number; medium: number; low: number; topPattern: SharpPattern | null } {
  return {
    total: correlations.length,
    high: correlations.filter((c) => c.risk === 'high').length,
    medium: correlations.filter((c) => c.risk === 'medium').length,
    low: correlations.filter((c) => c.risk === 'low').length,
    topPattern: correlations.length > 0 ? correlations[0].pattern : null,
  }
}
