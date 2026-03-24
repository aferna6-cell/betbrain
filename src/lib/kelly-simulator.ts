/**
 * Kelly Bankroll Simulator — Project bankroll trajectories with different Kelly fractions.
 *
 * Simulates N future bets at various Kelly fractions to show how aggressive
 * vs conservative sizing affects bankroll growth, volatility, and ruin risk.
 *
 * Uses seeded PRNG for reproducibility. Pure functions — no side effects.
 */

export interface KellySimConfig {
  /** Starting bankroll */
  startingBankroll: number
  /** Number of bets to simulate */
  numBets: number
  /** Win rate (0-1) */
  winRate: number
  /** Average odds (American) */
  avgOdds: number
  /** Number of simulation runs */
  simulations: number
  /** Random seed */
  seed?: number
}

export interface KellyTrajectory {
  /** Kelly fraction label (e.g., "Quarter Kelly") */
  label: string
  /** Kelly fraction (0-1) */
  fraction: number
  /** Median final bankroll */
  medianFinal: number
  /** 5th percentile (worst case) */
  p5Final: number
  /** 95th percentile (best case) */
  p95Final: number
  /** Average final bankroll */
  avgFinal: number
  /** Probability of ruin (dropping below 10% of starting) */
  ruinProbability: number
  /** Expected growth rate per bet */
  expectedGrowthRate: number
  /** Maximum drawdown (average across sims) */
  avgMaxDrawdown: number
  /** Median trajectory (bankroll at each step) */
  medianPath: number[]
}

export interface KellySimResult {
  config: KellySimConfig
  trajectories: KellyTrajectory[]
  /** Optimal full Kelly fraction */
  fullKellyFraction: number
  /** Recommendation */
  recommendation: string
}

/**
 * Seeded pseudo-random number generator (xorshift32).
 */
function createRNG(seed: number): () => number {
  let s = seed | 0
  if (s === 0) s = 1
  return () => {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

/**
 * Convert American odds to decimal payout multiplier.
 */
function oddsToDecimal(odds: number): number {
  if (odds > 0) return odds / 100
  return 100 / Math.abs(odds)
}

/**
 * Calculate the Kelly fraction for given win rate and odds.
 */
export function calculateKellyFraction(winRate: number, odds: number): number {
  const b = oddsToDecimal(odds) // net payout per $1
  const p = winRate
  const q = 1 - p
  const kelly = (b * p - q) / b
  return Math.max(0, kelly)
}

/**
 * Run a single simulation at a given Kelly fraction.
 */
function runSim(
  config: KellySimConfig,
  fraction: number,
  rng: () => number
): { finalBankroll: number; maxDrawdown: number; path: number[] } {
  let bankroll = config.startingBankroll
  let peak = bankroll
  let maxDrawdown = 0
  const path = [bankroll]
  const payout = oddsToDecimal(config.avgOdds)

  for (let i = 0; i < config.numBets; i++) {
    const betSize = bankroll * fraction
    if (bankroll <= 0) {
      path.push(0)
      continue
    }

    const isWin = rng() < config.winRate
    if (isWin) {
      bankroll += betSize * payout
    } else {
      bankroll -= betSize
    }

    bankroll = Math.max(0, bankroll)
    if (bankroll > peak) peak = bankroll
    const dd = peak > 0 ? (peak - bankroll) / peak : 0
    if (dd > maxDrawdown) maxDrawdown = dd
    path.push(bankroll)
  }

  return { finalBankroll: bankroll, maxDrawdown, path }
}

/**
 * Simulate a Kelly trajectory at a specific fraction.
 */
function simulateTrajectory(
  config: KellySimConfig,
  fraction: number,
  label: string,
  baseSeed: number
): KellyTrajectory {
  const finals: number[] = []
  const maxDDs: number[] = []
  const paths: number[][] = []

  for (let sim = 0; sim < config.simulations; sim++) {
    const rng = createRNG(baseSeed + sim * 7919 + Math.round(fraction * 10000))
    const result = runSim(config, fraction, rng)
    finals.push(result.finalBankroll)
    maxDDs.push(result.maxDrawdown)
    paths.push(result.path)
  }

  finals.sort((a, b) => a - b)

  const p5Idx = Math.floor(config.simulations * 0.05)
  const p50Idx = Math.floor(config.simulations * 0.5)
  const p95Idx = Math.floor(config.simulations * 0.95)

  const ruinCount = finals.filter((f) => f < config.startingBankroll * 0.1).length
  const avgFinal = finals.reduce((s, f) => s + f, 0) / finals.length
  const avgMaxDD = maxDDs.reduce((s, d) => s + d, 0) / maxDDs.length

  // Calculate expected growth rate
  const b = oddsToDecimal(config.avgOdds)
  const p = config.winRate
  const growthRate = p * Math.log(1 + fraction * b) + (1 - p) * Math.log(1 - fraction)
  const expectedGrowthRate = isFinite(growthRate) ? growthRate * 100 : 0

  // Build median path
  const medianPath: number[] = []
  for (let step = 0; step <= config.numBets; step++) {
    const stepValues = paths.map((p) => p[step] ?? 0).sort((a, b) => a - b)
    medianPath.push(stepValues[Math.floor(stepValues.length / 2)])
  }

  return {
    label,
    fraction,
    medianFinal: finals[p50Idx],
    p5Final: finals[p5Idx],
    p95Final: finals[p95Idx],
    avgFinal,
    ruinProbability: (ruinCount / config.simulations) * 100,
    expectedGrowthRate,
    avgMaxDrawdown: avgMaxDD * 100,
    medianPath,
  }
}

/**
 * Run the full Kelly simulator with multiple fractions.
 */
export function runKellySimulation(config: KellySimConfig): KellySimResult {
  const fullKelly = calculateKellyFraction(config.winRate, config.avgOdds)
  const seed = config.seed ?? 42

  const fractions = [
    { fraction: fullKelly * 0.25, label: 'Quarter Kelly' },
    { fraction: fullKelly * 0.5, label: 'Half Kelly' },
    { fraction: fullKelly * 0.75, label: 'Three-Quarter Kelly' },
    { fraction: fullKelly, label: 'Full Kelly' },
  ].filter((f) => f.fraction > 0 && f.fraction < 1)

  // Add a flat 2% option for comparison
  fractions.unshift({ fraction: 0.02, label: 'Flat 2%' })

  const trajectories = fractions.map((f) =>
    simulateTrajectory(config, f.fraction, f.label, seed)
  )

  // Find the fraction with highest median final that has < 5% ruin
  const safe = trajectories.filter((t) => t.ruinProbability < 5)
  const bestSafe = safe.length > 0
    ? safe.reduce((best, t) => (t.medianFinal > best.medianFinal ? t : best))
    : trajectories[0]

  let recommendation = ''
  if (fullKelly <= 0) {
    recommendation = 'Your edge is negative at these odds/win rate. No Kelly fraction is recommended. Focus on improving win rate or finding better lines.'
  } else if (bestSafe) {
    recommendation = `${bestSafe.label} (${(bestSafe.fraction * 100).toFixed(1)}% of bankroll) offers the best growth with acceptable risk. Expected max drawdown: ${bestSafe.avgMaxDrawdown.toFixed(0)}%.`
  }

  return {
    config,
    trajectories,
    fullKellyFraction: fullKelly,
    recommendation,
  }
}
