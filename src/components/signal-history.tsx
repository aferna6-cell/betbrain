'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { SignalHistoryRecord, SignalStats } from '@/lib/signal-history'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function SignalStatsBar({ stats }: { stats: SignalStats }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Signal Performance</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overall Hit Rate"
          value={stats.hitRate !== null ? `${stats.hitRate}%` : '--'}
          sub={`${stats.wins}W - ${stats.losses}L - ${stats.pushes}P (N=${stats.resolved})`}
        />
        <StatCard
          label="Strong Signals"
          value={stats.byStrength.strong.hitRate !== null ? `${stats.byStrength.strong.hitRate}%` : '--'}
          sub={`${stats.byStrength.strong.wins}W of ${stats.byStrength.strong.total} resolved`}
        />
        <StatCard
          label="Moderate Signals"
          value={stats.byStrength.moderate.hitRate !== null ? `${stats.byStrength.moderate.hitRate}%` : '--'}
          sub={`${stats.byStrength.moderate.wins}W of ${stats.byStrength.moderate.total} resolved`}
        />
        <StatCard
          label="Total Signals"
          value={String(stats.total)}
          sub={`${stats.resolved} resolved, ${stats.pending} pending`}
        />
      </div>

      {stats.resolved > 0 && (
        <div className="flex flex-wrap gap-3">
          {(['nba', 'nfl', 'mlb', 'nhl'] as const).map((sport) => {
            const s = stats.bySport[sport]
            if (s.total === 0) return null
            return (
              <div key={sport} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {SPORT_LABELS[sport]}
                </span>
                <span className={`text-sm font-medium ${
                  s.hitRate !== null && s.hitRate >= 55 ? 'text-green-500'
                  : s.hitRate !== null && s.hitRate >= 45 ? 'text-yellow-500'
                  : s.hitRate !== null ? 'text-red-500'
                  : 'text-muted-foreground'
                }`}>
                  {s.hitRate !== null ? `${s.hitRate}%` : '--'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({s.wins}/{s.total})
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OutcomeButton({
  gameId,
  label,
  outcome,
  onResolve,
}: {
  gameId: string
  label: string
  outcome: 'win' | 'loss' | 'push'
  onResolve: (gameId: string, outcome: 'win' | 'loss' | 'push') => void
}) {
  const colors = {
    win: 'hover:bg-green-500/20 hover:text-green-500',
    loss: 'hover:bg-red-500/20 hover:text-red-500',
    push: 'hover:bg-yellow-500/20 hover:text-yellow-500',
  }

  return (
    <button
      onClick={() => onResolve(gameId, outcome)}
      className={`rounded-md border border-border px-2 py-1 text-xs transition-colors ${colors[outcome]}`}
    >
      {label}
    </button>
  )
}

function HistoryRow({
  record,
  onResolve,
}: {
  record: SignalHistoryRecord
  onResolve: (gameId: string, outcome: 'win' | 'loss' | 'push') => void
}) {
  const outcomeColors = {
    win: 'bg-green-500/20 text-green-500',
    loss: 'bg-red-500/20 text-red-500',
    push: 'bg-yellow-500/20 text-yellow-500',
  }

  const gameDate = new Date(record.game_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-xs font-semibold uppercase">
          {SPORT_LABELS[record.sport] ?? record.sport.toUpperCase()}
        </Badge>
        <div>
          <p className="text-sm font-medium">
            {record.away_team} @ {record.home_team}
          </p>
          <p className="text-xs text-muted-foreground">{gameDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={record.strength === 'strong' ? 'default' : 'outline'} className="text-xs">
          {record.strength}
        </Badge>

        {record.value_side && (
          <span className="text-xs text-muted-foreground">
            Value: {record.value_side === 'home' ? record.home_team : record.away_team}
          </span>
        )}

        {record.outcome && record.outcome !== 'pending' ? (
          <Badge className={`text-xs ${outcomeColors[record.outcome]}`}>
            {record.outcome.toUpperCase()}
          </Badge>
        ) : (
          <div className="flex gap-1">
            <OutcomeButton gameId={record.external_game_id} label="W" outcome="win" onResolve={onResolve} />
            <OutcomeButton gameId={record.external_game_id} label="L" outcome="loss" onResolve={onResolve} />
            <OutcomeButton gameId={record.external_game_id} label="P" outcome="push" onResolve={onResolve} />
          </div>
        )}
      </div>
    </div>
  )
}

export function SignalHistoryView({
  initialHistory,
  initialStats,
}: {
  initialHistory: SignalHistoryRecord[]
  initialStats: SignalStats
}) {
  const [history, setHistory] = useState(initialHistory)
  const [stats, setStats] = useState(initialStats)
  const [resolving, setResolving] = useState<string | null>(null)

  async function handleResolve(gameId: string, outcome: 'win' | 'loss' | 'push') {
    if (resolving) return
    setResolving(gameId)

    try {
      const res = await fetch('/api/signals/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalGameId: gameId, outcome }),
      })

      if (res.ok) {
        // Update local state
        setHistory((prev) =>
          prev.map((r) =>
            r.external_game_id === gameId
              ? { ...r, outcome, resolved_at: new Date().toISOString() }
              : r
          )
        )

        // Refresh stats
        const statsRes = await fetch('/api/signals/history?limit=0')
        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats(data.stats)
        }
      }
    } catch (err) {
      console.error('Failed to resolve signal:', err)
    } finally {
      setResolving(null)
    }
  }

  return (
    <div className="space-y-6">
      <SignalStatsBar stats={stats} />

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Signal History</h2>
          <div className="space-y-2">
            {history.map((record) => (
              <HistoryRow
                key={record.id}
                record={record}
                onResolve={handleResolve}
              />
            ))}
          </div>
        </div>
      )}

      {history.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No signal history yet. Signals are recorded automatically when detected.
            Check back after games have been played to track outcomes.
          </p>
        </div>
      )}
    </div>
  )
}
