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
vi.stubGlobal('crypto', { randomUUID: () => `test-${Date.now()}-${Math.random()}` })

import {
  getAllParlayGroups,
  createParlayGroup,
  deleteParlayGroup,
  calculateParlayVsStraightStats,
  type ParlayGroup,
} from '../parlay-stats'

describe('parlay-stats', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('CRUD', () => {
    it('creates a parlay group', () => {
      const group = createParlayGroup({
        pickIds: ['p1', 'p2', 'p3'],
        totalOdds: 600,
        units: 1,
      })
      expect(group.legs).toBe(3)
      expect(group.anyPending).toBe(true)
    })

    it('retrieves all groups', () => {
      createParlayGroup({ pickIds: ['p1', 'p2'], totalOdds: 300, units: 1 })
      createParlayGroup({ pickIds: ['p3', 'p4'], totalOdds: 400, units: 2 })
      expect(getAllParlayGroups().length).toBe(2)
    })

    it('deletes a group', () => {
      const group = createParlayGroup({ pickIds: ['p1'], totalOdds: 200, units: 1 })
      expect(deleteParlayGroup(group.id)).toBe(true)
      expect(getAllParlayGroups().length).toBe(0)
    })

    it('delete returns false for missing id', () => {
      expect(deleteParlayGroup('nonexistent')).toBe(false)
    })
  })

  describe('calculateParlayVsStraightStats', () => {
    it('separates straight and parlay picks', () => {
      const picks = [
        { id: 'p1', outcome: 'win', profit: 1, units: 1 },
        { id: 'p2', outcome: 'loss', profit: -1, units: 1 },
        { id: 'p3', outcome: 'win', profit: 1, units: 1 },
        { id: 'p4', outcome: 'win', profit: 1, units: 1 },
      ]
      const parlayGroups: ParlayGroup[] = [{
        id: 'pg1',
        pickIds: ['p3', 'p4'],
        legs: 2,
        allWon: false,
        anyPending: false,
        totalOdds: 300,
        units: 1,
        profit: null,
        createdAt: new Date().toISOString(),
      }]

      const stats = calculateParlayVsStraightStats(picks, parlayGroups)

      // Straight: p1 (win) + p2 (loss)
      expect(stats.straight.total).toBe(2)
      expect(stats.straight.wins).toBe(1)
      expect(stats.straight.losses).toBe(1)

      // Parlay: 1 group with 2 winning legs
      expect(stats.parlay.total).toBe(1)
      expect(stats.parlay.hits).toBe(1)
    })

    it('handles all-straight picks', () => {
      const picks = [
        { id: 'p1', outcome: 'win', profit: 2, units: 1 },
        { id: 'p2', outcome: 'win', profit: 1.5, units: 1 },
      ]

      const stats = calculateParlayVsStraightStats(picks, [])
      expect(stats.straight.total).toBe(2)
      expect(stats.straight.wins).toBe(2)
      expect(stats.parlay.total).toBe(0)
    })

    it('detects missed parlay (any leg lost)', () => {
      const picks = [
        { id: 'p1', outcome: 'win', profit: 1, units: 1 },
        { id: 'p2', outcome: 'loss', profit: -1, units: 1 },
      ]
      const parlayGroups: ParlayGroup[] = [{
        id: 'pg1',
        pickIds: ['p1', 'p2'],
        legs: 2,
        allWon: false,
        anyPending: false,
        totalOdds: 400,
        units: 1,
        profit: null,
        createdAt: new Date().toISOString(),
      }]

      const stats = calculateParlayVsStraightStats(picks, parlayGroups)
      expect(stats.parlay.hits).toBe(0)
      expect(stats.parlay.misses).toBe(1)
      expect(stats.parlay.profit).toBeLessThan(0)
    })

    it('handles pending parlays', () => {
      const picks = [
        { id: 'p1', outcome: 'win', profit: 1, units: 1 },
        { id: 'p2', outcome: 'pending', profit: null, units: 1 },
      ]
      const parlayGroups: ParlayGroup[] = [{
        id: 'pg1',
        pickIds: ['p1', 'p2'],
        legs: 2,
        allWon: false,
        anyPending: true,
        totalOdds: 300,
        units: 1,
        profit: null,
        createdAt: new Date().toISOString(),
      }]

      const stats = calculateParlayVsStraightStats(picks, parlayGroups)
      expect(stats.parlay.pending).toBe(1)
      expect(stats.parlay.hits).toBe(0)
    })

    it('calculates hit rate correctly', () => {
      const picks = [
        { id: 'p1', outcome: 'win', profit: 1, units: 1 },
        { id: 'p2', outcome: 'win', profit: 1, units: 1 },
        { id: 'p3', outcome: 'win', profit: 1, units: 1 },
        { id: 'p4', outcome: 'loss', profit: -1, units: 1 },
      ]
      const parlayGroups: ParlayGroup[] = [
        {
          id: 'pg1',
          pickIds: ['p1', 'p2'],
          legs: 2,
          allWon: false,
          anyPending: false,
          totalOdds: 300,
          units: 1,
          profit: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'pg2',
          pickIds: ['p3', 'p4'],
          legs: 2,
          allWon: false,
          anyPending: false,
          totalOdds: 300,
          units: 1,
          profit: null,
          createdAt: new Date().toISOString(),
        },
      ]

      const stats = calculateParlayVsStraightStats(picks, parlayGroups)
      expect(stats.parlay.hitRate).toBe(50) // 1 hit out of 2
    })

    it('calculates average legs', () => {
      const parlayGroups: ParlayGroup[] = [
        { id: 'pg1', pickIds: ['p1', 'p2'], legs: 2, allWon: false, anyPending: true, totalOdds: 300, units: 1, profit: null, createdAt: new Date().toISOString() },
        { id: 'pg2', pickIds: ['p3', 'p4', 'p5'], legs: 3, allWon: false, anyPending: true, totalOdds: 800, units: 1, profit: null, createdAt: new Date().toISOString() },
      ]
      const stats = calculateParlayVsStraightStats([], parlayGroups)
      expect(stats.parlay.avgLegs).toBe(2.5)
    })
  })
})
