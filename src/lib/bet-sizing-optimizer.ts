/**
 * Bet Sizing Optimizer — Smart unit sizing based on Kelly, performance, and confidence.
 *
 * Analyzes recent betting history to suggest optimal unit sizes
 * per confidence level, adjusting for recent performance streaks
 * and actual win rates vs stated confidence.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface SizingRecommendation {
  /** Base unit size (from bankroll config) */
  baseUnitSize: number
  /** Adjusted unit size considering all factors */
  adjustedUnitSize: number
  /** Adjustment factor (multiplier, 0.5 to 1.5) */
  adjustmentFactor: number
  /** Reason for the adjustment */
  reason: string
  /** Individual factors that contributed */
  factors: SizingFactor[]
  /** Overall health of bet sizing (0-100) */
  sizingScore: number
}

export interface SizingFactor {
  name: string
  score: number // 0 to 100
  weight: number
  contribution: number // weighted score
  detail: string
}

export interface PerformanceWindow {
  wins: number
  losses: number
  pushes: number
  totalPicks: number
  winRate: number
  roi: number
  avgUnits: number
  netProfit: number
}

interface PickForSizing {
  outcome: string | null
  profit: number | null
  units: number
  odds: number
  game_date: string
}

/**
 * Analyze recent performance for sizing adjustments.
 */
export function analyzeRecentPerformance(
  picks: PickForSizing[],
  windowDays: number = 14
): PerformanceWindow {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const recent = picks.filter(
    (p) =>
      p.outcome &&
      p.outcome !== 'pending' &&
      p.profit != null &&
      p.game_date >= cutoffStr
  )

  if (recent.length === 0) {
    return {
      wins: 0, losses: 0, pushes: 0, totalPicks: 0,
      winRate: 0, roi: 0, avgUnits: 0, netProfit: 0,
    }
  }

  let wins = 0, losses = 0, pushes = 0
  let totalUnits = 0, totalProfit = 0

  for (const p of recent) {
    if (p.outcome === 'win') wins++
    else if (p.outcome === 'loss') losses++
    else if (p.outcome === 'push') pushes++
    totalUnits += p.units
    totalProfit += p.profit!
  }

  return {
    wins,
    losses,
    pushes,
    totalPicks: recent.length,
    winRate: recent.length > 0 ? wins / recent.length : 0,
    roi: totalUnits > 0 ? (totalProfit / totalUnits) * 100 : 0,
    avgUnits: recent.length > 0 ? totalUnits / recent.length : 0,
    netProfit: Math.round(totalProfit * 100) / 100,
  }
}

/**
 * Calculate optimal bet sizing recommendation.
 */
export function getOptimalSizing(
  bankroll: number,
  baseUnitSize: number,
  kellyMultiplier: number,
  recentPerformance: PerformanceWindow
): SizingRecommendation {
  const factors: SizingFactor[] = []

  // Factor 1: Recent Win Rate (weight: 30%)
  const winRateScore = scoreWinRate(recentPerformance.winRate, recentPerformance.totalPicks)
  factors.push({
    name: 'Win Rate',
    score: winRateScore,
    weight: 0.3,
    contribution: winRateScore * 0.3,
    detail: recentPerformance.totalPicks > 0
      ? `${(recentPerformance.winRate * 100).toFixed(1)}% over last ${recentPerformance.totalPicks} picks`
      : 'No recent data',
  })

  // Factor 2: ROI Trend (weight: 25%)
  const roiScore = scoreROI(recentPerformance.roi)
  factors.push({
    name: 'ROI',
    score: roiScore,
    weight: 0.25,
    contribution: roiScore * 0.25,
    detail: `${recentPerformance.roi >= 0 ? '+' : ''}${recentPerformance.roi.toFixed(1)}% ROI`,
  })

  // Factor 3: Volume (weight: 15%)
  const volumeScore = scoreVolume(recentPerformance.totalPicks)
  factors.push({
    name: 'Sample Size',
    score: volumeScore,
    weight: 0.15,
    contribution: volumeScore * 0.15,
    detail: `${recentPerformance.totalPicks} picks in window`,
  })

  // Factor 4: Bankroll Health (weight: 20%)
  const bankrollScore = scoreBankrollHealth(bankroll, baseUnitSize)
  factors.push({
    name: 'Bankroll Health',
    score: bankrollScore,
    weight: 0.2,
    contribution: bankrollScore * 0.2,
    detail: `${(baseUnitSize / bankroll * 100).toFixed(1)}% of bankroll per unit`,
  })

  // Factor 5: Kelly Aggression (weight: 10%)
  const kellyScore = scoreKellyAggression(kellyMultiplier)
  factors.push({
    name: 'Kelly Setting',
    score: kellyScore,
    weight: 0.1,
    contribution: kellyScore * 0.1,
    detail: `${kellyMultiplier}x Kelly`,
  })

  // Calculate composite score (0-100)
  const sizingScore = Math.round(factors.reduce((sum, f) => sum + f.contribution, 0))

  // Calculate adjustment factor (0.5 to 1.5)
  // Score 50 = no adjustment (1.0x)
  // Score 100 = increase to 1.5x
  // Score 0 = decrease to 0.5x
  const adjustmentFactor = Math.round((0.5 + (sizingScore / 100)) * 100) / 100

  const adjustedUnitSize = Math.round(baseUnitSize * adjustmentFactor * 100) / 100

  // Generate reason
  const reason = generateReason(sizingScore, recentPerformance, adjustmentFactor)

  return {
    baseUnitSize,
    adjustedUnitSize,
    adjustmentFactor,
    reason,
    factors,
    sizingScore,
  }
}

