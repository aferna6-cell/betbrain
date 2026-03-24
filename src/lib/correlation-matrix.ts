/**
 * Correlation matrix — analyze which sports and bet types
 * have correlated performance (win/loss streaks together).
 *
 * Helps identify diversification or concentration risks.
 */

export interface CorrelationPair {
  categoryA: string
  categoryB: string
  correlation: number // -1 to 1
  sampleSize: number
  interpretation: 'strong_positive' | 'moderate_positive' | 'weak' | 'moderate_negative' | 'strong_negative'
}

export interface CorrelationResult {
  pairs: CorrelationPair[]
  categories: string[]
  matrix: number[][] // NxN correlation matrix
}

interface PickForCorrelation {
  sport: string
  pick_type: string
  outcome: string | null
  game_date: string
}

/**
 * Calculate correlation between sports/bet types based on daily outcomes.
 * Groups picks by category (sport or bet type), computes daily win rates,
 * then calculates Pearson correlation between category pairs.
 */
export function calcCorrelationMatrix(
  picks: PickForCorrelation[],
  groupBy: 'sport' | 'pick_type' = 'sport'
): CorrelationResult {
  const resolved = picks.filter((p) => p.outcome === 'win' || p.outcome === 'loss')
  if (resolved.length < 5) {
    return { pairs: [], categories: [], matrix: [] }
  }

  // Group by category
  const categories = [...new Set(resolved.map((p) => groupBy === 'sport' ? p.sport : p.pick_type))]
  if (categories.length < 2) {
    return { pairs: [], categories, matrix: [[1]] }
  }

  // Build daily outcome vectors per category
  // Each date gets a value: win rate for that day (0 to 1)
  const dates = [...new Set(resolved.map((p) => p.game_date.split('T')[0]))].sort()

  const vectors: Map<string, number[]> = new Map()
  for (const cat of categories) {
    const vec: number[] = []
    for (const date of dates) {
      const dayPicks = resolved.filter(
        (p) => (groupBy === 'sport' ? p.sport : p.pick_type) === cat && p.game_date.split('T')[0] === date
      )
      if (dayPicks.length === 0) {
        vec.push(NaN) // No picks this day
      } else {
        const wins = dayPicks.filter((p) => p.outcome === 'win').length
        vec.push(wins / dayPicks.length)
      }
    }
    vectors.set(cat, vec)
  }

  // Calculate Pearson correlation for each pair
  const pairs: CorrelationPair[] = []
  const matrix: number[][] = Array.from({ length: categories.length }, () =>
    Array(categories.length).fill(0)
  )

  for (let i = 0; i < categories.length; i++) {
    matrix[i][i] = 1
    for (let j = i + 1; j < categories.length; j++) {
      const vecA = vectors.get(categories[i])!
      const vecB = vectors.get(categories[j])!

      const { correlation, sampleSize } = pearsonCorrelation(vecA, vecB)
      matrix[i][j] = correlation
      matrix[j][i] = correlation

      const interpretation = interpretCorrelation(correlation)

      pairs.push({
        categoryA: categories[i],
        categoryB: categories[j],
        correlation: Math.round(correlation * 1000) / 1000,
        sampleSize,
        interpretation,
      })
    }
  }

  // Sort by absolute correlation descending
  pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))

  return { pairs, categories, matrix }
}

/**
 * Pearson correlation coefficient between two vectors.
 * Skips indices where either value is NaN.
 */
export function pearsonCorrelation(a: number[], b: number[]): { correlation: number; sampleSize: number } {
  // Filter to indices where both have values
  const validPairs: [number, number][] = []
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (!isNaN(a[i]) && !isNaN(b[i])) {
      validPairs.push([a[i], b[i]])
    }
  }

  if (validPairs.length < 3) {
    return { correlation: 0, sampleSize: validPairs.length }
  }

  const n = validPairs.length
  const meanA = validPairs.reduce((s, [x]) => s + x, 0) / n
  const meanB = validPairs.reduce((s, [, y]) => s + y, 0) / n

  let numerator = 0
  let denomA = 0
  let denomB = 0

  for (const [x, y] of validPairs) {
    const dx = x - meanA
    const dy = y - meanB
    numerator += dx * dy
    denomA += dx * dx
    denomB += dy * dy
  }

  const denom = Math.sqrt(denomA * denomB)
  if (denom === 0) return { correlation: 0, sampleSize: n }

  return {
    correlation: numerator / denom,
    sampleSize: n,
  }
}

function interpretCorrelation(r: number): CorrelationPair['interpretation'] {
  const abs = Math.abs(r)
  if (abs < 0.3) return 'weak'
  if (r > 0.6) return 'strong_positive'
  if (r > 0.3) return 'moderate_positive'
  if (r < -0.6) return 'strong_negative'
  return 'moderate_negative'
}
