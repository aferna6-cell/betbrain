/**
 * Bankroll management utilities.
 *
 * Calculates running balance, drawdown, and Kelly criterion
 * from a user's pick history.
 */

export interface BankrollConfig {
  startingBalance: number
  unitSize: number
}

export interface BankrollSnapshot {
  pickId: string
  date: string
  balanceBefore: number
  balanceAfter: number
  profit: number
  units: number
  runningProfit: number
}

export interface BankrollStats {
  currentBalance: number
  startingBalance: number
  totalProfit: number
  totalUnitsWagered: number
  roi: number
  peakBalance: number
  troughBalance: number
  maxDrawdown: number
  maxDrawdownPct: number
  currentStreak: number
  bestStreak: number
  worstStreak: number
  snapshots: BankrollSnapshot[]
}

/**
 * Calculates full bankroll history and stats from resolved picks.
 */
export function calculateBankrollStats(
  picks: Array<{
    id: string
    game_date: string
    outcome: string | null
    profit: number | null
    units: number
  }>,
  config: BankrollConfig
): BankrollStats {
  // Only resolved picks, sorted chronologically
  const resolved = picks
    .filter((p) => p.outcome && p.outcome !== 'pending' && p.profit != null)
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())

  let balance = config.startingBalance
  let peakBalance = config.startingBalance
  let troughBalance = config.startingBalance
  let maxDrawdown = 0
  let maxDrawdownPct = 0
  let runningProfit = 0
  let totalUnitsWagered = 0
  let currentStreak = 0
  let bestStreak = 0
  let worstStreak = 0

  const snapshots: BankrollSnapshot[] = []

  for (const pick of resolved) {
    const profit = (pick.profit ?? 0) * config.unitSize
    const balanceBefore = balance
    balance += profit
    runningProfit += profit
    totalUnitsWagered += pick.units

    snapshots.push({
      pickId: pick.id,
      date: pick.game_date,
      balanceBefore,
      balanceAfter: balance,
      profit,
      units: pick.units,
      runningProfit,
    })

    // Track peak/trough
    if (balance > peakBalance) peakBalance = balance
    if (balance < troughBalance) troughBalance = balance

    // Track drawdown from peak
    const drawdown = peakBalance - balance
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      maxDrawdownPct = peakBalance > 0
        ? round((drawdown / peakBalance) * 100, 1)
        : 0
    }

    // Track streaks
    if (pick.outcome === 'win') {
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1
    } else if (pick.outcome === 'loss') {
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1
    }
    if (currentStreak > bestStreak) bestStreak = currentStreak
    if (currentStreak < worstStreak) worstStreak = currentStreak
  }

  const unitsDollars = totalUnitsWagered * config.unitSize
  const roi = unitsDollars > 0 ? round((runningProfit / unitsDollars) * 100, 2) : 0

  return {
    currentBalance: round(balance, 2),
    startingBalance: config.startingBalance,
    totalProfit: round(runningProfit, 2),
    totalUnitsWagered,
    roi,
    peakBalance: round(peakBalance, 2),
    troughBalance: round(troughBalance, 2),
    maxDrawdown: round(maxDrawdown, 2),
    maxDrawdownPct,
    currentStreak,
    bestStreak,
    worstStreak,
    snapshots,
  }
}

/**
 * Kelly Criterion: optimal bet sizing given edge and odds.
 * Returns fraction of bankroll to wager (0-1).
 *
 * @param winProbability - Estimated probability of winning (0-1)
 * @param americanOdds - The odds in American format
 * @returns Recommended fraction of bankroll (capped at 0.25 for safety)
 */
export function kellyCriterion(winProbability: number, americanOdds: number): number {
  if (winProbability <= 0 || winProbability >= 1) return 0

  // Convert to decimal odds
  const decimalOdds = americanOdds >= 100
    ? americanOdds / 100 + 1
    : 100 / Math.abs(americanOdds) + 1

  const b = decimalOdds - 1 // net fractional odds
  const q = 1 - winProbability

  const kelly = (b * winProbability - q) / b

  // Cap at 25% (full Kelly is too aggressive for most bettors)
  return Math.max(0, Math.min(round(kelly, 4), 0.25))
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
