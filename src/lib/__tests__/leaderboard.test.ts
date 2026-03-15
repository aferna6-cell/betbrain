/**
 * Leaderboard unit tests.
 *
 * Validates shape, determinism, sort order for every column, field
 * correctness, rank assignment, win rate bounds, and pick count math.
 * Pure logic — no external API or database calls.
 */

import { describe, it, expect } from 'vitest'
import { getLeaderboard } from '@/lib/leaderboard'
import type { LeaderboardResult, LeaderboardEntry } from '@/lib/leaderboard'

// ---------------------------------------------------------------------------
// 1. Return shape
// ---------------------------------------------------------------------------

describe('getLeaderboard returns correct shape', () => {
  it('result has entries array', () => {
    const result: LeaderboardResult = getLeaderboard()
    expect(Array.isArray(result.entries)).toBe(true)
  })

  it('result has lastUpdated string', () => {
    const result = getLeaderboard()
    expect(typeof result.lastUpdated).toBe('string')
    expect(result.lastUpdated.length).toBeGreaterThan(0)
  })

  it('result has totalParticipants number', () => {
    const result = getLeaderboard()
    expect(typeof result.totalParticipants).toBe('number')
    expect(result.totalParticipants).toBeGreaterThan(0)
  })

  it('entries length equals totalParticipants', () => {
    const result = getLeaderboard()
    expect(result.entries.length).toBe(result.totalParticipants)
  })

  it('totalParticipants is 25', () => {
    const result = getLeaderboard()
    expect(result.totalParticipants).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// 2. Determinism
// ---------------------------------------------------------------------------

describe('Determinism', () => {
  it('calling with roi twice returns identical entries', () => {
    const r1 = getLeaderboard('roi')
    const r2 = getLeaderboard('roi')
    expect(r1.entries).toEqual(r2.entries)
  })

  it('calling with profit twice returns identical entries', () => {
    const r1 = getLeaderboard('profit')
    const r2 = getLeaderboard('profit')
    expect(r1.entries).toEqual(r2.entries)
  })

  it('calling with winRate twice returns identical entries', () => {
    const r1 = getLeaderboard('winRate')
    const r2 = getLeaderboard('winRate')
    expect(r1.entries).toEqual(r2.entries)
  })

  it('calling with picks twice returns identical entries', () => {
    const r1 = getLeaderboard('picks')
    const r2 = getLeaderboard('picks')
    expect(r1.entries).toEqual(r2.entries)
  })

  it('totalParticipants is always 25 regardless of sort', () => {
    for (const sort of ['roi', 'profit', 'winRate', 'picks'] as const) {
      expect(getLeaderboard(sort).totalParticipants).toBe(25)
    }
  })
})

// ---------------------------------------------------------------------------
// 3. Sort order — roi
// ---------------------------------------------------------------------------

describe('Sort order — roi', () => {
  it('entries are sorted by roi descending', () => {
    const { entries } = getLeaderboard('roi')
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].roi).toBeGreaterThanOrEqual(entries[i + 1].roi)
    }
  })

  it('first entry has highest roi', () => {
    const { entries } = getLeaderboard('roi')
    const maxRoi = Math.max(...entries.map((e) => e.roi))
    expect(entries[0].roi).toBe(maxRoi)
  })
})

// ---------------------------------------------------------------------------
// 4. Sort order — profit
// ---------------------------------------------------------------------------

describe('Sort order — profit', () => {
  it('entries are sorted by totalProfit descending', () => {
    const { entries } = getLeaderboard('profit')
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].totalProfit).toBeGreaterThanOrEqual(entries[i + 1].totalProfit)
    }
  })

  it('first entry has highest totalProfit', () => {
    const { entries } = getLeaderboard('profit')
    const maxProfit = Math.max(...entries.map((e) => e.totalProfit))
    expect(entries[0].totalProfit).toBe(maxProfit)
  })
})

// ---------------------------------------------------------------------------
// 5. Sort order — winRate
// ---------------------------------------------------------------------------

describe('Sort order — winRate', () => {
  it('entries are sorted by winRate descending', () => {
    const { entries } = getLeaderboard('winRate')
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].winRate).toBeGreaterThanOrEqual(entries[i + 1].winRate)
    }
  })

  it('first entry has highest winRate', () => {
    const { entries } = getLeaderboard('winRate')
    const maxWr = Math.max(...entries.map((e) => e.winRate))
    expect(entries[0].winRate).toBe(maxWr)
  })
})

// ---------------------------------------------------------------------------
// 6. Sort order — picks
// ---------------------------------------------------------------------------

describe('Sort order — picks', () => {
  it('entries are sorted by totalPicks descending', () => {
    const { entries } = getLeaderboard('picks')
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].totalPicks).toBeGreaterThanOrEqual(entries[i + 1].totalPicks)
    }
  })

  it('first entry has highest totalPicks', () => {
    const { entries } = getLeaderboard('picks')
    const maxPicks = Math.max(...entries.map((e) => e.totalPicks))
    expect(entries[0].totalPicks).toBe(maxPicks)
  })
})

// ---------------------------------------------------------------------------
// 7. Entry fields
// ---------------------------------------------------------------------------

