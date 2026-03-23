/**
 * Streak tracking and badge calculation.
 * Pure functions — no database or API calls.
 */

export interface StreakInfo {
  /** Current streak type: 'win', 'loss', or null if no resolved picks */
  currentType: 'win' | 'loss' | null
  /** Length of current streak */
  currentLength: number
  /** Longest win streak ever */
  longestWinStreak: number
  /** Longest loss streak ever */
  longestLossStreak: number
  /** Best week: { weekLabel, wins, losses } */
  bestWeek: { weekLabel: string; wins: number; losses: number; net: number } | null
}

export interface Badge {
  id: string
  label: string
  description: string
  icon: string
  /** When it was first earned (ISO date from the pick that triggered it) */
  earnedAt: string | null
}

interface PickForStreak {
  outcome: string | null
  game_date: string
  resolved_at?: string | null
  profit?: number | null
  odds?: number
  closing_odds?: number | null
}

/**
 * Calculate streak info from a list of picks sorted by game_date descending.
 */
export function calculateStreaks(picks: PickForStreak[]): StreakInfo {
  // Work with resolved picks in chronological order (oldest first)
  const resolved = picks
    .filter((p) => p.outcome === 'win' || p.outcome === 'loss')
    .sort((a, b) => {
      const dateA = a.resolved_at || a.game_date
      const dateB = b.resolved_at || b.game_date
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

  if (resolved.length === 0) {
    return {
      currentType: null,
      currentLength: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      bestWeek: null,
    }
  }

  // Current streak (from most recent backwards)
  let currentType: 'win' | 'loss' = resolved[resolved.length - 1].outcome as 'win' | 'loss'
  let currentLength = 0
  for (let i = resolved.length - 1; i >= 0; i--) {
    if (resolved[i].outcome === currentType) {
      currentLength++
    } else {
      break
    }
  }

  // Longest streaks
  let longestWin = 0
  let longestLoss = 0
  let runType = resolved[0].outcome
  let runLen = 1

  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i].outcome === runType) {
      runLen++
    } else {
      if (runType === 'win') longestWin = Math.max(longestWin, runLen)
      if (runType === 'loss') longestLoss = Math.max(longestLoss, runLen)
      runType = resolved[i].outcome
      runLen = 1
    }
  }
  // Final run
  if (runType === 'win') longestWin = Math.max(longestWin, runLen)
  if (runType === 'loss') longestLoss = Math.max(longestLoss, runLen)

  // Best week (Mon-Sun buckets)
  const bestWeek = calculateBestWeek(resolved)

  return {
    currentType,
    currentLength,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    bestWeek,
  }
}

/**
 * Find the best week by net wins (wins - losses).
 */
function calculateBestWeek(
  resolved: PickForStreak[]
): StreakInfo['bestWeek'] {
  if (resolved.length === 0) return null

  // Group by ISO week (Mon-Sun)
  const weekMap = new Map<string, { wins: number; losses: number }>()

  for (const pick of resolved) {
    const date = new Date(pick.game_date)
    const weekLabel = getWeekLabel(date)
    const entry = weekMap.get(weekLabel) ?? { wins: 0, losses: 0 }
    if (pick.outcome === 'win') entry.wins++
    else if (pick.outcome === 'loss') entry.losses++
    weekMap.set(weekLabel, entry)
  }

  let best: StreakInfo['bestWeek'] = null
  for (const [weekLabel, { wins, losses }] of weekMap) {
    const net = wins - losses
    if (!best || net > best.net || (net === best.net && wins > best.wins)) {
      best = { weekLabel, wins, losses, net }
    }
  }

  return best
}

/**
 * Get a human-readable week label from a date, e.g. "Mar 17 - Mar 23"
 */
