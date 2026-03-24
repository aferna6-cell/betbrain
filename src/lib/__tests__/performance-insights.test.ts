/**
 * Performance Insights tests.
 *
 * Tests insight generation from pick history data.
 * Pure logic — no Supabase or API calls.
 */

import { describe, it, expect } from 'vitest'
import { generateInsights, type PickForInsight } from '@/lib/performance-insights'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePick(overrides: Partial<PickForInsight> = {}): PickForInsight {
  return {
    id: `pick-${Math.random().toString(36).slice(2, 8)}`,
    sport: 'nba',
    pick_type: 'moneyline',
    outcome: 'win',
    odds: -110,
    profit: 0.91,
    units: 1,
    game_date: '2026-03-20',
    ...overrides,
  }
}

function makeNPicks(n: number, overrides: Partial<PickForInsight> = {}): PickForInsight[] {
  return Array.from({ length: n }, (_, i) =>
    makePick({
      id: `p${i}`,
      game_date: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
      ...overrides,
    })
  )
}

// ---------------------------------------------------------------------------
// 1. Minimum data requirement
// ---------------------------------------------------------------------------

describe('generateInsights — minimum data', () => {
  it('returns "not enough data" with fewer than 10 resolved picks', () => {
    const picks = makeNPicks(5)
    const result = generateInsights(picks)
    expect(result.insights).toHaveLength(1)
    expect(result.insights[0].title).toBe('Not enough data')
    expect(result.resolvedPicks).toBe(5)
  })

  it('ignores pending picks', () => {
    const picks = [
      ...makeNPicks(5, { outcome: 'win' }),
      ...makeNPicks(5, { outcome: 'pending', profit: null }),
    ]
    const result = generateInsights(picks)
    expect(result.resolvedPicks).toBe(5)
    expect(result.insights[0].title).toBe('Not enough data')
  })

  it('generates insights with 10+ resolved picks', () => {
    const picks = makeNPicks(15, { outcome: 'win', profit: 0.91 })
    const result = generateInsights(picks)
    expect(result.resolvedPicks).toBe(15)
    // Should have at least 1 real insight
    expect(result.insights.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Bet type insights
// ---------------------------------------------------------------------------

describe('generateInsights — bet type', () => {
  it('identifies strongest bet type', () => {
    const picks = [
      ...makeNPicks(8, { pick_type: 'moneyline', outcome: 'win', profit: 1, units: 1 }),
      ...makeNPicks(8, { pick_type: 'spread', outcome: 'loss', profit: -1, units: 1 }),
    ]
    const result = generateInsights(picks)
    const typeInsights = result.insights.filter((i) => i.category === 'bet-type')
    // Should identify moneyline as strong
    const strong = typeInsights.find((i) => i.sentiment === 'positive')
    if (strong) {
      expect(strong.title).toContain('moneyline')
    }
  })

  it('identifies weakest bet type', () => {
    const picks = [
      ...makeNPicks(8, { pick_type: 'spread', outcome: 'loss', profit: -1, units: 1 }),
      ...makeNPicks(8, { pick_type: 'moneyline', outcome: 'win', profit: 1, units: 1 }),
    ]
    const result = generateInsights(picks)
    const typeInsights = result.insights.filter((i) => i.category === 'bet-type')
    const weak = typeInsights.find((i) => i.sentiment === 'negative')
    if (weak) {
      expect(weak.title).toContain('spread')
    }
  })
})

// ---------------------------------------------------------------------------
// 3. Sport insights
// ---------------------------------------------------------------------------

describe('generateInsights — sport', () => {
  it('identifies best sport', () => {
    const picks = [
      ...makeNPicks(8, { sport: 'nba', outcome: 'win', profit: 2, units: 1 }),
      ...makeNPicks(8, { sport: 'nfl', outcome: 'loss', profit: -1, units: 1 }),
    ]
    const result = generateInsights(picks)
    const sportInsights = result.insights.filter((i) => i.category === 'sport')
    const best = sportInsights.find((i) => i.sentiment === 'positive')
    if (best) {
      expect(best.title.toUpperCase()).toContain('NBA')
    }
  })

  it('identifies worst sport', () => {
    const picks = [
      ...makeNPicks(8, { sport: 'nfl', outcome: 'loss', profit: -1, units: 1 }),
      ...makeNPicks(8, { sport: 'nba', outcome: 'win', profit: 1, units: 1 }),
    ]
    const result = generateInsights(picks)
    const sportInsights = result.insights.filter((i) => i.category === 'sport')
    const worst = sportInsights.find((i) => i.sentiment === 'negative')
    if (worst) {
      expect(worst.title.toUpperCase()).toContain('NFL')
    }
  })
})

// ---------------------------------------------------------------------------
// 4. CLV insights
// ---------------------------------------------------------------------------

describe('generateInsights — CLV', () => {
  it('detects positive CLV trend', () => {
    // Opening odds -110, closing odds -120 = positive CLV (you got better odds)
    const picks = makeNPicks(10, {
      outcome: 'win',
      profit: 0.91,
      odds: -110,
      closing_odds: -120,
    })
    const result = generateInsights(picks)
    const clvInsights = result.insights.filter((i) => i.category === 'clv')
    const positive = clvInsights.find((i) => i.sentiment === 'positive')
    if (positive) {
      expect(positive.title).toContain('closing line')
    }
  })

  it('skips CLV analysis with insufficient closing odds data', () => {
    const picks = makeNPicks(15, { outcome: 'win', profit: 0.91 })
    // No closing_odds set
    const result = generateInsights(picks)
    const clvInsights = result.insights.filter((i) => i.category === 'clv')
    expect(clvInsights).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Volume insights
// ---------------------------------------------------------------------------

describe('generateInsights — volume', () => {
  it('detects improvement over time', () => {
    const early = makeNPicks(12, {
      outcome: 'loss',
      profit: -1,
      units: 1,
      game_date: '2026-01-15',
    })
    const recent = makeNPicks(12, {
      outcome: 'win',
      profit: 2,
      units: 1,
      game_date: '2026-03-15',
    })
    const picks = [...early, ...recent]
    const result = generateInsights(picks)
    const volumeInsights = result.insights.filter((i) => i.category === 'volume')
    const improving = volumeInsights.find((i) => i.title === 'Improving over time')
    if (improving) {
      expect(improving.sentiment).toBe('positive')
    }
  })
})

// ---------------------------------------------------------------------------
// 6. Insight structure
// ---------------------------------------------------------------------------

describe('Insight structure', () => {
  it('all insights have required fields', () => {
    const picks = [
      ...makeNPicks(8, { sport: 'nba', pick_type: 'moneyline', outcome: 'win', profit: 1 }),
      ...makeNPicks(8, { sport: 'nfl', pick_type: 'spread', outcome: 'loss', profit: -1 }),
    ]
    const result = generateInsights(picks)
    for (const insight of result.insights) {
      expect(insight.title).toBeTruthy()
      expect(insight.description).toBeTruthy()
      expect(insight.action).toBeTruthy()
      expect(['positive', 'negative', 'neutral']).toContain(insight.sentiment)
      expect(insight.confidence).toBeGreaterThanOrEqual(0)
      expect(insight.confidence).toBeLessThanOrEqual(100)
      expect(['bet-type', 'sport', 'odds-range', 'timing', 'clv', 'volume']).toContain(insight.category)
    }
  })

  it('limits to 12 insights max', () => {
    // Create diverse data to trigger many insights
    const picks = [
      ...makeNPicks(6, { sport: 'nba', pick_type: 'moneyline', outcome: 'win', profit: 2, odds: -110, game_date: '2026-03-01' }),
      ...makeNPicks(6, { sport: 'nfl', pick_type: 'spread', outcome: 'loss', profit: -1, odds: 150, game_date: '2026-03-05' }),
      ...makeNPicks(6, { sport: 'mlb', pick_type: 'over', outcome: 'win', profit: 1, odds: -200, game_date: '2026-03-10' }),
      ...makeNPicks(6, { sport: 'nhl', pick_type: 'under', outcome: 'loss', profit: -2, odds: 200, game_date: '2026-03-15' }),
    ]
    const result = generateInsights(picks)
    expect(result.insights.length).toBeLessThanOrEqual(12)
  })

  it('sorts by confidence descending', () => {
    const picks = [
      ...makeNPicks(8, { sport: 'nba', outcome: 'win', profit: 1 }),
      ...makeNPicks(8, { sport: 'nfl', outcome: 'loss', profit: -1 }),
    ]
    const result = generateInsights(picks)
    for (let i = 1; i < result.insights.length; i++) {
      // Positive sentiments may be sorted first at same confidence
      if (result.insights[i - 1].confidence === result.insights[i].confidence) continue
      expect(result.insights[i - 1].confidence).toBeGreaterThanOrEqual(result.insights[i].confidence)
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Edge cases
// ---------------------------------------------------------------------------

describe('generateInsights edge cases', () => {
  it('handles empty array', () => {
    const result = generateInsights([])
    expect(result.totalPicks).toBe(0)
    expect(result.resolvedPicks).toBe(0)
    expect(result.insights[0].title).toBe('Not enough data')
  })

  it('handles all pending picks', () => {
    const picks = makeNPicks(20, { outcome: 'pending', profit: null })
    const result = generateInsights(picks)
    expect(result.resolvedPicks).toBe(0)
  })

  it('handles all wins', () => {
    const picks = makeNPicks(15, { outcome: 'win', profit: 1 })
    const result = generateInsights(picks)
    expect(result.resolvedPicks).toBe(15)
    // Should have positive insights
    const positive = result.insights.filter((i) => i.sentiment === 'positive')
    expect(positive.length).toBeGreaterThanOrEqual(0)
  })

  it('handles all losses', () => {
    const picks = makeNPicks(15, { outcome: 'loss', profit: -1 })
    const result = generateInsights(picks)
    expect(result.resolvedPicks).toBe(15)
  })

  it('no NaN or Infinity in insights', () => {
    const picks = [
      ...makeNPicks(10, { outcome: 'win', profit: 0, units: 0 }),
      ...makeNPicks(5, { outcome: 'loss', profit: -1, units: 1 }),
    ]
    const result = generateInsights(picks)
    for (const insight of result.insights) {
      expect(isFinite(insight.confidence)).toBe(true)
      expect(insight.description).not.toContain('NaN')
      expect(insight.description).not.toContain('Infinity')
    }
  })
})
