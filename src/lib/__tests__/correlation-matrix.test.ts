import { describe, it, expect } from 'vitest'
import { calcCorrelationMatrix, pearsonCorrelation } from '../correlation-matrix'

describe('pearsonCorrelation', () => {
  it('returns 1 for identical vectors', () => {
    const { correlation } = pearsonCorrelation([1, 2, 3, 4], [1, 2, 3, 4])
    expect(correlation).toBeCloseTo(1, 5)
  })

  it('returns -1 for perfectly negatively correlated', () => {
    const { correlation } = pearsonCorrelation([1, 2, 3, 4], [4, 3, 2, 1])
    expect(correlation).toBeCloseTo(-1, 5)
  })

  it('returns negative for inversely correlated data', () => {
    const { correlation } = pearsonCorrelation([1, 0, 1, 0, 1], [0, 1, 0, 1, 0])
    expect(correlation).toBeCloseTo(-1, 5)
  })

  it('skips NaN values', () => {
    const { correlation, sampleSize } = pearsonCorrelation([1, NaN, 3, 4], [1, 2, 3, 4])
    expect(sampleSize).toBe(3)
    expect(correlation).toBeCloseTo(1, 5)
  })

  it('returns 0 when fewer than 3 valid pairs', () => {
    const { correlation } = pearsonCorrelation([1, NaN, NaN], [1, 2, NaN])
    expect(correlation).toBe(0)
  })

  it('returns 0 for constant vector', () => {
    const { correlation } = pearsonCorrelation([1, 1, 1, 1], [1, 2, 3, 4])
    expect(correlation).toBe(0)
  })
})

describe('calcCorrelationMatrix', () => {
  it('returns empty for too few picks', () => {
    const picks = [
      { sport: 'nba', pick_type: 'moneyline', outcome: 'win', game_date: '2026-03-20' },
    ]
    const result = calcCorrelationMatrix(picks)
    expect(result.pairs).toEqual([])
  })

  it('returns empty for single category', () => {
    const picks = Array.from({ length: 10 }, (_, i) => ({
      sport: 'nba',
      pick_type: 'moneyline',
      outcome: i % 2 === 0 ? 'win' : 'loss',
      game_date: `2026-03-${String(i + 1).padStart(2, '0')}`,
    }))
    const result = calcCorrelationMatrix(picks)
    expect(result.pairs).toEqual([])
  })

  it('calculates correlation between sports', () => {
    const picks = [
      // Same-day wins for both sports = positive correlation
      { sport: 'nba', pick_type: 'ml', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'nba', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'nba', pick_type: 'ml', outcome: 'win', game_date: '2026-03-03' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'win', game_date: '2026-03-03' },
    ]
    const result = calcCorrelationMatrix(picks, 'sport')
    expect(result.pairs).toHaveLength(1)
    expect(result.pairs[0].correlation).toBeCloseTo(1, 2)
  })

  it('groups by pick_type when specified', () => {
    const picks = [
      { sport: 'nba', pick_type: 'moneyline', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'nba', pick_type: 'spread', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'nba', pick_type: 'moneyline', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'nba', pick_type: 'spread', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'nba', pick_type: 'moneyline', outcome: 'win', game_date: '2026-03-03' },
      { sport: 'nba', pick_type: 'spread', outcome: 'win', game_date: '2026-03-03' },
    ]
    const result = calcCorrelationMatrix(picks, 'pick_type')
    expect(result.categories).toContain('moneyline')
    expect(result.categories).toContain('spread')
  })

  it('builds NxN matrix', () => {
    const picks = [
      { sport: 'nba', pick_type: 'ml', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'mlb', pick_type: 'ml', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'nba', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'mlb', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'nba', pick_type: 'ml', outcome: 'win', game_date: '2026-03-03' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'win', game_date: '2026-03-03' },
      { sport: 'mlb', pick_type: 'ml', outcome: 'win', game_date: '2026-03-03' },
    ]
    const result = calcCorrelationMatrix(picks)
    expect(result.matrix).toHaveLength(3)
    expect(result.matrix[0]).toHaveLength(3)
    // Diagonal should be 1
    expect(result.matrix[0][0]).toBe(1)
    expect(result.matrix[1][1]).toBe(1)
  })

  it('sorts pairs by absolute correlation descending', () => {
    const picks = [
      // NBA/NFL: perfectly correlated
      { sport: 'nba', pick_type: 'ml', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'win', game_date: '2026-03-01' },
      { sport: 'mlb', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-01' },
      { sport: 'nba', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-02' },
      { sport: 'mlb', pick_type: 'ml', outcome: 'win', game_date: '2026-03-02' },
      { sport: 'nba', pick_type: 'ml', outcome: 'win', game_date: '2026-03-03' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'win', game_date: '2026-03-03' },
      { sport: 'mlb', pick_type: 'ml', outcome: 'loss', game_date: '2026-03-03' },
    ]
    const result = calcCorrelationMatrix(picks)
    // First pair should have highest absolute correlation
    expect(Math.abs(result.pairs[0].correlation)).toBeGreaterThanOrEqual(
      Math.abs(result.pairs[result.pairs.length - 1].correlation)
    )
  })

  it('excludes pending picks', () => {
    const picks = [
      { sport: 'nba', pick_type: 'ml', outcome: 'pending', game_date: '2026-03-01' },
      { sport: 'nfl', pick_type: 'ml', outcome: 'pending', game_date: '2026-03-01' },
    ]
    const result = calcCorrelationMatrix(picks)
    expect(result.pairs).toEqual([])
  })
})
