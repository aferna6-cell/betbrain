/**
 * Watchlist localStorage helpers unit tests.
 *
 * The watchlist module guards every browser call with
 * `typeof window === 'undefined'`, so all five exported functions are
 * no-ops in a pure Node environment.  We install a minimal localStorage
 * mock on `globalThis` before importing the module so the guards pass and
 * the real logic runs.
 *
 * Each test group calls `storage.clear()` in beforeEach so state never
 * leaks between tests.
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// localStorage mock — must be installed BEFORE the module is imported so that
// `typeof window !== 'undefined'` evaluates to true on the first call.
// ---------------------------------------------------------------------------

const storage = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string): string | null => storage.get(key) ?? null,
  setItem: (key: string, value: string): void => { storage.set(key, value) },
  removeItem: (key: string): void => { storage.delete(key) },
  clear: (): void => { storage.clear() },
  get length(): number { return storage.size },
  key: (index: number): string | null => Array.from(storage.keys())[index] ?? null,
}

// Make `window` point to globalThis so that `typeof window !== 'undefined'`
// is true, then attach our mock localStorage on the same object.
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true, configurable: true })
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true, configurable: true })

// Static import is fine: the `typeof window` guard runs at call-time, not
// at module parse time, so the global is already set when any function runs.
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isWatched,
  clearWatchlist,
} from '@/lib/watchlist'
import type { WatchlistItem } from '@/lib/watchlist'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'betbrain-watchlist'

function makeItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    gameId: 'game-001',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    commenceTime: '2026-03-14T23:00:00Z',
    addedAt: '2026-03-14T10:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. getWatchlist
// ---------------------------------------------------------------------------

describe('getWatchlist', () => {
  beforeEach(() => { storage.clear() })

  it('returns an empty array when localStorage has no entry', () => {
    expect(getWatchlist()).toEqual([])
  })

  it('returns an empty array when the stored value is empty JSON array', () => {
    storage.set(STORAGE_KEY, '[]')
    expect(getWatchlist()).toEqual([])
  })

  it('returns items that were written directly to localStorage', () => {
    const item = makeItem()
    storage.set(STORAGE_KEY, JSON.stringify([item]))
    expect(getWatchlist()).toHaveLength(1)
    expect(getWatchlist()[0]).toEqual(item)
  })

  it('returns multiple items in insertion order', () => {
    const items = [makeItem({ gameId: 'g1' }), makeItem({ gameId: 'g2' })]
    storage.set(STORAGE_KEY, JSON.stringify(items))
    const result = getWatchlist()
    expect(result).toHaveLength(2)
    expect(result[0].gameId).toBe('g1')
    expect(result[1].gameId).toBe('g2')
  })

  it('returns an empty array when the stored value is invalid JSON', () => {
    storage.set(STORAGE_KEY, 'not-json{{')
    expect(getWatchlist()).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 2. addToWatchlist
// ---------------------------------------------------------------------------

describe('addToWatchlist', () => {
  beforeEach(() => { storage.clear() })

  it('adds an item to an empty watchlist', () => {
    addToWatchlist(makeItem())
    expect(getWatchlist()).toHaveLength(1)
  })

  it('persists the item to localStorage under the correct key', () => {
    const item = makeItem({ gameId: 'persist-test' })
    addToWatchlist(item)
    const raw = storage.get(STORAGE_KEY)
    expect(raw).toBeDefined()
    const parsed: WatchlistItem[] = JSON.parse(raw!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].gameId).toBe('persist-test')
  })

  it('stores all WatchlistItem fields without modification', () => {
    const item = makeItem()
    addToWatchlist(item)
    expect(getWatchlist()[0]).toEqual(item)
  })

  it('does not add a duplicate when the same gameId is added twice', () => {
    const item = makeItem()
    addToWatchlist(item)
    addToWatchlist(item)
    expect(getWatchlist()).toHaveLength(1)
  })

  it('does not add a duplicate even when other fields differ', () => {
    addToWatchlist(makeItem({ gameId: 'dup', homeTeam: 'Lakers' }))
    addToWatchlist(makeItem({ gameId: 'dup', homeTeam: 'Warriors' }))
    expect(getWatchlist()).toHaveLength(1)
    // First item wins — the second call is a no-op
    expect(getWatchlist()[0].homeTeam).toBe('Lakers')
  })

  it('adds multiple items with distinct gameIds', () => {
    addToWatchlist(makeItem({ gameId: 'a' }))
    addToWatchlist(makeItem({ gameId: 'b' }))
    addToWatchlist(makeItem({ gameId: 'c' }))
    expect(getWatchlist()).toHaveLength(3)
  })

  it('appends to the end of the existing list', () => {
    addToWatchlist(makeItem({ gameId: 'first' }))
    addToWatchlist(makeItem({ gameId: 'second' }))
    const list = getWatchlist()
    expect(list[0].gameId).toBe('first')
    expect(list[1].gameId).toBe('second')
  })
})

// ---------------------------------------------------------------------------
// 3. removeFromWatchlist
// ---------------------------------------------------------------------------

describe('removeFromWatchlist', () => {
  beforeEach(() => { storage.clear() })

  it('removes the item with the matching gameId', () => {
    addToWatchlist(makeItem({ gameId: 'to-remove' }))
    removeFromWatchlist('to-remove')
    expect(getWatchlist()).toHaveLength(0)
  })

  it('only removes the matching item, leaving others intact', () => {
    addToWatchlist(makeItem({ gameId: 'keep-1' }))
    addToWatchlist(makeItem({ gameId: 'remove-me' }))
    addToWatchlist(makeItem({ gameId: 'keep-2' }))
    removeFromWatchlist('remove-me')
    const list = getWatchlist()
    expect(list).toHaveLength(2)
    expect(list.map((i) => i.gameId)).toEqual(['keep-1', 'keep-2'])
  })

  it('is a no-op when the gameId does not exist in the list', () => {
    addToWatchlist(makeItem({ gameId: 'existing' }))
    removeFromWatchlist('nonexistent')
    expect(getWatchlist()).toHaveLength(1)
  })

  it('is a no-op on an empty watchlist', () => {
    expect(() => removeFromWatchlist('any-id')).not.toThrow()
    expect(getWatchlist()).toHaveLength(0)
  })

  it('writes the updated list back to localStorage', () => {
    addToWatchlist(makeItem({ gameId: 'g1' }))
    addToWatchlist(makeItem({ gameId: 'g2' }))
    removeFromWatchlist('g1')
    const raw = storage.get(STORAGE_KEY)
    const parsed: WatchlistItem[] = JSON.parse(raw!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].gameId).toBe('g2')
  })

  it('removing the only item results in an empty array in localStorage', () => {
    addToWatchlist(makeItem({ gameId: 'solo' }))
    removeFromWatchlist('solo')
    const raw = storage.get(STORAGE_KEY)
    const parsed: WatchlistItem[] = JSON.parse(raw!)
    expect(parsed).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 4. isWatched
// ---------------------------------------------------------------------------

describe('isWatched', () => {
  beforeEach(() => { storage.clear() })

  it('returns false when the watchlist is empty', () => {
    expect(isWatched('game-001')).toBe(false)
  })

  it('returns true for a gameId that has been added', () => {
    addToWatchlist(makeItem({ gameId: 'watched-game' }))
    expect(isWatched('watched-game')).toBe(true)
  })

  it('returns false for a gameId that was never added', () => {
    addToWatchlist(makeItem({ gameId: 'some-game' }))
    expect(isWatched('other-game')).toBe(false)
  })

  it('returns false after the item has been removed', () => {
    addToWatchlist(makeItem({ gameId: 'temp' }))
    removeFromWatchlist('temp')
    expect(isWatched('temp')).toBe(false)
  })

  it('returns false after clearWatchlist', () => {
    addToWatchlist(makeItem({ gameId: 'clear-test' }))
    clearWatchlist()
    expect(isWatched('clear-test')).toBe(false)
  })

  it('is case-sensitive — different casing is not a match', () => {
    addToWatchlist(makeItem({ gameId: 'Game-001' }))
    expect(isWatched('game-001')).toBe(false)
    expect(isWatched('GAME-001')).toBe(false)
    expect(isWatched('Game-001')).toBe(true)
  })

  it('returns true for each item in a multi-item list', () => {
    addToWatchlist(makeItem({ gameId: 'g1' }))
    addToWatchlist(makeItem({ gameId: 'g2' }))
    addToWatchlist(makeItem({ gameId: 'g3' }))
    expect(isWatched('g1')).toBe(true)
    expect(isWatched('g2')).toBe(true)
    expect(isWatched('g3')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 5. clearWatchlist
// ---------------------------------------------------------------------------

describe('clearWatchlist', () => {
  beforeEach(() => { storage.clear() })

  it('removes all items from the watchlist', () => {
    addToWatchlist(makeItem({ gameId: 'a' }))
    addToWatchlist(makeItem({ gameId: 'b' }))
    clearWatchlist()
    expect(getWatchlist()).toEqual([])
  })

  it('removes the localStorage entry entirely', () => {
    addToWatchlist(makeItem())
    clearWatchlist()
    expect(storage.get(STORAGE_KEY)).toBeUndefined()
  })

  it('is a no-op when the watchlist is already empty — does not throw', () => {
    expect(() => clearWatchlist()).not.toThrow()
    expect(getWatchlist()).toEqual([])
  })

  it('leaves other localStorage keys untouched', () => {
    storage.set('other-key', 'other-value')
    addToWatchlist(makeItem())
    clearWatchlist()
    expect(storage.get('other-key')).toBe('other-value')
  })

  it('a new item can be added after clearWatchlist', () => {
    addToWatchlist(makeItem({ gameId: 'before-clear' }))
    clearWatchlist()
    addToWatchlist(makeItem({ gameId: 'after-clear' }))
    expect(getWatchlist()).toHaveLength(1)
    expect(getWatchlist()[0].gameId).toBe('after-clear')
  })
})

// ---------------------------------------------------------------------------
// 6. WatchlistItem shape
// ---------------------------------------------------------------------------

describe('WatchlistItem shape', () => {
  beforeEach(() => { storage.clear() })

  it('stored item has all six required fields', () => {
    const item = makeItem()
    addToWatchlist(item)
    const stored = getWatchlist()[0]
    expect(Object.keys(stored).sort()).toEqual(
      ['addedAt', 'awayTeam', 'commenceTime', 'gameId', 'homeTeam', 'sport'].sort()
    )
  })

  it('gameId is a non-empty string', () => {
    addToWatchlist(makeItem({ gameId: 'id-test' }))
    expect(typeof getWatchlist()[0].gameId).toBe('string')
    expect(getWatchlist()[0].gameId.length).toBeGreaterThan(0)
  })

  it('sport is a non-empty string', () => {
    addToWatchlist(makeItem({ sport: 'nfl' }))
    expect(typeof getWatchlist()[0].sport).toBe('string')
    expect(getWatchlist()[0].sport.length).toBeGreaterThan(0)
  })

  it('homeTeam is a non-empty string', () => {
    addToWatchlist(makeItem({ homeTeam: 'Warriors' }))
    expect(typeof getWatchlist()[0].homeTeam).toBe('string')
    expect(getWatchlist()[0].homeTeam.length).toBeGreaterThan(0)
  })

  it('awayTeam is a non-empty string', () => {
    addToWatchlist(makeItem({ awayTeam: 'Clippers' }))
    expect(typeof getWatchlist()[0].awayTeam).toBe('string')
    expect(getWatchlist()[0].awayTeam.length).toBeGreaterThan(0)
  })

  it('commenceTime is a non-empty string (ISO timestamp)', () => {
    addToWatchlist(makeItem({ commenceTime: '2026-04-01T19:30:00Z' }))
    expect(typeof getWatchlist()[0].commenceTime).toBe('string')
    expect(getWatchlist()[0].commenceTime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('addedAt is a non-empty string (ISO timestamp)', () => {
    addToWatchlist(makeItem({ addedAt: '2026-03-14T10:00:00Z' }))
    expect(typeof getWatchlist()[0].addedAt).toBe('string')
    expect(getWatchlist()[0].addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('all fields round-trip through JSON serialization without loss', () => {
    const item = makeItem()
    addToWatchlist(item)
    const retrieved = getWatchlist()[0]
    expect(retrieved.gameId).toBe(item.gameId)
    expect(retrieved.sport).toBe(item.sport)
    expect(retrieved.homeTeam).toBe(item.homeTeam)
    expect(retrieved.awayTeam).toBe(item.awayTeam)
    expect(retrieved.commenceTime).toBe(item.commenceTime)
    expect(retrieved.addedAt).toBe(item.addedAt)
  })
})

// ---------------------------------------------------------------------------
// 7. Persistence across function calls
// ---------------------------------------------------------------------------

describe('Persistence across function calls', () => {
  beforeEach(() => { storage.clear() })

  it('data written by addToWatchlist is visible to a subsequent getWatchlist call', () => {
    addToWatchlist(makeItem({ gameId: 'persist-1' }))
    // Simulates a later call — same underlying storage
    expect(getWatchlist()).toHaveLength(1)
    expect(getWatchlist()[0].gameId).toBe('persist-1')
  })

  it('multiple sequential addToWatchlist calls accumulate correctly', () => {
    addToWatchlist(makeItem({ gameId: 'seq-1' }))
    addToWatchlist(makeItem({ gameId: 'seq-2' }))
    addToWatchlist(makeItem({ gameId: 'seq-3' }))
    expect(getWatchlist()).toHaveLength(3)
  })

  it('isWatched reflects the state after a sequence of add and remove', () => {
    addToWatchlist(makeItem({ gameId: 'add-remove' }))
    expect(isWatched('add-remove')).toBe(true)
    removeFromWatchlist('add-remove')
    expect(isWatched('add-remove')).toBe(false)
  })

  it('add → clear → add restores a single-item list', () => {
    addToWatchlist(makeItem({ gameId: 'cycle-1' }))
    clearWatchlist()
    addToWatchlist(makeItem({ gameId: 'cycle-2' }))
    const list = getWatchlist()
    expect(list).toHaveLength(1)
    expect(list[0].gameId).toBe('cycle-2')
  })

  it('length grows and shrinks correctly through a full add/remove cycle', () => {
    expect(getWatchlist()).toHaveLength(0)
    addToWatchlist(makeItem({ gameId: 'g1' }))
    expect(getWatchlist()).toHaveLength(1)
    addToWatchlist(makeItem({ gameId: 'g2' }))
    expect(getWatchlist()).toHaveLength(2)
    removeFromWatchlist('g1')
    expect(getWatchlist()).toHaveLength(1)
    removeFromWatchlist('g2')
    expect(getWatchlist()).toHaveLength(0)
  })

  it('duplicate add attempt does not change the list length', () => {
    addToWatchlist(makeItem({ gameId: 'dedup' }))
    addToWatchlist(makeItem({ gameId: 'dedup' }))
    addToWatchlist(makeItem({ gameId: 'dedup' }))
    expect(getWatchlist()).toHaveLength(1)
  })

  it('remove then re-add treats it as a fresh entry appended at the end', () => {
    addToWatchlist(makeItem({ gameId: 'first' }))
    addToWatchlist(makeItem({ gameId: 'second' }))
    removeFromWatchlist('first')
    addToWatchlist(makeItem({ gameId: 'first' }))
    const list = getWatchlist()
    // 'first' was removed and re-added — it should appear after 'second'
    expect(list).toHaveLength(2)
    expect(list[0].gameId).toBe('second')
    expect(list[1].gameId).toBe('first')
  })
})
