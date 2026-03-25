/**
 * Bet Slip Builder — Multi-pick slip with running EV and correlation warnings.
 *
 * Tracks a set of prospective picks before they become official user_picks.
 * Calculates combined odds, parlay payout, expected value, and warns about
 * correlated legs or excessive exposure.
 *
 * Pure functions — no side effects, no localStorage, no API calls.
 */

import { americanToDecimal, americanToImplied, decimalToAmerican } from '@/lib/odds'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlipLeg {
  /** Unique leg identifier */
  id: string
  /** Game identifier from Odds API */
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  /** Which side: home, away, over, under */
  side: 'home' | 'away' | 'over' | 'under'
  /** Market type */
  market: 'moneyline' | 'spread' | 'total'
  /** American odds for this leg */
  odds: number
  /** Spread or total line (null for moneyline) */
  line: number | null
  /** Estimated win probability (0-1). From no-vig consensus or user input. */
  fairProbability: number | null
  /** Bookmaker key */
  bookmaker: string
  /** Commence time ISO */
  commenceTime: string
}

export type SlipMode = 'straight' | 'parlay' | 'roundrobin'

export interface SlipConfig {
  mode: SlipMode
  /** Base units to stake (for straight mode, each leg; for parlay, the parlay) */
  units: number
  /** Round robin leg count (e.g. 2 for 2-leg RR from N picks) */
  roundRobinLegs?: number
}

export interface SlipWarning {
  type: 'correlation' | 'exposure' | 'value' | 'size'
  severity: 'high' | 'medium' | 'low'
  message: string
  legIds: string[]
}

export interface LegAnalysis {
  legId: string
  decimalOdds: number
  impliedProbability: number
  fairProbability: number | null
  /** Expected value as percentage. Null if no fair probability. */
  ev: number | null
  /** True if EV is positive (potential value bet) */
  isPositiveEv: boolean
}

export interface SlipAnalysis {
  /** Analysis per leg */
  legs: LegAnalysis[]
  /** Combined decimal odds (for parlay mode) */
  combinedDecimalOdds: number
  /** Combined American odds (for parlay mode) */
  combinedAmericanOdds: number
  /** Combined implied probability (product of individual implied probs) */
  combinedImpliedProbability: number
  /** Combined fair probability (product of fair probs, if all available) */
  combinedFairProbability: number | null
  /** Overall EV percentage for parlay. Null if missing fair probs. */
  parlayEv: number | null
  /** Potential profit per unit staked in parlay mode */
  parlayPayoutPerUnit: number
  /** Total potential profit across all straight bets */
  straightTotalPayout: number
  /** Total units at risk */
  totalUnitsAtRisk: number
  /** Warnings about the slip */
  warnings: SlipWarning[]
  /** Number of legs */
  legCount: number
  /** True if any leg has positive EV */
  hasPositiveEv: boolean
}

// ---------------------------------------------------------------------------
// Core analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a leg's odds and value.
 */
export function analyzeLeg(leg: SlipLeg): LegAnalysis {
  const decimalOdds = americanToDecimal(leg.odds)
  const impliedProbability = americanToImplied(leg.odds)
  const fairProbability = leg.fairProbability

  let ev: number | null = null
  let isPositiveEv = false

  if (fairProbability !== null && fairProbability > 0 && fairProbability < 1) {
    // EV = (probability * payout) - (1 - probability) * stake
    // As percentage: (fairProb * decimalOdds - 1) * 100
    ev = Math.round(((fairProbability * decimalOdds) - 1) * 1000) / 10
    isPositiveEv = ev > 0
  }

  return {
    legId: leg.id,
    decimalOdds,
    impliedProbability,
    fairProbability,
    ev,
    isPositiveEv,
  }
}

/**
 * Analyze a complete bet slip.
 */
export function analyzeSlip(legs: SlipLeg[], config: SlipConfig): SlipAnalysis {
  const legAnalyses = legs.map(analyzeLeg)

  // Combined odds (multiply decimal odds for parlay)
  const combinedDecimalOdds = legAnalyses.reduce((acc, l) => acc * l.decimalOdds, 1)
  const combinedAmericanOdds = legs.length > 0 ? decimalToAmerican(combinedDecimalOdds) : 0
  const combinedImpliedProbability = legAnalyses.reduce(
    (acc, l) => acc * l.impliedProbability, 1
  )

  // Combined fair probability (only if all legs have fair probs)
  const allHaveFair = legAnalyses.every((l) => l.fairProbability !== null)
  const combinedFairProbability = allHaveFair
    ? legAnalyses.reduce((acc, l) => acc * (l.fairProbability ?? 1), 1)
    : null

  // Parlay EV
  let parlayEv: number | null = null
  if (combinedFairProbability !== null) {
    parlayEv = Math.round(((combinedFairProbability * combinedDecimalOdds) - 1) * 1000) / 10
  }

  // Payouts
  const parlayPayoutPerUnit = Math.round((combinedDecimalOdds - 1) * 100) / 100
  const straightTotalPayout = legAnalyses.reduce((sum, l) => {
    return sum + (l.decimalOdds - 1) * config.units
  }, 0)

  // Total units at risk
  const totalUnitsAtRisk = config.mode === 'parlay'
    ? config.units
    : config.units * legs.length

  // Detect warnings
  const warnings = detectWarnings(legs, legAnalyses, config)

  return {
    legs: legAnalyses,
    combinedDecimalOdds,
    combinedAmericanOdds,
    combinedImpliedProbability,
    combinedFairProbability,
    parlayEv,
    parlayPayoutPerUnit,
    straightTotalPayout,
    totalUnitsAtRisk,
    warnings,
    legCount: legs.length,
    hasPositiveEv: legAnalyses.some((l) => l.isPositiveEv),
  }
}

