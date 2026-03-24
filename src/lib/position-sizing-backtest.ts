/**
 * Position Sizing Backtest
 *
 * Simulates historical performance with different unit sizing strategies.
 * Takes actual pick history and replays outcomes with various staking methods
 * to show what bankroll trajectory would have looked like.
 *
 * Strategies:
 * - Flat: Fixed unit size (e.g., 1% of starting bankroll)
 * - Percentage: Fixed % of current bankroll
 * - Kelly: Kelly criterion based on edge estimate
 * - Confidence-scaled: Units scale with stated confidence
 * - Progressive: Increase after losses (anti-Martingale: increase after wins)
 *
 * For informational purposes only. Not financial advice.
 */

export interface HistoricalPick {
  id: string
  odds: number // American odds
  units: number // Actual units wagered
  result: 'win' | 'loss' | 'push'
  confidence?: number // 1-5
  date?: string
}

export type SizingStrategy = 'flat' | 'percentage' | 'kelly' | 'confidence' | 'anti-martingale'

export interface StrategyConfig {
  strategy: SizingStrategy
  /** For flat: unit size. For percentage: % of bankroll. For kelly: fraction multiplier. */
  param: number
  label: string
}

export interface BacktestPoint {
  pickIndex: number
  bankroll: number
  units: number
  result: 'win' | 'loss' | 'push'
  profit: number
}

export interface BacktestResult {
  strategy: StrategyConfig
  /** Bankroll at each point */
  trajectory: BacktestPoint[]
  /** Final bankroll */
  finalBankroll: number
  /** Total profit/loss */
  totalProfit: number
  /** ROI percentage */
  roi: number
  /** Maximum bankroll reached */
  peak: number
  /** Maximum drawdown percentage from peak */
  maxDrawdownPct: number
  /** Total units wagered */
  totalUnitsWagered: number
  /** Sharpe-like ratio: avg return / std dev of returns */
  sharpeRatio: number
  /** Number of times bankroll went below starting */
  belowStartCount: number
  /** Went broke (bankroll <= 0) */
  wentBroke: boolean
}

export interface BacktestComparison {
  results: BacktestResult[]
  picks: HistoricalPick[]
  startingBankroll: number
  bestStrategy: string
  worstStrategy: string
}

const DEFAULT_STRATEGIES: StrategyConfig[] = [
  { strategy: 'flat', param: 1, label: 'Flat 1 unit' },
  { strategy: 'percentage', param: 2, label: '2% of bankroll' },
  { strategy: 'percentage', param: 5, label: '5% of bankroll' },
  { strategy: 'kelly', param: 0.25, label: 'Quarter Kelly' },
  { strategy: 'kelly', param: 0.5, label: 'Half Kelly' },
  { strategy: 'confidence', param: 1, label: 'Confidence-scaled' },
  { strategy: 'anti-martingale', param: 1.5, label: 'Anti-Martingale 1.5x' },
]

/**
 * Calculate payout multiplier from American odds.
 */
function payoutMultiplier(odds: number): number {
  if (odds > 0) return odds / 100
  return 100 / Math.abs(odds)
}

/**
 * Estimate edge from odds (rough: assume fair odds are -105 both sides).
 * For Kelly calculation.
 */
function estimateEdge(odds: number): number {
  const implied = odds < 0
    ? Math.abs(odds) / (Math.abs(odds) + 100)
    : 100 / (odds + 100)
  // Assume true probability is ~3-5% less than implied (typical vig)
  const vigAdjust = 0.03
  const trueProbEstimate = implied - vigAdjust
  const payout = payoutMultiplier(odds)
  // EV = p * payout - (1-p)
  return trueProbEstimate * payout - (1 - trueProbEstimate)
}

/**
 * Calculate units to wager based on strategy.
 */
