/**
 * Bet Timing Optimizer — Analyze when bets are most profitable.
 *
 * Tracks time-to-game (how far before game start a pick was placed) and
 * correlates with outcomes. Identifies sweet spots for each sport/market.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface TimingBucket {
  /** Human-readable label */
  label: string
  /** Min hours before game */
  minHours: number
  /** Max hours before game (Infinity for last bucket) */
  maxHours: number
  wins: number
  losses: number
  pushes: number
  total: number
  winRate: number | null
  profit: number
  roi: number
  avgOdds: number | null
}

export interface TimingAnalysis {
  buckets: TimingBucket[]
  /** Best timing window */
  bestBucket: TimingBucket | null
  /** Worst timing window */
  worstBucket: TimingBucket | null
  /** Average hours before game across all picks */
  avgHoursBeforeGame: number | null
  /** Sport-specific analysis */
  bySport: SportTimingAnalysis[]
}

export interface SportTimingAnalysis {
  sport: string
  bestBucket: TimingBucket | null
  avgHoursBeforeGame: number | null
  totalPicks: number
}

interface PickForTiming {
  outcome: string | null
  profit: number | null
  units: number
  odds: number
  sport?: string
  /** When the pick was created */
  created_at?: string
  /** When the game starts */
  game_date?: string
}

// Timing buckets
const BUCKET_DEFS: { label: string; minHours: number; maxHours: number }[] = [
  { label: 'Game day (<6h)', minHours: 0, maxHours: 6 },
  { label: 'Morning of (6-12h)', minHours: 6, maxHours: 12 },
  { label: 'Night before (12-24h)', minHours: 12, maxHours: 24 },
  { label: '1-2 days early', minHours: 24, maxHours: 48 },
  { label: '2-3 days early', minHours: 48, maxHours: 72 },
  { label: '3+ days early', minHours: 72, maxHours: Infinity },
]

/**
 * Calculate hours between pick creation and game start.
 * Returns null if either date is missing.
 */
export function calcHoursBeforeGame(
  createdAt: string | undefined,
  gameDate: string | undefined
): number | null {
  if (!createdAt || !gameDate) return null
  const created = new Date(createdAt).getTime()
  const game = new Date(gameDate).getTime()
  if (isNaN(created) || isNaN(game)) return null
  const diffMs = game - created
  if (diffMs < 0) return 0 // picked after game start (live bet)
  return diffMs / (1000 * 60 * 60)
}

/**
 * Assign a pick to a timing bucket based on hours before game.
 */
export function getBucketForHours(hours: number): string {
  for (const bucket of BUCKET_DEFS) {
    if (hours >= bucket.minHours && hours < bucket.maxHours) {
      return bucket.label
    }
  }
  return BUCKET_DEFS[BUCKET_DEFS.length - 1].label
}

/**
 * Full timing analysis across all picks.
 */
