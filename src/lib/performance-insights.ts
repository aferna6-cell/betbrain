/**
 * Performance Insights — Actionable feedback on betting patterns.
 *
 * Analyzes pick history to generate personalized, data-driven insights.
 * Identifies strengths, weaknesses, and patterns that can improve results.
 *
 * Pure functions, no side effects or API calls.
 */

export interface PickForInsight {
  id: string
  sport: string
  pick_type: string
  outcome: string | null
  odds: number
  profit: number | null
  units: number
  game_date: string
  closing_odds?: number | null
}

export interface Insight {
  /** Short title */
  title: string
  /** Detailed explanation */
  description: string
  /** Positive = strength, negative = weakness, neutral = observation */
  sentiment: 'positive' | 'negative' | 'neutral'
  /** Actionable suggestion */
  action: string
  /** Confidence in the insight (0-100). Higher = more data backing it. */
  confidence: number
  /** Category for grouping */
  category: 'bet-type' | 'sport' | 'odds-range' | 'timing' | 'clv' | 'volume'
}

export interface InsightResult {
  insights: Insight[]
  totalPicks: number
  resolvedPicks: number
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Generate performance insights from pick history.
 * Requires at least 10 resolved picks for meaningful analysis.
 */
export function generateInsights(picks: PickForInsight[]): InsightResult {
  const resolved = picks.filter(
    (p) => p.outcome && p.outcome !== 'pending' && p.profit != null
  )

  if (resolved.length < 10) {
    return {
      insights: [{
        title: 'Not enough data',
        description: `You have ${resolved.length} resolved picks. Need at least 10 for insights.`,
        sentiment: 'neutral',
        action: 'Keep logging your picks to unlock performance insights.',
        confidence: 100,
        category: 'volume',
      }],
      totalPicks: picks.length,
      resolvedPicks: resolved.length,
    }
  }

  const insights: Insight[] = []

  // Generate insights from different angles
  insights.push(...betTypeInsights(resolved))
  insights.push(...sportInsights(resolved))
  insights.push(...oddsRangeInsights(resolved))
  insights.push(...clvInsights(resolved))
  insights.push(...volumeInsights(resolved))
  insights.push(...timingInsights(resolved))

  // Sort by confidence descending, then positive first
  insights.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    if (a.sentiment === 'positive' && b.sentiment !== 'positive') return -1
    if (b.sentiment === 'positive' && a.sentiment !== 'positive') return 1
    return 0
  })

  return {
    insights: insights.slice(0, 12), // Top 12
    totalPicks: picks.length,
    resolvedPicks: resolved.length,
  }
}

// ---------------------------------------------------------------------------
// Bet type analysis
// ---------------------------------------------------------------------------

function betTypeInsights(picks: PickForInsight[]): Insight[] {
  const insights: Insight[] = []
  const types = groupBy(picks, (p) => p.pick_type)

  const typeStats = Object.entries(types).map(([type, typePicks]) => {
    const wins = typePicks.filter((p) => p.outcome === 'win').length
    const total = typePicks.length
    const winRate = total > 0 ? wins / total : 0
    const totalProfit = typePicks.reduce((s, p) => s + (p.profit ?? 0), 0)
    const roi = total > 0 ? (totalProfit / typePicks.reduce((s, p) => s + p.units, 0)) * 100 : 0
    return { type, wins, total, winRate, totalProfit, roi }
  })

  // Find best and worst bet type
  const minSample = 5
  const qualified = typeStats.filter((ts) => ts.total >= minSample)

  if (qualified.length >= 2) {
    const best = qualified.reduce((a, b) => (a.roi > b.roi ? a : b))
    const worst = qualified.reduce((a, b) => (a.roi < b.roi ? a : b))

    if (best.roi > 0) {
      insights.push({
        title: `Strong at ${formatType(best.type)}`,
        description: `${best.wins}/${best.total} win rate (${(best.winRate * 100).toFixed(1)}%) with ${best.roi.toFixed(1)}% ROI on ${formatType(best.type)} bets.`,
        sentiment: 'positive',
        action: `Consider increasing your ${formatType(best.type)} volume — this is your edge.`,
        confidence: Math.min(90, best.total * 3),
        category: 'bet-type',
      })
    }

    if (worst.roi < -10 && worst.total >= minSample) {
      insights.push({
        title: `Struggling with ${formatType(worst.type)}`,
        description: `${worst.roi.toFixed(1)}% ROI on ${formatType(worst.type)} bets (${worst.total} picks).`,
        sentiment: 'negative',
        action: `Review your ${formatType(worst.type)} approach or reduce volume until your edge improves.`,
        confidence: Math.min(85, worst.total * 3),
        category: 'bet-type',
      })
    }
  }

  return insights
}

// ---------------------------------------------------------------------------
// Sport analysis
// ---------------------------------------------------------------------------

