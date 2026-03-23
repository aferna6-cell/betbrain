'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { generateWeeklyRecap, type WeeklyRecap as WeeklyRecapType } from '@/lib/weekly-recap'

export function WeeklyRecapPanel() {
  const [recap, setRecap] = useState<WeeklyRecapType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecap = useCallback(async () => {
    try {
      const res = await fetch('/api/picks')
      const data = await res.json()
      if (res.ok) {
        const recapData = generateWeeklyRecap(data.picks ?? [])
        setRecap(recapData)
      } else {
        setError('Failed to load picks')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecap()
  }, [fetchRecap])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (!recap || recap.totalPicks === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground">No picks this week yet. Your recap will appear here.</p>
      </div>
    )
  }

  const profitColor = recap.profit > 0 ? 'text-green-500' : recap.profit < 0 ? 'text-red-500' : ''
  const roiColor = recap.roi > 0 ? 'text-green-500' : recap.roi < 0 ? 'text-red-500' : ''

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Weekly Recap</h3>
            <p className="text-xs text-muted-foreground">
              {formatDateDisplay(recap.weekStart)} - {formatDateDisplay(recap.weekEnd)}
            </p>
          </div>
          <Badge
            variant={recap.profit > 0 ? 'default' : recap.profit < 0 ? 'destructive' : 'secondary'}
            className="text-sm"
          >
            {recap.profit > 0 ? '+' : ''}{recap.profit.toFixed(2)}u
          </Badge>
        </div>

        {/* Key stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Record</p>
            <p className="text-lg font-bold font-mono">
              {recap.wins}-{recap.losses}
              {recap.pushes > 0 && <span className="text-muted-foreground">-{recap.pushes}</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">P/L</p>
            <p className={`text-lg font-bold font-mono ${profitColor}`}>
              {recap.profit > 0 ? '+' : ''}{recap.profit.toFixed(2)}u
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ROI</p>
            <p className={`text-lg font-bold font-mono ${roiColor}`}>
              {recap.roi > 0 ? '+' : ''}{recap.roi.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold font-mono">{recap.winRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid gap-4 sm:grid-cols-2">
        {recap.bestPick && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Best Pick</p>
            <p className="text-sm font-semibold">{recap.bestPick.team}</p>
            <p className="text-xs font-mono text-green-500">
              +{recap.bestPick.profit.toFixed(2)}u at {recap.bestPick.odds > 0 ? '+' : ''}{recap.bestPick.odds}
            </p>
          </div>
        )}

        {recap.worstPick && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Worst Pick</p>
            <p className="text-sm font-semibold">{recap.worstPick.team}</p>
            <p className="text-xs font-mono text-red-500">
              {recap.worstPick.profit.toFixed(2)}u at {recap.worstPick.odds > 0 ? '+' : ''}{recap.worstPick.odds}
            </p>
          </div>
        )}
      </div>

      {/* Streak + changes */}
      <div className="grid gap-4 sm:grid-cols-3">
        {recap.streak && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Current Streak</p>
            <p className={`text-lg font-bold ${recap.streak.type === 'win' ? 'text-green-500' : 'text-red-500'}`}>
              {recap.streak.count}{recap.streak.type === 'win' ? 'W' : 'L'}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Volume vs Last Week</p>
          <p className={`text-lg font-bold ${recap.volumeChange > 0 ? 'text-blue-400' : recap.volumeChange < 0 ? 'text-yellow-500' : ''}`}>
            {recap.volumeChange > 0 ? '+' : ''}{recap.volumeChange} picks
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Profit vs Last Week</p>
          <p className={`text-lg font-bold font-mono ${recap.profitChange > 0 ? 'text-green-500' : recap.profitChange < 0 ? 'text-red-500' : ''}`}>
            {recap.profitChange > 0 ? '+' : ''}{recap.profitChange.toFixed(2)}u
          </p>
        </div>
      </div>

      {/* Sport breakdown */}
      {recap.sportBreakdown.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">By Sport</p>
          <div className="space-y-2">
            {recap.sportBreakdown.map((s) => (
              <div key={s.sport} className="flex items-center justify-between text-sm">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {s.sport}
                </Badge>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span>{s.wins}-{s.losses}</span>
                  <span className={s.profit > 0 ? 'text-green-500' : s.profit < 0 ? 'text-red-500' : ''}>
                    {s.profit > 0 ? '+' : ''}{s.profit.toFixed(2)}u
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {recap.pending > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {recap.pending} pick{recap.pending > 1 ? 's' : ''} still pending this week
        </p>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-center">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
