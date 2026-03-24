'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { calculateCLV } from '@/lib/clv'
import { profitColor } from '@/lib/format'

interface Pick {
  id: string
  odds: number
  closing_odds: number | null
  units: number
  game_date: string
  outcome?: string | null
}

interface CLVTrendChartProps {
  picks: Pick[]
}

interface DataPoint {
  date: string
  clv: number
  runningAvg: number
  pickCount: number
}

function buildCLVTrendData(picks: Pick[]): DataPoint[] {
  // Filter to picks with closing odds, sort by date
  const withClosing = picks
    .filter((p) => p.closing_odds !== null)
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())

  if (withClosing.length === 0) return []

  const points: DataPoint[] = []
  let cumulativeCLV = 0

  for (let i = 0; i < withClosing.length; i++) {
    const pick = withClosing[i]
    const clv = calculateCLV(pick.odds, pick.closing_odds!)
    cumulativeCLV += clv

    const date = pick.game_date.split('T')[0]
    points.push({
      date,
      clv: Math.round(clv * 100) / 100,
      runningAvg: Math.round((cumulativeCLV / (i + 1)) * 100) / 100,
      pickCount: i + 1,
    })
  }

  return points
}

export function CLVTrendChart({ picks }: CLVTrendChartProps) {
  const data = useMemo(() => buildCLVTrendData(picks), [picks])

  if (data.length < 3) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Need at least 3 picks with closing odds to show CLV trends.
          Add closing odds when logging picks to track your line-beating ability.
        </p>
      </div>
    )
  }

  const latestAvg = data[data.length - 1].runningAvg

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          CLV Trend
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            {data.length} picks tracked
          </span>
          <span className={`font-medium ${profitColor(latestAvg)}`}>
            Avg: {latestAvg >= 0 ? '+' : ''}{latestAvg.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#71717a' }}
              tickFormatter={(d: string) => {
                const parts = d.split('-')
                return `${parts[1]}/${parts[2]}`
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#71717a' }}
              tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                const v = Number(value)
                const label = name === 'clv' ? 'CLV' : 'Running Avg'
                return [`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, label]
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => `Date: ${String(label)}`}
            />
            <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="clv"
              stroke="#6366f1"
              strokeWidth={1}
              dot={{ r: 2, fill: '#6366f1' }}
              name="clv"
            />
            <Line
              type="monotone"
              dataKey="runningAvg"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="runningAvg"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-3 rounded bg-indigo-500" />
          Per-pick CLV
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-3 rounded bg-green-500" />
          Running average
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground/60">
        Consistently positive CLV is the #1 predictor of long-term profitability.
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

export { buildCLVTrendData }
