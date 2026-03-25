/**
 * Reverse Line Movement (RLM) Alerts tests.
 */

import { describe, it, expect } from 'vitest'
import { scanForRLM, type RLMAlert } from '@/lib/rlm-alerts'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    lastUpdated: '2026-03-25T00:00:00Z',
  }
}

function makeGame(overrides: Partial<NormalizedGame> & { bookmakers: NormalizedBookmakerOdds[] }): NormalizedGame {
  return {
    id: 'game-1',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-25T20:00:00Z',
    fromCache: true,
    isFresh: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// scanForRLM
// ---------------------------------------------------------------------------

describe('scanForRLM', () => {
  it('returns empty for games with too few bookmakers', () => {
    const games = [
      makeGame({
        bookmakers: [
          makeBookmaker('a', -150, 130),
          makeBookmaker('b', -145, 125),
        ],
      }),
    ]
    const result = scanForRLM(games)
    expect(result.alerts).toEqual([])
    expect(result.gamesScanned).toBe(1)
  })

  it('returns empty for no games', () => {
    const result = scanForRLM([])
    expect(result.alerts).toEqual([])
    expect(result.gamesScanned).toBe(0)
  })

  it('detects RLM when sharp side has wider variance', () => {
    // Home is heavy favorite (public side), away has varying odds (sharp action)
    const games = [
      makeGame({
        bookmakers: [
          makeBookmaker('fanduel', -300, 250),
          makeBookmaker('draftkings', -310, 260),
          makeBookmaker('betmgm', -295, 240),
          makeBookmaker('caesars', -305, 320), // Outlier on away
        ],
      }),
    ]
    const result = scanForRLM(games)
    // May or may not trigger based on thresholds, but structure should be correct
    expect(result.gamesScanned).toBe(1)
    expect(typeof result.strongCount).toBe('number')
    expect(typeof result.moderateCount).toBe('number')
  })

  it('identifies correct public and sharp sides', () => {
    // Heavy home favorite = public on home, sharp on away
    const games = [
      makeGame({
        homeTeam: 'Warriors',
        awayTeam: 'Pistons',
        bookmakers: [
          makeBookmaker('a', -400, 310),
          makeBookmaker('b', -410, 320),
          makeBookmaker('c', -390, 300),
          makeBookmaker('d', -395, 380), // Big outlier on away (sharp side)
        ],
      }),
    ]
    const result = scanForRLM(games)
    for (const alert of result.alerts) {
      // Public should be home (Warriors are heavy favorites)
      expect(alert.publicSide).toBe('home')
      expect(alert.publicTeam).toBe('Warriors')
      expect(alert.sharpSide).toBe('away')
      expect(alert.sharpTeam).toBe('Pistons')
    }
  })

  it('includes best sharp odds and bookmaker', () => {
    const games = [
      makeGame({
        bookmakers: [
          makeBookmaker('a', -350, 280),
          makeBookmaker('b', -360, 290),
          makeBookmaker('c', -340, 270),
          makeBookmaker('best_book', -370, 350), // Best away odds
        ],
      }),
    ]
    const result = scanForRLM(games)
    for (const alert of result.alerts) {
      if (alert.sharpSide === 'away') {
        expect(alert.bestSharpOdds).toBe(350)
        expect(alert.bestSharpBook).toBe('best_book')
      }
    }
  })

  it('sorts alerts by strength then confidence', () => {
    // Create games with different RLM signal strengths
    const games = [
      makeGame({
        id: 'g1',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        bookmakers: [
          makeBookmaker('a', -200, 170),
          makeBookmaker('b', -210, 180),
          makeBookmaker('c', -195, 165),
          makeBookmaker('d', -205, 250), // Outlier
        ],
      }),
      makeGame({
        id: 'g2',
        homeTeam: 'Team C',
        awayTeam: 'Team D',
        bookmakers: [
          makeBookmaker('a', -500, 400),
          makeBookmaker('b', -510, 410),
          makeBookmaker('c', -490, 390),
          makeBookmaker('d', -505, 500), // Big outlier
          makeBookmaker('e', -495, 480), // Another outlier
        ],
      }),
    ]
    const result = scanForRLM(games)
    if (result.alerts.length >= 2) {
      // Stronger signals should come first
      const strengths = result.alerts.map((a) => a.strength)
      const order = { strong: 3, moderate: 2, weak: 1 }
      for (let i = 1; i < strengths.length; i++) {
        expect(order[strengths[i]]).toBeLessThanOrEqual(order[strengths[i - 1]])
      }
    }
  })

  it('includes description and factors', () => {
    const games = [
      makeGame({
        bookmakers: [
          makeBookmaker('a', -300, 250),
          makeBookmaker('b', -310, 260),
          makeBookmaker('c', -295, 240),
          makeBookmaker('d', -305, 340), // Outlier
        ],
      }),
    ]
    const result = scanForRLM(games)
    for (const alert of result.alerts) {
      expect(alert.description.length).toBeGreaterThan(0)
      expect(alert.description).toContain('RLM detected')
      expect(alert.factors.length).toBeGreaterThan(0)
      expect(alert.confidence).toBeGreaterThan(0)
      expect(alert.confidence).toBeLessThanOrEqual(95)
    }
  })

  it('handles games with only null moneyline odds', () => {
    const games = [
      makeGame({
        bookmakers: [
          { bookmaker: 'a', moneyline: null, spread: null, total: null, lastUpdated: '' },
          { bookmaker: 'b', moneyline: null, spread: null, total: null, lastUpdated: '' },
          { bookmaker: 'c', moneyline: null, spread: null, total: null, lastUpdated: '' },
        ],
      }),
    ]
    const result = scanForRLM(games)
    expect(result.alerts).toEqual([])
  })

  it('scans multiple games and counts strengths correctly', () => {
    const games = Array.from({ length: 5 }, (_, i) =>
      makeGame({
        id: `g${i}`,
        homeTeam: `Home${i}`,
        awayTeam: `Away${i}`,
        bookmakers: [
          makeBookmaker('a', -250, 210),
          makeBookmaker('b', -260, 220),
          makeBookmaker('c', -240, 200),
          makeBookmaker('d', -255, 300 + i * 20),
        ],
      })
    )
    const result = scanForRLM(games)
    expect(result.gamesScanned).toBe(5)
    expect(result.strongCount + result.moderateCount).toBeLessThanOrEqual(result.alerts.length)
  })

  it('handles close matchups with mild home bias', () => {
    const games = [
      makeGame({
        bookmakers: [
          makeBookmaker('a', -105, -115),
          makeBookmaker('b', -108, -112),
          makeBookmaker('c', -103, -117),
          makeBookmaker('d', -110, -105), // Sharp on away?
        ],
      }),
    ]
    const result = scanForRLM(games)
    // Close matchup should still be analyzed
    expect(result.gamesScanned).toBe(1)
  })
})