function scoreWinRate(winRate: number, totalPicks: number): number {
  if (totalPicks < 5) return 50 // Not enough data, neutral
  if (winRate >= 0.6) return 85
  if (winRate >= 0.55) return 75
  if (winRate >= 0.5) return 60
  if (winRate >= 0.45) return 45
  if (winRate >= 0.4) return 30
  return 15
}

function scoreROI(roi: number): number {
  if (roi >= 15) return 90
  if (roi >= 10) return 80
  if (roi >= 5) return 70
  if (roi >= 0) return 55
  if (roi >= -5) return 40
  if (roi >= -10) return 25
  return 10
}

function scoreVolume(totalPicks: number): number {
  if (totalPicks >= 30) return 85
  if (totalPicks >= 20) return 70
  if (totalPicks >= 10) return 55
  if (totalPicks >= 5) return 40
  return 25
}

function scoreBankrollHealth(bankroll: number, unitSize: number): number {
  if (bankroll <= 0 || unitSize <= 0) return 50
  const pct = unitSize / bankroll
  if (pct <= 0.01) return 90 // Very conservative
  if (pct <= 0.02) return 75
  if (pct <= 0.03) return 60
  if (pct <= 0.05) return 40
  return 20 // Over 5% per unit is aggressive
}

function scoreKellyAggression(multiplier: number): number {
  if (multiplier <= 0.25) return 80 // Conservative
  if (multiplier <= 0.5) return 65
  if (multiplier <= 0.75) return 50
  return 35 // Full Kelly is risky
}

function generateReason(
  score: number,
  perf: PerformanceWindow,
  factor: number
): string {
  if (perf.totalPicks < 5) {
    return 'Not enough recent data to adjust sizing. Using base unit size.'
  }

  if (score >= 70) {
    return `Strong recent performance (${(perf.winRate * 100).toFixed(0)}% win rate, ${perf.roi >= 0 ? '+' : ''}${perf.roi.toFixed(1)}% ROI). Sizing increased to ${factor}x base.`
  }

  if (score >= 50) {
    return `Solid performance. Maintaining near-base sizing at ${factor}x.`
  }

  if (score >= 30) {
    return `Below-average recent results (${(perf.winRate * 100).toFixed(0)}% win rate). Reducing exposure to ${factor}x base.`
  }

  return `Poor recent performance. Significantly reducing unit size to ${factor}x base to protect bankroll.`
}

/**
 * Get sizing health label.
 */
export function getSizingHealth(score: number): {
  label: string
  color: string
} {
  if (score >= 70) return { label: 'Increase', color: 'text-green-400' }
  if (score >= 50) return { label: 'Maintain', color: 'text-blue-400' }
  if (score >= 30) return { label: 'Reduce', color: 'text-amber-400' }
  return { label: 'Protect', color: 'text-red-400' }
}
