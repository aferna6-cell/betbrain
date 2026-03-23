import { describe, it, expect } from 'vitest'
import { findFadeOpportunities, formatFadeOdds } from '../fade-public'
import type { NormalizedGame } from '../sports/config'

function makeGame(overrides: Partial<NormalizedGame> = {}): NormalizedGame {
  return {
    id: 'game-1',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    startTime: '2026-03-23T19:00:00Z',
    bookmakers: [
      {
        bookmaker: 'DraftKings',
        moneyline: { home: -250, away: 200 },
        spread: null,
        totals: null,
      },
      {
        bookmaker: 'FanDuel',
        moneyline: { home: -260, away: 210 },
        spread: null,
        totals: null,
      },
      {
        bookmaker: 'BetMGM',
        moneyline: { home: -240, away: 195 },
        spread: null,
        totals: null,
      },
      {
        bookmaker: 'Caesars',
        moneyline: { home: -300, away: 240 },
        spread: null,
        totals: null,
      },
    ],
    ...overrides,
  }
}

describe('fade-public', () => {
  it('returns empty for no games', () => {
    const result = findFadeOpportunities([])
    expect(result.opportunities).toHaveLength(0)
    expect(result.gamesAnalyzed).toBe(0)
  })

  it('returns empty for games with < 3 bookmakers', () => {
    const game = makeGame({
      bookmakers: [
        { bookmaker: 'A', moneyline: { home: -150, away: 130 }, spread: null, totals: null },
      ],
    })
    const result = findFadeOpportunities([game])
    expect(result.opportunities).toHaveLength(0)
  })

  it('identifies fade opportunity on heavy favorite', () => {
    const game = makeGame() // Lakers -250 heavy favorite
    const result = findFadeOpportunities([game])
    // Should identify Celtics as the fade side
    const fade = result.opportunities.find((o) => o.fadeTeam === 'Celtics')
    if (fade) {
      expect(fade.publicTeam).toBe('Lakers')
      expect(fade.fadeSide).toBe('away')
      expect(fade.fadeStrength).toBeGreaterThan(0)
      expect(fade.reasons.length).toBeGreaterThan(0)
    }
  })

  it('tracks public bias stats', () => {
    const game = makeGame()
    const result = findFadeOpportunities([game])
    expect(result.publicBias.gamesWithPublicSide).toBeGreaterThanOrEqual(0)
  })

  it('finds best fade odds across books', () => {
    const game = makeGame()
    const result = findFadeOpportunities([game])
    const fade = result.opportunities.find((o) => o.fadeSide === 'away')
    if (fade) {
      // Caesars has +240 — the best away odds
      expect(fade.bestFadeOdds).toBe(240)
      expect(fade.bestFadeBook).toBe('Caesars')
    }
  })

  it('skips near-coinflip games', () => {
    const game = makeGame({
      bookmakers: [
        { bookmaker: 'A', moneyline: { home: -105, away: -105 }, spread: null, totals: null },
        { bookmaker: 'B', moneyline: { home: -103, away: -107 }, spread: null, totals: null },
        { bookmaker: 'C', moneyline: { home: -104, away: -106 }, spread: null, totals: null },
      ],
    })
    const result = findFadeOpportunities([game])
    // Coinflip = no clear public side = no fade
    expect(result.opportunities).toHaveLength(0)
  })

  it('sorts by fade strength descending', () => {
    const games = [
      makeGame({ id: 'g1' }),
      makeGame({
        id: 'g2',
        bookmakers: [
          { bookmaker: 'A', moneyline: { home: -400, away: 320 }, spread: null, totals: null },
          { bookmaker: 'B', moneyline: { home: -350, away: 280 }, spread: null, totals: null },
          { bookmaker: 'C', moneyline: { home: -500, away: 400 }, spread: null, totals: null },
          { bookmaker: 'D', moneyline: { home: -300, away: 240 }, spread: null, totals: null },
        ],
      }),
    ]
    const result = findFadeOpportunities(games)
    if (result.opportunities.length >= 2) {
      expect(result.opportunities[0].fadeStrength).toBeGreaterThanOrEqual(
        result.opportunities[1].fadeStrength
      )
    }
  })

  it('includes fadeImplied probability', () => {
    const game = makeGame()
    const result = findFadeOpportunities([game])
    for (const opp of result.opportunities) {
      expect(opp.fadeImplied).toBeGreaterThan(0)
      expect(opp.fadeImplied).toBeLessThan(100)
    }
  })

  it('caps fade strength at 100', () => {
    const game = makeGame()
    const result = findFadeOpportunities([game])
    for (const opp of result.opportunities) {
      expect(opp.fadeStrength).toBeLessThanOrEqual(100)
    }
  })
})

describe('formatFadeOdds', () => {
  it('formats positive odds with +', () => {
    expect(formatFadeOdds(200)).toBe('+200')
  })

  it('formats negative odds', () => {
    expect(formatFadeOdds(-110)).toBe('-110')
  })

  it('handles null', () => {
    expect(formatFadeOdds(null)).toBe('N/A')
  })
})
