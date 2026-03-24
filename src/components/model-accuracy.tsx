'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { loadAccuracyRecords, calcModelAccuracy, type ModelAccuracyStats } from '@/lib/model-accuracy'

/**
 * Model Accuracy Tracking panel.
 * Shows how well AI confidence predictions match actual outcomes.
 */
export function ModelAccuracyPanel() {
  const [stats, setStats] = useState<ModelAccuracyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const records = loadAccuracyRecords()
    setStats(calcModelAccuracy(records))
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!stats || stats.totalRecords === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No AI analysis data yet. Run AI analyses on games and log picks to start tracking model accuracy.
        </p>
      </div>
    )
  }

  const resolved = stats.buckets.reduce((s, b) => s + b.total, 0)

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Tracked</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.totalRecords}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Accuracy</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${
            stats.overallAccuracy !== null && stats.overallAccuracy >= 52.4
              ? 'text-green-500'
              : stats.overallAccuracy !== null && stats.overallAccuracy < 50
                ? 'text-red-500'
                : ''
          }`}>
            {stats.overallAccuracy !== null ? `${stats.overallAccuracy}%` : '--'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Brier Score</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${
            stats.brierScore !== null && stats.brierScore < 0.2
              ? 'text-green-500'
              : stats.brierScore !== null && stats.brierScore > 0.3
                ? 'text-red-500'
                : ''
          }`}>
            {stats.brierScore !== null ? stats.brierScore.toFixed(4) : '--'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            0 = perfect, 0.25 = random
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Resolved</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{resolved}</p>
        </div>
      </div>

      {/* Confidence bucket breakdown */}
      {resolved > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Accuracy by Confidence Bucket
          </h4>
          <div className="space-y-2">
            {stats.buckets.map((bucket) => (
              <div key={bucket.range} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-muted-foreground font-mono text-xs">{bucket.range}</span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                  {bucket.total > 0 && (
                    <div
                      className={`h-full rounded-full transition-all ${
                        bucket.winRate !== null && bucket.winRate >= 52.4
                          ? 'bg-green-500/60'
                          : bucket.winRate !== null && bucket.winRate < 50
                            ? 'bg-red-500/60'
                            : 'bg-yellow-500/60'
                      }`}
                      style={{ width: `${bucket.winRate ?? 0}%` }}
                    />
                  )}
                  {bucket.total > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                      {bucket.winRate}% ({bucket.correct}/{bucket.total})
                    </span>
                  )}
                </div>
                <span className="w-8 text-right text-xs text-muted-foreground">
                  {bucket.total > 0 ? `n=${bucket.total}` : '--'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ideally, 70% confidence predictions should win ~70% of the time.
          </p>
        </div>
      )}

      {/* Risk level breakdown */}
      {stats.byRiskLevel.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Accuracy by Risk Level
          </h4>
          <div className="flex gap-3">
            {stats.byRiskLevel.map((rl) => (
              <div key={rl.level} className="flex-1 text-center">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    rl.level === 'low'
                      ? 'border-green-500/30 text-green-500'
                      : rl.level === 'medium'
                        ? 'border-yellow-500/30 text-yellow-500'
                        : 'border-red-500/30 text-red-500'
                  }`}
                >
                  {rl.level.toUpperCase()}
                </Badge>
                <p className="mt-2 text-lg font-bold tabular-nums">
                  {rl.winRate !== null ? `${rl.winRate}%` : '--'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {rl.correct}/{rl.total} correct
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent trend */}
      {stats.recentTrend.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Recent Predictions (Last 20)
          </h4>
          <div className="flex gap-0.5 flex-wrap">
            {stats.recentTrend.map((t, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-sm ${
                  t.correct ? 'bg-green-500/70' : 'bg-red-500/70'
                }`}
                title={`${t.date}: ${t.correct ? 'Correct' : 'Incorrect'}`}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Green = AI prediction matched outcome. Red = mismatch.
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
