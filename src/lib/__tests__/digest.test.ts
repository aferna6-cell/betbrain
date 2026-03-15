/**
 * Digest generation logic unit tests.
 *
 * Tests DigestContent interface compliance, formatDigestText output,
 * empty-content edge cases, and sendDigestEmail no-op behavior.
 *
 * Does NOT call Supabase, The Odds API, or any external service.
 * generateDigest is not tested here because it has live dependencies.
 */

import { describe, it, expect } from 'vitest'
import { formatDigestText, sendDigestEmail } from '@/lib/digest'
import type { DigestContent, DigestGame, LineMoveItem } from '@/lib/digest'
import type { Sport } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const SAMPLE_DISCLAIMER =
  'For informational purposes only. This is not financial or betting advice. Past performance does not guarantee future results. Always gamble responsibly.'

function makeDigestGame(overrides: Partial<DigestGame> = {}): DigestGame {
  return {
    id: 'game-001',
    sport: 'nba' as Sport,
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-14T20:00:00Z',
    bestHomeOdds: -115,
    bestAwayOdds: -105,
    bookmakerCount: 4,
    ...overrides,
  }
}

function makeLineMoveItem(overrides: Partial<LineMoveItem> = {}): LineMoveItem {
  return {
    gameId: 'game-001',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    sport: 'nba' as Sport,
    side: 'home',
    variance: 40,
    ...overrides,
  }
}