function sportInsights(picks: PickForInsight[]): Insight[] {
  const insights: Insight[] = []
  const sports = groupBy(picks, (p) => p.sport)

  const sportStats = Object.entries(sports).map(([sport, sportPicks]) => {
    const wins = sportPicks.filter((p) => p.outcome === 'win').length
    const total = sportPicks.length
    const winRate = total > 0 ? wins / total : 0
    const totalProfit = sportPicks.reduce((s, p) => s + (p.profit ?? 0), 0)
    const roi = total > 0 ? (totalProfit / sportPicks.reduce((s, p) => s + p.units, 0)) * 100 : 0
    return { sport, wins, total, winRate, totalProfit, roi }
  })

  const minSample = 5
  const qualified = sportStats.filter((ss) => ss.total >= minSample)

  if (qualified.length >= 2) {
    const best = qualified.reduce((a, b) => (a.roi > b.roi ? a : b))
    const worst = qualified.reduce((a, b) => (a.roi < b.roi ? a : b))

    if (best.roi > 5) {
      insights.push({
        title: `${best.sport.toUpperCase()} is your best sport`,
        description: `${best.roi.toFixed(1)}% ROI across ${best.total} ${best.sport.toUpperCase()} picks.`,
        sentiment: 'positive',
        action: `Focus more on ${best.sport.toUpperCase()} where you have a demonstrated edge.`,
        confidence: Math.min(85, best.total * 3),
        category: 'sport',
      })
    }

    if (worst.roi < -10) {
      insights.push({
        title: `${worst.sport.toUpperCase()} is dragging your record`,
        description: `${worst.roi.toFixed(1)}% ROI on ${worst.total} ${worst.sport.toUpperCase()} picks. ${worst.wins}/${worst.total} win rate.`,
        sentiment: 'negative',
        action: `Consider taking a break from ${worst.sport.toUpperCase()} or reducing your unit size for those picks.`,
        confidence: Math.min(80, worst.total * 3),
        category: 'sport',
      })
    }
  }

  return insights
}

// ---------------------------------------------------------------------------
// Odds range analysis
// ---------------------------------------------------------------------------

function oddsRangeInsights(picks: PickForInsight[]): Insight[] {
  const insights: Insight[] = []

  const favorites = picks.filter((p) => p.odds < -110)
  const dogs = picks.filter((p) => p.odds > 110)
  const coinFlips = picks.filter((p) => p.odds >= -110 && p.odds <= 110)

  const ranges = [
    { label: 'favorites', picks: favorites, desc: 'odds shorter than -110' },
    { label: 'underdogs', picks: dogs, desc: 'odds longer than +110' },
    { label: 'coin-flip odds', picks: coinFlips, desc: 'odds between -110 and +110' },
  ]

  for (const range of ranges) {
    if (range.picks.length < 5) continue
    const wins = range.picks.filter((p) => p.outcome === 'win').length
    const total = range.picks.length
    const winRate = wins / total
    const profit = range.picks.reduce((s, p) => s + (p.profit ?? 0), 0)
    const roi = (profit / range.picks.reduce((s, p) => s + p.units, 0)) * 100

    if (roi > 5) {
      insights.push({
        title: `Profitable on ${range.label}`,
        description: `${roi.toFixed(1)}% ROI on ${total} bets with ${range.desc}. Win rate: ${(winRate * 100).toFixed(1)}%.`,
        sentiment: 'positive',
        action: `You find value in ${range.label} — keep it up.`,
        confidence: Math.min(80, total * 2),
        category: 'odds-range',
      })
    } else if (roi < -15 && total >= 8) {
      insights.push({
        title: `Losing on ${range.label}`,
        description: `${roi.toFixed(1)}% ROI on ${total} bets with ${range.desc}.`,
        sentiment: 'negative',
        action: `Reevaluate your ${range.label} selections — the juice may be eating your edge.`,
        confidence: Math.min(75, total * 2),
        category: 'odds-range',
      })
    }
  }

  return insights
}

// ---------------------------------------------------------------------------
// CLV analysis
// ---------------------------------------------------------------------------

function clvInsights(picks: PickForInsight[]): Insight[] {
  const insights: Insight[] = []

  const withClosing = picks.filter(
    (p) => p.closing_odds != null && p.closing_odds !== 0
  )

  if (withClosing.length < 5) return insights

  // Calculate CLV for each pick
  let positiveCLV = 0
  for (const pick of withClosing) {
    const openImpl = impliedProb(pick.odds)
    const closeImpl = impliedProb(pick.closing_odds!)
    if (closeImpl > openImpl) positiveCLV++
  }

  const clvRate = positiveCLV / withClosing.length

  if (clvRate >= 0.55) {
    insights.push({
      title: 'Beating the closing line',
      description: `${(clvRate * 100).toFixed(0)}% of your picks had positive CLV (${positiveCLV}/${withClosing.length}). This is the strongest indicator of long-term profitability.`,
      sentiment: 'positive',
      action: 'Your timing is excellent. CLV is the single best predictor of long-term profit. Keep your current approach.',
      confidence: Math.min(90, withClosing.length * 4),
      category: 'clv',
    })
  } else if (clvRate < 0.40 && withClosing.length >= 10) {
    insights.push({
      title: 'Negative CLV trend',
      description: `Only ${(clvRate * 100).toFixed(0)}% of picks beat the closing line (${positiveCLV}/${withClosing.length}).`,
      sentiment: 'negative',
      action: 'Try placing bets earlier when lines are first posted. Sharper books (Pinnacle, Circa) set the market — if their line moves against you, your edge shrinks.',
      confidence: Math.min(85, withClosing.length * 4),
      category: 'clv',
    })
  }

  return insights
}

