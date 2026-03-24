/**
 * Daily Slate — Cross-sport same-day summary for quick analysis.
 *
 * Aggregates games across all leagues for a given day:
 * - Sport-by-sport breakdown with game counts
 * - Highlighted best EV / arb / game script opportunities
 * - Betting volume estimation (how many games are worth looking at)
 * - "Today's best bets" ranked by combined signals
 * - Quick verdict: "Loaded slate" vs "Light day"
 *
 * Pure functions, no side effects.
 */

import type { NormalizedGame } from '@/lib/sports/config'
import type { Sport } from '@/lib/supabase/types'
import type { EVOpportunity } from '@/lib/ev-scanner'
import type { GameScript } from '@/lib/game-script'
import { SPORT_LABELS } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SportBreakdown {
  sport: Sport
  label: string
  gameCount: number
  evCount: number
  interestingCount: number  // games with some notable signal
}

export type SlateVerdict = 'loaded' | 'solid' | 'average' | 'light' | 'empty'

export interface DailySlate {
  /** Date string (YYYY-MM-DD) */
  date: string
  /** Total games across all sports */
  totalGames: number
  /** Breakdown by sport */
  sports: SportBreakdown[]
  /** Number of sports with games today */
  activeSports: number
  /** Overall slate verdict */
  verdict: SlateVerdict
  verdictLabel: string
  /** Top game picks for the day (combined signals) */
  topGames: TopGame[]
  /** Summary statistics */
  stats: {
    totalEVOpps: number
    avgConfidence: number
    otCandidates: number
    blowoutRisk: number
    closeGames: number
  }
}

export interface TopGame {
  game: NormalizedGame
  score: number  // composite interest score 0-100
  reasons: string[]
  sport: Sport
  sportLabel: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateString(isoDate: string): string {
  return isoDate.slice(0, 10)
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Determine slate verdict based on game count and signal density.
 */
export function getSlateVerdict(totalGames: number, activeSports: number, evCount: number): SlateVerdict {
  if (totalGames === 0) return 'empty'
  if (totalGames >= 10 && activeSports >= 3) return 'loaded'
  if (totalGames >= 6 || (activeSports >= 2 && evCount >= 3)) return 'solid'
  if (totalGames >= 3) return 'average'
  return 'light'
}

export function getVerdictLabel(verdict: SlateVerdict): string {
  switch (verdict) {
    case 'loaded': return 'Loaded Slate'
    case 'solid': return 'Solid Day'
    case 'average': return 'Average Slate'
    case 'light': return 'Light Day'
    case 'empty': return 'No Games'
  }
}

export function getVerdictColor(verdict: SlateVerdict): string {
  switch (verdict) {
    case 'loaded': return 'text-green-500'
    case 'solid': return 'text-blue-500'
    case 'average': return 'text-yellow-500'
    case 'light': return 'text-orange-500'
    case 'empty': return 'text-muted-foreground'
  }
}

/**
 * Score a game's interest level based on available signals.
 */
export function scoreGameInterest(
  game: NormalizedGame,
  evOpps: EVOpportunity[],
  script: GameScript | undefined
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // EV opportunities for this game
  const gameEV = evOpps.filter((e) => e.game.id === game.id)
  if (gameEV.length > 0) {
    const bestEV = Math.max(...gameEV.map((e) => e.ev))
    score += Math.min(bestEV * 5, 30)
    reasons.push(`+${bestEV.toFixed(1)}% EV on ${gameEV[0].bookmaker.replace(/_/g, ' ')}`)
  }

  // Game script signals
  if (script) {
    if (script.predictedFlow === 'overtime_candidate') {
      score += 15
      reasons.push('OT candidate — consider total impact')
    }
    if (script.predictedFlow === 'close') {
      score += 10
      reasons.push('Close game expected — competitive matchup')
    }
    if (script.spreadAnalysis.lopsided) {
      score += 5
      reasons.push('Lopsided spread — blowout risk for live betting')
    }
    if (script.spreadAnalysis.spreadRange > 1.5) {
      score += 10
      reasons.push('Books disagree on spread — line is unsettled')
    }
    if (script.scoring.tempo === 'high') {
      score += 5
      reasons.push('High-scoring environment expected')
    }
    // Confidence bonus
    score += Math.floor(script.confidence / 10)
  }

  // Book count as a data quality signal
  if (game.bookmakers.length >= 5) {
    score += 5
  }

  return { score: Math.min(score, 100), reasons }
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Build a cross-sport daily slate summary.
 *
 * @param games All games for today
 * @param evOpps EV opportunities from the scanner
 * @param scripts Game script predictions
 * @param date Override date (defaults to today)
 */
export function buildDailySlate(
  games: NormalizedGame[],
  evOpps: EVOpportunity[],
  scripts: GameScript[],
  date?: string
): DailySlate {
  const targetDate = date ?? todayString()

  // Filter to today's games
  const todayGames = games.filter((g) => getDateString(g.commenceTime) === targetDate)

  // Build sport breakdown
  const sportMap = new Map<Sport, NormalizedGame[]>()
  for (const game of todayGames) {
    const existing = sportMap.get(game.sport) || []
    existing.push(game)
    sportMap.set(game.sport, existing)
  }

  const sports: SportBreakdown[] = []
  for (const [sport, sportGames] of sportMap) {
    const evCount = evOpps.filter((e) => e.game.sport === sport).length
    const interestingCount = sportGames.filter((g) => {
      const gameEV = evOpps.filter((e) => e.game.id === g.id)
      const script = scripts.find((s) => s.game.id === g.id)
      return gameEV.length > 0 || (script && script.confidence >= 70)
    }).length

    sports.push({
      sport,
      label: SPORT_LABELS[sport] ?? sport.toUpperCase(),
      gameCount: sportGames.length,
      evCount,
      interestingCount,
    })
  }

  sports.sort((a, b) => b.gameCount - a.gameCount)

  const activeSports = sports.length
  const totalEVOpps = evOpps.length
  const verdict = getSlateVerdict(todayGames.length, activeSports, totalEVOpps)

  // Score and rank all games
  const scored: TopGame[] = todayGames.map((game) => {
    const script = scripts.find((s) => s.game.id === game.id)
    const { score, reasons } = scoreGameInterest(game, evOpps, script)
    return {
      game,
      score,
      reasons,
      sport: game.sport,
      sportLabel: SPORT_LABELS[game.sport] ?? game.sport.toUpperCase(),
    }
  }).sort((a, b) => b.score - a.score)

  // Script stats
  const otCandidates = scripts.filter((s) => s.predictedFlow === 'overtime_candidate').length
  const blowoutRisk = scripts.filter((s) => s.predictedFlow.startsWith('blowout_')).length
  const closeGames = scripts.filter((s) => s.predictedFlow === 'close' || s.predictedFlow === 'coin_flip').length
  const avgConfidence = scripts.length > 0
    ? Math.round(scripts.reduce((s, sc) => s + sc.confidence, 0) / scripts.length)
    : 0

  return {
    date: targetDate,
    totalGames: todayGames.length,
    sports,
    activeSports,
    verdict,
    verdictLabel: getVerdictLabel(verdict),
    topGames: scored.slice(0, 10), // Top 10
    stats: {
      totalEVOpps,
      avgConfidence,
      otCandidates,
      blowoutRisk,
      closeGames,
    },
  }
}
