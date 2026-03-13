'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface OddsSnapshot {
  bookmaker: string
  home_odds: number | null
  away_odds: number | null
  fetched_at: string
}

// Consistent colors for bookmakers
const BOOKMAKER_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
]

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatOdds(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

interface LineMovementChartProps {
  gameId: string
  homeTeam: string
  awayTeam: string
}

export function LineMovementChart({
  gameId,
  homeTeam,
  awayTeam,
}: LineMovementChartProps) {
  const [snapshots, setSnapshots] = useState<OddsSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [side, setSide] = useState<'home' | 'away'>('home')

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/odds/history?gameId=${gameId}`)
        if (!res.ok) {
          setError('Failed to load line movement data')
          return
        }
        const data = await res.json()
        setSnapshots(data.snapshots ?? [])
      } catch {
        setError('Network error loading line movement')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [gameId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading line movement...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm font-medium">No line movement data yet</p>
        <p className="text-xs text-muted-foreground">
          Line history builds as odds are fetched over time. Check back later.
        </p>
      </div>
    )
  }

  // Group snapshots by timestamp, create one data point per timestamp
  const bookmakers = [...new Set(snapshots.map((s) => s.bookmaker))]
  const timestamps = [...new Set(snapshots.map((s) => s.fetched_at))].sort()

  const chartData = timestamps.map((ts) => {
    const point: Record<string, string | number | null> = {
      time: ts,
      label: timestamps.length > 24 ? formatDate(ts) : formatTime(ts),
    }
    for (const bk of bookmakers) {
      const snap = snapshots.find(
        (s) => s.fetched_at === ts && s.bookmaker === bk
      )
      point[bk] =
        side === 'home' ? (snap?.home_odds ?? null) : (snap?.away_odds ?? null)
    }
    return point
  })

  const bookmakerColors = new Map(
    bookmakers.map((bk, i) => [bk, BOOKMAKER_COLORS[i % BOOKMAKER_COLORS.length]])
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSide('home')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            side === 'home'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {homeTeam}
        </button>
        <button
          onClick={() => setSide('away')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            side === 'away'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {awayTeam}
        </button>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#888' }}
              tickLine={false}
              axisLine={{ stroke: '#333' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#888' }}
              tickFormatter={formatOdds}
              tickLine={false}
              axisLine={{ stroke: '#333' }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#888' }}
              formatter={(value) =>
                typeof value === 'number' ? formatOdds(value) : String(value ?? '')
              }
              labelFormatter={(label) => String(label)}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value: string) => value.replace(/_/g, ' ')}
            />
            {bookmakers.map((bk) => (
              <Line
                key={bk}
                type="monotone"
                dataKey={bk}
                stroke={bookmakerColors.get(bk)}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                name={bk}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Moneyline odds by bookmaker over time.
        {side === 'home' ? ` Showing ${homeTeam} (home).` : ` Showing ${awayTeam} (away).`}
      </p>
    </div>
  )
}
