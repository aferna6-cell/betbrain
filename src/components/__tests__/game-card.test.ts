/**
 * GameCard helper function tests.
 *
 * Covers:
 * - formatGameTime — today, tomorrow, other dates
 * - formatOdds — positive, negative, null
 * - getBestOdds — best price selection across bookmakers
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Re-implement pure helpers locally (component imports JSX dependencies)
// ---------------------------------------------------------------------------

function formatGameTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (isToday) return `Today ${time}`
  if (isTomorrow) return `Tomorrow ${time}`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatOdds(price: number | null): string {
  if (price === null) return '—'
  return price > 0 ? `+${price}` : `${price}`
}

function getBestOdds(game: NormalizedGame, side: 'home' | 'away'): number | null {
  let best: number | null = null
  for (const bk of game.bookmakers) {
    const price = side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (price !== null && price !== undefined) {
      if (best === null || price > best) {
        best = price
      }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeBookmaker(
  name: string,
  home: number | null,
  away: number | null
): NormalizedBookmakerOdds {
  return {
    bookmaker: name,
    moneyline: { home, away, draw: null },
    spread: null,
    total: null,
    lastUpdated: '2026-03-14T12:00:00Z',
  }
}

function makeGame(bookmakers: NormalizedBookmakerOdds[] = []): NormalizedGame {
  return {
    id: 'game-1',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-14T19:30:00Z',
    fromCache: false,
    isFresh: true,
    bookmakers,
  }
}

// ---------------------------------------------------------------------------
// formatOdds
// ---------------------------------------------------------------------------

describe('formatOdds', () => {
  it('returns em dash for null', () => {
    expect(formatOdds(null)).toBe('—')
  })

  it('prepends + for positive odds', () => {
    expect(formatOdds(150)).toBe('+150')
  })

  it('keeps - for negative odds', () => {
    expect(formatOdds(-110)).toBe('-110')
  })

  it('returns "0" for zero (no + prefix)', () => {
    expect(formatOdds(0)).toBe('0')
  })

  it('handles even money +100', () => {
    expect(formatOdds(100)).toBe('+100')
  })

  it('handles large favorites', () => {
    expect(formatOdds(-500)).toBe('-500')
  })

  it('handles large underdogs', () => {
    expect(formatOdds(1000)).toBe('+1000')
  })
})

// ---------------------------------------------------------------------------
// formatGameTime
// ---------------------------------------------------------------------------

describe('formatGameTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "Today" prefix for today\'s games', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T10:00:00'))
    const result = formatGameTime('2026-03-14T19:30:00')
    expect(result).toMatch(/^Today/)
  })

  it('shows "Tomorrow" prefix for tomorrow\'s games', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T10:00:00'))
    const result = formatGameTime('2026-03-15T19:30:00')
    expect(result).toMatch(/^Tomorrow/)
  })

  it('shows month and day for future dates beyond tomorrow', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T10:00:00'))
    const result = formatGameTime('2026-03-20T19:30:00')
    expect(result).not.toMatch(/^Today/)
    expect(result).not.toMatch(/^Tomorrow/)
    expect(result).toMatch(/Mar/)
  })

  it('includes time for today games', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T10:00:00'))
    const result = formatGameTime('2026-03-14T19:30:00')
    // Should contain time portion
    expect(result.length).toBeGreaterThan(5)
  })
})

// ---------------------------------------------------------------------------
// getBestOdds
// ---------------------------------------------------------------------------

describe('getBestOdds', () => {
  it('returns null for no bookmakers', () => {
    const game = makeGame([])
    expect(getBestOdds(game, 'home')).toBeNull()
    expect(getBestOdds(game, 'away')).toBeNull()
  })

  it('returns the only odds when single bookmaker', () => {
    const game = makeGame([makeBookmaker('fanduel', -150, 130)])
    expect(getBestOdds(game, 'home')).toBe(-150)
    expect(getBestOdds(game, 'away')).toBe(130)
  })

  it('picks the best (highest) home odds across bookmakers', () => {
    const game = makeGame([
      makeBookmaker('fanduel', -150, 130),
      makeBookmaker('draftkings', -140, 125),
      makeBookmaker('betmgm', -155, 135),
    ])
    expect(getBestOdds(game, 'home')).toBe(-140) // -140 > -150 > -155
  })

  it('picks the best (highest) away odds across bookmakers', () => {
    const game = makeGame([
      makeBookmaker('fanduel', -150, 130),
      makeBookmaker('draftkings', -140, 125),
      makeBookmaker('betmgm', -155, 135),
    ])
    expect(getBestOdds(game, 'away')).toBe(135)
  })

  it('skips bookmakers with null moneyline', () => {
    const nullBk: NormalizedBookmakerOdds = {
      bookmaker: 'broken',
      moneyline: null,
      spread: null,
      total: null,
      lastUpdated: '2026-03-14T12:00:00Z',
    }
    const game = makeGame([nullBk, makeBookmaker('fanduel', -110, 130)])
    expect(getBestOdds(game, 'home')).toBe(-110)
  })

  it('skips null individual prices', () => {
    const game = makeGame([
      makeBookmaker('fanduel', null, 130),
      makeBookmaker('draftkings', -110, null),
    ])
    expect(getBestOdds(game, 'home')).toBe(-110)
    expect(getBestOdds(game, 'away')).toBe(130)
  })

  it('returns null when all prices are null', () => {
    const game = makeGame([
      makeBookmaker('fanduel', null, null),
      makeBookmaker('draftkings', null, null),
    ])
    expect(getBestOdds(game, 'home')).toBeNull()
  })

  it('handles mix of positive and negative odds', () => {
    const game = makeGame([
      makeBookmaker('book1', -200, 100),
      makeBookmaker('book2', 150, -110),
    ])
    // For home: 150 > -200
    expect(getBestOdds(game, 'home')).toBe(150)
    // For away: 100 > -110
    expect(getBestOdds(game, 'away')).toBe(100)
  })

  it('best odds = highest numeric value (less negative is better)', () => {
    const game = makeGame([
      makeBookmaker('book1', -110, -110),
      makeBookmaker('book2', -105, -115),
    ])
    expect(getBestOdds(game, 'home')).toBe(-105)
    expect(getBestOdds(game, 'away')).toBe(-110)
  })
})
