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
  getAllGoals,
  createGoal,
  deleteGoal,
  calculateGoalProgress,
  getGoalTemplates,
  type BankrollGoal,
} from '../bankroll-goals'

function makeGoal(overrides: Partial<BankrollGoal> = {}): BankrollGoal {
  return {
    id: 'goal-1',
    period: 'weekly',
    targetProfit: 10,
    startDate: '2026-03-23',
    endDate: null,
    description: 'Win 10 units',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makePick(date: string, outcome: string, profit: number) {
  return { outcome, profit, units: 1, game_date: date }
}

describe('bankroll-goals', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('CRUD', () => {
    it('creates a goal', () => {
      const goal = createGoal({
        period: 'weekly',
        targetProfit: 10,
        startDate: '2026-03-23',
        endDate: null,
        description: 'Win 10 units',
      })
      expect(goal.id).toBeTruthy()
      expect(goal.targetProfit).toBe(10)
    })

    it('retrieves all goals', () => {
      createGoal({ period: 'weekly', targetProfit: 5, startDate: '2026-03-23', endDate: null, description: 'A' })
      createGoal({ period: 'monthly', targetProfit: 20, startDate: '2026-03-01', endDate: null, description: 'B' })
      expect(getAllGoals().length).toBe(2)
    })

    it('deletes a goal', () => {
      const goal = createGoal({ period: 'weekly', targetProfit: 5, startDate: '2026-03-23', endDate: null, description: 'X' })
      expect(deleteGoal(goal.id)).toBe(true)
      expect(getAllGoals().length).toBe(0)
    })

    it('delete returns false for missing id', () => {
      expect(deleteGoal('nonexistent')).toBe(false)
    })
  })

  describe('calculateGoalProgress', () => {
    it('calculates progress for picks in period', () => {
      const goal = makeGoal({ startDate: '2026-03-23', targetProfit: 10 })
      const picks = [
        makePick('2026-03-23', 'win', 3),
        makePick('2026-03-24', 'win', 2),
        makePick('2026-03-25', 'loss', -1),
      ]
      const ref = new Date('2026-03-26T12:00:00')
      const progress = calculateGoalProgress(goal, picks, ref)

      expect(progress.currentProfit).toBe(4)
      expect(progress.percentComplete).toBe(40)
      expect(progress.isAchieved).toBe(false)
      expect(progress.picksInPeriod).toBe(3)
    })

    it('marks goal as achieved', () => {
      const goal = makeGoal({ startDate: '2026-03-23', targetProfit: 5 })
      const picks = [
        makePick('2026-03-23', 'win', 3),
        makePick('2026-03-24', 'win', 3),
      ]
      const progress = calculateGoalProgress(goal, picks, new Date('2026-03-25'))
      expect(progress.isAchieved).toBe(true)
      expect(progress.percentComplete).toBe(100)
    })

    it('excludes picks outside period', () => {
      const goal = makeGoal({ startDate: '2026-03-23', period: 'weekly' })
      const picks = [
        makePick('2026-03-15', 'win', 10), // before period
        makePick('2026-03-23', 'win', 1),   // in period
      ]
      const progress = calculateGoalProgress(goal, picks, new Date('2026-03-25'))
      expect(progress.picksInPeriod).toBe(1)
      expect(progress.currentProfit).toBe(1)
    })

    it('ignores pending picks', () => {
      const goal = makeGoal({ startDate: '2026-03-23', targetProfit: 5 })
      const picks = [
        makePick('2026-03-23', 'pending', 0),
        makePick('2026-03-24', 'win', 2),
      ]
      const progress = calculateGoalProgress(goal, picks, new Date('2026-03-25'))
      expect(progress.picksInPeriod).toBe(1)
    })

    it('caps percent at 100', () => {
      const goal = makeGoal({ startDate: '2026-03-23', targetProfit: 5 })
      const picks = [
        makePick('2026-03-23', 'win', 10),
      ]
      const progress = calculateGoalProgress(goal, picks, new Date('2026-03-25'))
      expect(progress.percentComplete).toBe(100)
    })

    it('calculates days remaining', () => {
      const goal = makeGoal({ startDate: '2026-03-23', period: 'weekly' })
      const progress = calculateGoalProgress(goal, [], new Date('2026-03-25T12:00:00'))
      expect(progress.daysRemaining).toBeGreaterThan(0)
    })
  })

  describe('getGoalTemplates', () => {
    it('returns template goals', () => {
      const templates = getGoalTemplates()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0].period).toBeTruthy()
      expect(templates[0].targetProfit).toBeGreaterThan(0)
    })
  })
})
