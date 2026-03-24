'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { OddsDisplay } from '@/components/odds-display'
import { GameCountdown } from '@/components/game-countdown'
import { profitColor } from '@/lib/format'
import type { Sport, PickType, PickOutcome } from '@/lib/supabase/types'

interface TodayPick {
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
  game_date: string
}

function formatPickType(pick: TodayPick): string {
  switch (pick.pick_type) {
    case 'moneyline':
      return pick.pick_team ?? 'ML'
    case 'spread':
      return `${pick.pick_team ?? ''} ${pick.pick_line != null ? (pick.pick_line > 0 ? `+${pick.pick_line}` : pick.pick_line) : ''}`.trim()
    case 'over':
      return `Over ${pick.pick_line ?? ''}`
    case 'under':
      return `Under ${pick.pick_line ?? ''}`
    case 'prop':
      return 'Prop'
    default:
      return pick.pick_type
  }
}

function outcomeLabel(outcome: PickOutcome | null): string {
  if (!outcome || outcome === 'pending') return 'Pending'
  return outcome.charAt(0).toUpperCase() + outcome.slice(1)
}

function outcomeColor(outcome: PickOutcome | null): string {
  switch (outcome) {
    case 'win': return 'text-green-500'
    case 'loss': return 'text-red-500'
    case 'push': return 'text-yellow-500'
    default: return 'text-muted-foreground'
  }
}

export function TodaysAction() {
  const [picks, setPicks] = useState<TodayPick[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPicks = useCallback(async () => {
    try {
      const res = await fetch('/api/picks')
      if (!res.ok) return
      const data = await res.json()
      const allPicks: TodayPick[] = data.picks ?? []

      // Filter to today's picks
      const today = new Date().toISOString().split('T')[0]
      const todayPicks = allPicks.filter((p) => {
        const pickDate = p.game_date.split('T')[0]
        return pickDate === today
      })

      setPicks(todayPicks)
    } catch {
      // Silent — this is a dashboard widget, not critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPicks()
  }, [fetchPicks])

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted mb-3" />
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (picks.length === 0) return null // Don't show if no picks today

  const pending = picks.filter((p) => !p.outcome || p.outcome === 'pending')
  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  const totalUnits = picks.reduce((s, p) => s + p.units, 0)
  const totalProfit = resolved.reduce((s, p) => s + (p.profit ?? 0), 0)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Today&apos;s Action
        </h3>
        <Link
          href="/dashboard/picks"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all picks
        </Link>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4 text-xs">
        <span>{picks.length} pick{picks.length !== 1 ? 's' : ''}</span>
        <span className="text-muted-foreground">{totalUnits}u at risk</span>
        {resolved.length > 0 && (
          <span className={profitColor(totalProfit)}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}u P/L
          </span>
        )}
        {pending.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {pending.length} pending
          </Badge>
        )}
      </div>

      {/* Pick list */}
      <div className="space-y-1">
        {picks.map((pick) => (
          <div
            key={pick.id}
            className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-[10px]">
                {pick.sport.toUpperCase()}
              </Badge>
              <span className="font-medium">{formatPickType(pick)}</span>
              <span className="text-muted-foreground">
                <OddsDisplay odds={pick.odds} />
              </span>
              <span className="text-xs text-muted-foreground">
                {pick.units}u
              </span>
            </div>
            <div className="flex items-center gap-3">
              {(!pick.outcome || pick.outcome === 'pending') && (
                <GameCountdown commenceTime={pick.game_date} />
              )}
              <span className={`text-xs font-medium ${outcomeColor(pick.outcome)}`}>
                {outcomeLabel(pick.outcome)}
                {pick.profit != null && pick.outcome !== 'pending' && (
                  <span className="ml-1">
                    ({pick.profit >= 0 ? '+' : ''}{pick.profit.toFixed(2)}u)
                  </span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/60">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
