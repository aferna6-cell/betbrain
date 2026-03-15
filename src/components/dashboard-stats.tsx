'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  totalPicks: number
  winRate: number
  roi: number
  totalProfit: number
  pendingPicks: number
  activeSports: number
}

interface PickStats {
  total: number
  wins: number
  losses: number
  pushes: number
  pending: number
  totalProfit: number
  roi: number
}

interface PicksApiResponse {
  picks: Array<{ sport: string }>
  stats: PickStats
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveStats(data: PicksApiResponse): DashboardStats {
  const { stats, picks } = data
  const resolved = stats.total - stats.pending
  const winRate =
    resolved > 0 ? Math.round((stats.wins / resolved) * 10000) / 100 : 0
  const activeSports = new Set(picks.map((p) => p.sport)).size

  return {
    totalPicks: stats.total,
    winRate,
    roi: stats.roi,
    totalProfit: stats.totalProfit,
    pendingPicks: stats.pending,
    activeSports,
  }
}

function formatProfit(value: number): string {
  const abs = Math.abs(value).toFixed(2)
  return value >= 0 ? `+$${abs}` : `-$${abs}`
}

// ---------------------------------------------------------------------------
// Sub-component: individual stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string
  positive: boolean | null // null = neutral (no color coding)
  loading: boolean
}

function StatCard({ label, value, positive, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const valueColor =
    positive === null
      ? 'text-foreground'
      : positive
        ? 'text-green-500'
        : 'text-red-500'

  const TrendIcon =
    positive === null ? Minus : positive ? TrendingUp : TrendingDown

  const iconColor =
    positive === null
      ? 'text-muted-foreground'
      : positive
        ? 'text-green-500'
        : 'text-red-500'

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>
          {value}
        </p>
        <TrendIcon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await fetch('/api/picks')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data: PicksApiResponse = await res.json()
        if (!cancelled) {
          setStats(deriveStats(data))
        }
      } catch (err) {
        if (!cancelled) {
          setError('Could not load pick stats.')
          console.error('[dashboard-stats] fetch error:', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
  }, [])

  // Error state — show a quiet inline notice, don't break the layout
  if (error) {
    return (
      <p className="text-sm text-muted-foreground">{error}</p>
    )
  }

  const cards: StatCardProps[] = stats
    ? [
        {
          label: 'Total Picks',
          value: String(stats.totalPicks),
          positive: null,
          loading: false,
        },
        {
          label: 'Win Rate',
          value:
            stats.totalPicks - stats.pendingPicks === 0
              ? '—'
              : `${stats.winRate.toFixed(1)}%`,
          positive:
            stats.totalPicks - stats.pendingPicks === 0
              ? null
              : stats.winRate >= 52.4, // breakeven for -110 juice
          loading: false,
        },
        {
          label: 'ROI',
          value:
            stats.totalPicks - stats.pendingPicks === 0
              ? '—'
              : `${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`,
          positive:
            stats.totalPicks - stats.pendingPicks === 0
              ? null
              : stats.roi >= 0,
          loading: false,
        },
        {
          label: 'Net Profit',
          value:
            stats.totalPicks - stats.pendingPicks === 0
              ? '—'
              : formatProfit(stats.totalProfit),
          positive:
            stats.totalPicks - stats.pendingPicks === 0
              ? null
              : stats.totalProfit >= 0,
          loading: false,
        },
        {
          label: 'Pending',
          value: String(stats.pendingPicks),
          positive: null,
          loading: false,
        },
      ]
    : Array(5).fill({ label: '', value: '', positive: null, loading: true })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, i) => (
        <StatCard key={i} {...card} loading={loading} />
      ))}
    </div>
  )
}