describe('Entry fields', () => {
  const REQUIRED_KEYS: (keyof LeaderboardEntry)[] = [
    'rank',
    'displayName',
    'wins',
    'losses',
    'pushes',
    'winRate',
    'totalProfit',
    'roi',
    'streak',
    'favoriteSport',
    'totalPicks',
  ]

  it('every entry has all required fields', () => {
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      for (const key of REQUIRED_KEYS) {
        expect(entry).toHaveProperty(key)
      }
    }
  })

  it('displayName is a non-empty string', () => {
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(typeof entry.displayName).toBe('string')
      expect(entry.displayName.length).toBeGreaterThan(0)
    }
  })

  it('wins, losses, pushes are non-negative integers', () => {
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(entry.wins).toBeGreaterThanOrEqual(0)
      expect(entry.losses).toBeGreaterThanOrEqual(0)
      expect(entry.pushes).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(entry.wins)).toBe(true)
      expect(Number.isInteger(entry.losses)).toBe(true)
      expect(Number.isInteger(entry.pushes)).toBe(true)
    }
  })

  it('streak matches expected format (W or L followed by a digit)', () => {
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(entry.streak).toMatch(/^[WL]\d+$/)
    }
  })

  it('favoriteSport is one of NBA, NFL, MLB, NHL', () => {
    const VALID_SPORTS = new Set(['NBA', 'NFL', 'MLB', 'NHL'])
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(VALID_SPORTS.has(entry.favoriteSport)).toBe(true)
    }
  })

  it('totalPicks is a positive integer', () => {
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(Number.isInteger(entry.totalPicks)).toBe(true)
      expect(entry.totalPicks).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 8. Rank assignment
// ---------------------------------------------------------------------------

describe('Rank assignment', () => {
  it('ranks run from 1 to N in order', () => {
    const { entries } = getLeaderboard()
    entries.forEach((entry, i) => {
      expect(entry.rank).toBe(i + 1)
    })
  })

  it('first entry has rank 1', () => {
    const result = getLeaderboard()
    expect(result.entries[0].rank).toBe(1)
  })

  it('last entry has rank equal to totalParticipants', () => {
    const result = getLeaderboard()
    const last = result.entries[result.entries.length - 1]
    expect(last.rank).toBe(result.totalParticipants)
  })

  it('ranks are unique — no two entries share a rank', () => {
    const { entries } = getLeaderboard()
    const ranks = entries.map((e) => e.rank)
    expect(new Set(ranks).size).toBe(ranks.length)
  })

  it('rank assignment is consistent regardless of sort column', () => {
    for (const sort of ['roi', 'profit', 'winRate', 'picks'] as const) {
      const { entries } = getLeaderboard(sort)
      entries.forEach((entry, i) => {
        expect(entry.rank).toBe(i + 1)
      })
    }
  })
})

// ---------------------------------------------------------------------------
// 9. Win rate bounds
// ---------------------------------------------------------------------------

describe('Win rate bounds', () => {
  it('all win rates are between 0 and 100', () => {
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(entry.winRate).toBeGreaterThanOrEqual(0)
      expect(entry.winRate).toBeLessThanOrEqual(100)
    }
  })

  it('all win rates are in the expected 48–62% generation range', () => {
    // Generator constrains winRate to 48 + rand * 14
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(entry.winRate).toBeGreaterThanOrEqual(48)
      expect(entry.winRate).toBeLessThanOrEqual(62)
    }
  })

  it('win rates are rounded to one decimal place', () => {
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(entry.winRate).toBe(Math.round(entry.winRate * 10) / 10)
    }
  })
})

// ---------------------------------------------------------------------------
// 10. Total picks integrity
// ---------------------------------------------------------------------------

describe('Total picks integrity', () => {
  it('wins + losses + pushes equals totalPicks for every entry', () => {
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(entry.wins + entry.losses + entry.pushes).toBe(entry.totalPicks)
    }
  })

  it('totalPicks is at least 20 for every entry', () => {
    // Generator lower bound is 20
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(entry.totalPicks).toBeGreaterThanOrEqual(20)
    }
  })

  it('totalPicks is at most 200 for every entry', () => {
    // Generator upper bound is 20 + 180 = 200
    const { entries } = getLeaderboard()
    for (const entry of entries) {
      expect(entry.totalPicks).toBeLessThanOrEqual(200)
    }
  })

  it('wins + losses + pushes equals totalPicks across all sort columns', () => {
    for (const sort of ['roi', 'profit', 'winRate', 'picks'] as const) {
      const { entries } = getLeaderboard(sort)
      for (const entry of entries) {
        expect(entry.wins + entry.losses + entry.pushes).toBe(entry.totalPicks)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 11. Default sort
// ---------------------------------------------------------------------------

describe('Default sort', () => {
  it('getLeaderboard() with no args produces same entries as getLeaderboard("roi")', () => {
    const defaultResult = getLeaderboard()
    const roiResult = getLeaderboard('roi')
    expect(defaultResult.entries).toEqual(roiResult.entries)
  })

  it('default result is sorted by roi descending', () => {
    const { entries } = getLeaderboard()
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].roi).toBeGreaterThanOrEqual(entries[i + 1].roi)
    }
  })
})
