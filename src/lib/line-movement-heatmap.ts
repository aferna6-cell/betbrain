/**
 * Line Movement Heatmap — Identify which games have the most line activity.
 *
 * Analyzes bookmaker odds variance to determine movement intensity.
 * Higher variance across bookmakers = more movement = hotter game.
 *
 * Pure functions, no side effects.
 */

import { americanToImplied } from '@/lib/odds'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeatmapGame {
  game: NormalizedGame
  /** Movement intensity (0-100). Higher = more movement. */
  intensity: number
  /** Heat level for visual display */
  heat: 'cold' | 'mild' | 'warm' | 'hot' | 'fire'
  /** Which market has the most movement */
  hotMarket: 'moneyline' | 'spread' | 'total' | 'none'
  /** Summary of what's moving */
  summary: string
  /** Moneyline implied probability range (max - min) */
  mlRange: number
  /** Spread line range across books */
  spreadRange: number
  /** Total line range across books */
  totalRange: number
}

export interface HeatmapResult {
  games: HeatmapGame[]
  hottest: HeatmapGame | null
  avgIntensity: number
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Generate a movement heatmap for all games.
 * Returns games sorted by intensity (hottest first).
 */
export function generateHeatmap(games: NormalizedGame[]): HeatmapResult {
  const heatmapGames: HeatmapGame[] = games.map(analyzeGameMovement)

  // Sort by intensity descending
  heatmapGames.sort((a, b) => b.intensity - a.intensity)

  const avgIntensity = heatmapGames.length > 0
    ? Math.round(heatmapGames.reduce((s, g) => s + g.intensity, 0) / heatmapGames.length)
    : 0

  return {
    games: heatmapGames,
    hottest: heatmapGames[0] ?? null,
    avgIntensity,
  }
}

function analyzeGameMovement(game: NormalizedGame): HeatmapGame {
  const bks = game.bookmakers

  // Moneyline implied prob range
  const homeImplieds = bks
    .map((b) => b.moneyline?.home)
    .filter((v): v is number => v != null)
    .map(americanToImplied)
  const awayImplieds = bks
    .map((b) => b.moneyline?.away)
    .filter((v): v is number => v != null)
    .map(americanToImplied)

  const mlHomeRange = homeImplieds.length >= 2
    ? Math.max(...homeImplieds) - Math.min(...homeImplieds)
    : 0
  const mlAwayRange = awayImplieds.length >= 2
    ? Math.max(...awayImplieds) - Math.min(...awayImplieds)
    : 0
  const mlRange = Math.max(mlHomeRange, mlAwayRange)

  // Spread line range
  const spreadLines = bks
    .map((b) => b.spread?.homeLine)
    .filter((v): v is number => v != null)
  const spreadRange = spreadLines.length >= 2
    ? Math.max(...spreadLines) - Math.min(...spreadLines)
    : 0

  // Total line range
  const totalLines = bks
    .map((b) => b.total?.line)
    .filter((v): v is number => v != null)
  const totalRange = totalLines.length >= 2
    ? Math.max(...totalLines) - Math.min(...totalLines)
    : 0

  // Determine which market has the most movement (normalized)
  const mlScore = mlRange * 100 // implied prob range * 100 for parity
  const spreadScore = spreadRange * 10 // point range * 10
  const totalScore = totalRange * 5 // total range * 5

  let hotMarket: HeatmapGame['hotMarket'] = 'none'
  const maxScore = Math.max(mlScore, spreadScore, totalScore)
  if (maxScore > 0) {
    if (maxScore === mlScore) hotMarket = 'moneyline'
    else if (maxScore === spreadScore) hotMarket = 'spread'
    else hotMarket = 'total'
  }

  // Composite intensity (0-100)
  const rawIntensity = mlScore * 0.5 + spreadScore * 0.3 + totalScore * 0.2
  const intensity = Math.min(100, Math.round(rawIntensity))

  const heat = intensityToHeat(intensity)
  const summary = buildSummary(game, mlRange, spreadRange, totalRange, hotMarket)

  return {
    game,
    intensity,
    heat,
    hotMarket,
    summary,
    mlRange: Math.round(mlRange * 1000) / 10, // Convert to percentage points
    spreadRange: Math.round(spreadRange * 10) / 10,
    totalRange: Math.round(totalRange * 10) / 10,
  }
}

function intensityToHeat(intensity: number): HeatmapGame['heat'] {
  if (intensity <= 10) return 'cold'
  if (intensity <= 25) return 'mild'
  if (intensity <= 50) return 'warm'
  if (intensity <= 75) return 'hot'
  return 'fire'
}

function buildSummary(
  game: NormalizedGame,
  mlRange: number,
  spreadRange: number,
  totalRange: number,
  hotMarket: HeatmapGame['hotMarket']
): string {
  const parts: string[] = []

  if (mlRange > 0.03) {
    parts.push(`ML: ${(mlRange * 100).toFixed(1)}% implied prob spread`)
  }
  if (spreadRange > 0.5) {
    parts.push(`Spread: ${spreadRange.toFixed(1)} pts range`)
  }
  if (totalRange > 1) {
    parts.push(`Total: ${totalRange.toFixed(1)} pts range`)
  }

  if (parts.length === 0) {
    return `${game.homeTeam} vs ${game.awayTeam} — lines are tight across books`
  }

  return parts.join(' | ')
}
