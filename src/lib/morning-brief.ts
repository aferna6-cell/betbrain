/**
 * Morning Brief — AI-powered daily summary of today's best plays.
 *
 * Aggregates data from multiple analysis modules:
 * - Daily slate (game counts, sport breakdown, verdict)
 * - EV scanner (positive EV opportunities)
 * - Game scripts (flow predictions, OT candidates)
 * - Line movement signals (steam moves, RLM)
 * - Situational spots (B2B, rest advantages)
 *
 * Produces a structured brief with:
 * - Headline (one sentence summary of the day)
 * - Top plays ranked by composite signal strength
 * - Caution alerts (tilt, losing streak, bankroll warnings)
 * - Sport-by-sport quick takes
 * - Actionable checklist for the day
 *
 * Pure functions, no side effects.
 * For informational purposes only. Not financial advice.
 */

import type { NormalizedGame } from '@/lib/sports/config'
import type { Sport } from '@/lib/supabase/types'
import type { EVOpportunity } from '@/lib/ev-scanner'
import type { GameScript } from '@/lib/game-script'
import { SPORT_LABELS } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MorningBriefPlay {
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: Sport
  sportLabel: string
  commenceTime: string
  /** Composite signal strength 0-100 */
  signalStrength: number
  /** Why this play is notable */
  reasons: string[]
  /** The specific side/market if there's a clear edge */
  edge: {
    side: 'home' | 'away' | 'over' | 'under' | 'none'
    market: 'moneyline' | 'spread' | 'total' | 'multiple'
    description: string
  }
  /** Best available EV, if any */
  bestEV: number | null
  /** Game script prediction, if available */
  gameFlow: string | null
}

export interface SportQuickTake {
  sport: Sport
  label: string
  gameCount: number
  headline: string
  topPlay: string | null
}

export interface CautionAlert {
  type: 'losing_streak' | 'bankroll_low' | 'tilt_risk' | 'light_slate' | 'heavy_favorites'
  severity: 'info' | 'warning' | 'danger'
  message: string
}

export interface DailyChecklist {
  item: string
  priority: 'high' | 'medium' | 'low'
}

export interface MorningBrief {
  /** Date string YYYY-MM-DD */
  date: string
  /** Generated timestamp */
  generatedAt: string
  /** One-sentence headline */
  headline: string
  /** Slate verdict */
  slateVerdict: 'loaded' | 'solid' | 'average' | 'light' | 'empty'
  /** Total games across all sports */
  totalGames: number
  /** Active sport count */
  activeSports: number
  /** Top plays ranked by signal strength */
  topPlays: MorningBriefPlay[]
  /** Quick take per active sport */
  sportTakes: SportQuickTake[]
  /** Caution alerts based on recent performance */
  cautionAlerts: CautionAlert[]
  /** Actionable checklist for the day */
  checklist: DailyChecklist[]
  /** Stats summary */
  stats: {
    totalEVOpps: number
    avgSignalStrength: number
    otCandidates: number
    closeGames: number
  }
  /** Mandatory disclaimer */
  disclaimer: string
}

export interface RecentPerformance {
  lastNPicks: { won: boolean; units: number }[]
  currentBankroll: number
  startingBankroll: number
  winRate7d: number | null
}

