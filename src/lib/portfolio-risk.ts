/**
 * Bet Portfolio Risk Gauge — Portfolio-level risk exposure visualization.
 *
 * Analyzes all open (pending) picks to determine total risk exposure
 * by sport, bet type, and correlation. Helps bettors understand their
 * overall portfolio risk before placing additional bets.
 *
 * For informational purposes only. Not financial advice.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PickForRisk {
  id: string
  sport: string
  pick_type: string
  pick_team: string | null
  odds: number
  units: number
  game_date: string
  external_game_id: string
}

export interface SportExposure {
  sport: string
  pickCount: number
  totalUnits: number
  percentOfPortfolio: number
}

export interface TypeExposure {
  type: string
  pickCount: number
  totalUnits: number
  percentOfPortfolio: number
}

export interface CorrelationGroup {
  /** Game ID that picks share */
  gameId: string
  /** Teams involved */
  label: string
  picks: PickForRisk[]
  totalUnits: number
  /** Multiple correlated bets on same game = higher risk */
  riskLevel: 'low' | 'medium' | 'high'
}

export type OverallRisk = 'low' | 'moderate' | 'elevated' | 'high' | 'critical'

export interface PortfolioRiskResult {
  /** Overall risk level */
  overallRisk: OverallRisk
  /** 0-100 risk score */
  riskScore: number
  /** Human-readable risk summary */
  summary: string
  /** Total units at risk */
  totalUnitsAtRisk: number
  /** Number of open picks */
  openPickCount: number
  /** Breakdown by sport */
  sportExposure: SportExposure[]
  /** Breakdown by bet type */
  typeExposure: TypeExposure[]
  /** Games with multiple bets */
  correlationGroups: CorrelationGroup[]
  /** Risk factors contributing to the score */
  riskFactors: string[]
  /** Maximum potential loss (all pending picks lose) */
  maxLoss: number
  /** Maximum potential win (all pending picks win) */
  maxWin: number
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Risk thresholds */
const CONCENTRATION_THRESHOLD = 0.5 // >50% in one sport = concentrated
const CORRELATED_GAME_THRESHOLD = 3 // 3+ bets on same game = high risk
const HIGH_UNITS_THRESHOLD = 5 // >5 units on a single bet
const MAX_OPEN_THRESHOLD = 20 // >20 open picks at once

// ---------------------------------------------------------------------------
// Core logic (pure functions)
// ---------------------------------------------------------------------------

/**
 * Calculate potential payout for a single pick.
 */
export function calculatePotentialPayout(odds: number, units: number): number {
  if (odds > 0) {
    return (odds / 100) * units
  } else {
    return (100 / Math.abs(odds)) * units
  }
}

/**
 * Calculate sport-level exposure breakdown.
 */
export function calculateSportExposure(picks: PickForRisk[]): SportExposure[] {
  const totalUnits = picks.reduce((s, p) => s + p.units, 0)
  if (totalUnits === 0) return []

  const bySpot = new Map<string, { count: number; units: number }>()
  for (const p of picks) {
    const current = bySpot.get(p.sport) ?? { count: 0, units: 0 }
    current.count++
    current.units += p.units
    bySpot.set(p.sport, current)
  }

  return Array.from(bySpot.entries())
    .map(([sport, data]) => ({
      sport,
      pickCount: data.count,
      totalUnits: Math.round(data.units * 100) / 100,
      percentOfPortfolio: Math.round((data.units / totalUnits) * 100),
    }))
    .sort((a, b) => b.totalUnits - a.totalUnits)
}

/**
 * Calculate bet type exposure breakdown.
 */
export function calculateTypeExposure(picks: PickForRisk[]): TypeExposure[] {
  const totalUnits = picks.reduce((s, p) => s + p.units, 0)
  if (totalUnits === 0) return []

  const byType = new Map<string, { count: number; units: number }>()
  for (const p of picks) {
    const current = byType.get(p.pick_type) ?? { count: 0, units: 0 }
    current.count++
    current.units += p.units
    byType.set(p.pick_type, current)
  }

  return Array.from(byType.entries())
    .map(([type, data]) => ({
      type,
      pickCount: data.count,
      totalUnits: Math.round(data.units * 100) / 100,
      percentOfPortfolio: Math.round((data.units / totalUnits) * 100),
    }))
    .sort((a, b) => b.totalUnits - a.totalUnits)
}

/**
 * Find games with multiple bets (correlated risk).
 */
export function findCorrelationGroups(picks: PickForRisk[]): CorrelationGroup[] {
  const byGame = new Map<string, PickForRisk[]>()
  for (const p of picks) {
    if (!byGame.has(p.external_game_id)) byGame.set(p.external_game_id, [])
    byGame.get(p.external_game_id)!.push(p)
  }

  return Array.from(byGame.entries())
    .filter(([, gamePicks]) => gamePicks.length >= 2)
    .map(([gameId, gamePicks]) => {
      const totalUnits = gamePicks.reduce((s, p) => s + p.units, 0)
      const teams = [...new Set(gamePicks.map((p) => p.pick_team).filter(Boolean))]
      const label = teams.length > 0 ? teams.join(' vs ') : `Game ${gameId.slice(0, 8)}`

      return {
        gameId,
        label,
        picks: gamePicks,
        totalUnits: Math.round(totalUnits * 100) / 100,
        riskLevel: gamePicks.length >= CORRELATED_GAME_THRESHOLD ? 'high' as const
          : gamePicks.length >= 2 ? 'medium' as const : 'low' as const,
      }
    })
    .sort((a, b) => b.totalUnits - a.totalUnits)
}

/**
 * Calculate overall portfolio risk.
 */
export function analyzePortfolioRisk(picks: PickForRisk[]): PortfolioRiskResult {
  if (picks.length === 0) {
    return {
      overallRisk: 'low',
      riskScore: 0,
      summary: 'No open picks. Portfolio is clear.',
      totalUnitsAtRisk: 0,
      openPickCount: 0,
      sportExposure: [],
      typeExposure: [],
      correlationGroups: [],
      riskFactors: [],
      maxLoss: 0,
      maxWin: 0,
    }
  }

  const totalUnits = picks.reduce((s, p) => s + p.units, 0)
  const sportExposure = calculateSportExposure(picks)
  const typeExposure = calculateTypeExposure(picks)
  const correlationGroups = findCorrelationGroups(picks)

  const riskFactors: string[] = []
  let riskScore = 0

  // Factor 1: Total units at risk
  if (totalUnits > 15) {
    riskScore += 20
    riskFactors.push(`${totalUnits.toFixed(1)} total units at risk — high exposure`)
  } else if (totalUnits > 8) {
    riskScore += 10
    riskFactors.push(`${totalUnits.toFixed(1)} total units at risk — moderate exposure`)
  }

  // Factor 2: Sport concentration
  const maxSportPct = sportExposure.length > 0 ? sportExposure[0].percentOfPortfolio / 100 : 0
  if (maxSportPct > CONCENTRATION_THRESHOLD && sportExposure.length > 1) {
    riskScore += 15
    riskFactors.push(`${sportExposure[0].sport.toUpperCase()} has ${sportExposure[0].percentOfPortfolio}% of portfolio — concentrated`)
  }

  // Factor 3: Correlated bets
  const highCorrelation = correlationGroups.filter((g) => g.riskLevel === 'high')
  const medCorrelation = correlationGroups.filter((g) => g.riskLevel === 'medium')
  if (highCorrelation.length > 0) {
    riskScore += 20
    riskFactors.push(`${highCorrelation.length} game(s) with 3+ bets — highly correlated risk`)
  }
  if (medCorrelation.length > 0) {
    riskScore += 10
    riskFactors.push(`${medCorrelation.length} game(s) with 2 bets — some correlation`)
  }

  // Factor 4: Individual large bets
  const largeBets = picks.filter((p) => p.units >= HIGH_UNITS_THRESHOLD)
  if (largeBets.length > 0) {
    riskScore += 15
    riskFactors.push(`${largeBets.length} pick(s) with ${HIGH_UNITS_THRESHOLD}+ units — large individual bets`)
  }

  // Factor 5: Too many open picks
  if (picks.length > MAX_OPEN_THRESHOLD) {
    riskScore += 10
    riskFactors.push(`${picks.length} open picks — high volume`)
  }

  // Factor 6: Same-day concentration
  const dates = new Set(picks.map((p) => p.game_date.split('T')[0]))
  if (dates.size === 1 && picks.length > 5) {
    riskScore += 10
    riskFactors.push(`All ${picks.length} picks on same day — time-concentrated`)
  }

  // Factor 7: Heavy favorite risk (low payout, high probability of small wins)
  const heavyFavPicks = picks.filter((p) => p.odds < -200)
  if (heavyFavPicks.length >= 3) {
    riskScore += 10
    riskFactors.push(`${heavyFavPicks.length} heavy favorite picks — high loss risk if upset`)
  }

  riskScore = Math.min(100, riskScore)

  // Calculate max loss and max win
  const maxLoss = Math.round(totalUnits * 100) / 100
  const maxWin = Math.round(
    picks.reduce((s, p) => s + calculatePotentialPayout(p.odds, p.units), 0) * 100
  ) / 100

  // Determine overall risk level
  let overallRisk: OverallRisk
  if (riskScore >= 80) overallRisk = 'critical'
  else if (riskScore >= 60) overallRisk = 'high'
  else if (riskScore >= 40) overallRisk = 'elevated'
  else if (riskScore >= 20) overallRisk = 'moderate'
  else overallRisk = 'low'

  const summary = riskFactors.length === 0
    ? `${picks.length} open pick(s), ${totalUnits.toFixed(1)} units at risk. Portfolio looks balanced.`
    : `${picks.length} open pick(s), ${totalUnits.toFixed(1)} units at risk. ${riskFactors.length} risk factor(s) detected.`

  return {
    overallRisk,
    riskScore,
    summary,
    totalUnitsAtRisk: Math.round(totalUnits * 100) / 100,
    openPickCount: picks.length,
    sportExposure,
    typeExposure,
    correlationGroups,
    riskFactors,
    maxLoss,
    maxWin,
  }
}