export function getWeekLabel(date: Date): string {
  // Get Monday of the week
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  const monday = new Date(d.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (dt: Date) =>
    dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return `${fmt(monday)} - ${fmt(sunday)}`
}

/**
 * Determine which badges a user has earned based on their picks.
 */
export function calculateBadges(picks: PickForStreak[]): Badge[] {
  const streaks = calculateStreaks(picks)
  const resolved = picks.filter(
    (p) => p.outcome === 'win' || p.outcome === 'loss'
  )
  const wins = resolved.filter((p) => p.outcome === 'win')
  const badges: Badge[] = []

  // Find earliest pick date for each badge trigger
  const lastWinDate = wins.length > 0
    ? wins.sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())[0].game_date
    : null

  // --- Streak badges ---
  if (streaks.longestWinStreak >= 3) {
    badges.push({
      id: 'hot-hand',
      label: 'Hot Hand',
      description: '3+ win streak',
      icon: 'flame',
      earnedAt: lastWinDate,
    })
  }

  if (streaks.longestWinStreak >= 5) {
    badges.push({
      id: 'heater',
      label: '5-Game Heater',
      description: '5+ win streak',
      icon: 'fire',
      earnedAt: lastWinDate,
    })
  }

  if (streaks.longestWinStreak >= 10) {
    badges.push({
      id: 'on-fire',
      label: 'On Fire',
      description: '10+ win streak',
      icon: 'zap',
      earnedAt: lastWinDate,
    })
  }

  // --- Volume badges ---
  if (resolved.length >= 10) {
    badges.push({
      id: 'getting-started',
      label: 'Getting Started',
      description: '10+ resolved picks',
      icon: 'target',
      earnedAt: resolved[9]?.game_date ?? null,
    })
  }

  if (resolved.length >= 50) {
    badges.push({
      id: 'consistent',
      label: 'Consistent',
      description: '50+ resolved picks',
      icon: 'bar-chart',
      earnedAt: resolved[49]?.game_date ?? null,
    })
  }

  if (resolved.length >= 100) {
    badges.push({
      id: 'centurion',
      label: 'Centurion',
      description: '100+ resolved picks',
      icon: 'trophy',
      earnedAt: resolved[99]?.game_date ?? null,
    })
  }

  // --- Profitability badges ---
  const totalProfit = resolved.reduce((s, p) => s + (p.profit ?? 0), 0)
  const totalUnits = resolved.reduce((s, p) => s + 1, 0) // simplified
  const roi = totalUnits > 0 ? (totalProfit / totalUnits) * 100 : 0

  if (roi > 0 && resolved.length >= 20) {
    badges.push({
      id: 'profitable',
      label: 'In the Green',
      description: 'Positive ROI with 20+ picks',
      icon: 'trending-up',
      earnedAt: lastWinDate,
    })
  }

  if (roi >= 10 && resolved.length >= 30) {
    badges.push({
      id: 'sharp',
      label: 'Sharp',
      description: '10%+ ROI with 30+ picks',
      icon: 'brain',
      earnedAt: lastWinDate,
    })
  }

  // --- CLV badges ---
  const clvPicks = picks.filter(
    (p) => p.closing_odds != null && p.odds != null
  )
  const posClv = clvPicks.filter((p) => {
    if (!p.closing_odds || !p.odds) return false
    // Positive CLV means you got better odds than close
    const openImplied = americanToImplied(p.odds)
    const closeImplied = americanToImplied(p.closing_odds)
    return closeImplied > openImplied
  })

  if (clvPicks.length >= 10 && posClv.length / clvPicks.length >= 0.6) {
    badges.push({
      id: 'clv-king',
      label: 'CLV King',
      description: '60%+ positive CLV rate (10+ tracked)',
      icon: 'crown',
      earnedAt: lastWinDate,
    })
  }

  // --- Best week badge ---
  if (streaks.bestWeek && streaks.bestWeek.net >= 5) {
    badges.push({
      id: 'best-week',
      label: 'Perfect Week',
      description: '5+ net wins in a single week',
      icon: 'calendar',
      earnedAt: lastWinDate,
    })
  }

  return badges
}

/**
 * Convert American odds to implied probability.
 */
function americanToImplied(odds: number): number {
  if (odds >= 100) return 100 / (odds + 100)
  if (odds <= -100) return Math.abs(odds) / (Math.abs(odds) + 100)
  return 0.5
}