export interface SituationalSpot {
  gameId: string
  type: string
  impact: number
  description: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCLAIMER = 'For informational purposes only. Not financial advice. Always gamble responsibly.'

// ---------------------------------------------------------------------------
// Headline generation
// ---------------------------------------------------------------------------

function getSlateVerdict(totalGames: number, activeSports: number): MorningBrief['slateVerdict'] {
  if (totalGames === 0) return 'empty'
  if (totalGames >= 10 && activeSports >= 3) return 'loaded'
  if (totalGames >= 6 || activeSports >= 2) return 'solid'
  if (totalGames >= 3) return 'average'
  return 'light'
}

function generateHeadline(
  totalGames: number,
  activeSports: number,
  evCount: number,
  topPlay: MorningBriefPlay | null,
  verdict: MorningBrief['slateVerdict']
): string {
  if (totalGames === 0) {
    return 'No games on the board today — rest day.'
  }

  const parts: string[] = []

  switch (verdict) {
    case 'loaded':
      parts.push(`Loaded ${totalGames}-game slate across ${activeSports} sports`)
      break
    case 'solid':
      parts.push(`Solid ${totalGames}-game card today`)
      break
    case 'average':
      parts.push(`Average slate with ${totalGames} games`)
      break
    case 'light':
      parts.push(`Light day — only ${totalGames} game${totalGames !== 1 ? 's' : ''}`)
      break
    default:
      parts.push(`${totalGames} games today`)
  }

  if (evCount > 0) {
    parts.push(`${evCount} +EV spot${evCount !== 1 ? 's' : ''} detected`)
  }

  if (topPlay && topPlay.signalStrength >= 70) {
    parts.push(`top signal on ${topPlay.awayTeam} @ ${topPlay.homeTeam}`)
  }

  return parts.join(' — ') + '.'
}

// ---------------------------------------------------------------------------
// Play scoring
// ---------------------------------------------------------------------------

export function scoreBriefPlay(
  game: NormalizedGame,
  evOpps: EVOpportunity[],
  script: GameScript | undefined,
  spots: SituationalSpot[]
): MorningBriefPlay {
  let strength = 0
  const reasons: string[] = []
  let bestEV: number | null = null
  let edgeSide: MorningBriefPlay['edge']['side'] = 'none'
  let edgeMarket: MorningBriefPlay['edge']['market'] = 'moneyline'
  let edgeDesc = 'No clear edge identified'

  // EV opportunities
  const gameEVs = evOpps.filter(e => e.game.id === game.id)
  if (gameEVs.length > 0) {
    const best = gameEVs.reduce((a, b) => (a.ev > b.ev ? a : b))
    bestEV = best.ev
    strength += Math.min(best.ev * 8, 40) // up to 40 points from EV
    edgeSide = best.side === 'home' ? 'home' : 'away'
    edgeMarket = best.market as MorningBriefPlay['edge']['market']
    edgeDesc = `+${best.ev.toFixed(1)}% EV on ${best.team} (${best.bookmaker.replace(/_/g, ' ')})`
    reasons.push(`+${best.ev.toFixed(1)}% EV on ${best.team}`)

    if (gameEVs.length > 1) {
      reasons.push(`${gameEVs.length} +EV opportunities across books`)
    }
  }

  // Game script
  if (script) {
    if (script.predictedFlow === 'overtime_candidate') {
      strength += 15
      reasons.push('OT candidate — consider totals impact')
    }
    if (script.predictedFlow === 'close' || script.predictedFlow === 'coin_flip') {
      strength += 10
      reasons.push('Expected close game — competitive matchup')
    }
    if (script.spreadAnalysis.spreadRange > 1.5) {
      strength += 10
      reasons.push('Books disagree on spread — line is unsettled')
    }
    if (script.confidence >= 75) {
      strength += 5
    }
  }

  // Situational spots
  const gameSpots = spots.filter(s => s.gameId === game.id)
  for (const spot of gameSpots) {
    strength += Math.min(spot.impact * 3, 10)
    reasons.push(spot.description)
  }

  // Book count as data quality
  if (game.bookmakers.length >= 6) {
    strength += 5
  }

  if (reasons.length === 0) {
    reasons.push('Standard game — no significant signals')
  }

  if (edgeSide === 'none' && gameEVs.length === 0 && script) {
    edgeDesc = `Game flow: ${script.predictedFlow.replace(/_/g, ' ')}`
  }

  return {
    gameId: game.id,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    sport: game.sport,
    sportLabel: SPORT_LABELS[game.sport] ?? game.sport.toUpperCase(),
    commenceTime: game.commenceTime,
    signalStrength: Math.min(strength, 100),
    reasons,
    edge: {
      side: edgeSide,
      market: edgeMarket,
      description: edgeDesc,
    },
    bestEV,
    gameFlow: script?.predictedFlow?.replace(/_/g, ' ') ?? null,
  }
}

// ---------------------------------------------------------------------------
// Sport quick takes
// ---------------------------------------------------------------------------

function buildSportTakes(
  plays: MorningBriefPlay[],
  games: NormalizedGame[]
): SportQuickTake[] {
  const sportMap = new Map<Sport, MorningBriefPlay[]>()
  for (const play of plays) {
    const existing = sportMap.get(play.sport) || []
    existing.push(play)
    sportMap.set(play.sport, existing)
  }

  const takes: SportQuickTake[] = []
  for (const [sport, sportPlays] of sportMap) {
    const gameCount = games.filter(g => g.sport === sport).length
    const evPlays = sportPlays.filter(p => p.bestEV !== null)
    const topPlay = sportPlays.sort((a, b) => b.signalStrength - a.signalStrength)[0]
    const label = SPORT_LABELS[sport] ?? sport.toUpperCase()

    let headline: string
    if (evPlays.length > 0) {
      headline = `${evPlays.length} +EV spot${evPlays.length !== 1 ? 's' : ''} in ${gameCount} game${gameCount !== 1 ? 's' : ''}`
    } else if (gameCount > 0) {
      headline = `${gameCount} game${gameCount !== 1 ? 's' : ''} — no strong edges found`
    } else {
      headline = 'No games today'
    }

    takes.push({
      sport,
      label,
      gameCount,
      headline,
      topPlay: topPlay && topPlay.signalStrength >= 30
        ? `${topPlay.awayTeam} @ ${topPlay.homeTeam}: ${topPlay.reasons[0]}`
        : null,
    })
  }

  return takes.sort((a, b) => b.gameCount - a.gameCount)
}

// ---------------------------------------------------------------------------
// Caution alerts
// ---------------------------------------------------------------------------

export function buildCautionAlerts(
  performance: RecentPerformance | null,
  totalGames: number,
  plays: MorningBriefPlay[]
): CautionAlert[] {
  const alerts: CautionAlert[] = []

  if (performance) {
    // Losing streak check
    const recent = performance.lastNPicks
    let streak = 0
    for (const pick of recent) {
      if (!pick.won) streak++
      else break
    }
    if (streak >= 5) {
      alerts.push({
        type: 'losing_streak',
        severity: 'danger',
        message: `${streak}-game losing streak — consider reducing unit sizes today.`,
      })
    } else if (streak >= 3) {
      alerts.push({
        type: 'losing_streak',
        severity: 'warning',
        message: `${streak}-game losing streak — stay disciplined with your process.`,
      })
    }

    // Bankroll health
    if (performance.startingBankroll > 0) {
      const drawdown = (performance.startingBankroll - performance.currentBankroll) / performance.startingBankroll
      if (drawdown > 0.25) {
        alerts.push({
          type: 'bankroll_low',
          severity: 'danger',
          message: `Bankroll down ${(drawdown * 100).toFixed(0)}% from starting — consider a pause.`,
        })
      } else if (drawdown > 0.10) {
        alerts.push({
          type: 'bankroll_low',
          severity: 'warning',
          message: `Bankroll down ${(drawdown * 100).toFixed(0)}% — adjust unit sizes if needed.`,
        })
      }
    }

    // Tilt risk: losses + elevated betting
    if (streak >= 2 && recent.length >= 3) {
      const recentUnits = recent.slice(0, 3).reduce((s, p) => s + p.units, 0) / 3
      const avgUnits = recent.reduce((s, p) => s + p.units, 0) / recent.length
      if (recentUnits > avgUnits * 1.3) {
        alerts.push({
          type: 'tilt_risk',
          severity: 'warning',
          message: 'Recent unit sizes are elevated after losses — possible tilt. Stick to your system.',
        })
      }
    }
  }

  // Light slate warning
  if (totalGames > 0 && totalGames <= 2) {
    alerts.push({
      type: 'light_slate',
      severity: 'info',
      message: `Only ${totalGames} game${totalGames !== 1 ? 's' : ''} today — fewer plays means less data. Quality over quantity.`,
    })
  }

  // Heavy favorites warning
  const heavyFavPlays = plays.filter(p => p.signalStrength > 0 && p.edge.side !== 'none')
  if (heavyFavPlays.length >= 3) {
    const allSameSide = new Set(heavyFavPlays.map(p => p.edge.side)).size === 1
    if (allSameSide) {
      alerts.push({
        type: 'heavy_favorites',
        severity: 'info',
        message: 'All top plays lean the same direction — check for correlated risk.',
      })
    }
  }

  return alerts
}

// ---------------------------------------------------------------------------
// Daily checklist
// ---------------------------------------------------------------------------

function buildChecklist(
  totalGames: number,
  evCount: number,
  cautionAlerts: CautionAlert[]
): DailyChecklist[] {
  const items: DailyChecklist[] = []

  if (totalGames === 0) {
    items.push({ item: 'No games today — review yesterday\'s picks and update journal', priority: 'medium' })
    return items
  }

  if (evCount > 0) {
    items.push({ item: `Review ${evCount} +EV opportunit${evCount !== 1 ? 'ies' : 'y'} before lines move`, priority: 'high' })
  }

  items.push({ item: 'Check line movements since last night', priority: 'high' })
  items.push({ item: 'Log any picks with thesis and confidence rating', priority: 'high' })

  if (cautionAlerts.some(a => a.type === 'losing_streak')) {
    items.push({ item: 'Review your process — are you chasing losses?', priority: 'high' })
  }

  items.push({ item: 'Set alerts for games you\'re watching', priority: 'medium' })
  items.push({ item: 'Compare your lines to closing lines after games start', priority: 'medium' })
  items.push({ item: 'Complete daily review tonight after results are in', priority: 'low' })

  return items
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Generate a morning brief from today's data.
 *
 * @param games Today's games across all sports
 * @param evOpps EV opportunities from scanner
 * @param scripts Game script predictions
 * @param spots Situational spots
 * @param performance Recent performance for caution alerts
 * @param date Override date (defaults to today)
 */
export function generateMorningBrief(
  games: NormalizedGame[],
  evOpps: EVOpportunity[],
  scripts: GameScript[],
  spots: SituationalSpot[],
  performance: RecentPerformance | null,
  date?: string
): MorningBrief {
  const targetDate = date ?? new Date().toISOString().slice(0, 10)

  // Filter to today's games
  const todayGames = games.filter(g => g.commenceTime.slice(0, 10) === targetDate)

  // Score all games
  const plays = todayGames
    .map(game => {
      const script = scripts.find(s => s.game.id === game.id)
      return scoreBriefPlay(game, evOpps, script, spots)
    })
    .sort((a, b) => b.signalStrength - a.signalStrength)

  // Compute stats
  const activeSports = new Set(todayGames.map(g => g.sport)).size
  const verdict = getSlateVerdict(todayGames.length, activeSports)
  const topPlays = plays.slice(0, 5) // Top 5
  const topPlay = plays[0] ?? null

  const totalEVOpps = evOpps.filter(e =>
    todayGames.some(g => g.id === e.game.id)
  ).length

  const avgSignalStrength = plays.length > 0
    ? Math.round(plays.reduce((s, p) => s + p.signalStrength, 0) / plays.length)
    : 0

  const otCandidates = scripts.filter(s => s.predictedFlow === 'overtime_candidate').length
  const closeGames = scripts.filter(s =>
    s.predictedFlow === 'close' || s.predictedFlow === 'coin_flip'
  ).length

  const headline = generateHeadline(todayGames.length, activeSports, totalEVOpps, topPlay, verdict)
  const sportTakes = buildSportTakes(plays, todayGames)
  const cautionAlerts = buildCautionAlerts(performance, todayGames.length, plays)
  const checklist = buildChecklist(todayGames.length, totalEVOpps, cautionAlerts)

  return {
    date: targetDate,
    generatedAt: new Date().toISOString(),
    headline,
    slateVerdict: verdict,
    totalGames: todayGames.length,
    activeSports,
    topPlays,
    sportTakes,
    cautionAlerts,
    checklist,
    stats: {
      totalEVOpps,
      avgSignalStrength,
      otCandidates,
      closeGames,
    },
    disclaimer: DISCLAIMER,
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a morning brief as plain text for clipboard/sharing.
 */
export function formatBriefAsText(brief: MorningBrief): string {
  const lines: string[] = []

  lines.push(`MORNING BRIEF — ${brief.date}`)
  lines.push('='.repeat(40))
  lines.push('')
  lines.push(brief.headline)
  lines.push('')

  if (brief.topPlays.length > 0) {
    lines.push('TOP PLAYS')
    lines.push('-'.repeat(20))
    for (const play of brief.topPlays) {
      lines.push(`${play.sportLabel}: ${play.awayTeam} @ ${play.homeTeam} (Signal: ${play.signalStrength}/100)`)
      for (const reason of play.reasons) {
        lines.push(`  - ${reason}`)
      }
      lines.push('')
    }
  }

  if (brief.cautionAlerts.length > 0) {
    lines.push('CAUTION')
    lines.push('-'.repeat(20))
    for (const alert of brief.cautionAlerts) {
      const icon = alert.severity === 'danger' ? '!!!' : alert.severity === 'warning' ? '!!' : '!'
      lines.push(`${icon} ${alert.message}`)
    }
    lines.push('')
  }

  if (brief.checklist.length > 0) {
    lines.push('TODAY\'S CHECKLIST')
    lines.push('-'.repeat(20))
    for (const item of brief.checklist) {
      lines.push(`[ ] ${item.item}`)
    }
    lines.push('')
  }

  lines.push(brief.disclaimer)
  return lines.join('\n')
}
