'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAllGoals,
  createGoal,
  deleteGoal,
  calculateGoalProgress,
  getGoalTemplates,
  type BankrollGoal,
  type GoalProgress,
  type GoalPeriod,
} from '@/lib/bankroll-goals'

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function GoalProgressCard({
  progress,
  onDelete,
}: {
  progress: GoalProgress
  onDelete: () => void
}) {
  const { goal, currentProfit, percentComplete, isAchieved, picksInPeriod, daysRemaining, projectedEndProfit } = progress
  const barColor = isAchieved ? 'bg-green-500' : percentComplete > 50 ? 'bg-blue-500' : percentComplete > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className={`rounded-lg border p-4 ${isAchieved ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold">{goal.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-[10px]">{goal.period}</Badge>
            {isAchieved && (
              <Badge variant="default" className="text-[10px] bg-green-600">Achieved!</Badge>
            )}
            {daysRemaining !== null && !isAchieved && (
              <span className="text-[10px] text-muted-foreground">
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive h-6 px-2"
          onClick={onDelete}
        >
          &times;
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={`font-mono font-semibold ${currentProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {currentProfit > 0 ? '+' : ''}{currentProfit.toFixed(2)}u
          </span>
          <span className="text-muted-foreground">
            / {goal.targetProfit > 0 ? '+' : ''}{goal.targetProfit}u
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.max(0, Math.min(percentComplete, 100))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
          <span>{percentComplete}% complete</span>
          <span>{picksInPeriod} picks</span>
        </div>
      </div>

      {/* Projection */}
      {projectedEndProfit !== null && !isAchieved && picksInPeriod > 0 && (
        <p className="text-[10px] text-muted-foreground">
          At current pace: {projectedEndProfit > 0 ? '+' : ''}{projectedEndProfit}u projected
          {projectedEndProfit >= goal.targetProfit ? ' (on track)' : ' (behind pace)'}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Goal form
// ---------------------------------------------------------------------------

function GoalForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const templates = getGoalTemplates()
  const [period, setPeriod] = useState<GoalPeriod>('weekly')
  const [target, setTarget] = useState('5')
  const [description, setDescription] = useState('')
  const today = new Date().toISOString().split('T')[0]

  function handleSave() {
    const targetNum = parseFloat(target)
    if (isNaN(targetNum) || targetNum === 0) return

    createGoal({
      period,
      targetProfit: targetNum,
      startDate: today,
      endDate: null,
      description: description || `Win ${targetNum} units (${period})`,
    })
    onSave()
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold">New Goal</h3>

      {/* Quick templates */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick start:</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((t, i) => (
            <button
              key={i}
              onClick={() => {
                setPeriod(t.period)
                setTarget(t.targetProfit.toString())
                setDescription(t.description)
              }}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:border-primary/30 transition-colors"
            >
              {t.description}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="season">Season</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Target (units)</label>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Weekly target"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>Create Goal</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BankrollGoalsProps {
  picks: Array<{
    outcome?: string | null
    profit?: number | null
    units: number
    game_date: string
  }>
}

export function BankrollGoals({ picks }: BankrollGoalsProps) {
  const [goals, setGoals] = useState<BankrollGoal[]>([])
  const [showForm, setShowForm] = useState(false)

  const refresh = useCallback(() => {
    setGoals(getAllGoals())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return
    deleteGoal(id)
    refresh()
  }

  const progressList = goals.map((goal) => calculateGoalProgress(goal, picks))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bankroll Goals</h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Goal'}
        </Button>
      </div>

      {showForm && (
        <GoalForm
          onSave={() => { setShowForm(false); refresh() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {progressList.length === 0 && !showForm ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No goals set. Create a target to track your progress.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {progressList.map((p) => (
            <GoalProgressCard
              key={p.goal.id}
              progress={p}
              onDelete={() => handleDelete(p.goal.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
