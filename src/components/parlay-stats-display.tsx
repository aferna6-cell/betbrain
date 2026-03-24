'use client'

import { useState, useEffect } from 'react'
import { profitColor } from '@/lib/format'
import {
  getAllParlayGroups,
  calculateParlayVsStraightStats,
  type ParlayGroup,
  type ParlayVsStraightStats,
} from '@/lib/parlay-stats'

interface PickLike {
  id: string
  outcome?: string | null
  profit?: number | null
  units: number
}

interface ParlayStatsDisplayProps {
  picks: PickLike[]
}

export function ParlayStatsDisplay({ picks }: ParlayStatsDisplayProps) {
  const [stats, setStats] = useState<ParlayVsStraightStats | null>(null)
  const [groups, setGroups] = useState<ParlayGroup[]>([])

  useEffect(() => {
    const parlayGroups = getAllParlayGroups()
    setGroups(parlayGroups)
    if (parlayGroups.length > 0) {
      setStats(calculateParlayVsStraightStats(picks, parlayGroups))
    }
  }, [picks])

  if (groups.length === 0) {
    return null // Don't show anything if user hasn't created any parlays
  }

  if (!stats) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Straight vs Parlay Breakdown
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Straight bets */}
        <div className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Straight Bets</span>
            <span className="text-xs text-muted-foreground">
              {stats.straight.total} resolved
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-green-500">{stats.straight.wins}</p>
              <p className="text-xs text-muted-foreground">W</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{stats.straight.losses}</p>
              <p className="text-xs text-muted-foreground">L</p>
            </div>
            <div>
              <p className="text-lg font-bold text-muted-foreground">{stats.straight.pushes}</p>
              <p className="text-xs text-muted-foreground">P</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>
              Profit:{' '}
              <span className={`font-medium ${profitColor(stats.straight.profit)}`}>
                {stats.straight.profit >= 0 ? '+' : ''}
                {stats.straight.profit.toFixed(2)}u
              </span>
            </span>
            <span>
              ROI:{' '}
              <span className={`font-medium ${profitColor(stats.straight.roi)}`}>
                {stats.straight.roi >= 0 ? '+' : ''}
                {stats.straight.roi.toFixed(1)}%
              </span>
            </span>
          </div>
          {stats.straight.total > 0 && (
            <p className="text-xs text-muted-foreground">
              Win rate: {stats.straight.winRate.toFixed(1)}%
            </p>
          )}
        </div>

        {/* Parlays */}
        <div className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Parlays</span>
            <span className="text-xs text-muted-foreground">
              {stats.parlay.total} total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-green-500">{stats.parlay.hits}</p>
              <p className="text-xs text-muted-foreground">Hits</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{stats.parlay.misses}</p>
              <p className="text-xs text-muted-foreground">Misses</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-500">{stats.parlay.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>
              Profit:{' '}
              <span className={`font-medium ${profitColor(stats.parlay.profit)}`}>
                {stats.parlay.profit >= 0 ? '+' : ''}
                {stats.parlay.profit.toFixed(2)}u
              </span>
            </span>
            <span>
              ROI:{' '}
              <span className={`font-medium ${profitColor(stats.parlay.roi)}`}>
                {stats.parlay.roi >= 0 ? '+' : ''}
                {stats.parlay.roi.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Hit rate: {stats.parlay.hitRate.toFixed(1)}%</span>
            <span>Avg legs: {stats.parlay.avgLegs}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
