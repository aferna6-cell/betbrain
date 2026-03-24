import { describe, it, expect } from 'vitest'
import {
  calcStreakProbability,
  streakOccurrenceProbability,
  streakProbabilityTable,
} from '../streak-probability'

describe('calcStreakProbability', () => {
  it('returns empty result for no picks', () => {
    const result = calcStreakProbability([])
    expect(result.streakType).toBe('none')
    expect(result.currentLength).toBe(0)
  })

  it('detects a win streak', () => {
    const picks = [
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'loss' },
    ]
    const result = calcStreakProbability(picks)
    expect(result.streakType).toBe('win')
    expect(result.currentLength).toBe(3)
  })

  it('detects a loss streak', () => {
    const picks = [
      { outcome: 'loss' },
      { outcome: 'loss' },
      { outcome: 'win' },
    ]
    const result = calcStreakProbability(picks)
    expect(result.streakType).toBe('loss')
    expect(result.currentLength).toBe(2)
  })

  it('calculates win rate from picks', () => {
    const picks = [
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'loss' },
      { outcome: 'win' },
    ]
    const result = calcStreakProbability(picks)
    expect(result.winRate).toBe(0.75) // 3/4
  })

  it('uses override win rate when provided', () => {
    const picks = [
      { outcome: 'win' },
      { outcome: 'loss' },
    ]
    const result = calcStreakProbability(picks, 0.6)
    expect(result.winRate).toBe(0.6)
  })

  it('calculates extension probabilities for win streak', () => {
    const picks = [
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'loss' },
      { outcome: 'win' },
    ]
    // Win rate = 0.75
    const result = calcStreakProbability(picks)
    expect(result.extendBy1).toBe(0.75)
    expect(result.extendBy3).toBeCloseTo(0.422, 2)
    expect(result.extendBy5).toBeCloseTo(0.237, 2)
  })

  it('calculates extension probabilities for loss streak', () => {
    const picks = [
      { outcome: 'loss' },
      { outcome: 'loss' },
      { outcome: 'win' },
      { outcome: 'win' },
    ]
    // Win rate = 0.5, loss rate = 0.5
    const result = calcStreakProbability(picks)
    expect(result.extendBy1).toBe(0.5)
  })

  it('marks unusual streaks correctly', () => {
    // 50% win rate, 5 win streak: 0.5^5 = 0.03125 < 5%
    const picks = [
      ...Array.from({ length: 5 }, () => ({ outcome: 'win' as const })),
      ...Array.from({ length: 5 }, () => ({ outcome: 'loss' as const })),
    ]
    const result = calcStreakProbability(picks)
    expect(result.isUnusual).toBe(true)
  })

  it('does not mark normal streaks as unusual', () => {
    // 75% win rate, 2 win streak: 0.75^2 = 0.5625 > 5%
    const picks = [
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'loss' },
      { outcome: 'win' },
    ]
    const result = calcStreakProbability(picks)
    expect(result.isUnusual).toBe(false)
  })

  it('calculates expected streak length', () => {
    const picks = [
      { outcome: 'win' },
      { outcome: 'loss' },
    ]
    // 50% win rate → expected streak = 1/(1-0.5) = 2
    const result = calcStreakProbability(picks)
    expect(result.expectedStreakLength).toBe(2)
  })

  it('filters out pending and push outcomes', () => {
    const picks = [
      { outcome: 'win' },
      { outcome: 'pending' },
      { outcome: 'push' },
      { outcome: 'win' },
      { outcome: 'loss' },
    ]
    const result = calcStreakProbability(picks)
    // Only win, win, loss resolved → streak is 2 wins
    expect(result.currentLength).toBe(2)
    expect(result.streakType).toBe('win')
  })

  it('generates assessment for loss streak', () => {
    const picks = [
      { outcome: 'loss' },
      { outcome: 'loss' },
      { outcome: 'loss' },
      { outcome: 'win' },
      { outcome: 'win' },
      { outcome: 'win' },
    ]
    const result = calcStreakProbability(picks)
    expect(result.assessment).toContain('3-loss streak')
  })

  it('generates assessment for single win', () => {
    const picks = [{ outcome: 'win' }, { outcome: 'loss' }]
    const result = calcStreakProbability(picks)
    expect(result.assessment).toContain('1 win')
  })
})

describe('streakOccurrenceProbability', () => {
  it('returns 0 when streak length > total bets', () => {
    expect(streakOccurrenceProbability(5, 10, 0.5)).toBe(0)
  })

  it('returns 1 for streak length 0', () => {
    expect(streakOccurrenceProbability(10, 0, 0.5)).toBe(1)
  })

  it('returns 0 for probability 0', () => {
    expect(streakOccurrenceProbability(10, 3, 0)).toBe(0)
  })

  it('returns 1 for probability 1', () => {
    expect(streakOccurrenceProbability(10, 3, 1)).toBe(1)
  })

  it('higher N means higher streak probability', () => {
    const prob10 = streakOccurrenceProbability(10, 3, 0.5)
    const prob100 = streakOccurrenceProbability(100, 3, 0.5)
    expect(prob100).toBeGreaterThan(prob10)
  })

  it('longer streaks are less likely', () => {
    const prob3 = streakOccurrenceProbability(50, 3, 0.5)
    const prob5 = streakOccurrenceProbability(50, 5, 0.5)
    expect(prob3).toBeGreaterThan(prob5)
  })
})

describe('streakProbabilityTable', () => {
  it('generates rows from length 2 to min(15, totalBets)', () => {
    const table = streakProbabilityTable(0.5, 100)
    expect(table.length).toBe(14) // 2 through 15
    expect(table[0].streakLength).toBe(2)
    expect(table[table.length - 1].streakLength).toBe(15)
  })

  it('limits to totalBets', () => {
    const table = streakProbabilityTable(0.5, 5)
    expect(table.length).toBe(4) // 2, 3, 4, 5
  })

  it('includes both win and loss streak probabilities', () => {
    const table = streakProbabilityTable(0.6, 50)
    expect(table[0].winStreakProb).toBeGreaterThan(0)
    expect(table[0].lossStreakProb).toBeGreaterThan(0)
  })

  it('win streak probs > loss streak probs when win rate > 50%', () => {
    const table = streakProbabilityTable(0.6, 50)
    expect(table[0].winStreakProb).toBeGreaterThan(table[0].lossStreakProb)
  })
})
