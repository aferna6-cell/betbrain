'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { calcCorrelationMatrix, type CorrelationResult } from '@/lib/correlation-matrix'

/**
 * Correlation matrix panel — shows how different sports or bet types correlate.
 */
export function CorrelationMatrixPanel() {
  const [result, setResult] = useState<CorrelationResult | null>(null)
  const [groupBy, setGroupBy] = useState<'sport' | 'pick_type'>('sport')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/picks')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setResult(calcCorrelationMatrix(data.picks ?? [], groupBy))
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [groupBy])

  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />
  }

  if (!result || result.pairs.length === 0) {
    return (
      <div className="space-y-3">
        <GroupByToggle value={groupBy} onChange={setGroupBy} />
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Need picks across 2+ {groupBy === 'sport' ? 'sports' : 'bet types'} with 5+ resolved picks to calculate correlations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <GroupByToggle value={groupBy} onChange={setGroupBy} />

      {/* Heatmap matrix */}
      {result.categories.length <= 6 && (
        <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1" />
                {result.categories.map((cat) => (
                  <th key={cat} className="px-2 py-1 text-muted-foreground uppercase font-medium">
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.categories.map((catA, i) => (
                <tr key={catA}>
                  <td className="px-2 py-1 text-muted-foreground uppercase font-medium">{catA}</td>
                  {result.categories.map((catB, j) => {
                    const val = result.matrix[i][j]
                    return (
                      <td
                        key={catB}
                        className="px-2 py-1 text-center font-mono"
                        style={{ backgroundColor: correlationColor(val), color: Math.abs(val) > 0.5 ? '#fff' : undefined }}
                      >
                        {i === j ? '--' : val.toFixed(2)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pair details */}
      <div className="space-y-2">
        {result.pairs.map((pair, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{pair.categoryA.toUpperCase()}</Badge>
              <span className="text-muted-foreground">&harr;</span>
              <Badge variant="secondary" className="text-[10px]">{pair.categoryB.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">n={pair.sampleSize}</span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  pair.interpretation === 'strong_positive' ? 'text-red-500 border-red-500/30'
                  : pair.interpretation === 'moderate_positive' ? 'text-orange-500 border-orange-500/30'
                  : pair.interpretation === 'strong_negative' ? 'text-green-500 border-green-500/30'
                  : pair.interpretation === 'moderate_negative' ? 'text-blue-400 border-blue-400/30'
                  : 'text-muted-foreground'
                }`}
              >
                {pair.interpretation.replace(/_/g, ' ')}
              </Badge>
              <span className={`font-mono font-bold text-sm ${
                pair.correlation > 0.3 ? 'text-red-500'
                : pair.correlation < -0.3 ? 'text-green-500'
                : 'text-muted-foreground'
              }`}>
                {pair.correlation > 0 ? '+' : ''}{pair.correlation.toFixed(3)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Positive correlation: results move together (less diversification).
        Negative correlation: results move opposite (better diversification).
        Green is good for bankroll stability.
      </p>
      <p className="text-[10px] text-muted-foreground/60">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function GroupByToggle({ value, onChange }: { value: 'sport' | 'pick_type'; onChange: (v: 'sport' | 'pick_type') => void }) {
  return (
    <div className="flex gap-1">
      {(['sport', 'pick_type'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === v
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          {v === 'sport' ? 'By Sport' : 'By Bet Type'}
        </button>
      ))}
    </div>
  )
}

function correlationColor(r: number): string {
  if (isNaN(r)) return 'transparent'
  const abs = Math.abs(r)
  if (r > 0) {
    // Red tones (correlated = risk)
    const intensity = Math.round(abs * 255)
    return `rgba(239, 68, 68, ${intensity / 255 * 0.5})`
  } else {
    // Green tones (diversified = good)
    const intensity = Math.round(abs * 255)
    return `rgba(34, 197, 94, ${intensity / 255 * 0.5})`
  }
}
