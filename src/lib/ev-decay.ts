/**
 * EV Decay Tracker — Track how +EV opportunity value erodes over time.
 *
 * Analyzes odds history snapshots to measure how quickly the market corrects
 * +EV opportunities. Useful for understanding optimal bet timing.
 *
 * For informational purposes only. Not financial advice.
 */

import { americanToImplied, impliedToAmerican } from '@/lib/odds'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OddsSnapshot {
  /** ISO-8601 timestamp of the snapshot */
  fetchedAt: string
  bookmaker: string
  homeOdds: number | null
  awayOdds: number | null
}

export interface EVDecayPoint {
  /** Minutes before game time */
  minutesBefore: number
  /** EV percentage at this point */
  ev: number
  /** Fair odds at this point */
  fairOdds: number
  /** Best available book odds at this point */
  bestOdds: number
  /** Number of books in consensus */
  bookCount: number
  /** ISO-8601 timestamp */
  timestamp: string
}

export interface EVDecayAnalysis {
  gameId: string
  sport?: string
  side: 'home' | 'away'
  team: string
  /** Chronological EV decay points */
  decayPoints: EVDecayPoint[]
  /** Initial EV when first spotted */
  initialEV: number
  /** Final EV at last snapshot before game */
  finalEV: number
  /** How quickly EV drops by half (minutes), null if it doesn't */
  halfLife: number | null
  /** Total decay as a percentage of initial EV */
  decayPercent: number
  /** Average correction speed (EV points per hour) */
  correctionSpeed: number
  /** Game commence time */
  commenceTime: string
}

export interface EVDecaySummary {
  /** All individual game analyses */
  analyses: EVDecayAnalysis[]
  /** Average half-life across all tracked games */
  avgHalfLife: number | null
  /** Average correction speed across all games */
  avgCorrectionSpeed: number
  /** How many games had EV fully corrected before game time */
  fullyCorrectedCount: number
  /** Average initial EV */
  avgInitialEV: number
}

// ---------------------------------------------------------------------------
// Core logic (pure functions)
// ---------------------------------------------------------------------------

const MIN_BOOKMAKERS = 3

/**
 * Calculate fair probability from a set of snapshots at a given time point.
 */
function calculateFairAtSnapshot(
  snapshots: OddsSnapshot[]
): { home: number; away: number; bookCount: number } | null {
  const homeImplied: number[] = []
  const awayImplied: number[] = []

  for (const snap of snapshots) {
    if (snap.homeOdds != null) homeImplied.push(americanToImplied(snap.homeOdds))
    if (snap.awayOdds != null) awayImplied.push(americanToImplied(snap.awayOdds))
  }

  if (homeImplied.length < MIN_BOOKMAKERS || awayImplied.length < MIN_BOOKMAKERS) {
    return null
  }

  const avgHome = homeImplied.reduce((s, v) => s + v, 0) / homeImplied.length
  const avgAway = awayImplied.reduce((s, v) => s + v, 0) / awayImplied.length
  const overround = avgHome + avgAway
  if (overround <= 0) return null

  return {
    home: avgHome / overround,
    away: avgAway / overround,
    bookCount: Math.min(homeImplied.length, awayImplied.length),
  }
}

/**
 * Group snapshots by time window (rounded to nearest interval).
 */
export function groupSnapshotsByTime(
  snapshots: OddsSnapshot[],
  intervalMinutes: number = 15
): Map<string, OddsSnapshot[]> {
  const groups = new Map<string, OddsSnapshot[]>()

  for (const snap of snapshots) {
    const ts = new Date(snap.fetchedAt).getTime()
    const rounded = Math.round(ts / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000)
    const key = new Date(rounded).toISOString()

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(snap)
  }

  return groups
}

/**
 * Calculate EV at a specific time point for a given side.
 * Returns EV percentage (e.g., 3.5 means +3.5% EV) or null.
 */
export function calculateEVAtPoint(
  snapshots: OddsSnapshot[],
  side: 'home' | 'away'
): { ev: number; fairOdds: number; bestOdds: number; bookCount: number } | null {
  const fair = calculateFairAtSnapshot(snapshots)
  if (!fair) return null

  const fairProb = side === 'home' ? fair.home : fair.away
  const fairOddsAmerican = impliedToAmerican(fairProb)

  // Find best available odds for this side
  const sideOdds: number[] = []
  for (const snap of snapshots) {
    const val = side === 'home' ? snap.homeOdds : snap.awayOdds
    if (val != null) sideOdds.push(val)
  }
  if (sideOdds.length === 0) return null

  const bestOdds = Math.max(...sideOdds)
  const bestImplied = americanToImplied(bestOdds)

  // EV = (fair prob - book implied prob) * 100
  // Positive = book odds are better than fair (good for bettor)
  const ev = (fairProb - bestImplied) * 100

  return {
    ev: Math.round(ev * 100) / 100,
    fairOdds: Math.round(fairOddsAmerican),
    bestOdds,
    bookCount: fair.bookCount,
  }
}

/**
 * Analyze EV decay for a single game and side.
 */
