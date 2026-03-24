/**
 * EV Attribution — Identify which factors contribute most to your edge.
 *
 * Analyzes pick data across 6 dimensions (CLV, timing, sizing, line shopping,
 * sport selection, bet type) to determine which factors drive profitability.
 *
 * Pure functions — no side effects.
 */

export interface AttributionFactor {
  /** Factor name */
  name: string
  /** Description of what this measures */
  description: string
  /** Score 0-100 (higher = more contribution to edge) */
  score: number
  /** How much of total edge is attributable to this factor (percentage) */
  contribution: number
  /** Evidence supporting the score */
  evidence: string
  /** Actionable recommendation */
  recommendation: string
}

export interface EVAttribution {
  factors: AttributionFactor[]
  /** Overall edge assessment */
  overallEdge: 'strong' | 'moderate' | 'slight' | 'negative' | 'insufficient'
  /** Total edge score (weighted sum of factors) */
  totalScore: number
  /** Top contributing factor */
  topFactor: string
  /** Weakest factor (area for improvement) */
  weakestFactor: string
  /** Summary */
  summary: string
}

interface PickForAttribution {
  odds: number
  closing_odds?: number | null
  outcome?: string | null
  profit?: number | null
  units: number
  sport?: string
  bet_type?: string
  created_at?: string
  game_time?: string
  bookmaker?: string | null
}

/**
 * Convert American odds to implied probability.
 */
function impliedProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

/**
 * Analyze CLV contribution to edge.
 */
function analyzeCLV(picks: PickForAttribution[]): AttributionFactor {
  const withCLV = picks.filter((p) => p.closing_odds != null && p.closing_odds !== 0)
  if (withCLV.length < 5) {
    return {
      name: 'Closing Line Value',
      description: 'Edge captured by getting better odds than the closing line',
      score: 0,
      contribution: 0,
      evidence: `Only ${withCLV.length} picks with closing odds data`,
      recommendation: 'Record closing odds for more picks to measure CLV edge.',
    }
  }

  const clvValues = withCLV.map((p) => {
    const betProb = impliedProb(p.odds)
    const closeProb = impliedProb(p.closing_odds!)
    return (closeProb - betProb) * 100
  })

  const avgCLV = clvValues.reduce((s, v) => s + v, 0) / clvValues.length
  const posRate = (clvValues.filter((v) => v > 0).length / clvValues.length) * 100

  // Score: map avg CLV from [-5, +5] to [0, 100]
  const score = Math.max(0, Math.min(100, (avgCLV + 5) * 10))

  let recommendation = ''
  if (avgCLV > 2) recommendation = 'Excellent CLV — your line timing is sharp. Keep doing what you are doing.'
  else if (avgCLV > 0) recommendation = 'Positive CLV — you beat the closing line. Try to bet even earlier when you spot value.'
  else recommendation = 'Negative CLV — focus on getting your bets in earlier or using line shopping tools.'

  return {
    name: 'Closing Line Value',
    description: 'Edge captured by getting better odds than the closing line',
    score,
    contribution: 0, // will be calculated later
    evidence: `Avg CLV: ${avgCLV >= 0 ? '+' : ''}${avgCLV.toFixed(2)}%, ${posRate.toFixed(0)}% of picks beat closing line (${withCLV.length} picks)`,
    recommendation,
  }
}

/**
 * Analyze timing contribution (how far before game start).
 */
