import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
  length: 0,
  key: vi.fn(() => null),
}

vi.stubGlobal('window', { localStorage: localStorageMock })
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('crypto', { randomUUID: () => `test-${Date.now()}-${Math.random()}` })

import {
  getAllEntries,
  getEntry,
  getEntryByDate,
  createEntry,
  updateEntry,
  deleteEntry,
  calculateJournalStats,
  exportJournalToCSV,
  type JournalEntry,
  type JournalMood,
} from '../journal'

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: `entry-${Math.random()}`,
    date: '2026-03-23',
    mood: 'good' as JournalMood,
    bankroll: 1000,
    title: 'Test entry',
    notes: 'Some notes',
    lessons: ['Lesson 1'],
    tags: ['nba'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('journal', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('CRUD', () => {
    it('creates and retrieves an entry', () => {
      const entry = createEntry({
        date: '2026-03-23',
        title: 'Test',
        mood: 'good',
        bankroll: 500,
        notes: 'Notes',
        lessons: ['L1'],
        tags: ['nba'],
      })

      expect(entry.id).toBeTruthy()
      expect(entry.title).toBe('Test')
      expect(entry.mood).toBe('good')

      const retrieved = getEntry(entry.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.title).toBe('Test')
    })

    it('getAllEntries returns sorted by date descending', () => {
      createEntry({ date: '2026-03-20', title: 'Old', mood: 'neutral', bankroll: null, notes: '', lessons: [], tags: [] })
      createEntry({ date: '2026-03-23', title: 'New', mood: 'good', bankroll: null, notes: '', lessons: [], tags: [] })
      createEntry({ date: '2026-03-21', title: 'Mid', mood: 'bad', bankroll: null, notes: '', lessons: [], tags: [] })

      const entries = getAllEntries()
      expect(entries.map((e) => e.title)).toEqual(['New', 'Mid', 'Old'])
    })

    it('getEntryByDate returns matching entry', () => {
      createEntry({ date: '2026-03-23', title: 'March 23', mood: 'good', bankroll: null, notes: '', lessons: [], tags: [] })
      const found = getEntryByDate('2026-03-23')
      expect(found).not.toBeNull()
      expect(found!.title).toBe('March 23')
    })

    it('updateEntry modifies and returns entry', () => {
      const entry = createEntry({ date: '2026-03-23', title: 'Original', mood: 'neutral', bankroll: 500, notes: '', lessons: [], tags: [] })
      const updated = updateEntry(entry.id, { title: 'Updated', mood: 'great' })
      expect(updated).not.toBeNull()
      expect(updated!.title).toBe('Updated')
      expect(updated!.mood).toBe('great')
    })

    it('updateEntry returns null for missing id', () => {
      expect(updateEntry('nonexistent', { title: 'X' })).toBeNull()
    })

    it('deleteEntry removes the entry', () => {
      const entry = createEntry({ date: '2026-03-23', title: 'Doomed', mood: 'bad', bankroll: null, notes: '', lessons: [], tags: [] })
      expect(deleteEntry(entry.id)).toBe(true)
      expect(getEntry(entry.id)).toBeNull()
    })

    it('deleteEntry returns false for missing id', () => {
      expect(deleteEntry('nonexistent')).toBe(false)
    })
  })

  describe('calculateJournalStats', () => {
    it('calculates mood distribution', () => {
      const entries: JournalEntry[] = [
        makeEntry({ mood: 'good' }),
        makeEntry({ mood: 'good' }),
        makeEntry({ mood: 'bad' }),
        makeEntry({ mood: 'great' }),
      ]
      const stats = calculateJournalStats(entries)
      expect(stats.moodDistribution.good).toBe(2)
      expect(stats.moodDistribution.bad).toBe(1)
      expect(stats.moodDistribution.great).toBe(1)
      expect(stats.moodDistribution.neutral).toBe(0)
    })

    it('calculates average bankroll', () => {
      const entries: JournalEntry[] = [
        makeEntry({ bankroll: 1000 }),
        makeEntry({ bankroll: 2000 }),
        makeEntry({ bankroll: null }),
      ]
      const stats = calculateJournalStats(entries)
      expect(stats.avgBankroll).toBe(1500)
    })

    it('returns null avgBankroll when no bankroll entries', () => {
      const entries: JournalEntry[] = [
        makeEntry({ bankroll: null }),
      ]
      const stats = calculateJournalStats(entries)
      expect(stats.avgBankroll).toBeNull()
    })

    it('calculates top tags', () => {
      const entries: JournalEntry[] = [
        makeEntry({ tags: ['nba', 'parlay'] }),
        makeEntry({ tags: ['nba', 'live'] }),
        makeEntry({ tags: ['nba'] }),
      ]
      const stats = calculateJournalStats(entries)
      expect(stats.topTags[0].tag).toBe('nba')
      expect(stats.topTags[0].count).toBe(3)
    })

    it('counts lessons', () => {
      const entries: JournalEntry[] = [
        makeEntry({ lessons: ['L1', 'L2'] }),
        makeEntry({ lessons: ['L3'] }),
      ]
      const stats = calculateJournalStats(entries)
      expect(stats.lessonsCount).toBe(3)
    })

    it('handles empty entries', () => {
      const stats = calculateJournalStats([])
      expect(stats.totalEntries).toBe(0)
      expect(stats.currentStreak).toBe(0)
    })
  })

  describe('exportJournalToCSV', () => {
    it('produces valid CSV', () => {
      const entries: JournalEntry[] = [
        makeEntry({ date: '2026-03-23', title: 'Good day', mood: 'good', bankroll: 1000 }),
      ]
      const csv = exportJournalToCSV(entries)
      expect(csv).toContain('Date,Title,Mood,Bankroll')
      expect(csv).toContain('2026-03-23')
      expect(csv).toContain('Good day')
      expect(csv).toContain('good')
    })

    it('escapes quotes in CSV', () => {
      const entries: JournalEntry[] = [
        makeEntry({ title: 'He said "hello"' }),
      ]
      const csv = exportJournalToCSV(entries)
      expect(csv).toContain('""hello""')
    })
  })
})