function makeDigestContent(overrides: Partial<DigestContent> = {}): DigestContent {
  const game = makeDigestGame()
  return {
    date: '2026-03-14',
    totalGames: 1,
    gamesBySport: { nba: [game] },
    smartSignals: {
      total: 1,
      strong: 0,
      items: [
        {
          homeTeam: 'Lakers',
          awayTeam: 'Celtics',
          sport: 'nba' as Sport,
          strength: 'moderate',
          signalCount: 2,
          valueSide: 'away',
          confidence: 80,
        },
      ],
    },
    significantMoves: [makeLineMoveItem()],
    disclaimer: SAMPLE_DISCLAIMER,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. DigestContent type compliance
// ---------------------------------------------------------------------------

describe('DigestContent type compliance', () => {
  it('a well-formed digest has a date string', () => {
    const digest = makeDigestContent()
    expect(typeof digest.date).toBe('string')
    expect(digest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('a well-formed digest has a numeric totalGames', () => {
    const digest = makeDigestContent()
    expect(typeof digest.totalGames).toBe('number')
    expect(digest.totalGames).toBeGreaterThanOrEqual(0)
  })

  it('gamesBySport is an object mapping sport keys to DigestGame arrays', () => {
    const digest = makeDigestContent()
    expect(typeof digest.gamesBySport).toBe('object')
    for (const games of Object.values(digest.gamesBySport)) {
      expect(Array.isArray(games)).toBe(true)
    }
  })

  it('smartSignals contains total, strong, and items', () => {
    const digest = makeDigestContent()
    expect(typeof digest.smartSignals.total).toBe('number')
    expect(typeof digest.smartSignals.strong).toBe('number')
    expect(Array.isArray(digest.smartSignals.items)).toBe(true)
  })

  it('significantMoves is an array', () => {
    const digest = makeDigestContent()
    expect(Array.isArray(digest.significantMoves)).toBe(true)
  })

  it('disclaimer is a non-empty string', () => {
    const digest = makeDigestContent()
    expect(typeof digest.disclaimer).toBe('string')
    expect(digest.disclaimer.length).toBeGreaterThan(0)
  })

  it('DigestGame has all required fields', () => {
    const game = makeDigestGame()
    expect(typeof game.id).toBe('string')
    expect(typeof game.sport).toBe('string')
    expect(typeof game.homeTeam).toBe('string')
    expect(typeof game.awayTeam).toBe('string')
    expect(typeof game.commenceTime).toBe('string')
    expect(typeof game.bookmakerCount).toBe('number')
    // bestHomeOdds / bestAwayOdds may be null
    expect(game.bestHomeOdds === null || typeof game.bestHomeOdds === 'number').toBe(true)
    expect(game.bestAwayOdds === null || typeof game.bestAwayOdds === 'number').toBe(true)
  })

  it('LineMoveItem has all required fields', () => {
    const move = makeLineMoveItem()
    expect(typeof move.gameId).toBe('string')
    expect(typeof move.homeTeam).toBe('string')
    expect(typeof move.awayTeam).toBe('string')
    expect(typeof move.sport).toBe('string')
    expect(['home', 'away']).toContain(move.side)
    expect(typeof move.variance).toBe('number')
  })

  it('smartSignals.strong is <= smartSignals.total', () => {
    const digest = makeDigestContent({
      smartSignals: {
        total: 3,
        strong: 1,
        items: [],
      },
    })
    expect(digest.smartSignals.strong).toBeLessThanOrEqual(digest.smartSignals.total)
  })

  it('totalGames matches the sum of games across all sports', () => {
    const digest = makeDigestContent({
      totalGames: 2,
      gamesBySport: {
        nba: [makeDigestGame(), makeDigestGame({ id: 'game-002' })],
      },
    })
    const sumFromSports = Object.values(digest.gamesBySport).reduce(
      (acc, arr) => acc + arr.length,
      0
    )
    expect(digest.totalGames).toBe(sumFromSports)
  })
})

// ---------------------------------------------------------------------------
// 2. formatDigestText output
// ---------------------------------------------------------------------------

describe('formatDigestText output', () => {
  it('includes the date in the header line', () => {
    const digest = makeDigestContent({ date: '2026-03-14' })
    const text = formatDigestText(digest)
    expect(text).toContain('2026-03-14')
  })

  it('includes "BetBrain Daily Digest" in the first line', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    const firstLine = text.split('\n')[0]
    expect(firstLine).toContain('BetBrain Daily Digest')
  })

  it('includes a separator line of equals signs', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(text).toContain('='.repeat(45))
  })

  it('includes SMART SIGNALS section header when signals exist', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(text).toContain('SMART SIGNALS')
  })

  it('includes the signal count in the SMART SIGNALS header', () => {
    const digest = makeDigestContent({
      smartSignals: {
        total: 2,
        strong: 1,
        items: [
          {
            homeTeam: 'Lakers',
            awayTeam: 'Celtics',
            sport: 'nba' as Sport,
            strength: 'moderate',
            signalCount: 2,
            valueSide: null,
            confidence: null,
          },
          {
            homeTeam: 'Bulls',
            awayTeam: 'Heat',
            sport: 'nba' as Sport,
            strength: 'strong',
            signalCount: 3,
            valueSide: 'home',
            confidence: 82,
          },
        ],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('SMART SIGNALS (2)')
  })

  it('marks strong signals with [STRONG] tag', () => {
    const digest = makeDigestContent({
      smartSignals: {
        total: 1,
        strong: 1,
        items: [
          {
            homeTeam: 'Lakers',
            awayTeam: 'Celtics',
            sport: 'nba' as Sport,
            strength: 'strong',
            signalCount: 3,
            valueSide: 'home',
            confidence: 85,
          },
        ],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('[STRONG]')
  })

  it('marks moderate signals with [moderate] tag', () => {
    const digest = makeDigestContent({
      smartSignals: {
        total: 1,
        strong: 0,
        items: [
          {
            homeTeam: 'Lakers',
            awayTeam: 'Celtics',
            sport: 'nba' as Sport,
            strength: 'moderate',
            signalCount: 2,
            valueSide: null,
            confidence: null,
          },
        ],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('[moderate]')
  })

  it('includes home and away team names in signal line', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(text).toContain('Celtics')
    expect(text).toContain('Lakers')
  })

  it('includes sport in uppercase within signal line', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(text).toContain('NBA')
  })

  it('includes Value side when present', () => {
    const digest = makeDigestContent({
      smartSignals: {
        total: 1,
        strong: 0,
        items: [
          {
            homeTeam: 'Lakers',
            awayTeam: 'Celtics',
            sport: 'nba' as Sport,
            strength: 'moderate',
            signalCount: 2,
            valueSide: 'away',
            confidence: null,
          },
        ],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('Value: away')
  })

  it('includes AI confidence percentage when present', () => {
    const digest = makeDigestContent({
      smartSignals: {
        total: 1,
        strong: 0,
        items: [
          {
            homeTeam: 'Lakers',
            awayTeam: 'Celtics',
            sport: 'nba' as Sport,
            strength: 'moderate',
            signalCount: 2,
            valueSide: null,
            confidence: 80,
          },
        ],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('AI: 80%')
  })

  it('includes LINE MOVES section when significant moves exist', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(text).toContain('LINE MOVES')
  })

  it('line move entry includes variance point count', () => {
    const digest = makeDigestContent({
      significantMoves: [makeLineMoveItem({ variance: 45 })],
    })
    const text = formatDigestText(digest)
    expect(text).toContain('45 pts')
  })

  it('line move entry includes side (home/away)', () => {
    const digest = makeDigestContent({
      significantMoves: [makeLineMoveItem({ side: 'home' })],
    })
    const text = formatDigestText(digest)
    expect(text).toContain('home ML varies')
  })

  it("includes TODAY'S GAMES section with total game count", () => {
    const digest = makeDigestContent({ totalGames: 1 })
    const text = formatDigestText(digest)
    expect(text).toContain("TODAY'S GAMES (1 total)")
  })

  it('includes sport label in uppercase for each sport group', () => {
    const digest = makeDigestContent({
      totalGames: 2,
      gamesBySport: {
        nba: [makeDigestGame()],
        nfl: [makeDigestGame({ id: 'g2', sport: 'nfl', homeTeam: 'Chiefs', awayTeam: 'Ravens' })],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('NBA:')
    expect(text).toContain('NFL:')
  })

  it('formats game line with @ between away and home teams', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(text).toContain('Celtics')
    expect(text).toContain('@')
    expect(text).toContain('Lakers')
  })

  it('formats positive home odds with a leading + sign', () => {
    const digest = makeDigestContent({
      gamesBySport: {
        nba: [makeDigestGame({ bestHomeOdds: 120, bestAwayOdds: -140 })],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('+120')
  })

  it('formats negative home odds without a leading +', () => {
    const digest = makeDigestContent({
      gamesBySport: {
        nba: [makeDigestGame({ bestHomeOdds: -115, bestAwayOdds: -105 })],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('-115')
    expect(text).not.toContain('+-115')
  })

  it('shows — for null bestHomeOdds', () => {
    const digest = makeDigestContent({
      gamesBySport: {
        nba: [makeDigestGame({ bestHomeOdds: null, bestAwayOdds: null })],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('—')
  })

  it('includes the disclaimer at the end of the output', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(text).toContain(SAMPLE_DISCLAIMER)
  })

  it('disclaimer appears after the games section', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    const gamesIndex = text.indexOf("TODAY'S GAMES")
    const disclaimerIndex = text.indexOf(SAMPLE_DISCLAIMER)
    expect(disclaimerIndex).toBeGreaterThan(gamesIndex)
  })

  it('output is a single newline-joined string (no undefined/null segments)', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(text).not.toContain('undefined')
    expect(text).not.toContain('null')
  })

  it('returns a non-empty string', () => {
    const digest = makeDigestContent()
    const text = formatDigestText(digest)
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 3. formatDigestText with empty content
// ---------------------------------------------------------------------------

describe('formatDigestText with empty content', () => {
  it('handles zero smart signals — omits SMART SIGNALS section', () => {
    const digest = makeDigestContent({
      smartSignals: { total: 0, strong: 0, items: [] },
    })
    const text = formatDigestText(digest)
    expect(text).not.toContain('SMART SIGNALS')
  })

  it('handles zero significant moves — omits LINE MOVES section', () => {
    const digest = makeDigestContent({ significantMoves: [] })
    const text = formatDigestText(digest)
    expect(text).not.toContain('LINE MOVES')
  })

  it('handles empty gamesBySport — still renders TODAY\'S GAMES header', () => {
    const digest = makeDigestContent({
      totalGames: 0,
      gamesBySport: {},
    })
    const text = formatDigestText(digest)
    expect(text).toContain("TODAY'S GAMES (0 total)")
  })

  it('handles empty content and still includes disclaimer', () => {
    const digest = makeDigestContent({
      totalGames: 0,
      gamesBySport: {},
      smartSignals: { total: 0, strong: 0, items: [] },
      significantMoves: [],
    })
    const text = formatDigestText(digest)
    expect(text).toContain(SAMPLE_DISCLAIMER)
  })

  it('handles empty content and still includes header', () => {
    const digest = makeDigestContent({
      totalGames: 0,
      gamesBySport: {},
      smartSignals: { total: 0, strong: 0, items: [] },
      significantMoves: [],
    })
    const text = formatDigestText(digest)
    expect(text).toContain('BetBrain Daily Digest')
  })

  it('truncates to 10 line move entries when more than 10 exist', () => {
    const moves = Array.from({ length: 15 }, (_, i) =>
      makeLineMoveItem({ gameId: `game-${i}`, variance: 40 + i })
    )
    const digest = makeDigestContent({ significantMoves: moves })
    const text = formatDigestText(digest)
    // Count occurrences of "ML varies" — each line move item includes this phrase
    const count = (text.match(/ML varies/g) ?? []).length
    expect(count).toBeLessThanOrEqual(10)
  })

  it('shows "...and N more" when a sport has more than 5 games', () => {
    const games = Array.from({ length: 7 }, (_, i) =>
      makeDigestGame({ id: `g-${i}`, awayTeam: `Away${i}` })
    )
    const digest = makeDigestContent({
      totalGames: 7,
      gamesBySport: { nba: games },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('...and 2 more')
  })

  it('does not show "...and N more" when a sport has exactly 5 games', () => {
    const games = Array.from({ length: 5 }, (_, i) =>
      makeDigestGame({ id: `g-${i}`, awayTeam: `Away${i}` })
    )
    const digest = makeDigestContent({
      totalGames: 5,
      gamesBySport: { nba: games },
    })
    const text = formatDigestText(digest)
    expect(text).not.toContain('...and')
  })

  it('handles a sport with a single game — uses singular "game"', () => {
    const digest = makeDigestContent({
      totalGames: 1,
      gamesBySport: { nba: [makeDigestGame()] },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('NBA: 1 game')
    expect(text).not.toContain('NBA: 1 games')
  })

  it('handles a sport with multiple games — uses plural "games"', () => {
    const digest = makeDigestContent({
      totalGames: 3,
      gamesBySport: {
        nba: [
          makeDigestGame({ id: 'g1' }),
          makeDigestGame({ id: 'g2' }),
          makeDigestGame({ id: 'g3' }),
        ],
      },
    })
    const text = formatDigestText(digest)
    expect(text).toContain('NBA: 3 games')
  })
})

// ---------------------------------------------------------------------------
// 4. sendDigestEmail — no-op logger
// ---------------------------------------------------------------------------

describe('sendDigestEmail', () => {
  it('does not throw with a valid email and digest', async () => {
    const digest = makeDigestContent()
    await expect(sendDigestEmail('test@example.com', digest)).resolves.not.toThrow()
  })

  it('returns an object with sent: false', async () => {
    const digest = makeDigestContent()
    const result = await sendDigestEmail('test@example.com', digest)
    expect(result.sent).toBe(false)
  })

  it('returns an object with preview: true', async () => {
    const digest = makeDigestContent()
    const result = await sendDigestEmail('test@example.com', digest)
    expect(result.preview).toBe(true)
  })

  it('returns a plain object with both sent and preview fields', async () => {
    const digest = makeDigestContent()
    const result = await sendDigestEmail('user@example.com', digest)
    expect(result).toHaveProperty('sent')
    expect(result).toHaveProperty('preview')
  })

  it('does not throw with an empty signals digest', async () => {
    const digest = makeDigestContent({
      smartSignals: { total: 0, strong: 0, items: [] },
      significantMoves: [],
      totalGames: 0,
      gamesBySport: {},
    })
    await expect(sendDigestEmail('empty@example.com', digest)).resolves.not.toThrow()
  })

  it('resolves (is async / returns a promise)', async () => {
    const digest = makeDigestContent()
    const promise = sendDigestEmail('async@example.com', digest)
    expect(promise).toBeInstanceOf(Promise)
    await promise
  })
})
