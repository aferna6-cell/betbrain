'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  calcSportPerformance,
  suggestAllocation,
  type AllocationResult,
} from '@/lib/bankroll-allocation'

/**
 * Smart bankroll allocation panel.
 * Suggests how to split bankroll across sports based on performance.
 */
export function BankrollAllocationPanel() {
  const [result, setResult] = useState<AllocationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [bankroll, setBankroll] = useState(1000)

  useEffect(() => {
    let cancelled = false

    async function fetch_() {
      try {
        const res = await fetch('/api/picks')
        if (!res.ok) return
        const data = await res.json()
        const picks = data.picks ?? []
        const perf = calcSportPerformance(picks)
        if (!cancelled) {
          // Try to read bankroll from localStorage
          try {
            const saved = localStorage.getItem('betbrain_bankroll')
            if (saved) {
              const config = JSON.parse(saved)
              if (config.balance) setBankroll(config.balance)
            }
          } catch { /* ignore */ }
          setResult(suggestAllocation(perf, bankroll))
        }
      } catch {
        // Silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch_()
    return () => { cancelled = true }
  }, [bankroll])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!result || result.suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No pick history yet. Log picks across different sports to get allocation suggestions.
        </p>
      </div>
    )
  }

  const COLORS = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
  const CONFIDENCE_STYLES = {
    high: 'text-green-500 border-green-500/30',
    medium: 'text-yellow-500 border-yellow-500/30',
    low: 'text-red-500 border-red-500/30',
  }

  return (
    <div className="space-y-4">
      {/* Bankroll input */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Bankroll:</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">$</span>
          <input
            type="number"
            min={100}
            step={100}
            value={bankroll}
            onChange={(e) => setBankroll(parseInt(e.target.value) || 1000)}
            className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm text-right font-mono"
          />
        </div>
      </div>

      {result.minSampleWarning && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2">
          <p className="text-xs text-yellow-500">
            Some sports have fewer than 20 picks. Allocations will become more accurate as you log more picks.
          </p>
        </div>
      )}

      {/* Visual allocation bar */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex h-8 rounded-full overflow-hidden">
          {result.suggestions.map((s, i) => (
            <div
              key={s.sport}
              className={`${COLORS[i % COLORS.length]} flex items-center justify-center text-[10px] font-bold text-white transition-all`}
              style={{ width: `${s.percentage}%` }}
              title={`${s.sport.toUpperCase()}: ${s.percentage}%`}
            >
              {s.percentage >= 10 ? s.sport.toUpperCase() : ''}
            </div>
          ))}
        </div>

        {/* Detail rows */}
        <div className="space-y-2">
          {result.suggestions.map((s, i) => (
            <div
              key={s.sport}
              className="flex items-center gap-3 text-sm"
            >
              <div className={`w-3 h-3 rounded-full ${COLORS[i % COLORS.length]} shrink-0`} />
              <span className="w-10 font-semibold">{s.sport.toUpperCase()}</span>
              <span className="font-mono font-bold w-14 text-right">
                {s.percentage}%
              </span>
              <span className="font-mono text-muted-foreground w-20 text-right">
                ${Math.round(bankroll * s.percentage / 100)}
              </span>
              <Badge variant="outline" className={`text-[10px] ${CONFIDENCE_STYLES[s.confidence]}`}>
                {s.confidence}
              </Badge>
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {s.reasoning}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {result.methodology}
      </p>
      <p className="text-[10px] text-muted-foreground/60">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
