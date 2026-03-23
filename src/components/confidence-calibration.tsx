'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  calculateCalibration,
  getAllConfidenceRatings,
  type CalibrationResult,
  type CalibrationBucket,
} from '@/lib/confidence-calibration'

function CalibrationBar({ bucket }: { bucket: CalibrationBucket }) {
  const hasData = bucket.total >= 3
  const actualHeight = bucket.actualWinRate != null ? bucket.actualWinRate : 0
  const expectedHeight = bucket.expectedWinRate

  const errorColor =
    bucket.calibrationError != null
      ? Math.abs(bucket.calibrationError) <= 8
        ? 'text-green-500'
        : bucket.calibrationError > 0
          ? 'text-blue-400'
          : 'text-red-400'
      : 'text-muted-foreground'

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Chart bar area */}
      <div className="relative h-32 w-12 flex items-end justify-center gap-0.5">
        {/* Expected bar (faded) */}
        <div
          className="w-5 bg-muted/40 rounded-t transition-all"
          style={{ height: `${expectedHeight}%` }}
          title={`Expected: ${expectedHeight}%`}
        />
        {/* Actual bar */}
        <div
          className={`w-5 rounded-t transition-all ${
            !hasData
              ? 'bg-muted/20'
              : Math.abs(bucket.calibrationError ?? 50) <= 8
                ? 'bg-green-500/60'
                : (bucket.calibrationError ?? 0) > 0
                  ? 'bg-blue-500/60'
                  : 'bg-red-500/60'
          }`}
          style={{ height: hasData ? `${actualHeight}%` : '2%' }}
          title={hasData ? `Actual: ${bucket.actualWinRate}%` : 'Not enough data'}
        />
      </div>

      {/* Label */}
      <span className="text-[10px] text-muted-foreground font-mono">{bucket.label}</span>

      {/* Stats */}
      {hasData ? (
        <div className="text-center">
          <div className={`text-xs font-semibold ${errorColor}`}>
            {bucket.actualWinRate}%
          </div>
          <div className="text-[10px] text-muted-foreground">
            {bucket.wins}/{bucket.total}
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground">
          {bucket.total > 0 ? `${bucket.total} pick${bucket.total !== 1 ? 's' : ''}` : '—'}
        </div>
      )}
    </div>
  )
}

function DiagnosisBadge({ diagnosis }: { diagnosis: CalibrationResult['diagnosis'] }) {
  const config = {
    'well-calibrated': { label: 'Well Calibrated', variant: 'default' as const, className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    'over-confident': { label: 'Over-Confident', variant: 'default' as const, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    'under-confident': { label: 'Under-Confident', variant: 'default' as const, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'insufficient-data': { label: 'Needs Data', variant: 'secondary' as const, className: '' },
  }[diagnosis]

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

export function ConfidenceCalibrationPanel() {
  const [result, setResult] = useState<CalibrationResult | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/picks')
      const data = await res.json()
      if (res.ok && data.picks) {
        // Merge picks with confidence ratings from localStorage
        const confidenceRatings = getAllConfidenceRatings()
        const picksWithConfidence = data.picks.map((p: { id: string; outcome: string | null }) => ({
          outcome: p.outcome,
          confidence: confidenceRatings[p.id] ?? null,
        }))
        setResult(calculateCalibration(picksWithConfidence))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="h-32 bg-muted/30 rounded" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        Unable to load calibration data.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Confidence Calibration</h3>
          <p className="text-sm text-muted-foreground">
            How well does your stated confidence match actual outcomes?
          </p>
        </div>
        <DiagnosisBadge diagnosis={result.diagnosis} />
      </div>

      {result.diagnosis !== 'insufficient-data' && (
        <>
          {/* Score */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-3xl font-bold font-mono">
                {result.calibrationScore}
              </div>
              <div className="text-xs text-muted-foreground">Calibration Score</div>
            </div>
            <div>
              <div className={`text-xl font-semibold font-mono ${
                result.avgCalibrationError > 0 ? 'text-blue-400' : result.avgCalibrationError < 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {result.avgCalibrationError > 0 ? '+' : ''}{result.avgCalibrationError.toFixed(1)}pp
              </div>
              <div className="text-xs text-muted-foreground">Avg Error</div>
            </div>
            <div>
              <div className="text-xl font-semibold font-mono text-muted-foreground">
                {result.totalPicks}
              </div>
              <div className="text-xs text-muted-foreground">Rated Picks</div>
            </div>
          </div>

          {/* Chart */}
          <div>
            <div className="flex items-end justify-between gap-1">
              {result.buckets.map((bucket) => (
                <CalibrationBar key={bucket.label} bucket={bucket} />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-muted/40 rounded" /> Expected
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-green-500/60 rounded" /> Actual (calibrated)
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-red-500/60 rounded" /> Actual (over-confident)
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-blue-500/60 rounded" /> Actual (under-confident)
              </div>
            </div>
          </div>
        </>
      )}

      {/* Summary */}
      <p className="text-sm text-muted-foreground bg-muted/20 rounded p-3">
        {result.summary}
      </p>

      {result.diagnosis === 'insufficient-data' && (
        <p className="text-xs text-muted-foreground">
          Add confidence ratings to your picks in the Pick Tracker to start building calibration data.
        </p>
      )}
    </div>
  )
}
