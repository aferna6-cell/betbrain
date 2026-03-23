/**
 * Monte Carlo Bankroll Simulator
 *
 * Projects likely bankroll outcomes over N future bets using
 * historical win rate, average odds, and unit sizing.
 *
 * Runs many random simulations to estimate:
 * - Median expected bankroll
 * - Best/worst case scenarios (5th/95th percentile)
 * - Probability of ruin (going bust)
 * - Probability of reaching a profit target
 *
 * Pure functions — no API calls.
 */

export interface SimulationConfig {
  /** Starting bankroll in units */
  startingBankroll: number
  /** Historical win rate (0-1, e.g. 0.55 = 55%) */
  winRate: number
  /** Average odds (American, e.g. -110) */
  avgOdds: number
  /** Units per bet */
  unitSize: number
  /** Number of future bets to simulate */
  numBets: number
  /** Number of simulation runs */
  numSimulations: number
  /** Stop simulation if bankroll drops to 0 */
  enableRuin?: boolean
}

export interface SimulationResult {
  /** Median final bankroll */
  median: number
  /** 5th percentile (bad case) */
  p5: number
  /** 25th percentile */
  p25: number
  /** 75th percentile */
  p75: number
  /** 95th percentile (good case) */
  p95: number
  /** Average final bankroll */
  mean: number
  /** Probability of ending up in profit (%) */
  profitProbability: number
  /** Probability of ruin / going bust (%) */
  ruinProbability: number
  /** Probability of doubling starting bankroll (%) */
  doubleProbability: number
  /** Expected ROI over the period (%) */
  expectedROI: number
  /** Bankroll trajectory snapshots (percentiles at each bet) */
  trajectories: TrajectoryPoint[]
  /** Config used for this simulation */
  config: SimulationConfig
}

export interface TrajectoryPoint {
  bet: number
  p5: number
  p25: number
  median: number
  p75: number
  p95: number
}

const DEFAULT_SIMULATIONS = 1000
const MAX_SIMULATIONS = 5000
const MAX_BETS = 1000
const TRAJECTORY_SAMPLE_INTERVAL = 5 // Sample every N bets for trajectory chart

/**
 * Calculate profit from a single bet.
 */
function calcBetProfit(won: boolean, odds: number, units: number): number {
  if (!won) return -units

  if (odds >= 100) {
    return units * (odds / 100)
  }
  // Negative odds (e.g., -110)
  return units * (100 / Math.abs(odds))
}

/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Allows reproducible simulations when seed is provided.
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Run Monte Carlo simulation of future bets.
 */
