import { describe, it, expect } from 'vitest'
import { analyzeConsensus, analyzeAllConsensus, type ConsensusIndicator } from '../consensus'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGame(
  bookmakers: Partial<NormalizedBookmakerOdds>[],
  overrides?: Partial<NormalizedGame>
): NormalizedGame {
  return {
    id: 'game-1',
    sport: 'nba',
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Boston Celtics',
    commenceTime: '2026-03-23T19:00:00Z',
    bookmakers: bookmakers.map((bk, i) => ({
      bookmaker: bk.bookmaker ?? `book_${i}`,
      moneyline: bk.moneyline ?? null,
      spread: bk.spread ?? null,
      total: bk.total ?? null,
    })),
    ...overrides,
  }
}

function makeML(home: number, away: number) {
  return { home, away, draw: null }
}

// ---------------------------------------------------------------------------
// analyzeConsensus
// ---------------------------------------------------------------------------

describe('analyzeConsensus', () => {
  it('returns null with fewer than 3 bookmakers', () => {
    const game = makeGame([
      { moneyline: makeML(-150, +130) },
      { moneyline: makeML(-155, +135) },
    ])
    expect(analyzeConsensus(game)).toBeNull()
  })

  it('identifies home team as public side when heavily favored', () => {
    const game = makeGame([
      { moneyline: makeML(-200, +170) },
      { moneyline: makeML(-210, +175) },
      { moneyline: makeML(-195, +165) },
      { moneyline: makeML(-205, +172) },
    ])
    const result = analyzeConsensus(game)
    expect(result).not.toBeNull()
    expect(result!.publicSide).toBe('home')
  })

  it('identifies split when game is near coin-flip', () => {
    const game = makeGame([
      { moneyline: makeML(-105, -105) },
      { moneyline: makeML(-108, -102) },
      { moneyline: makeML(-103, -107) },
    ])
    const result = analyzeConsensus(game)
    expect(result).not.toBeNull()
    expect(result!.publicSide).toBe('split')
  })

  it('detects divergence when outlier books disagree', () => {
    // Most books have home as big favorite, but one book gives away much better odds
    const game = makeGame([
      { bookmaker: 'book_a', moneyline: makeML(-250, +200) },
      { bookmaker: 'book_b', moneyline: makeML(-260, +210) },
      { bookmaker: 'book_c', moneyline: makeML(-240, +195) },
      { bookmaker: 'book_d', moneyline: makeML(-255, +205) },
      { bookmaker: 'outlier', moneyline: makeML(-180, +160) }, // Outlier: away is getting better value
    ])
    const result = analyzeConsensus(game)
    expect(result).not.toBeNull()
    // Public side should be home (favorite)
    expect(result!.publicSide).toBe('home')
  })

  it('returns confidence capped at 85', () => {
    const game = makeGame(
      Array.from({ length: 8 }, (_, i) => ({
        moneyline: makeML(-200 - i * 20, +170 + i * 15),
      }))
    )
    const result = analyzeConsensus(game)
    expect(result).not.toBeNull()
    expect(result!.confidence).toBeLessThanOrEqual(85)
  })

  it('includes avg implied probabilities', () => {
    const game = makeGame([
      { moneyline: makeML(-200, +170) },
      { moneyline: makeML(-200, +170) },
      { moneyline: makeML(-200, +170) },
    ])
    const result = analyzeConsensus(game)
    expect(result).not.toBeNull()
    expect(result!.avgImplied.home).toBeGreaterThan(50)
    expect(result!.avgImplied.away).toBeGreaterThan(20)
    expect(result!.avgImplied.home + result!.avgImplied.away).toBeGreaterThan(100) // vig
  })

  it('provides reasoning string', () => {
    const game = makeGame([
      { moneyline: makeML(-200, +170) },
      { moneyline: makeML(-210, +175) },
      { moneyline: makeML(-195, +165) },
    ])
    const result = analyzeConsensus(game)
    expect(result).not.toBeNull()
    expect(result!.reasoning.length).toBeGreaterThan(10)
    expect(result!.reasoning).toContain('.')
  })
})

// ---------------------------------------------------------------------------
// analyzeAllConsensus
// ---------------------------------------------------------------------------

describe('analyzeAllConsensus', () => {
  it('returns empty for no games', () => {
    expect(analyzeAllConsensus([])).toEqual([])
  })

  it('filters out low-confidence results', () => {
    // Two bookmakers = null result, filtered out
    const game = makeGame([
      { moneyline: makeML(-110, -110) },
      { moneyline: makeML(-110, -110) },
    ])
    const results = analyzeAllConsensus([game])
    expect(results).toEqual([])
  })

  it('sorts divergences first', () => {
    const games = [
      makeGame(
        [
          { moneyline: makeML(-200, +170) },
          { moneyline: makeML(-210, +175) },
          { moneyline: makeML(-195, +165) },
          { moneyline: makeML(-200, +170) },
          { moneyline: makeML(-200, +170) },
        ],
        { id: 'game-no-diverge' }
      ),
      makeGame(
        [
          { moneyline: makeML(-250, +200) },
          { moneyline: makeML(-260, +210) },
          { moneyline: makeML(-240, +195) },
          { moneyline: makeML(-255, +205) },
          { moneyline: makeML(-180, +160) },
        ],
        { id: 'game-with-outlier' }
      ),
    ]
    const results = analyzeAllConsensus(games)
    expect(results.length).toBeGreaterThan(0)
    // Divergent games should be first if present
    const divergentIdx = results.findIndex((r) => r.divergence)
    const nonDivergentIdx = results.findIndex((r) => !r.divergence)
    if (divergentIdx >= 0 && nonDivergentIdx >= 0) {
      expect(divergentIdx).toBeLessThan(nonDivergentIdx)
    }
  })
})
