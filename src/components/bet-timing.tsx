'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  analyzeTimingPerformance,
  getTimingRecommendation,
  type TimingAnalysis,
  type TimingBucket,
} from '@/lib/bet-timing'

interface PickForTiming {
  outcome: string | null
  profit: number | null
  units: number
  odds: number
  sport?: string
  created_at?: string
  game_date?: string
}

export function BetTimingPanel() {
  const [picks, setPicks] = useState<PickForTiming[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) setPicks(JSON.parse(raw))
    } catch {
      /* empty */
    }
  }, [])

  const analysis = useMemo(() => analyzeTimingPerformance(picks), [picks])
  const recommendation = useMemo(
    () => getTimingRecommendation(analysis),
    [analysis]
  )

  const hasBucketData = analysis.buckets.some((b) => b.total > 0)

  if (!hasBucketData) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Bet Timing Optimizer</h3>
        <p className="text-sm text-muted-foreground">
          Log picks with both creation time and game time to discover your
          optimal betting window. Are you better betting early or close to game time?
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bet Timing Optimizer</h3>
        {analysis.avgHoursBeforeGame != null && (
          <span className="text-xs text-muted-foreground">
            Avg: {formatHours(analysis.avgHoursBeforeGame)} before game
          </span>
        )}
      </div>

      {/* Best/Worst summary */}
      {(analysis.bestBucket || analysis.worstBucket) && (
        <div className="grid grid-cols-2 gap-3">
          {analysis.bestBucket && (
            <BucketSummary
              label="Best Window"
              bucket={analysis.bestBucket}
              variant="good"
            />
          )}
          {analysis.worstBucket && (
            <BucketSummary
              label="Worst Window"
              bucket={analysis.worstBucket}
              variant="bad"
            />
          )}
        </div>
      )}

      {/* Timing bars */}
      <div className="space-y-2">
        {analysis.buckets
          .filter((b) => b.total > 0)
          .map((bucket) => (
            <TimingBar
              key={bucket.label}
              bucket={bucket}
              maxTotal={Math.max(...analysis.buckets.map((b) => b.total))}
              isBest={bucket.label === analysis.bestBucket?.label}
            />
          ))}
      </div>

      {/* Recommendation */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
        <div className="text-xs text-blue-400 font-medium mb-1">
          Timing Insight
        </div>
        <p className="text-sm text-foreground">{recommendation}</p>
      </div>

      {/* Sport breakdown */}
      {analysis.bySport.length > 1 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Best Timing by Sport
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {analysis.bySport.map((s) => (
              <div
                key={s.sport}
                className="flex items-center justify-between px-3 py-2 rounded bg-muted/50 text-xs"
              >
                <span className="uppercase font-medium">{s.sport}</span>
                <div className="flex items-center gap-2">
                  {s.bestBucket ? (
                    <>
                      <span className="text-muted-foreground">
                        {s.bestBucket.label}
                      </span>
                      <span
                        className={
                          s.bestBucket.roi > 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {s.bestBucket.roi > 0 ? '+' : ''}
                        {s.bestBucket.roi.toFixed(0)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BucketSummary({
  label,
  bucket,
  variant,
}: {
  label: string
  bucket: TimingBucket
  variant: 'good' | 'bad'
}) {
  const isGood = variant === 'good'
  return (
    <div
      className={`rounded-lg p-3 border ${
        isGood
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-red-500/10 border-red-500/20'
      }`}
    >
      <div
        className={`text-xs mb-1 ${
          isGood ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {label}
      </div>
      <div className="text-sm font-medium">{bucket.label}</div>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs text-muted-foreground">
          {bucket.wins}W-{bucket.losses}L
        </span>
        <span
          className={`text-xs font-bold ${
            bucket.roi > 0 ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {bucket.roi > 0 ? '+' : ''}
          {bucket.roi.toFixed(1)}% ROI
        </span>
      </div>
    </div>
  )
}

function TimingBar({
  bucket,
  maxTotal,
  isBest,
}: {
  bucket: TimingBucket
  maxTotal: number
  isBest: boolean
}) {
  const barWidth = maxTotal > 0 ? (bucket.total / maxTotal) * 100 : 0
  const resolved = bucket.wins + bucket.losses + bucket.pushes

  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-xs text-muted-foreground shrink-0">
        {bucket.label}
        {isBest && (
          <span className="ml-1 text-green-400 text-[10px]">BEST</span>
        )}
      </div>
      <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden relative">
        <div
          className={`h-full rounded transition-all ${
            bucket.roi > 0 ? 'bg-green-500/40' : bucket.roi < 0 ? 'bg-red-500/40' : 'bg-zinc-500/40'
          }`}
          style={{ width: `${barWidth}%` }}
        />
        <div className="absolute inset-0 flex items-center px-2 text-xs">
          <span className="font-mono">
            {bucket.wins}W-{bucket.losses}L
          </span>
        </div>
      </div>
      <div className="w-16 text-right">
        <span
          className={`text-xs font-mono ${
            bucket.roi > 0
              ? 'text-green-400'
              : bucket.roi < 0
                ? 'text-red-400'
                : 'text-zinc-400'
          }`}
        >
          {resolved > 0
            ? `${bucket.roi > 0 ? '+' : ''}${bucket.roi.toFixed(0)}%`
            : '--'}
        </span>
      </div>
    </div>
  )
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return `${days.toFixed(1)}d`
}
