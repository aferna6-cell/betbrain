'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { analyzeByTimeOfDay, type TimeAnalysis, type TimePeriodStats } from '@/lib/time-analysis'

function PeriodBar({ period, maxPicks }: { period: TimePeriodStats; maxPicks: number }) {
  const width = maxPicks > 0 ? (period.picks / maxPicks) * 100 : 0
  const profitColor = period.profit > 0 ? 'text-green-500' : period.profit < 0 ? 'text-red-500' : 'text-muted-foreground'
  const barColor = period.roi > 0 ? 'bg-green-500/40' : period.roi < 0 ? 'bg-red-500/40' : 'bg-muted'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium w-28">{period.label}</span>
          <span className="text-xs text-muted-foreground">{period.hourRange}</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs">
          <span className="text-muted-foreground">
            {period.wins}-{period.losses}
            {period.pushes > 0 && `-${period.pushes}`}
          </span>
          <span className={profitColor}>
            {period.profit > 0 ? '+' : ''}{period.profit.toFixed(2)}u
          </span>
          <span className={`font-semibold ${period.roi > 0 ? 'text-green-500' : period.roi < 0 ? 'text-red-500' : ''}`}>
            {period.roi > 0 ? '+' : ''}{period.roi.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export function TimeAnalysisPanel() {
  const [analysis, setAnalysis] = useState<TimeAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/picks')
      const data = await res.json()
      if (res.ok) {
        setAnalysis(analyzeByTimeOfDay(data.picks ?? []))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (!analysis || analysis.totalResolvedByTime === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Not enough resolved picks to analyze time patterns. Keep betting and check back.
        </p>
      </div>
    )
  }

  const maxPicks = Math.max(...analysis.periods.map((p) => p.picks))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {analysis.periods.map((period) => (
          <PeriodBar key={period.period} period={period} maxPicks={maxPicks} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {analysis.bestPeriod && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Best Time to Bet</p>
            <p className="text-sm font-semibold">{analysis.bestPeriod.label}</p>
            <p className="text-xs text-muted-foreground">{analysis.bestPeriod.hourRange}</p>
            <p className="text-xs font-mono text-green-500 mt-1">
              +{analysis.bestPeriod.roi.toFixed(1)}% ROI ({analysis.bestPeriod.wins}W-{analysis.bestPeriod.losses}L)
            </p>
          </div>
        )}
        {analysis.worstPeriod && analysis.worstPeriod.period !== analysis.bestPeriod?.period && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Worst Time to Bet</p>
            <p className="text-sm font-semibold">{analysis.worstPeriod.label}</p>
            <p className="text-xs text-muted-foreground">{analysis.worstPeriod.hourRange}</p>
            <p className="text-xs font-mono text-red-500 mt-1">
              {analysis.worstPeriod.roi.toFixed(1)}% ROI ({analysis.worstPeriod.wins}W-{analysis.worstPeriod.losses}L)
            </p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Based on {analysis.totalResolvedByTime} resolved picks. Times based on when the pick was placed.
      </p>
    </div>
  )
}