export function runSimulation(config: SimulationConfig, seed?: number): SimulationResult {
  const {
    startingBankroll,
    winRate,
    avgOdds,
    unitSize,
    numBets: rawNumBets,
    numSimulations: rawNumSims,
    enableRuin = true,
  } = config

  const numBets = Math.min(rawNumBets, MAX_BETS)
  const numSimulations = Math.min(rawNumSims || DEFAULT_SIMULATIONS, MAX_SIMULATIONS)

  // Validate
  if (startingBankroll <= 0 || winRate <= 0 || winRate >= 1 || unitSize <= 0 || numBets <= 0) {
    return emptyResult(config)
  }

  const rng = seed != null ? mulberry32(seed) : () => Math.random()
  const finalBankrolls: number[] = []
  let ruinCount = 0
  let profitCount = 0
  let doubleCount = 0

  // Trajectory tracking
  const samplePoints = new Set<number>()
  for (let b = TRAJECTORY_SAMPLE_INTERVAL; b <= numBets; b += TRAJECTORY_SAMPLE_INTERVAL) {
    samplePoints.add(b)
  }
  samplePoints.add(numBets)

  const trajectoryBankrolls: Map<number, number[]> = new Map()
  for (const pt of samplePoints) {
    trajectoryBankrolls.set(pt, [])
  }

  // Run simulations
  for (let sim = 0; sim < numSimulations; sim++) {
    let bankroll = startingBankroll
    let ruined = false

    for (let bet = 1; bet <= numBets; bet++) {
      if (enableRuin && bankroll < unitSize) {
        ruined = true
        // Fill remaining trajectory points with 0
        for (let remaining = bet; remaining <= numBets; remaining++) {
          if (samplePoints.has(remaining)) {
            trajectoryBankrolls.get(remaining)!.push(0)
          }
        }
        break
      }

      const won = rng() < winRate
      bankroll += calcBetProfit(won, avgOdds, unitSize)
      bankroll = Math.round(bankroll * 100) / 100

      if (samplePoints.has(bet)) {
        trajectoryBankrolls.get(bet)!.push(bankroll)
      }
    }

    if (ruined) {
      finalBankrolls.push(0)
      ruinCount++
    } else {
      finalBankrolls.push(bankroll)
      if (bankroll > startingBankroll) profitCount++
      if (bankroll >= startingBankroll * 2) doubleCount++
    }
  }

  // Sort for percentile calculations
  finalBankrolls.sort((a, b) => a - b)

  const percentile = (p: number) => {
    const idx = Math.floor((p / 100) * finalBankrolls.length)
    return finalBankrolls[Math.min(idx, finalBankrolls.length - 1)]
  }

  const meanBankroll =
    finalBankrolls.reduce((s, v) => s + v, 0) / finalBankrolls.length

  // Build trajectory
  const trajectories: TrajectoryPoint[] = []
  for (const bet of Array.from(samplePoints).sort((a, b) => a - b)) {
    const values = trajectoryBankrolls.get(bet)!.sort((a, b) => a - b)
    if (values.length === 0) continue
    const ptile = (p: number) => {
      const idx = Math.floor((p / 100) * values.length)
      return values[Math.min(idx, values.length - 1)]
    }
    trajectories.push({
      bet,
      p5: round(ptile(5)),
      p25: round(ptile(25)),
      median: round(ptile(50)),
      p75: round(ptile(75)),
      p95: round(ptile(95)),
    })
  }

  return {
    median: round(percentile(50)),
    p5: round(percentile(5)),
    p25: round(percentile(25)),
    p75: round(percentile(75)),
    p95: round(percentile(95)),
    mean: round(meanBankroll),
    profitProbability: round((profitCount / numSimulations) * 100),
    ruinProbability: round((ruinCount / numSimulations) * 100),
    doubleProbability: round((doubleCount / numSimulations) * 100),
    expectedROI: round(((meanBankroll - startingBankroll) / startingBankroll) * 100),
    trajectories,
    config: { ...config, numBets, numSimulations },
  }
}

function emptyResult(config: SimulationConfig): SimulationResult {
  return {
    median: config.startingBankroll,
    p5: config.startingBankroll,
    p25: config.startingBankroll,
    p75: config.startingBankroll,
    p95: config.startingBankroll,
    mean: config.startingBankroll,
    profitProbability: 0,
    ruinProbability: 0,
    doubleProbability: 0,
    expectedROI: 0,
    trajectories: [],
    config,
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * Derive simulation config from historical pick data.
 */
export function deriveConfigFromPicks(
  picks: Array<{ outcome: string | null; odds: number; units: number }>,
  startingBankroll: number,
  numBets: number = 100
): SimulationConfig {
  const resolved = picks.filter(
    (p) => p.outcome === 'win' || p.outcome === 'loss'
  )

  if (resolved.length === 0) {
    return {
      startingBankroll,
      winRate: 0.5,
      avgOdds: -110,
      unitSize: 1,
      numBets,
      numSimulations: DEFAULT_SIMULATIONS,
    }
  }

  const wins = resolved.filter((p) => p.outcome === 'win').length
  const winRate = wins / resolved.length
  const avgOdds = Math.round(
    resolved.reduce((s, p) => s + p.odds, 0) / resolved.length
  )
  const avgUnits =
    Math.round(
      (resolved.reduce((s, p) => s + p.units, 0) / resolved.length) * 100
    ) / 100

  return {
    startingBankroll,
    winRate,
    avgOdds,
    unitSize: avgUnits,
    numBets,
    numSimulations: DEFAULT_SIMULATIONS,
  }
}