// ---------------------------------------------------------------------------
// Volume analysis
// ---------------------------------------------------------------------------

function volumeInsights(picks: PickForInsight[]): Insight[] {
  const insights: Insight[] = []

  // Check if high volume is hurting ROI
  const unitTotal = picks.reduce((s, p) => s + p.units, 0)
  const avgUnits = unitTotal / picks.length

  if (avgUnits > 2) {
    const bigBets = picks.filter((p) => p.units >= 3)
    const smallBets = picks.filter((p) => p.units <= 1)

    if (bigBets.length >= 3 && smallBets.length >= 3) {
      const bigROI = calcROI(bigBets)
      const smallROI = calcROI(smallBets)

      if (smallROI > bigROI + 10) {
        insights.push({
          title: 'Smaller bets outperform larger ones',
          description: `Your 1-unit bets have ${smallROI.toFixed(1)}% ROI vs ${bigROI.toFixed(1)}% ROI on 3+ unit bets.`,
          sentiment: 'negative',
          action: 'You might be over-betting when confident. Consider capping units at 2 or using strict Kelly sizing.',
          confidence: Math.min(70, (bigBets.length + smallBets.length) * 2),
          category: 'volume',
        })
      }
    }
  }

  // Volume trend
  if (picks.length >= 20) {
    const firstHalf = picks.slice(0, Math.floor(picks.length / 2))
    const secondHalf = picks.slice(Math.floor(picks.length / 2))
    const firstROI = calcROI(firstHalf)
    const secondROI = calcROI(secondHalf)

    if (secondROI > firstROI + 10) {
      insights.push({
        title: 'Improving over time',
        description: `Your recent ROI (${secondROI.toFixed(1)}%) is better than your early ROI (${firstROI.toFixed(1)}%).`,
        sentiment: 'positive',
        action: 'Your analysis is getting sharper. Stay disciplined and keep learning.',
        confidence: Math.min(75, picks.length),
        category: 'volume',
      })
    } else if (firstROI > secondROI + 15) {
      insights.push({
        title: 'Performance declining recently',
        description: `Recent ROI (${secondROI.toFixed(1)}%) is down from earlier (${firstROI.toFixed(1)}%).`,
        sentiment: 'negative',
        action: 'Consider reducing volume temporarily to reassess your approach. Sometimes less is more.',
        confidence: Math.min(70, picks.length),
        category: 'volume',
      })
    }
  }

  return insights
}

// ---------------------------------------------------------------------------
// Timing analysis
// ---------------------------------------------------------------------------

function timingInsights(picks: PickForInsight[]): Insight[] {
  const insights: Insight[] = []

  // Day of week analysis
  const byDay = groupBy(picks, (p) => {
    const day = new Date(p.game_date).getDay()
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
  })

  const dayStats = Object.entries(byDay)
    .map(([day, dayPicks]) => ({
      day,
      total: dayPicks.length,
      roi: calcROI(dayPicks),
    }))
    .filter((d) => d.total >= 3)

  if (dayStats.length >= 3) {
    const best = dayStats.reduce((a, b) => (a.roi > b.roi ? a : b))
    const worst = dayStats.reduce((a, b) => (a.roi < b.roi ? a : b))

    if (best.roi > 10 && best.total >= 5) {
      insights.push({
        title: `${best.day} is your best day`,
        description: `${best.roi.toFixed(1)}% ROI on ${best.total} ${best.day} picks.`,
        sentiment: 'positive',
        action: `Focus your best analysis on ${best.day} games.`,
        confidence: Math.min(65, best.total * 3),
        category: 'timing',
      })
    }

    if (worst.roi < -15 && worst.total >= 5) {
      insights.push({
        title: `Avoid ${worst.day} bets`,
        description: `${worst.roi.toFixed(1)}% ROI on ${worst.total} ${worst.day} picks.`,
        sentiment: 'negative',
        action: `Consider sitting out on ${worst.day}s or reducing your stakes.`,
        confidence: Math.min(60, worst.total * 3),
        category: 'timing',
      })
    }
  }

  return insights
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const k = key(item)
    if (!groups[k]) groups[k] = []
    groups[k].push(item)
  }
  return groups
}

function calcROI(picks: PickForInsight[]): number {
  const profit = picks.reduce((s, p) => s + (p.profit ?? 0), 0)
  const units = picks.reduce((s, p) => s + p.units, 0)
  return units > 0 ? (profit / units) * 100 : 0
}

function impliedProb(americanOdds: number): number {
  if (americanOdds < 0) return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
  return 100 / (americanOdds + 100)
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    moneyline: 'moneyline',
    spread: 'spread',
    over: 'over',
    under: 'under',
    prop: 'prop',
  }
  return labels[type] ?? type
}