export function analyzeTimingPerformance(
  picks: PickForTiming[]
): TimingAnalysis {
  const resolved = picks.filter(
    (p) =>
      (p.outcome === 'win' || p.outcome === 'loss' || p.outcome === 'push') &&
      p.created_at &&
      p.game_date
  )

  // Initialize buckets
  const bucketMap = new Map<string, {
    wins: number; losses: number; pushes: number;
    totalProfit: number; totalUnits: number; totalOdds: number; count: number;
    def: typeof BUCKET_DEFS[0]
  }>()
  for (const def of BUCKET_DEFS) {
    bucketMap.set(def.label, {
      wins: 0, losses: 0, pushes: 0,
      totalProfit: 0, totalUnits: 0, totalOdds: 0, count: 0,
      def,
    })
  }

  let totalHours = 0
  let hoursCount = 0

  for (const pick of resolved) {
    const hours = calcHoursBeforeGame(pick.created_at, pick.game_date)
    if (hours == null) continue

    totalHours += hours
    hoursCount++

    const bucketLabel = getBucketForHours(hours)
    const bucket = bucketMap.get(bucketLabel)!

    bucket.count++
    if (pick.outcome === 'win') bucket.wins++
    else if (pick.outcome === 'loss') bucket.losses++
    else if (pick.outcome === 'push') bucket.pushes++
    if (pick.profit != null) bucket.totalProfit += pick.profit
    bucket.totalUnits += pick.units
    bucket.totalOdds += pick.odds
  }

  const buckets: TimingBucket[] = BUCKET_DEFS.map((def) => {
    const b = bucketMap.get(def.label)!
    const resolved = b.wins + b.losses + b.pushes
    return {
      label: def.label,
      minHours: def.minHours,
      maxHours: def.maxHours,
      wins: b.wins,
      losses: b.losses,
      pushes: b.pushes,
      total: b.count,
      winRate: resolved > 0 ? (b.wins / resolved) * 100 : null,
      profit: b.totalProfit,
      roi: b.totalUnits > 0 ? (b.totalProfit / b.totalUnits) * 100 : 0,
      avgOdds: b.count > 0 ? b.totalOdds / b.count : null,
    }
  })

  const withResults = buckets.filter((b) => b.wins + b.losses > 0)
  const sortedByROI = [...withResults].sort((a, b) => b.roi - a.roi)

  // Sport-specific analysis
  const sportMap = new Map<string, PickForTiming[]>()
  for (const pick of resolved) {
    const sport = pick.sport || 'unknown'
    if (!sportMap.has(sport)) sportMap.set(sport, [])
    sportMap.get(sport)!.push(pick)
  }

  const bySport: SportTimingAnalysis[] = []
  for (const [sport, sportPicks] of sportMap) {
    const sportBuckets = new Map<string, { wins: number; losses: number; profit: number; units: number }>()
    let sportHours = 0
    let sportHoursCount = 0

    for (const pick of sportPicks) {
      const hours = calcHoursBeforeGame(pick.created_at, pick.game_date)
      if (hours == null) continue
      sportHours += hours
      sportHoursCount++

      const label = getBucketForHours(hours)
      if (!sportBuckets.has(label)) {
        sportBuckets.set(label, { wins: 0, losses: 0, profit: 0, units: 0 })
      }
      const sb = sportBuckets.get(label)!
      if (pick.outcome === 'win') sb.wins++
      else if (pick.outcome === 'loss') sb.losses++
      if (pick.profit != null) sb.profit += pick.profit
      sb.units += pick.units
    }

    let bestLabel: string | null = null
    let bestROI = -Infinity
    for (const [label, sb] of sportBuckets) {
      if (sb.wins + sb.losses === 0) continue
      const roi = sb.units > 0 ? (sb.profit / sb.units) * 100 : 0
      if (roi > bestROI) {
        bestROI = roi
        bestLabel = label
      }
    }

    const bestDef = bestLabel ? BUCKET_DEFS.find((d) => d.label === bestLabel) : null
    const bestSb = bestLabel ? sportBuckets.get(bestLabel)! : null

    bySport.push({
      sport,
      bestBucket: bestDef && bestSb
        ? {
            label: bestDef.label,
            minHours: bestDef.minHours,
            maxHours: bestDef.maxHours,
            wins: bestSb.wins,
            losses: bestSb.losses,
            pushes: 0,
            total: bestSb.wins + bestSb.losses,
            winRate:
              bestSb.wins + bestSb.losses > 0
                ? (bestSb.wins / (bestSb.wins + bestSb.losses)) * 100
                : null,
            profit: bestSb.profit,
            roi: bestROI,
            avgOdds: null,
          }
        : null,
      avgHoursBeforeGame: sportHoursCount > 0 ? sportHours / sportHoursCount : null,
      totalPicks: sportPicks.length,
    })
  }

  return {
    buckets,
    bestBucket: sortedByROI.length > 0 ? sortedByROI[0] : null,
    worstBucket: sortedByROI.length > 0 ? sortedByROI[sortedByROI.length - 1] : null,
    avgHoursBeforeGame: hoursCount > 0 ? totalHours / hoursCount : null,
    bySport: bySport.sort((a, b) => b.totalPicks - a.totalPicks),
  }
}

/**
 * Get a timing recommendation based on analysis.
 */
export function getTimingRecommendation(analysis: TimingAnalysis): string {
  if (!analysis.bestBucket) {
    return 'Not enough data. Log picks with timestamps to get timing insights.'
  }

  const best = analysis.bestBucket
  const worst = analysis.worstBucket

  let rec = `Your best results come from betting "${best.label}" `
  rec += `(${best.winRate?.toFixed(0)}% win rate, ${best.roi > 0 ? '+' : ''}${best.roi.toFixed(1)}% ROI). `

  if (worst && worst.label !== best.label && worst.roi < 0) {
    rec += `Avoid "${worst.label}" where you're at ${worst.roi.toFixed(1)}% ROI. `
  }

  if (analysis.avgHoursBeforeGame != null) {
    const avgH = analysis.avgHoursBeforeGame
    if (avgH < 6) {
      rec += 'You tend to bet very close to game time — consider looking at lines earlier for softer numbers.'
    } else if (avgH > 48) {
      rec += 'You bet early, which can mean softer lines but also more variance from lineup changes.'
    }
  }

  return rec
}
