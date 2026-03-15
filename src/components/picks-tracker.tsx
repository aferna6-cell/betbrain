'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  Sport,
  PickType,
  PickOutcome,
} from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserPick {
  id: string
  external_game_id: string
  sport: Sport
  pick_type: PickType
  pick_team: string | null
  pick_line: number | null
  odds: number
  units: number
  outcome: PickOutcome | null
  profit: number | null
  notes: string | null
  game_date: string
  created_at: string
}

interface PickStats {
  total: number
  wins: number
  losses: number
  pushes: number
  pending: number
  totalProfit: number
  roi: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`
}

const OUTCOME_COLORS: Record<string, string> = {
  win: 'text-green-500',
  loss: 'text-red-500',
  push: 'text-yellow-500',
  pending: 'text-muted-foreground',
}

// ---------------------------------------------------------------------------
// Pick Form
// ---------------------------------------------------------------------------

function PickForm({ onSubmit }: { onSubmit: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    const body = {
      externalGameId: formData.get('gameId') as string,
      sport: formData.get('sport') as string,
      pickType: formData.get('pickType') as string,
      pickTeam: (formData.get('pickTeam') as string) || null,
      pickLine: formData.get('pickLine')
        ? Number(formData.get('pickLine'))
        : null,
      odds: Number(formData.get('odds')),
      units: Number(formData.get('units')) || 1,
      gameDate: formData.get('gameDate') as string,
      notes: (formData.get('notes') as string) || null,
    }

    try {
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Failed to save pick')
        return
      }

      form.reset()
      onSubmit()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Log a Pick</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="pick-gameId" className="mb-1 block text-sm text-muted-foreground">
            Game ID
          </label>
          <input
            id="pick-gameId"
            name="gameId"
            required
            placeholder="External game ID"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pick-sport" className="mb-1 block text-sm text-muted-foreground">
            Sport
          </label>
          <select id="pick-sport" name="sport" required className={inputClass}>
            <option value="nba">NBA</option>
            <option value="nfl">NFL</option>
            <option value="mlb">MLB</option>
            <option value="nhl">NHL</option>
          </select>
        </div>

        <div>
          <label htmlFor="pick-pickType" className="mb-1 block text-sm text-muted-foreground">
            Pick Type
          </label>
          <select id="pick-pickType" name="pickType" required className={inputClass}>
            <option value="moneyline">Moneyline</option>
            <option value="spread">Spread</option>
            <option value="over">Over</option>
            <option value="under">Under</option>
            <option value="prop">Prop</option>
          </select>
        </div>

        <div>
          <label htmlFor="pick-pickTeam" className="mb-1 block text-sm text-muted-foreground">
            Team / Side
          </label>
          <input
            id="pick-pickTeam"
            name="pickTeam"
            placeholder="e.g. Lakers"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pick-pickLine" className="mb-1 block text-sm text-muted-foreground">
            Line
          </label>
          <input
            id="pick-pickLine"
            name="pickLine"
            type="number"
            step="0.5"
            placeholder="e.g. -3.5"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pick-odds" className="mb-1 block text-sm text-muted-foreground">
            Odds (American)
          </label>
          <input
            id="pick-odds"
            name="odds"
            type="number"
            required
            placeholder="e.g. -110"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pick-units" className="mb-1 block text-sm text-muted-foreground">
            Units
          </label>
          <input
            id="pick-units"
            name="units"
            type="number"
            step="0.5"
            min="0.5"
            defaultValue="1"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pick-gameDate" className="mb-1 block text-sm text-muted-foreground">
            Game Date
          </label>
          <input
            id="pick-gameDate"
            name="gameDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pick-notes" className="mb-1 block text-sm text-muted-foreground">
            Notes
          </label>
          <input
            id="pick-notes"
            name="notes"
            placeholder="Optional notes"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Log Pick'}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Stats Summary
// ---------------------------------------------------------------------------

function StatsSummary({ stats }: { stats: PickStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Record</p>
        <p className="mt-1 text-xl font-semibold">
          {stats.wins}-{stats.losses}
          {stats.pushes > 0 && `-${stats.pushes}`}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Total Picks</p>
        <p className="mt-1 text-xl font-semibold">{stats.total}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Pending</p>
        <p className="mt-1 text-xl font-semibold">{stats.pending}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Profit (units)</p>
        <p
          className={`mt-1 text-xl font-semibold ${
            stats.totalProfit > 0
              ? 'text-green-500'
              : stats.totalProfit < 0
                ? 'text-red-500'
                : ''
          }`}
        >
          {stats.totalProfit > 0 ? '+' : ''}
          {stats.totalProfit}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">ROI</p>
        <p
          className={`mt-1 text-xl font-semibold ${
            stats.roi > 0
              ? 'text-green-500'
              : stats.roi < 0
                ? 'text-red-500'
                : ''
          }`}
        >
          {stats.roi > 0 ? '+' : ''}
          {stats.roi}%
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Picks Table
// ---------------------------------------------------------------------------

function PicksTable({ picks }: { picks: UserPick[] }) {
  if (picks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No picks logged yet. Use the form above to start tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Sport</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Pick</th>
            <th className="px-4 py-3 font-medium text-right">Odds</th>
            <th className="px-4 py-3 font-medium text-right">Units</th>
            <th className="px-4 py-3 font-medium text-center">Outcome</th>
            <th className="px-4 py-3 font-medium text-right">Profit</th>
          </tr>
        </thead>
        <tbody>
          {picks.map((pick) => (
            <tr
              key={pick.id}
              className="border-b border-border/50 bg-card/50"
            >
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(pick.game_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className="text-xs uppercase">
                  {pick.sport}
                </Badge>
              </td>
              <td className="px-4 py-3 capitalize">{pick.pick_type}</td>
              <td className="px-4 py-3">
                {pick.pick_team ?? '—'}
                {pick.pick_line !== null && (
                  <span className="ml-1 text-muted-foreground">
                    ({pick.pick_line > 0 ? '+' : ''}
                    {pick.pick_line})
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {formatOdds(pick.odds)}
              </td>
              <td className="px-4 py-3 text-right">{pick.units}</td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`font-medium capitalize ${
                    OUTCOME_COLORS[pick.outcome ?? 'pending']
                  }`}
                >
                  {pick.outcome ?? 'Pending'}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {pick.profit !== null ? (
                  <span
                    className={
                      pick.profit > 0
                        ? 'text-green-500'
                        : pick.profit < 0
                          ? 'text-red-500'
                          : ''
                    }
                  >
                    {pick.profit > 0 ? '+' : ''}
                    {pick.profit}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PicksTracker() {
  const [picks, setPicks] = useState<UserPick[]>([])
  const [stats, setStats] = useState<PickStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPicks = useCallback(async () => {
    try {
      const response = await fetch('/api/picks')
      const data = await response.json()
      if (response.ok) {
        setPicks(data.picks)
        setStats(data.stats)
      }
    } catch {
      console.error('Failed to fetch picks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPicks()
  }, [fetchPicks])

  if (loading) {
    return (
      <div className="text-center text-muted-foreground">Loading picks...</div>
    )
  }

  return (
    <div className="space-y-6">
      {stats && <StatsSummary stats={stats} />}
      <PickForm onSubmit={fetchPicks} />
      <PicksTable picks={picks} />
    </div>
  )
}
