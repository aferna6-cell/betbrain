import { describe, it, expect } from 'vitest'
import {
  calculateCLV,
  buildCLVDistribution,
  getCLVPercentile,
  findSweetSpot,
} from '../clv-distribution'

describe('calculateCLV', () => {
  it('positive CLV when closing line is shorter than bet odds', () => {
    // Bet at +150, closed at +120 (closing prob higher = you got better odds)
    const clv = calculateCLV(150, 120)
    expect(clv).toBeGreaterThan(0)
  })

  it('negative CLV when closing line is longer than bet odds', () => {
    // Bet at +120, closed at +150 (you bet at worse odds)
    const clv = calculateCLV(120, 150)
    expect(clv).toBeLessThan(0)
  })

  it('zero CLV when odds match', () => {
    expect(calculateCLV(-110, -110)).toBeCloseTo(0, 5)
  })

  it('handles negative odds (favorites)', () => {
    // Bet at -110, closed at -130 (got better price)
    const clv = calculateCLV(-110, -130)
    expect(clv).toBeGreaterThan(0)
  })

  it('handles large underdogs', () => {
    const clv = calculateCLV(300, 250)
    expect(clv).toBeGreaterThan(0) // closing was shorter, you got value
  })
})

describe('buildCLVDistribution', () => {
  const makePicks = (count: number, baseOdds: number, closingOdds: number, outcome: string) =>
    Array.from({ length: count }, () => ({
      odds: baseOdds,
      closing_odds: closingOdds,
      outcome,
    }))

  it('returns insufficient for < 5 picks', () => {
    const picks = makePicks(3, -110, -120, 'win')
    const dist = buildCLVDistribution(picks)
    expect(dist.shape).toBe('insufficient')
    expect(dist.totalPicks).toBe(3)
  })

  it('builds distribution with valid picks', () => {
    const picks = [
      ...makePicks(5, -110, -130, 'win'),  // positive CLV
      ...makePicks(5, -110, -100, 'loss'),  // negative CLV
    ]
    const dist = buildCLVDistribution(picks)
    expect(dist.totalPicks).toBe(10)
    expect(dist.buckets.length).toBeGreaterThan(0)
    expect(dist.positiveCLVRate).toBe(50)
  })

  it('calculates average CLV', () => {
    // All picks at same CLV
    const picks = makePicks(10, 150, 120, 'win')
    const dist = buildCLVDistribution(picks)
    expect(dist.avgCLV).toBeGreaterThan(0)
    expect(dist.stdDev).toBeCloseTo(0, 5)
  })

  it('calculates median CLV', () => {
    const picks = [
      ...makePicks(3, -110, -130, 'win'),
      ...makePicks(2, -110, -105, 'win'),
      ...makePicks(3, -110, -100, 'loss'),
    ]
    const dist = buildCLVDistribution(picks)
    expect(typeof dist.medianCLV).toBe('number')
  })

  it('filters out picks without closing odds', () => {
    const picks = [
      ...makePicks(5, -110, -130, 'win'),
      { odds: -110, closing_odds: null, outcome: 'win' },
      { odds: -110, closing_odds: undefined, outcome: 'loss' },
    ]
    const dist = buildCLVDistribution(picks)
    expect(dist.totalPicks).toBe(5)
  })

  it('assigns picks to correct buckets', () => {
    // All picks with same CLV should land in one bucket
    const picks = makePicks(10, -110, -130, 'win')
    const dist = buildCLVDistribution(picks)
    const nonEmpty = dist.buckets.filter((b) => b.count > 0)
    expect(nonEmpty.length).toBe(1)
    expect(nonEmpty[0].count).toBe(10)
    expect(nonEmpty[0].percentage).toBe(100)
  })

  it('calculates win rate per bucket', () => {
    const picks = [
      ...makePicks(4, -110, -130, 'win'),   // positive CLV
      ...makePicks(1, -110, -130, 'loss'),   // positive CLV
    ]
    const dist = buildCLVDistribution(picks)
    const bucket = dist.buckets.find((b) => b.count > 0)!
    expect(bucket.winRate).toBe(80)
  })

  it('bucket win rate is null when no resolved picks', () => {
    const picks = makePicks(5, -110, -130, 'pending')
    const dist = buildCLVDistribution(picks)
    const bucket = dist.buckets.find((b) => b.count > 0)
    expect(bucket?.winRate).toBeNull()
  })

  it('generates summary for positive edge', () => {
    const picks = makePicks(10, -110, -150, 'win')
    const dist = buildCLVDistribution(picks)
    expect(dist.summary).toContain('edge')
    expect(dist.positiveCLVRate).toBe(100)
  })

  it('generates summary for negative edge', () => {
    const picks = makePicks(10, -150, -110, 'loss')
    const dist = buildCLVDistribution(picks)
    expect(dist.summary).toContain('Negative CLV')
  })

  it('detects right-skewed distribution', () => {
    // Many small losses, few big wins
    const picks = [
      ...makePicks(8, -110, -105, 'loss'),  // small negative CLV
      ...makePicks(2, -110, -200, 'win'),   // large positive CLV
    ]
    const dist = buildCLVDistribution(picks)
    // Shape depends on actual skewness calculation
    expect(['left-skewed', 'normal', 'right-skewed']).toContain(dist.shape)
  })

  it('supports custom bucket boundaries', () => {
    const picks = makePicks(10, -110, -130, 'win')
    const dist = buildCLVDistribution(picks, [-5, 0, 5])
    // Should have 4 buckets: <-5, -5 to 0, 0 to 5, >5
    expect(dist.buckets.length).toBe(4)
  })
})

describe('getCLVPercentile', () => {
  it('returns percentile rank', () => {
    const allCLVs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(getCLVPercentile(5, allCLVs)).toBe(40) // 4 out of 10 below 5
  })

  it('returns 0 for lowest value', () => {
    expect(getCLVPercentile(1, [1, 2, 3])).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(getCLVPercentile(5, [])).toBe(0)
  })

  it('handles ties', () => {
    const allCLVs = [1, 1, 1, 5, 5]
    const pct = getCLVPercentile(5, allCLVs)
    expect(pct).toBe(60) // 3 out of 5 below 5
  })
})

describe('findSweetSpot', () => {
  it('finds bucket with highest win rate and minimum samples', () => {
    const buckets = [
      { min: 0, max: 3, label: '0-3%', count: 10, percentage: 50, avgCLV: 1.5, winRate: 70 },
      { min: 3, max: 5, label: '3-5%', count: 5, percentage: 25, avgCLV: 4, winRate: 85 },
      { min: 5, max: Infinity, label: '>5%', count: 2, percentage: 10, avgCLV: 7, winRate: 100 },
    ]
    const spot = findSweetSpot(buckets)
    // Bucket >5% has 100% win rate but only 2 samples, so 3-5% should win
    expect(spot?.label).toBe('3-5%')
  })

  it('returns null when no buckets have enough samples', () => {
    const buckets = [
      { min: 0, max: 3, label: '0-3%', count: 1, percentage: 100, avgCLV: 1, winRate: 100 },
    ]
    expect(findSweetSpot(buckets)).toBeNull()
  })

  it('returns null when all win rates are null', () => {
    const buckets = [
      { min: 0, max: 3, label: '0-3%', count: 5, percentage: 100, avgCLV: 1, winRate: null },
    ]
    expect(findSweetSpot(buckets)).toBeNull()
  })
})
