'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { generateInsights, type Insight, type InsightResult } from '@/lib/performance-insights'

// ---------------------------------------------------------------------------
// Performance Insights Component
// ---------------------------------------------------------------------------

const SENTIMENT_STYLES: Record<string, { badge: string; border: string; icon: string }> = {
  positive: {
    badge: 'bg-green-500/20 text-green-400',
    border: 'border-green-500/20',
    icon: '+',
  },
  negative: {
    badge: 'bg-red-500/20 text-red-400',
    border: 'border-red-500/20',
    icon: '!',
  },
  neutral: {
    badge: 'bg-zinc-500/20 text-zinc-400',
    border: 'border-zinc-500/20',
    icon: 'i',
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  'bet-type': 'Bet Type',
  sport: 'Sport',
  'odds-range': 'Odds Range',
  timing: 'Timing',
  clv: 'CLV',
  volume: 'Volume',
}

export function PerformanceInsights() {
  const [result, setResult] = useState<InsightResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchPicks() {
      try {
        const res = await fetch('/api/picks')
        if (!res.ok) throw new Error('Failed to fetch picks')
        const data = await res.json()
        const picks = data.picks ?? data ?? []
        setResult(generateInsights(picks))
      } catch {
        setError('Could not load pick data.')
      } finally {
        setLoading(false)
      }
    }
    fetchPicks()
  }, [])

  const filteredInsights = useMemo(() => {
    if (!result) return []
    if (filter === 'all') return result.insights
    return result.insights.filter((i) => i.category === filter)
  }, [result, filter])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  if (!result || result.insights.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No insights available yet. Keep logging picks to unlock performance analysis.
        </p>
      </div>
    )
  }

  const categories = ['all', ...new Set(result.insights.map((i) => i.category))]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Performance Insights</h3>
          <p className="text-xs text-muted-foreground">
            Based on {result.resolvedPicks} resolved picks
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Insight cards */}
      <div className="space-y-3">
        {filteredInsights.map((insight, idx) => (
          <InsightCard key={idx} insight={insight} />
        ))}
      </div>

      {filteredInsights.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No insights in this category yet.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  const style = SENTIMENT_STYLES[insight.sentiment] ?? SENTIMENT_STYLES.neutral

  return (
    <div className={`rounded-lg border ${style.border} bg-card p-4`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style.badge}`}>
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold">{insight.title}</h4>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {CATEGORY_LABELS[insight.category] ?? insight.category}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {insight.confidence}% confidence
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
          <p className="text-sm mt-2 text-foreground/80">
            <span className="font-medium">Action:</span> {insight.action}
          </p>
        </div>
      </div>
    </div>
  )
}
