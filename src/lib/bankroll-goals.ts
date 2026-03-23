/**
 * Bankroll Goals — set monthly/weekly profit targets with progress tracking.
 *
 * Goals are stored in localStorage. Progress is calculated from picks data.
 */

export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'season'

export interface BankrollGoal {
  id: string
  period: GoalPeriod
  targetProfit: number // in units
  startDate: string // YYYY-MM-DD
  endDate: string | null // null = rolling
  description: string
  createdAt: string
}

export interface GoalProgress {
  goal: BankrollGoal
  currentProfit: number
  percentComplete: number
  isAchieved: boolean
  picksInPeriod: number
  daysRemaining: number | null
  projectedEndProfit: number | null
}

const STORAGE_KEY = 'betbrain_bankroll_goals'

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadGoals(): BankrollGoal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BankrollGoal[]) : []
  } catch {
    return []
  }
}

function saveGoals(goals: BankrollGoal[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getAllGoals(): BankrollGoal[] {
  return loadGoals().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function createGoal(input: Omit<BankrollGoal, 'id' | 'createdAt'>): BankrollGoal {
  const goals = loadGoals()
  const goal: BankrollGoal = {
    ...input,
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `goal-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  goals.push(goal)
  saveGoals(goals)
  return goal
}

export function deleteGoal(id: string): boolean {
  const goals = loadGoals()
  const filtered = goals.filter((g) => g.id !== id)
  if (filtered.length === goals.length) return false
  saveGoals(filtered)
  return true
}

// ---------------------------------------------------------------------------
// Progress calculation
// ---------------------------------------------------------------------------

interface PickLike {
  outcome?: string | null
  profit?: number | null
  units: number
  game_date: string
}

export function calculateGoalProgress<T extends PickLike>(
  goal: BankrollGoal,
  picks: T[],
  referenceDate?: Date
): GoalProgress {
  const ref = referenceDate ?? new Date()
  const start = new Date(goal.startDate + 'T00:00:00')

  let end: Date
  if (goal.endDate) {
    end = new Date(goal.endDate + 'T23:59:59')
  } else {
    // Rolling period
    switch (goal.period) {
      case 'daily':
        end = new Date(start)
        end.setDate(start.getDate() + 1)
        break
      case 'weekly':
        end = new Date(start)
        end.setDate(start.getDate() + 7)
        break
      case 'monthly':
        end = new Date(start)
        end.setMonth(start.getMonth() + 1)
        break
      case 'season':
        end = new Date(start)
        end.setMonth(start.getMonth() + 6)
        break
    }
  }

  // Filter picks in period
  const periodPicks = picks.filter((p) => {
    const d = new Date(p.game_date)
    return d >= start && d <= end && p.outcome && p.outcome !== 'pending'
  })

  const currentProfit = periodPicks.reduce((s, p) => s + (p.profit ?? 0), 0)
  const percentComplete = goal.targetProfit > 0
    ? Math.min(Math.round((currentProfit / goal.targetProfit) * 100), 100)
    : currentProfit >= goal.targetProfit ? 100 : 0

  const isAchieved = currentProfit >= goal.targetProfit

  // Days remaining
  const msRemaining = end.getTime() - ref.getTime()
  const daysRemaining = msRemaining > 0 ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : null

  // Projected end profit based on current pace
  const daysPassed = Math.max(1, Math.ceil((ref.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const dailyRate = currentProfit / daysPassed
  const projectedEndProfit = totalDays > 0 ? Math.round(dailyRate * totalDays * 100) / 100 : null

  return {
    goal,
    currentProfit: Math.round(currentProfit * 100) / 100,
    percentComplete,
    isAchieved,
    picksInPeriod: periodPicks.length,
    daysRemaining,
    projectedEndProfit,
  }
}

// ---------------------------------------------------------------------------
// Quick goal templates
// ---------------------------------------------------------------------------

export function getGoalTemplates(): Array<Omit<BankrollGoal, 'id' | 'createdAt'>> {
  const today = new Date().toISOString().split('T')[0]
  return [
    {
      period: 'weekly',
      targetProfit: 5,
      startDate: today,
      endDate: null,
      description: 'Win 5 units this week',
    },
    {
      period: 'monthly',
      targetProfit: 15,
      startDate: today,
      endDate: null,
      description: 'Win 15 units this month',
    },
    {
      period: 'weekly',
      targetProfit: 3,
      startDate: today,
      endDate: null,
      description: 'Conservative: 3 units per week',
    },
    {
      period: 'monthly',
      targetProfit: 30,
      startDate: today,
      endDate: null,
      description: 'Aggressive: 30 units per month',
    },
  ]
}