// ---------------------------------------------------------------------------
// Warning detection
// ---------------------------------------------------------------------------

function detectWarnings(
  legs: SlipLeg[],
  analyses: LegAnalysis[],
  config: SlipConfig
): SlipWarning[] {
  const warnings: SlipWarning[] = []

  // 1. Same-game correlation
  const gameGroups = new Map<string, SlipLeg[]>()
  for (const leg of legs) {
    const existing = gameGroups.get(leg.gameId) ?? []
    existing.push(leg)
    gameGroups.set(leg.gameId, existing)
  }

  for (const [, group] of gameGroups) {
    if (group.length >= 2) {
      warnings.push({
        type: 'correlation',
        severity: 'high',
        message: `${group.length} legs from ${group[0].homeTeam} vs ${group[0].awayTeam} — highly correlated. Books add extra vig to same-game parlays.`,
        legIds: group.map((l) => l.id),
      })
    }
  }

  // 2. Opposing sides in same game
  for (const [, group] of gameGroups) {
    if (group.length >= 2) {
      const hasBothSides = group.some((l) => l.side === 'home') && group.some((l) => l.side === 'away')
      if (hasBothSides) {
        warnings.push({
          type: 'correlation',
          severity: 'high',
          message: `Opposing sides bet in same game — one must lose.`,
          legIds: group.map((l) => l.id),
        })
      }
    }
  }

  // 3. Heavy exposure to one sport
  const sportCounts = new Map<string, number>()
  for (const leg of legs) {
    sportCounts.set(leg.sport, (sportCounts.get(leg.sport) ?? 0) + 1)
  }
  for (const [sport, count] of sportCounts) {
    if (count >= 4 && legs.length >= 5) {
      warnings.push({
        type: 'exposure',
        severity: 'medium',
        message: `${count}/${legs.length} legs are ${sport.toUpperCase()} — consider diversifying.`,
        legIds: legs.filter((l) => l.sport === sport).map((l) => l.id),
      })
    }
  }

  // 4. All negative EV legs in a parlay
  if (config.mode === 'parlay' && legs.length >= 2) {
    const allNegativeEv = analyses.every((a) => a.ev !== null && a.ev < 0)
    if (allNegativeEv) {
      warnings.push({
        type: 'value',
        severity: 'high',
        message: 'Every leg has negative EV — this parlay has poor expected value.',
        legIds: legs.map((l) => l.id),
      })
    }
  }

  // 5. Very low combined probability for large parlays
  if (config.mode === 'parlay' && legs.length >= 4) {
    const combinedProb = analyses.reduce((acc, l) => acc * l.impliedProbability, 1)
    if (combinedProb < 0.05) {
      warnings.push({
        type: 'size',
        severity: 'medium',
        message: `Combined win probability is ${(combinedProb * 100).toFixed(1)}% — this is a longshot.`,
        legIds: legs.map((l) => l.id),
      })
    }
  }

  // 6. Excessive units at risk (more than 5 units total)
  const totalUnits = config.mode === 'parlay' ? config.units : config.units * legs.length
  if (totalUnits > 5) {
    warnings.push({
      type: 'size',
      severity: 'medium',
      message: `${totalUnits.toFixed(1)} total units at risk — consider reducing stake.`,
      legIds: [],
    })
  }

  // Sort: high > medium > low
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return warnings
}

// ---------------------------------------------------------------------------
// Round robin calculations
// ---------------------------------------------------------------------------

/**
 * Calculate all round robin combinations from a set of legs.
 * Returns the number of bets and total stake required.
 */
