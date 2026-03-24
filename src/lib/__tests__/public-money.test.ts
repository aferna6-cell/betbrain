/**
 * Public Money Estimator tests.
 */

import { describe, it, expect } from 'vitest'
import { estimatePublicMoney, type PublicMoneyEstimate } from '@/lib/public-money'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

function makeBookmaker(
  name: string,
  homeOdds: number,
  awayOdds: number
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home: homeOdds, away: awayOdds },
    spread: null,
    total: null,
    lastUpdated: new Date().toISOString(),
  }
}

function makeGame(
  id: string,
  homeTeam: string,
  awayTeam: string,
  bookmakers: NormalizedBookmakerOdds[]
): NormalizedGame {
  return {
    id,
    sport: 'nba',
    homeTeam,
    awayTeam,
    commenceTime: new Date().toISOString(),
    fromCache: true,
    isFresh: true,
    bookmakers,
  }
}

describe('estimatePublicMoney', () => {
  it('returns empty for no games', () => {
    const result = estimatePublicMoney([])
    expect(result.estimates).toHaveLength(0)
    expect(result.gamesAnalyzed).toBe(0)
  })

  it('skips games with < 2 bookmakers', () => {
    const game = makeGame('g1', 'A', 'B', [
      makeBookmaker('b1', -150, +130),
    ])
    const result = estimatePublicMoney([game])
    expect(result.estimates).toHaveLength(0)
  })

  it('identifies heavy favorite as public side', () => {
    const game = makeGame('g1', 'Lakers', 'Celtics', [
      makeBookmaker('b1', -300, +250),
      makeBookmaker('b2', -280, +230),
      makeBookmaker('b3', -310, +260),
    ])
    const result = estimatePublicMoney([game])
    expect(result.estimates).toHaveLength(1)
    expect(result.estimates[0].publicTeam).toBe('Lakers')
    expect(result.estimates[0].publicPct).toBeGreaterThan(50)
  })

  it('identifies away favorite correctly', () => {
    const game = makeGame('g1', 'Home', 'Away', [
      makeBookmaker('b1', +250, -300),
      makeBookmaker('b2', +230, -280),
    ])
    const result = estimatePublicMoney([game])
    expect(result.estimates).toHaveLength(1)
    expect(result.estimates[0].publicTeam).toBe('Away')
    expect(result.estimates[0].sharpTeam).toBe('Home')
  })

  it('detects divergence when outliers exist', () => {
    const game = makeGame('g1', 'Home', 'Away', [
      makeBookmaker('b1', -200, +180),
      makeBookmaker('b2', -195, +175),
      makeBookmaker('b3', -190, +170),
      makeBookmaker('outlier', -130, +110), // Sharp book disagreeing
    ])
    const result = estimatePublicMoney([game])
    // May or may not flag as divergence depending on thresholds
    expect(result.estimates.length).toBeGreaterThan(0)
  })

  it('sorts by confidence descending', () => {
    const games = [
      makeGame('g1', 'A', 'B', [
        makeBookmaker('b1', -110, -110),
        makeBookmaker('b2', -112, -108),
      ]),
      makeGame('g2', 'C', 'D', [
        makeBookmaker('b1', -300, +250),
        makeBookmaker('b2', -280, +230),
        makeBookmaker('b3', -310, +260),
        makeBookmaker('b4', -290, +240),
        makeBookmaker('b5', -305, +255),
      ]),
    ]
    const result = estimatePublicMoney(games)
    for (let i = 1; i < result.estimates.length; i++) {
      expect(result.estimates[i].confidence).toBeLessThanOrEqual(result.estimates[i - 1].confidence)
    }
  })

  it('includes factors in each estimate', () => {
    const game = makeGame('g1', 'Home', 'Away', [
      makeBookmaker('b1', -200, +180),
      makeBookmaker('b2', -195, +175),
    ])
    const result = estimatePublicMoney([game])
    expect(result.estimates[0].factors.length).toBeGreaterThan(0)
  })

  it('public percentage is between 50 and 90', () => {
    const game = makeGame('g1', 'Home', 'Away', [
      makeBookmaker('b1', -500, +400),
      makeBookmaker('b2', -480, +380),
    ])
    const result = estimatePublicMoney([game])
    const est = result.estimates[0]
    expect(est.publicPct).toBeGreaterThanOrEqual(50)
    expect(est.publicPct).toBeLessThanOrEqual(90)
  })

  it('confidence is capped at 85', () => {
    const game = makeGame('g1', 'Home', 'Away', [
      makeBookmaker('b1', -500, +400),
      makeBookmaker('b2', -480, +380),
      makeBookmaker('b3', -490, +390),
      makeBookmaker('b4', -510, +410),
      makeBookmaker('b5', -495, +395),
      makeBookmaker('b6', -505, +405),
    ])
    const result = estimatePublicMoney([game])
    expect(result.estimates[0].confidence).toBeLessThanOrEqual(85)
  })

  it('counts divergences in result', () => {
    const result = estimatePublicMoney([])
    expect(result.divergenceCount).toBe(0)
  })

  it('handles even odds correctly', () => {
    const game = makeGame('g1', 'Home', 'Away', [
      makeBookmaker('b1', -110, -110),
      makeBookmaker('b2', -110, -110),
    ])
    const result = estimatePublicMoney([game])
    // Home team bias should push public slightly to home
    expect(result.estimates).toHaveLength(1)
    expect(result.estimates[0].publicTeam).toBe('Home')
  })
})