function analyzeTiming(picks: PickForAttribution[]): AttributionFactor {
  const withTiming = picks.filter((p) => p.created_at && p.game_time)
  if (withTiming.length < 5) {
    return {
      name: 'Bet Timing',
      description: 'Edge from optimal bet placement timing relative to game start',
      score: 50,
      contribution: 0,
      evidence: `Insufficient timing data (${withTiming.length} picks)`,
      recommendation: 'Log game times with your picks to track timing impact.',
    }
  }

  // Group by early (>24h), medium (4-24h), late (<4h)
  const groups = { early: [] as PickForAttribution[], medium: [] as PickForAttribution[], late: [] as PickForAttribution[] }
  for (const p of withTiming) {
    const hoursBeforeGame = (new Date(p.game_time!).getTime() - new Date(p.created_at!).getTime()) / (1000 * 60 * 60)
    if (hoursBeforeGame > 24) groups.early.push(p)
    else if (hoursBeforeGame > 4) groups.medium.push(p)
    else groups.late.push(p)
  }

  const calcROI = (arr: PickForAttribution[]) => {
    const totalProfit = arr.reduce((s, p) => s + (p.profit ?? 0), 0)
    const totalUnits = arr.reduce((s, p) => s + p.units, 0)
    return totalUnits > 0 ? (totalProfit / totalUnits) * 100 : 0
  }

  const earlyROI = calcROI(groups.early)
  const medROI = calcROI(groups.medium)
  const lateROI = calcROI(groups.late)
  const bestROI = Math.max(earlyROI, medROI, lateROI)
  const spread = bestROI - Math.min(earlyROI, medROI, lateROI)

  // Score based on whether timing differentiates performance
  const score = Math.min(100, Math.max(0, 50 + spread * 2))

  const bestWindow = earlyROI === bestROI ? 'early (>24h)' : medROI === bestROI ? 'medium (4-24h)' : 'late (<4h)'

  return {
    name: 'Bet Timing',
    description: 'Edge from optimal bet placement timing relative to game start',
    score,
    contribution: 0,
    evidence: `Early: ${earlyROI.toFixed(1)}% ROI (${groups.early.length}), Medium: ${medROI.toFixed(1)}% ROI (${groups.medium.length}), Late: ${lateROI.toFixed(1)}% ROI (${groups.late.length})`,
    recommendation: `Your best window is ${bestWindow}. ${spread > 10 ? 'Timing makes a big difference for you — stick to your best window.' : 'Timing has minimal impact — focus on other factors.'}`,
  }
}

/**
 * Analyze sizing discipline contribution.
 */
function analyzeSizing(picks: PickForAttribution[]): AttributionFactor {
  const resolved = picks.filter((p) => p.outcome === 'win' || p.outcome === 'loss')
  if (resolved.length < 10) {
    return {
      name: 'Unit Sizing',
      description: 'Edge from disciplined unit sizing relative to confidence',
      score: 50,
      contribution: 0,
      evidence: `Insufficient resolved picks (${resolved.length})`,
      recommendation: 'Need at least 10 resolved picks to analyze sizing.',
    }
  }

  const units = resolved.map((p) => p.units)
  const avgUnit = units.reduce((s, u) => s + u, 0) / units.length
  const maxUnit = Math.max(...units)
  const minUnit = Math.min(...units)
  const unitSpread = maxUnit - minUnit

  // Check if bigger bets win more often
  const aboveAvg = resolved.filter((p) => p.units > avgUnit)
  const belowAvg = resolved.filter((p) => p.units <= avgUnit)
  const aboveWinRate = aboveAvg.length > 0
    ? (aboveAvg.filter((p) => p.outcome === 'win').length / aboveAvg.length) * 100
    : 0
  const belowWinRate = belowAvg.length > 0
    ? (belowAvg.filter((p) => p.outcome === 'win').length / belowAvg.length) * 100
    : 0

  // Score: good sizing = bigger bets have higher win rate AND reasonable spread
  const winRateDiff = aboveWinRate - belowWinRate
  const disciplineScore = unitSpread <= 3 ? 20 : unitSpread <= 5 ? 10 : 0 // reward moderate variation
  const score = Math.max(0, Math.min(100, 50 + winRateDiff + disciplineScore))

  return {
    name: 'Unit Sizing',
    description: 'Edge from disciplined unit sizing relative to confidence',
    score,
    contribution: 0,
    evidence: `Avg unit: ${avgUnit.toFixed(1)}, Range: ${minUnit}-${maxUnit}. Higher-unit picks: ${aboveWinRate.toFixed(0)}% win rate vs ${belowWinRate.toFixed(0)}% for smaller.`,
    recommendation: winRateDiff > 5
      ? 'Good sizing calibration — you bet bigger when you are right more often.'
      : winRateDiff < -5
      ? 'Your bigger bets win less often. Consider flattening your unit sizing or recalibrating confidence.'
      : 'Unit sizing has minimal edge impact. This is fine — consistent sizing is a valid strategy.',
  }
}

