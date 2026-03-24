'use client'

import { useState, useEffect } from 'react'
import { buildBankrollCurve, type BankrollPoint } from '@/lib/bankroll-history'

/**
 * Mini SVG sparkline showing bankroll trend over time.
 * Designed to fit inside the dashboard stats grid.
 */
export function BankrollSparkline() {
  const [points, setPoints] = useState<BankrollPoint[]>([])
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
          setPoints(buildBankrollCurve(picks))
        }
      } catch {
        // Silent — decorative widget
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-16 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Bankroll Trend
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Need 2+ resolved picks to show trend
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Bankroll Trend
      </p>
      <div className="mt-2">
        <Sparkline points={points} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pure SVG Sparkline
// ---------------------------------------------------------------------------

interface SparklineProps {
  points: BankrollPoint[]
  width?: number
  height?: number
}

function Sparkline({ points, width = 200, height = 48 }: SparklineProps) {
  if (points.length < 2) return null

  const values = points.map((p) => p.cumulative)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const range = max - min || 1

  const padding = 2
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  // Map data points to SVG coordinates
  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * innerW
    const y = padding + innerH - ((p.cumulative - min) / range) * innerH
    return { x, y }
  })

  // Build polyline path
  const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')

  // Build gradient fill area (line down to zero baseline)
  const zeroY = padding + innerH - ((0 - min) / range) * innerH
  const areaPath = [
    `M ${coords[0].x.toFixed(1)},${zeroY.toFixed(1)}`,
    ...coords.map((c) => `L ${c.x.toFixed(1)},${c.y.toFixed(1)}`),
    `L ${coords[coords.length - 1].x.toFixed(1)},${zeroY.toFixed(1)}`,
    'Z',
  ].join(' ')

  const lastValue = values[values.length - 1]
  const isPositive = lastValue >= 0
  const strokeColor = isPositive ? '#22c55e' : '#ef4444'
  const fillColor = isPositive ? '#22c55e' : '#ef4444'

  const lastPoint = coords[coords.length - 1]

  return (
    <div className="flex items-center gap-3">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-label={`Bankroll trend: ${lastValue >= 0 ? '+' : ''}${lastValue.toFixed(2)} units`}
      >
        {/* Zero baseline */}
        <line
          x1={padding}
          y1={zeroY}
          x2={width - padding}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={0.5}
          strokeDasharray="3,3"
        />

        {/* Gradient fill */}
        <path
          d={areaPath}
          fill={fillColor}
          fillOpacity={0.1}
        />

        {/* Line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current point dot */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2.5}
          fill={strokeColor}
        />
      </svg>

      <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {lastValue >= 0 ? '+' : ''}{lastValue.toFixed(1)}u
      </span>
    </div>
  )
}