function calculateUnits(
  strategy: StrategyConfig,
  currentBankroll: number,
  startingBankroll: number,
  pick: HistoricalPick,
  previousResult: 'win' | 'loss' | 'push' | null,
  previousUnits: number,
): number {
  const minBet = 0.1 // Minimum bet size

  switch (strategy.strategy) {
    case 'flat':
      return strategy.param

    case 'percentage':
      return Math.max(minBet, (strategy.param / 100) * currentBankroll)

    case 'kelly': {
      const edge = estimateEdge(pick.odds)
      const payout = payoutMultiplier(pick.odds)
      if (edge <= 0 || payout <= 0) return minBet
      const kellyFraction = edge / payout
      const adjustedKelly = kellyFraction * strategy.param
      const units = Math.max(minBet, adjustedKelly * currentBankroll)
      // Cap at 10% of bankroll
      return Math.min(units, currentBankroll * 0.1)
    }

    case 'confidence': {
      const conf = pick.confidence ?? 3
      // Scale: confidence 1 = 0.5 units, 5 = 2.5 units
      const scale = 0.5 + (conf - 1) * 0.5
      return Math.max(minBet, scale * strategy.param)
    }

    case 'anti-martingale': {
      // Increase after wins, reset after losses
      if (previousResult === 'win') {
        return Math.max(minBet, previousUnits * strategy.param)
      }
      return 1 // Reset to 1 unit after loss or first bet
    }

    default:
      return 1
  }
}

/**
 * Run a single backtest with one strategy.
 */
export function runBacktest(
  picks: HistoricalPick[],
  strategy: StrategyConfig,
  startingBankroll: number
): BacktestResult {
  let bankroll = startingBankroll
  let peak = startingBankroll
  let maxDrawdownPct = 0
  let totalUnitsWagered = 0
  let belowStartCount = 0
  let wentBroke = false
  const trajectory: BacktestPoint[] = []
  const returns: number[] = []
  let previousResult: 'win' | 'loss' | 'push' | null = null
  let previousUnits = 1

  for (let i = 0; i < picks.length; i++) {
    const pick = picks[i]

    if (bankroll <= 0) {
      wentBroke = true
      trajectory.push({ pickIndex: i, bankroll: 0, units: 0, result: pick.result, profit: 0 })
      continue
    }

    const units = calculateUnits(strategy, bankroll, startingBankroll, pick, previousResult, previousUnits)
    totalUnitsWagered += units

    let profit = 0
    if (pick.result === 'win') {
      profit = units * payoutMultiplier(pick.odds)
    } else if (pick.result === 'loss') {
      profit = -units
    }
    // push = 0

    bankroll += profit
    returns.push(profit / startingBankroll)

    if (bankroll > peak) peak = bankroll
    const drawdown = peak > 0 ? (peak - bankroll) / peak * 100 : 0
    if (drawdown > maxDrawdownPct) maxDrawdownPct = drawdown
    if (bankroll < startingBankroll) belowStartCount++

    trajectory.push({
      pickIndex: i,
      bankroll: Math.round(bankroll * 100) / 100,
      units: Math.round(units * 100) / 100,
      result: pick.result,
      profit: Math.round(profit * 100) / 100,
    })

    previousResult = pick.result
    previousUnits = units
  }

  const totalProfit = bankroll - startingBankroll
  const roi = startingBankroll > 0 ? (totalProfit / startingBankroll) * 100 : 0

  // Sharpe ratio
  const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length)
    : 0
  const sharpeRatio = stdReturn > 0 ? avgReturn / stdReturn : 0

  return {
    strategy,
    trajectory,
    finalBankroll: Math.round(bankroll * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    peak: Math.round(peak * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    totalUnitsWagered: Math.round(totalUnitsWagered * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 1000) / 1000,
    belowStartCount,
    wentBroke,
  }
}

/**
 * Compare multiple sizing strategies on the same pick history.
 */
export function compareStrategies(
  picks: HistoricalPick[],
  startingBankroll: number,
  strategies?: StrategyConfig[]
): BacktestComparison {
  const strats = strategies ?? DEFAULT_STRATEGIES

  const results = strats.map(s => runBacktest(picks, s, startingBankroll))

  const sorted = [...results].sort((a, b) => b.finalBankroll - a.finalBankroll)

  return {
    results,
    picks,
    startingBankroll,
    bestStrategy: sorted[0]?.strategy.label ?? '',
    worstStrategy: sorted[sorted.length - 1]?.strategy.label ?? '',
  }
}

export { DEFAULT_STRATEGIES }