export function analyzeEVDecay(
  snapshots: OddsSnapshot[],
  commenceTime: string,
  gameId: string,
  side: 'home' | 'away',
  team: string,
  intervalMinutes: number = 15,
  sport?: string
): EVDecayAnalysis | null {
  const gameTime = new Date(commenceTime).getTime()
  const groups = groupSnapshotsByTime(snapshots, intervalMinutes)

  // Sort time groups chronologically
  const sortedKeys = Array.from(groups.keys()).sort()

  const decayPoints: EVDecayPoint[] = []

  for (const key of sortedKeys) {
    const group = groups.get(key)!
    const evData = calculateEVAtPoint(group, side)
    if (!evData) continue

    const ts = new Date(key).getTime()
    const minutesBefore = Math.round((gameTime - ts) / 60000)

    // Only include pre-game data points
    if (minutesBefore < 0) continue

    decayPoints.push({
      minutesBefore,
      ev: evData.ev,
      fairOdds: evData.fairOdds,
      bestOdds: evData.bestOdds,
      bookCount: evData.bookCount,
      timestamp: key,
    })
  }

  // Need at least 2 points to track decay
  if (decayPoints.length < 2) return null

  // Sort by time (earliest first = highest minutesBefore)
  decayPoints.sort((a, b) => b.minutesBefore - a.minutesBefore)

  // Only analyze if there was initially positive EV
  const initialEV = decayPoints[0].ev
  if (initialEV <= 0) return null

  const finalEV = decayPoints[decayPoints.length - 1].ev

  // Calculate half-life: how many minutes until EV drops to half
  const halfEV = initialEV / 2
  let halfLife: number | null = null
  for (let i = 1; i < decayPoints.length; i++) {
    if (decayPoints[i].ev <= halfEV) {
      halfLife = decayPoints[0].minutesBefore - decayPoints[i].minutesBefore
      break
    }
  }

  const decayPercent = initialEV > 0
    ? Math.round(((initialEV - finalEV) / initialEV) * 100)
    : 0

  // Minutes elapsed between first and last point
  const timeSpanMinutes = decayPoints[0].minutesBefore - decayPoints[decayPoints.length - 1].minutesBefore
  const hoursElapsed = timeSpanMinutes / 60
  const correctionSpeed = hoursElapsed > 0
    ? Math.round(((initialEV - finalEV) / hoursElapsed) * 100) / 100
    : 0

  return {
    gameId,
    sport,
    side,
    team,
    decayPoints,
    initialEV,
    finalEV,
    halfLife,
    decayPercent,
    correctionSpeed,
    commenceTime,
  }
}

/**
 * Summarize EV decay across multiple games.
 */
export function summarizeEVDecay(
  analyses: EVDecayAnalysis[]
): EVDecaySummary {
  if (analyses.length === 0) {
    return {
      analyses: [],
      avgHalfLife: null,
      avgCorrectionSpeed: 0,
      fullyCorrectedCount: 0,
      avgInitialEV: 0,
    }
  }

  const halfLives = analyses
    .map((a) => a.halfLife)
    .filter((h): h is number => h !== null)

  const avgHalfLife = halfLives.length > 0
    ? Math.round(halfLives.reduce((s, v) => s + v, 0) / halfLives.length)
    : null

  const avgCorrectionSpeed =
    Math.round(
      (analyses.reduce((s, a) => s + a.correctionSpeed, 0) / analyses.length) * 100
    ) / 100

  const fullyCorrectedCount = analyses.filter((a) => a.finalEV <= 0).length

  const avgInitialEV =
    Math.round(
      (analyses.reduce((s, a) => s + a.initialEV, 0) / analyses.length) * 100
    ) / 100

  return {
    analyses,
    avgHalfLife,
    avgCorrectionSpeed,
    fullyCorrectedCount,
    avgInitialEV,
  }
}

// ---------------------------------------------------------------------------
// Sport-level aggregation
// ---------------------------------------------------------------------------

export interface SportDecaySummary {
  sport: string
  count: number
  avgHalfLife: number | null
  avgCorrectionSpeed: number
  avgInitialEV: number
  fullyCorrectedCount: number
}

/**
 * Aggregate EV decay by sport for cross-sport comparison.
 * Shows which sport's lines get corrected fastest.
 */
export function aggregateBySort(
  analyses: EVDecayAnalysis[]
): SportDecaySummary[] {
  const bySport = new Map<string, EVDecayAnalysis[]>()
  for (const a of analyses) {
    const sport = a.sport ?? 'unknown'
    if (!bySport.has(sport)) bySport.set(sport, [])
    bySport.get(sport)!.push(a)
  }

  const results: SportDecaySummary[] = []
  for (const [sport, sportAnalyses] of bySport) {
    const halfLives = sportAnalyses
      .map(a => a.halfLife)
      .filter((h): h is number => h !== null)

    results.push({
      sport,
      count: sportAnalyses.length,
      avgHalfLife: halfLives.length > 0
        ? Math.round(halfLives.reduce((s, v) => s + v, 0) / halfLives.length)
        : null,
      avgCorrectionSpeed: sportAnalyses.length > 0
        ? Math.round((sportAnalyses.reduce((s, a) => s + a.correctionSpeed, 0) / sportAnalyses.length) * 100) / 100
        : 0,
      avgInitialEV: sportAnalyses.length > 0
        ? Math.round((sportAnalyses.reduce((s, a) => s + a.initialEV, 0) / sportAnalyses.length) * 100) / 100
        : 0,
      fullyCorrectedCount: sportAnalyses.filter(a => a.finalEV <= 0).length,
    })
  }

  return results.sort((a, b) => b.count - a.count)
}
