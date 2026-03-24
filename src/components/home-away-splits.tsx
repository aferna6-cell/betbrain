'use client'

import { useState, useEffect } from 'react'
import { calcHomeAwaySplit, type HomeAwaySplit } from '@/lib/bankroll-history'
import { profitColor } from '@/lib/format'

/**
 * Home vs Away performance split display.
 * Shows win rate, ROI, and profit for home vs away picks.
 */
export function HomeAwaySplits() {
  const [splits, setSplits] = useState<HomeAwaySplit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const res = await fetch('/api/picks')
        if (!res.ok) return
        const data = await res.json()
        const picks = data.picks ?? []
        if (!cancelled) {
          setSplits(calcHomeAwaySplit(picks))
        }
      } catch {
        // Silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Home / Away Splits</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  if (splits.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Home / Away Splits</h3>
        <p className="text-xs text-muted-foreground">
          No picks with team data available. Log picks with a team selected to see splits.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Home / Away Splits</h3>
      <div className="grid grid-cols-2 gap-3">
        {splits.map((split) => (
          <SplitCard key={split.side} split={split} />
        ))}
      </div>
    </div>
  )
}

function SplitCard({ split }: { split: HomeAwaySplit }) {
  const icon = split.side === 'home' ? '🏠' : '✈️'
  const label = split.side === 'home' ? 'Home' : 'Away'

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg" role="img" aria-label={label}>{icon}</span>
        <span className="text-sm font-semibold">{label} Picks</span>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Record</span>
          <span className="font-mono font-medium">
            {split.wins}-{split.losses}
            {split.pushes > 0 ? `-${split.pushes}` : ''}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Win Rate</span>
          <span className={`font-mono font-medium ${
            split.winRate !== null && split.winRate >= 52.4
              ? 'text-green-500'
              : split.winRate !== null && split.winRate < 50
                ? 'text-red-500'
                : ''
          }`}>
            {split.winRate !== null ? `${split.winRate}%` : '--'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">ROI</span>
          <span className={`font-mono font-medium ${
            split.roi > 0 ? 'text-green-500' : split.roi < 0 ? 'text-red-500' : ''
          }`}>
            {split.roi >= 0 ? '+' : ''}{split.roi}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Profit</span>
          <span className={`font-mono font-medium ${profitColor(split.profit)}`}>
            {split.profit >= 0 ? '+' : ''}{split.profit.toFixed(2)}u
          </span>
        </div>
      </div>
    </div>
  )
}