export function calculateRoundRobin(
  legs: SlipLeg[],
  legCount: number,
  unitsPerBet: number
): { combinations: number; totalStake: number; bestPayout: number; worstPayout: number } {
  if (legCount < 2 || legCount > legs.length) {
    return { combinations: 0, totalStake: 0, bestPayout: 0, worstPayout: 0 }
  }

  // C(n, k) combinations
  const combinations = nChooseK(legs.length, legCount)
  const totalStake = combinations * unitsPerBet

  // Calculate all combo payouts to find best/worst
  const combos = generateCombinations(legs, legCount)
  let bestPayout = 0
  let worstPayout = Infinity

  for (const combo of combos) {
    const decimalOdds = combo.reduce((acc, leg) => acc * americanToDecimal(leg.odds), 1)
    const payout = (decimalOdds - 1) * unitsPerBet
    bestPayout = Math.max(bestPayout, payout)
    worstPayout = Math.min(worstPayout, payout)
  }

  if (combos.length === 0) worstPayout = 0

  return {
    combinations,
    totalStake: Math.round(totalStake * 100) / 100,
    bestPayout: Math.round(bestPayout * 100) / 100,
    worstPayout: Math.round(worstPayout * 100) / 100,
  }
}

// ---------------------------------------------------------------------------
// Slip manipulation
// ---------------------------------------------------------------------------

/**
 * Add a leg to the slip, returning the new legs array.
 * Returns null if the leg would create an impossible combination.
 */
export function addLeg(existingLegs: SlipLeg[], newLeg: SlipLeg): { legs: SlipLeg[]; warning: string | null } {
  // Check for duplicate
  const isDupe = existingLegs.some(
    (l) => l.gameId === newLeg.gameId && l.side === newLeg.side && l.market === newLeg.market
  )
  if (isDupe) {
    return { legs: existingLegs, warning: 'This exact bet is already in the slip.' }
  }

  // Check for opposing sides in same game
  const hasOpposite = existingLegs.some(
    (l) => l.gameId === newLeg.gameId && l.market === newLeg.market && l.side !== newLeg.side
  )

  const warning = hasOpposite
    ? 'Added opposing side from the same game — one leg must lose.'
    : null

  return { legs: [...existingLegs, newLeg], warning }
}

/**
 * Remove a leg from the slip by id.
 */
export function removeLeg(legs: SlipLeg[], legId: string): SlipLeg[] {
  return legs.filter((l) => l.id !== legId)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nChooseK(n: number, k: number): number {
  if (k > n || k < 0) return 0
  if (k === 0 || k === n) return 1
  let result = 1
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1)
  }
  return Math.round(result)
}

function generateCombinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (k > items.length) return []

  const combos: T[][] = []
  const maxCombos = 500 // Safety cap

  function backtrack(start: number, current: T[]) {
    if (combos.length >= maxCombos) return
    if (current.length === k) {
      combos.push([...current])
      return
    }
    for (let i = start; i < items.length; i++) {
      current.push(items[i])
      backtrack(i + 1, current)
      current.pop()
    }
  }

  backtrack(0, [])
  return combos
}

/**
 * Format a bet slip as a shareable text string.
 */
export function formatSlipAsText(legs: SlipLeg[], analysis: SlipAnalysis, config: SlipConfig): string {
  const lines: string[] = []
  lines.push(`BetBrain Slip (${config.mode.toUpperCase()})`)
  lines.push('─'.repeat(30))

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i]
    const la = analysis.legs[i]
    const oddsStr = leg.odds >= 0 ? `+${leg.odds}` : `${leg.odds}`
    const evStr = la.ev !== null ? ` (EV: ${la.ev >= 0 ? '+' : ''}${la.ev}%)` : ''
    const lineStr = leg.line !== null ? ` ${leg.line >= 0 ? '+' : ''}${leg.line}` : ''
    const sideLabel = leg.side === 'over' || leg.side === 'under'
      ? `${leg.side.charAt(0).toUpperCase() + leg.side.slice(1)}${lineStr}`
      : `${leg.side === 'home' ? leg.homeTeam : leg.awayTeam}${lineStr}`

    lines.push(`${i + 1}. ${sideLabel} ${leg.market} ${oddsStr}${evStr}`)
  }

  lines.push('─'.repeat(30))
  if (config.mode === 'parlay') {
    const oddsStr = analysis.combinedAmericanOdds >= 0
      ? `+${analysis.combinedAmericanOdds}`
      : `${analysis.combinedAmericanOdds}`
    lines.push(`Combined: ${oddsStr} | Payout: ${analysis.parlayPayoutPerUnit.toFixed(2)}u per 1u`)
    if (analysis.parlayEv !== null) {
      lines.push(`Parlay EV: ${analysis.parlayEv >= 0 ? '+' : ''}${analysis.parlayEv}%`)
    }
  } else {
    lines.push(`Total risk: ${analysis.totalUnitsAtRisk.toFixed(1)}u`)
    lines.push(`Max payout: ${analysis.straightTotalPayout.toFixed(2)}u`)
  }

  if (analysis.warnings.length > 0) {
    lines.push('')
    lines.push('Warnings:')
    for (const w of analysis.warnings.slice(0, 3)) {
      lines.push(`  - ${w.message}`)
    }
  }

  lines.push('')
  lines.push('For informational purposes only. Not financial advice.')

  return lines.join('\n')
}