/**
 * Analyze sport selection contribution.
 */
function analyzeSportSelection(picks: PickForAttribution[]): AttributionFactor {
  const resolved = picks.filter((p) => p.sport && (p.outcome === 'win' || p.outcome === 'loss'))
  if (resolved.length < 10) {
    return {
      name: 'Sport Selection',
      description: 'Edge from focusing on sports where you have an advantage',
      score: 50,
      contribution: 0,
      evidence: `Insufficient data (${resolved.length} resolved picks with sport)`,
      recommendation: 'Log more picks with sport tags to analyze sport-specific edge.',
    }
  }

  const sportMap = new Map<string, { wins: number; losses: number; profit: number; units: number }>()
  for (const p of resolved) {
    const s = p.sport!
    if (!sportMap.has(s)) sportMap.set(s, { wins: 0, losses: 0, profit: 0, units: 0 })
    const entry = sportMap.get(s)!
    if (p.outcome === 'win') entry.wins++
    else entry.losses++
    entry.profit += p.profit ?? 0
    entry.units += p.units
  }

  const sports = [...sportMap.entries()].map(([name, data]) => ({
    name,
    ...data,
    roi: data.units > 0 ? (data.profit / data.units) * 100 : 0,
    total: data.wins + data.losses,
  }))

  const best = sports.reduce((b, s) => (s.roi > b.roi ? s : b), sports[0])
  const worst = sports.reduce((w, s) => (s.roi < w.roi ? s : w), sports[0])
  const spread = best.roi - worst.roi

  const score = Math.max(0, Math.min(100, 50 + spread))

  return {
    name: 'Sport Selection',
    description: 'Edge from focusing on sports where you have an advantage',
    score,
    contribution: 0,
    evidence: sports.map((s) => `${s.name}: ${s.roi.toFixed(1)}% ROI (${s.total} picks)`).join(', '),
    recommendation: spread > 20
      ? `Significant edge in ${best.name} (${best.roi.toFixed(1)}% ROI). Consider reducing action on ${worst.name} (${worst.roi.toFixed(1)}% ROI).`
      : 'Performance is similar across sports. No strong sport-specific edge detected.',
  }
}

/**
 * Analyze bet type contribution.
 */
function analyzeBetType(picks: PickForAttribution[]): AttributionFactor {
  const resolved = picks.filter((p) => p.bet_type && (p.outcome === 'win' || p.outcome === 'loss'))
  if (resolved.length < 10) {
    return {
      name: 'Bet Type',
      description: 'Edge from selecting the right market type (ML, spread, total)',
      score: 50,
      contribution: 0,
      evidence: `Insufficient data (${resolved.length} resolved picks with bet type)`,
      recommendation: 'Log more picks with bet types to analyze market-specific edge.',
    }
  }

  const typeMap = new Map<string, { wins: number; losses: number; profit: number; units: number }>()
  for (const p of resolved) {
    const t = p.bet_type!
    if (!typeMap.has(t)) typeMap.set(t, { wins: 0, losses: 0, profit: 0, units: 0 })
    const entry = typeMap.get(t)!
    if (p.outcome === 'win') entry.wins++
    else entry.losses++
    entry.profit += p.profit ?? 0
    entry.units += p.units
  }

  const types = [...typeMap.entries()].map(([name, data]) => ({
    name,
    ...data,
    roi: data.units > 0 ? (data.profit / data.units) * 100 : 0,
    total: data.wins + data.losses,
  }))

  const best = types.reduce((b, t) => (t.roi > b.roi ? t : b), types[0])
  const worst = types.reduce((w, t) => (t.roi < w.roi ? t : w), types[0])
  const spread = best.roi - worst.roi

  const score = Math.max(0, Math.min(100, 50 + spread))

  return {
    name: 'Bet Type',
    description: 'Edge from selecting the right market type (ML, spread, total)',
    score,
    contribution: 0,
    evidence: types.map((t) => `${t.name}: ${t.roi.toFixed(1)}% ROI (${t.total} picks)`).join(', '),
    recommendation: spread > 15
      ? `Strong edge in ${best.name} market. Consider increasing allocation there and reducing ${worst.name}.`
      : 'Similar performance across bet types. No strong market-specific edge detected.',
  }
}

