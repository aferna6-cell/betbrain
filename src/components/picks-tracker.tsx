'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/toast'
import { TermTooltip } from '@/components/term-tooltip'
import { isValidAmericanOdds } from '@/lib/odds'
import { useOddsFormat } from '@/components/odds-format-provider'
import { gradePick, calcDayOfWeekBreakdown } from '@/lib/pick-stats'
import { calculateStreaks, calculateBadges } from '@/lib/streaks'
import type { StreakInfo, Badge as BadgeType } from '@/lib/streaks'
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
  closing_odds: number | null
  clv: number | null
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

interface CLVStats {
  averageCLV: number
  totalPicks: number
  positiveCLVCount: number
  negativeCLVCount: number
  positiveCLVRate: number
  weightedCLV: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OUTCOME_COLORS: Record<string, string> = {
  win: 'text-green-500',
  loss: 'text-red-500',
  push: 'text-yellow-500',
  pending: 'text-muted-foreground',
}

// ---------------------------------------------------------------------------
// Pick Form
// ---------------------------------------------------------------------------

function PickForm({
  onSubmit,
  onError,
}: {
  onSubmit: () => void
  onError: (message: string) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill from URL params (e.g. from game detail "Log Pick" button)
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const prefill = {
    gameId: params?.get('gameId') ?? '',
    sport: params?.get('sport') ?? '',
    date: params?.get('date') ?? '',
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    const oddsVal = Number(formData.get('odds'))
    if (!isValidAmericanOdds(oddsVal)) {
      setError('Invalid odds — must be -100 or lower, or +100 or higher')
      setSubmitting(false)
      return
    }

    const body = {
      externalGameId: formData.get('gameId') as string,
      sport: formData.get('sport') as string,
      pickType: formData.get('pickType') as string,
      pickTeam: (formData.get('pickTeam') as string) || null,
      pickLine: formData.get('pickLine')
        ? Number(formData.get('pickLine'))
        : null,
      odds: oddsVal,
      closingOdds: formData.get('closingOdds')
        ? Number(formData.get('closingOdds'))
        : null,
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
        const msg = data.error ?? 'Failed to save pick'
        setError(msg)
        onError(msg)
        return
      }

      form.reset()
      onSubmit()
    } catch {
      const msg = 'Network error — please try again'
      setError(msg)
      onError(msg)
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
            defaultValue={prefill.gameId}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pick-sport" className="mb-1 block text-sm text-muted-foreground">
            Sport
          </label>
          <select id="pick-sport" name="sport" required defaultValue={prefill.sport || 'nba'} className={inputClass}>
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
          <label htmlFor="pick-closingOdds" className="mb-1 block text-sm text-muted-foreground">
            Closing Odds
          </label>
          <input
            id="pick-closingOdds"
            name="closingOdds"
            type="number"
            placeholder="Optional"
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
            defaultValue={prefill.date || new Date().toISOString().slice(0, 10)}
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

function StatsSummary({ stats, clvStats }: { stats: PickStats; clvStats: CLVStats | null }) {
  const { addToast } = useToast()

  function handleCopyStats() {
    const lines = [
      `BetBrain Record: ${stats.wins}W-${stats.losses}L${stats.pushes > 0 ? `-${stats.pushes}P` : ''}`,
      `ROI: ${stats.roi >= 0 ? '+' : ''}${stats.roi}%`,
      `Profit: ${stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit} units`,
    ]
    if (clvStats && clvStats.totalPicks > 0) {
      lines.push(`Avg CLV: ${clvStats.averageCLV >= 0 ? '+' : ''}${clvStats.averageCLV}%`)
      lines.push(`+CLV Rate: ${clvStats.positiveCLVRate}%`)
    }
    lines.push('Tracked on BetBrain')
    navigator.clipboard.writeText(lines.join(' | ')).then(
      () => addToast('Stats copied to clipboard', 'success'),
      () => addToast('Failed to copy', 'error')
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        {stats.total > 0 && (
          <button
            onClick={handleCopyStats}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Copy stats
          </button>
        )}
      </div>
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
          <p className="text-sm text-muted-foreground"><TermTooltip term="ROI">ROI</TermTooltip></p>
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

      {clvStats && clvStats.totalPicks > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-blue-400"><TermTooltip term="CLV">Avg CLV</TermTooltip></p>
            <p
              className={`mt-1 text-xl font-semibold ${
                clvStats.averageCLV > 0
                  ? 'text-green-500'
                  : clvStats.averageCLV < 0
                    ? 'text-red-500'
                    : 'text-muted-foreground'
              }`}
            >
              {clvStats.averageCLV > 0 ? '+' : ''}
              {clvStats.averageCLV}%
            </p>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-blue-400">Weighted CLV</p>
            <p
              className={`mt-1 text-xl font-semibold ${
                clvStats.weightedCLV > 0
                  ? 'text-green-500'
                  : clvStats.weightedCLV < 0
                    ? 'text-red-500'
                    : 'text-muted-foreground'
              }`}
            >
              {clvStats.weightedCLV > 0 ? '+' : ''}
              {clvStats.weightedCLV}%
            </p>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-blue-400">+CLV Rate</p>
            <p className="mt-1 text-xl font-semibold">
              {clvStats.positiveCLVRate}%
            </p>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-blue-400">CLV Tracked</p>
            <p className="mt-1 text-xl font-semibold">
              {clvStats.totalPicks}/{stats.total}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pick Type Breakdown
// ---------------------------------------------------------------------------

function PickTypeBreakdown({ picks }: { picks: UserPick[] }) {
  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  if (resolved.length < 3) return null

  const types = ['moneyline', 'spread', 'over', 'under', 'prop'] as const
  const breakdown = types.map((type) => {
    const typePicks = resolved.filter((p) => p.pick_type === type)
    if (typePicks.length === 0) return null
    const wins = typePicks.filter((p) => p.outcome === 'win').length
    const losses = typePicks.filter((p) => p.outcome === 'loss').length
    const totalProfit = typePicks.reduce((s, p) => s + (p.profit ?? 0), 0)
    const totalUnits = typePicks.reduce((s, p) => s + p.units, 0)
    const roi = totalUnits > 0 ? Math.round((totalProfit / totalUnits) * 10000) / 100 : 0
    const decided = wins + losses
    const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null
    return { type, wins, losses, total: typePicks.length, winRate, roi }
  }).filter(Boolean) as Array<{ type: string; wins: number; losses: number; total: number; winRate: number | null; roi: number }>

  if (breakdown.length < 2) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Performance by Type</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {breakdown.map((b) => (
          <div key={b.type} className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
            <span className="text-xs font-medium capitalize">{b.type}</span>
            <div className="flex items-center gap-3 text-xs">
              <span>{b.wins}W-{b.losses}L</span>
              {b.winRate !== null && (
                <span className={b.winRate >= 52.4 ? 'text-green-500' : b.winRate < 50 ? 'text-red-500' : ''}>
                  {b.winRate}%
                </span>
              )}
              <span className={`font-mono ${b.roi > 0 ? 'text-green-500' : b.roi < 0 ? 'text-red-500' : ''}`}>
                {b.roi > 0 ? '+' : ''}{b.roi}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Streak Display
// ---------------------------------------------------------------------------

function StreakDisplay({ picks }: { picks: UserPick[] }) {
  const streaks = calculateStreaks(picks)

  if (streaks.currentType === null) return null

  const isHot = streaks.currentType === 'win' && streaks.currentLength >= 3
  const isCold = streaks.currentType === 'loss' && streaks.currentLength >= 3

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className={`rounded-lg border p-4 ${
        isHot ? 'border-green-500/30 bg-green-500/5' :
        isCold ? 'border-red-500/30 bg-red-500/5' :
        'border-border bg-card'
      }`}>
        <p className="text-sm text-muted-foreground">Current Streak</p>
        <p className={`mt-1 text-xl font-semibold ${
          streaks.currentType === 'win' ? 'text-green-500' : 'text-red-500'
        }`}>
          {streaks.currentLength} {streaks.currentType === 'win' ? 'W' : 'L'}
          {isHot && ' \u{1F525}'}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Longest Win Streak</p>
        <p className="mt-1 text-xl font-semibold text-green-500">
          {streaks.longestWinStreak}W
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Longest Loss Streak</p>
        <p className="mt-1 text-xl font-semibold text-red-500">
          {streaks.longestLossStreak}L
        </p>
      </div>
      {streaks.bestWeek && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Best Week</p>
          <p className="mt-1 text-xl font-semibold">
            {streaks.bestWeek.wins}W-{streaks.bestWeek.losses}L
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{streaks.bestWeek.weekLabel}</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Badges Display
// ---------------------------------------------------------------------------

const BADGE_ICONS: Record<string, string> = {
  flame: '\u{1F525}',
  fire: '\u{1F525}\u{1F525}',
  zap: '\u26A1',
  target: '\u{1F3AF}',
  'bar-chart': '\u{1F4CA}',
  trophy: '\u{1F3C6}',
  'trending-up': '\u{1F4C8}',
  brain: '\u{1F9E0}',
  crown: '\u{1F451}',
  calendar: '\u{1F4C5}',
}

function BadgesDisplay({ picks }: { picks: UserPick[] }) {
  const badges = calculateBadges(picks)

  if (badges.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Badges Earned ({badges.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5"
            title={badge.description}
          >
            <span className="text-base">{BADGE_ICONS[badge.icon] ?? '\u{2B50}'}</span>
            <span className="text-xs font-medium">{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Day of Week Breakdown
// ---------------------------------------------------------------------------

function DayOfWeekDisplay({ picks }: { picks: UserPick[] }) {
  const breakdown = calcDayOfWeekBreakdown(picks)

  if (breakdown.length < 2) return null

  const bestDay = [...breakdown].sort((a, b) => b.roi - a.roi)[0]
  const worstDay = [...breakdown].sort((a, b) => a.roi - b.roi)[0]

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Performance by Day of Week
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {breakdown.map((d) => {
          const isBest = d.day === bestDay?.day && d.roi > 0
          const isWorst = d.day === worstDay?.day && d.roi < 0
          return (
            <div
              key={d.day}
              className={`flex items-center justify-between rounded border px-3 py-2 ${
                isBest ? 'border-green-500/30 bg-green-500/5' :
                isWorst ? 'border-red-500/30 bg-red-500/5' :
                'border-border/50'
              }`}
            >
              <span className="text-xs font-medium">{d.day.slice(0, 3)}</span>
              <div className="flex items-center gap-3 text-xs">
                <span>{d.wins}W-{d.losses}L</span>
                {d.winRate !== null && (
                  <span className={d.winRate >= 52.4 ? 'text-green-500' : d.winRate < 50 ? 'text-red-500' : ''}>
                    {d.winRate}%
                  </span>
                )}
                <span className={`font-mono ${d.roi > 0 ? 'text-green-500' : d.roi < 0 ? 'text-red-500' : ''}`}>
                  {d.roi > 0 ? '+' : ''}{d.roi}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {bestDay && bestDay.roi > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Best day: <span className="text-green-500 font-medium">{bestDay.day}</span> ({bestDay.roi > 0 ? '+' : ''}{bestDay.roi}% ROI)
          {worstDay && worstDay.roi < 0 && (
            <> &middot; Worst: <span className="text-red-500 font-medium">{worstDay.day}</span> ({worstDay.roi}% ROI)</>
          )}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportPicksToCSV(picks: UserPick[]) {
  const headers = [
    'Date', 'Sport', 'Type', 'Team/Side', 'Line', 'Odds',
    'Closing Odds', 'Units', 'Outcome', 'Profit', 'Notes'
  ]

  const rows = picks.map((p) => [
    p.game_date,
    p.sport.toUpperCase(),
    p.pick_type,
    p.pick_team ?? '',
    p.pick_line !== null ? String(p.pick_line) : '',
    String(p.odds),
    p.closing_odds !== null ? String(p.closing_odds) : '',
    String(p.units),
    p.outcome ?? 'pending',
    p.profit !== null ? String(p.profit) : '',
    (p.notes ?? '').replace(/"/g, '""'),
  ])

  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `betbrain-picks-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Picks Table
// ---------------------------------------------------------------------------

type SortKey = 'date' | 'profit' | 'clv'
type FilterOutcome = 'all' | 'win' | 'loss' | 'pending'

function PicksTable({ picks, onUpdate }: { picks: UserPick[]; onUpdate: () => void }) {
  const { addToast } = useToast()
  const { formatPrice } = useOddsFormat()
  const [filterOutcome, setFilterOutcome] = useState<FilterOutcome>('all')
  const [filterSport, setFilterSport] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')

  const filteredPicks = picks
    .filter((p) => filterOutcome === 'all' || (p.outcome ?? 'pending') === filterOutcome)
    .filter((p) => filterSport === 'all' || p.sport === filterSport)
    .sort((a, b) => {
      if (sortKey === 'profit') return (b.profit ?? 0) - (a.profit ?? 0)
      if (sortKey === 'clv') return (b.clv ?? 0) - (a.clv ?? 0)
      return new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
    })

  async function handleSetOutcome(pickId: string, odds: number, units: number) {
    const choice = prompt('Enter outcome: win, loss, or push')
    if (!choice) return
    const outcome = choice.trim().toLowerCase()
    if (!['win', 'loss', 'push'].includes(outcome)) {
      addToast('Must be win, loss, or push', 'error')
      return
    }

    // Calculate profit based on outcome and American odds
    let profit = 0
    if (outcome === 'win') {
      profit = odds > 0 ? (odds / 100) * units : (100 / Math.abs(odds)) * units
    } else if (outcome === 'loss') {
      profit = -units
    }
    // push = 0

    try {
      const res = await fetch('/api/picks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickId, outcome, profit: Math.round(profit * 100) / 100 }),
      })
      if (res.ok) {
        addToast(`Pick marked as ${outcome}`, 'success')
        onUpdate()
      } else {
        addToast('Failed to update outcome', 'error')
      }
    } catch {
      addToast('Network error', 'error')
    }
  }

  async function handleDeletePick(pickId: string) {
    if (!confirm('Delete this pick? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/picks?id=${pickId}`, { method: 'DELETE' })
      if (res.ok) {
        addToast('Pick deleted', 'success')
        onUpdate()
      } else {
        addToast('Failed to delete pick', 'error')
      }
    } catch {
      addToast('Network error', 'error')
    }
  }

  async function handleSetClosingOdds(pickId: string) {
    const input = prompt('Enter closing odds (American format, e.g. -115):')
    if (!input) return
    const closingOdds = Number(input)
    if (isNaN(closingOdds)) {
      addToast('Invalid odds format', 'error')
      return
    }

    try {
      const res = await fetch('/api/picks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickId, closingOdds }),
      })
      if (res.ok) {
        addToast('Closing odds saved', 'success')
        onUpdate()
      } else {
        addToast('Failed to save closing odds', 'error')
      }
    } catch {
      addToast('Network error', 'error')
    }
  }

  if (picks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No picks logged yet. Use the form above to start tracking.
        </p>
      </div>
    )
  }

  const selectClass = 'h-7 rounded border border-border bg-background px-2 text-xs'
  const sports = [...new Set(picks.map((p) => p.sport))]

  return (
    <div className="space-y-2">
      {/* Filters + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value as FilterOutcome)} className={selectClass}>
          <option value="all">All outcomes</option>
          <option value="win">Wins</option>
          <option value="loss">Losses</option>
          <option value="pending">Pending</option>
        </select>
        <select value={filterSport} onChange={(e) => setFilterSport(e.target.value)} className={selectClass}>
          <option value="all">All sports</option>
          {sports.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={selectClass}>
          <option value="date">Sort: Date</option>
          <option value="profit">Sort: Profit</option>
          <option value="clv">Sort: CLV</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredPicks.length} of {picks.length} picks
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Sport</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Pick</th>
            <th className="px-4 py-3 font-medium text-right">Odds</th>
            <th className="px-4 py-3 font-medium text-right">Close</th>
            <th className="px-4 py-3 font-medium text-right">CLV</th>
            <th className="px-4 py-3 font-medium text-right">Units</th>
            <th className="px-4 py-3 font-medium text-center">Outcome</th>
            <th className="px-4 py-3 font-medium text-right">Profit</th>
            <th className="px-4 py-3 font-medium text-center">Grade</th>
            <th className="px-4 py-3 font-medium w-8"></th>
          </tr>
        </thead>
        <tbody>
          {filteredPicks.map((pick) => (
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
                {formatPrice(pick.odds)}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {pick.closing_odds != null ? (
                  formatPrice(pick.closing_odds)
                ) : (
                  <button
                    onClick={() => handleSetClosingOdds(pick.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    + Add
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {pick.clv != null ? (
                  <span
                    className={
                      pick.clv > 0
                        ? 'text-green-500'
                        : pick.clv < 0
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    }
                  >
                    {pick.clv > 0 ? '+' : ''}
                    {pick.clv}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">{pick.units}</td>
              <td className="px-4 py-3 text-center">
                {!pick.outcome || pick.outcome === 'pending' ? (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleSetOutcome(pick.id, pick.odds, pick.units)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
                    >
                      Set result
                    </button>
                    {pick.sport === 'nba' && pick.pick_type !== 'prop' ? (
                      <span className="text-[10px] text-emerald-500/70" title="This pick can be auto-resolved from NBA game scores">
                        auto
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50" title={pick.pick_type === 'prop' ? 'Prop bets require manual resolution' : 'Auto-resolve only available for NBA picks'}>
                        manual
                      </span>
                    )}
                  </div>
                ) : (
                  <span
                    className={`font-medium capitalize ${
                      OUTCOME_COLORS[pick.outcome]
                    }`}
                  >
                    {pick.outcome}
                  </span>
                )}
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
              <td className="px-4 py-3 text-center">
                {(() => {
                  const { grade, label } = gradePick(pick.outcome, pick.clv)
                  const gradeColor =
                    grade === 'A' ? 'text-green-500'
                    : grade === 'B' ? 'text-blue-400'
                    : grade === 'C' ? 'text-yellow-500'
                    : grade === 'D' ? 'text-orange-500'
                    : grade === 'F' ? 'text-red-500'
                    : 'text-muted-foreground'
                  return (
                    <span className={`text-sm font-bold ${gradeColor}`} title={label}>
                      {grade}
                    </span>
                  )
                })()}
              </td>
              <td className="px-2 py-3 text-center">
                <button
                  onClick={() => handleDeletePick(pick.id)}
                  className="text-xs text-zinc-600 hover:text-red-500 transition-colors"
                  title="Delete pick"
                >
                  x
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PicksTracker() {
  const [picks, setPicks] = useState<UserPick[]>([])
  const [stats, setStats] = useState<PickStats | null>(null)
  const [clvStats, setClvStats] = useState<CLVStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const { addToast } = useToast()

  const fetchPicks = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch('/api/picks')
      const data = await response.json()
      if (response.ok) {
        setPicks(data.picks)
        setStats(data.stats)
        setClvStats(data.clvStats ?? null)
      } else {
        setError('Failed to load picks')
      }
    } catch {
      setError('Network error — please refresh')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPicks()
  }, [fetchPicks])

  function handlePickSaved() {
    addToast('Pick saved', 'success')
    fetchPicks()
  }

  function handlePickError(message: string) {
    addToast(message, 'error')
  }

  async function handleAutoResolve() {
    setResolving(true)
    try {
      const res = await fetch('/api/picks/resolve', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        const count = data.resolved?.length ?? 0
        if (count > 0) {
          addToast(`Auto-resolved ${count} NBA pick${count !== 1 ? 's' : ''}`, 'success')
          fetchPicks()
        } else {
          addToast(data.message || 'No picks to resolve', 'info')
        }
      } else {
        addToast(data.error || 'Failed to resolve picks', 'error')
      }
    } catch {
      addToast('Network error — could not resolve picks', 'error')
    } finally {
      setResolving(false)
    }
  }

  const pendingNBAPicks = picks.filter(
    (p) => p.sport === 'nba' && (!p.outcome || p.outcome === 'pending') && new Date(p.game_date) < new Date()
  ).length

  if (loading) {
    return (
      <div className="text-center text-muted-foreground">Loading picks...</div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={fetchPicks}
          className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {stats && <StatsSummary stats={stats} clvStats={clvStats} />}
      <StreakDisplay picks={picks} />
      <BadgesDisplay picks={picks} />
      <PickTypeBreakdown picks={picks} />
      <DayOfWeekDisplay picks={picks} />
      {picks.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportPicksToCSV(picks)
              addToast('Picks exported to CSV', 'success')
            }}
          >
            Export CSV
          </Button>
        </div>
      )}
      {pendingNBAPicks > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <p className="text-sm text-blue-400">
            {pendingNBAPicks} NBA pick{pendingNBAPicks !== 1 ? 's' : ''} ready for auto-resolution
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAutoResolve}
            disabled={resolving}
            className="ml-auto"
          >
            {resolving ? 'Resolving...' : 'Auto-resolve NBA'}
          </Button>
        </div>
      )}
      <PickForm onSubmit={handlePickSaved} onError={handlePickError} />
      <PicksTable picks={picks} onUpdate={fetchPicks} />
    </div>
  )
}
