'use client'

import { useState, useEffect } from 'react'
import {
  buildCLVDistribution,
  findSweetSpot,
  type CLVDistribution,
} from '@/lib/clv-distribution'

interface Pick {
  odds: number
  closing_odds?: number | null
  outcome?: string | null
}

function HistogramBar({ count, maxCount, label, percentage, avgCLV, winRate }: {
  count: number
  maxCount: number
  label: string
  percentage: number
  avgCLV: number
  winRate: number | null
}) {
  const height = maxCount > 0 ? (count / maxCount) * 100 : 0
  const isPositive = avgCLV >= 0

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className="w-full h-32 flex items-end justify-center">
        <div
          className={`w-full max-w-8 rounded-t transition-all ${
            isPositive ? 'bg-emerald-500/70' : 'bg-red-500/70'
          }`}
          style={{ height: `${Math.max(height, count > 0 ? 4 : 0)}%` }}
          title={`${label}: ${count} picks (${percentage.toFixed(1)}%)${winRate !== null ? `, ${winRate.toFixed(0)}% win rate` : ''}`}
        />
      </div>
      <span className="text-[10px] text-zinc-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-center" title={label}>
        {label}
      </span>
      {count > 0 && (
        <span className="text-[10px] text-zinc-400">{count}</span>
      )}
    </div>
  )
}

export function CLVDistributionPanel() {
  const [dist, setDist] = useState<CLVDistribution | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('betbrain_picks')
      if (!raw) {
        setLoading(false)
        return
      }
      const picks: Pick[] = JSON.parse(raw)
      const result = buildCLVDistribution(picks)
      setDist(result)
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-48 mb-4" />
        <div className="h-32 bg-zinc-800 rounded" />
      </div>
    )
  }

  if (!dist || dist.shape === 'insufficient') {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
        <p className="text-sm text-zinc-400">
          {dist?.summary || 'Need picks with closing odds to show CLV distribution. Log picks and add closing odds to track your edge.'}
        </p>
      </div>
    )
  }

  const maxCount = Math.max(...dist.buckets.map((b) => b.count))
  const sweetSpot = findSweetSpot(dist.buckets)

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg CLV</p>
          <p className={`text-lg font-bold ${dist.avgCLV >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {dist.avgCLV >= 0 ? '+' : ''}{dist.avgCLV.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Median</p>
          <p className={`text-lg font-bold ${dist.medianCLV >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {dist.medianCLV >= 0 ? '+' : ''}{dist.medianCLV.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Std Dev</p>
          <p className="text-lg font-bold text-zinc-300">{dist.stdDev.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">+CLV Rate</p>
          <p className={`text-lg font-bold ${dist.positiveCLVRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {dist.positiveCLVRate.toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Picks</p>
          <p className="text-lg font-bold text-zinc-300">{dist.totalPicks}</p>
        </div>
      </div>

      {/* Histogram */}
      <div className="flex gap-0.5 items-end">
        {dist.buckets.map((b) => (
          <HistogramBar
            key={b.label}
            count={b.count}
            maxCount={maxCount}
            label={b.label}
            percentage={b.percentage}
            avgCLV={b.avgCLV}
            winRate={b.winRate}
          />
        ))}
      </div>

      {/* Shape + sweet spot */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Distribution:</span>
          <span className="text-zinc-300 capitalize">{dist.shape.replace('-', ' ')}</span>
        </div>
        {sweetSpot && (
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Sweet spot:</span>
            <span className="text-emerald-400">{sweetSpot.label}</span>
            <span className="text-zinc-500">({sweetSpot.winRate?.toFixed(0)}% win rate)</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded px-3 py-2">
        {dist.summary}
      </p>
    </div>
  )
}
