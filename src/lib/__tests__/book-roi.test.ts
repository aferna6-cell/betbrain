import { describe, it, expect, beforeEach, vi } from 'vitest'

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

import {
  getBookForPick,
  setBookForPick,
  removeBookForPick,
  getAllAssignments,
  calculateBookROI,
  exportBookROIToCSV,
  type BookAssignment,
} from '../book-roi'

describe('book-roi', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('assignments', () => {
    it('sets and gets book for a pick', () => {
      setBookForPick('pick-1', 'draftkings')
      expect(getBookForPick('pick-1')).toBe('draftkings')
    })

    it('returns null for unassigned pick', () => {
      expect(getBookForPick('unknown')).toBeNull()
    })

    it('updates existing assignment', () => {
      setBookForPick('pick-1', 'draftkings')
      setBookForPick('pick-1', 'fanduel')
      expect(getBookForPick('pick-1')).toBe('fanduel')
    })

    it('removes assignment', () => {
      setBookForPick('pick-1', 'draftkings')
      removeBookForPick('pick-1')
      expect(getBookForPick('pick-1')).toBeNull()
    })

    it('getAllAssignments returns all', () => {
      setBookForPick('pick-1', 'draftkings')
      setBookForPick('pick-2', 'fanduel')
      expect(getAllAssignments().length).toBe(2)
    })
  })

  describe('calculateBookROI', () => {
    it('calculates ROI per book', () => {
      const picks = [
        { id: 'p1', outcome: 'win', profit: 1, units: 1 },
        { id: 'p2', outcome: 'loss', profit: -1, units: 1 },
        { id: 'p3', outcome: 'win', profit: 1.5, units: 1 },
        { id: 'p4', outcome: 'win', profit: 0.8, units: 1 },
      ]
      const assignments: BookAssignment[] = [
        { pickId: 'p1', bookmaker: 'draftkings' },
        { pickId: 'p2', bookmaker: 'draftkings' },
        { pickId: 'p3', bookmaker: 'fanduel' },
        { pickId: 'p4', bookmaker: 'fanduel' },
      ]

      const result = calculateBookROI(picks, assignments)
      expect(result.length).toBe(2)

      const dk = result.find((r) => r.bookmaker === 'draftkings')!
      expect(dk.wins).toBe(1)
      expect(dk.losses).toBe(1)
      expect(dk.totalProfit).toBe(0)
      expect(dk.roi).toBe(0)

      const fd = result.find((r) => r.bookmaker === 'fanduel')!
      expect(fd.wins).toBe(2)
      expect(fd.losses).toBe(0)
      expect(fd.totalProfit).toBe(2.3)
      expect(fd.roi).toBeGreaterThan(0)
    })

    it('ignores unassigned picks', () => {
      const picks = [
        { id: 'p1', outcome: 'win', profit: 1, units: 1 },
      ]
      const result = calculateBookROI(picks, [])
      expect(result.length).toBe(0)
    })

    it('ignores pending picks', () => {
      const picks = [
        { id: 'p1', outcome: 'pending', profit: null, units: 1 },
      ]
      const assignments: BookAssignment[] = [
        { pickId: 'p1', bookmaker: 'draftkings' },
      ]
      const result = calculateBookROI(picks, assignments)
      expect(result.length).toBe(0)
    })

    it('sorts by ROI descending', () => {
      const picks = [
        { id: 'p1', outcome: 'win', profit: 5, units: 1 },
        { id: 'p2', outcome: 'loss', profit: -2, units: 1 },
      ]
      const assignments: BookAssignment[] = [
        { pickId: 'p1', bookmaker: 'best_book' },
        { pickId: 'p2', bookmaker: 'worst_book' },
      ]
      const result = calculateBookROI(picks, assignments)
      expect(result[0].bookmaker).toBe('best_book')
      expect(result[1].bookmaker).toBe('worst_book')
    })

    it('handles pushes', () => {
      const picks = [
        { id: 'p1', outcome: 'push', profit: 0, units: 1 },
      ]
      const assignments: BookAssignment[] = [
        { pickId: 'p1', bookmaker: 'draftkings' },
      ]
      const result = calculateBookROI(picks, assignments)
      expect(result[0].pushes).toBe(1)
    })
  })

  describe('exportBookROIToCSV', () => {
    it('produces valid CSV', () => {
      const data = [{
        bookmaker: 'draftkings',
        picks: 10,
        wins: 6,
        losses: 4,
        pushes: 0,
        totalProfit: 2.5,
        totalUnits: 10,
        roi: 25,
        winRate: 60,
      }]
      const csv = exportBookROIToCSV(data)
      expect(csv).toContain('Bookmaker,Picks')
      expect(csv).toContain('draftkings,10,6,4,0,2.5,10,25,60')
    })
  })
})