/**
 * Analyze line shopping contribution.
 */
function analyzeLineShopping(picks: PickForAttribution[]): AttributionFactor {
  const withBook = picks.filter((p) => p.bookmaker && (p.outcome === 'win' || p.outcome === 'loss'))
  if (withBook.length < 10) {
    return {
      name: 'Line Shopping',
      description: 'Edge from selecting the best available odds across bookmakers',
      score: 50,
      contribution: 0,
      evidence: `Insufficient data (${withBook.length} picks with bookmaker)`,
      recommendation: 'Record which bookmaker you use for each pick to track line shopping impact.',
    }
  }

  const bookMap = new Map<string, number>()
  for (const p of withBook) {
    const b = p.bookmaker!
    bookMap.set(b, (bookMap.get(b) ?? 0) + 1)
  }

  const uniqueBooks = bookMap.size
  const bookDiversity = Math.min(100, uniqueBooks * 20) // 5+ books = max diversity

  // Check if different books correlate with different outcomes
  const bookROIs: number[] = []
  for (const [book] of bookMap) {
    const bookPicks = withBook.filter((p) => p.bookmaker === book)
    const profit = bookPicks.reduce((s, p) => s + (p.profit ?? 0), 0)
    const units = bookPicks.reduce((s, p) => s + p.units, 0)
    if (units > 0) bookROIs.push((profit / units) * 100)
  }

  const roiSpread = bookROIs.length > 1
    ? Math.max(...bookROIs) - Math.min(...bookROIs)
    : 0

  const score = Math.max(0, Math.min(100, bookDiversity + roiSpread * 0.5))

  return {
    name: 'Line Shopping',
    description: 'Edge from selecting the best available odds across bookmakers',
    score,
    contribution: 0,
    evidence: `Using ${uniqueBooks} bookmaker(s). ROI spread across books: ${roiSpread.toFixed(1)}%`,
    recommendation: uniqueBooks < 3
      ? 'Use more sportsbooks to compare lines. Even a half-point better line significantly increases long-term ROI.'
      : `Good book diversity (${uniqueBooks} books). ${roiSpread > 10 ? 'Consider focusing more on your most profitable books.' : 'Similar results across books — your line shopping is consistent.'}`,
  }
}

/**
 * Build full EV attribution from pick data.
 */
export function buildEVAttribution(picks: PickForAttribution[]): EVAttribution {
  const resolved = picks.filter((p) => p.outcome === 'win' || p.outcome === 'loss')

  if (resolved.length < 10) {
    return {
      factors: [],
      overallEdge: 'insufficient',
      totalScore: 0,
      topFactor: '',
      weakestFactor: '',
      summary: `Need at least 10 resolved picks for EV attribution (have ${resolved.length}).`,
    }
  }

  const factors = [
    analyzeCLV(picks),
    analyzeTiming(picks),
    analyzeSizing(picks),
    analyzeSportSelection(picks),
    analyzeBetType(picks),
    analyzeLineShopping(picks),
  ]

  // Calculate contribution percentages
  const totalRaw = factors.reduce((s, f) => s + f.score, 0)
  if (totalRaw > 0) {
    for (const f of factors) {
      f.contribution = (f.score / totalRaw) * 100
    }
  }

  // Sort by score descending
  factors.sort((a, b) => b.score - a.score)

  const totalScore = totalRaw / factors.length
  const topFactor = factors[0].name
  const weakestFactor = factors[factors.length - 1].name

  let overallEdge: EVAttribution['overallEdge'] = 'moderate'
  if (totalScore >= 70) overallEdge = 'strong'
  else if (totalScore >= 55) overallEdge = 'moderate'
  else if (totalScore >= 40) overallEdge = 'slight'
  else overallEdge = 'negative'

  const summary = `Your strongest edge comes from ${topFactor} (${factors[0].score}/100). Focus improvement on ${weakestFactor} (${factors[factors.length - 1].score}/100) for the biggest gains.`

  return {
    factors,
    overallEdge,
    totalScore,
    topFactor,
    weakestFactor,
    summary,
  }
}
