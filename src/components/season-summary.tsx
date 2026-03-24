'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateSeasonSummary, formatSummaryText, type SeasonSummary } from '@/lib/season-summary'
import { profitColor } from '@/lib/format'

/**
 * Season summary generator panel.
 * Auto-generates a performance report with grade, breakdowns, and sharing.
 */
export function SeasonSummaryPanel() {
  const [summary, setSummary] = useState<SeasonSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/picks')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setSummary(generateSeasonSummary(data.picks ?? []))
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!summary || summary.totalPicks === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No resolved picks yet. Start logging picks to generate your season summary.
        </p>
      </div>
    )
  }

  function handleCopy() {
    if (!summary) return
    navigator.clipboard.writeText(formatSummaryText(summary)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const gradeColor =
    summary.grade.startsWith('A') ? 'text-green-500'
    : summary.grade.startsWith('B') ? 'text-blue-400'
    : summary.grade === 'C' ? 'text-yellow-500'
    : summary.grade === 'D' ? 'text-orange-500'
    : summary.grade === 'F' ? 'text-red-500'
    : 'text-muted-foreground'

  return (
    <div className="space-y-4">
      {/* Grade + headline */}
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className={`text-6xl font-black ${gradeColor}`}>{summary.grade}</p>
        <p className="mt-2 text-sm text-muted-foreground">{summary.gradeDescription}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.dateRange.start} to {summary.dateRange.end}
        </p>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Record" value={`${summary.record.wins}-${summary.record.losses}${summary.record.pushes > 0 ? `-${summary.record.pushes}` : ''}`} />
        <StatBox label="Win Rate" value={summary.winRate !== null ? `${summary.winRate}%` : '--'} color={summary.winRate !== null && summary.winRate >= 52.4 ? 'text-green-500' : summary.winRate !== null ? 'text-red-500' : ''} />
        <StatBox label="ROI" value={`${summary.roi >= 0 ? '+' : ''}${summary.roi}%`} color={summary.roi > 0 ? 'text-green-500' : summary.roi < 0 ? 'text-red-500' : ''} />
        <StatBox label="Profit" value={`${summary.profit >= 0 ? '+' : ''}${summary.profit.toFixed(2)}u`} color={profitColor(summary.profit)} />
      </div>

      {/* Highlights */}
      <div className="grid gap-3 sm:grid-cols-2">
        {summary.bestSport && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-xs text-muted-foreground">Best Sport</p>
            <p className="text-lg font-bold text-green-500">{summary.bestSport.sport.toUpperCase()}</p>
            <p className="text-xs">{summary.bestSport.record} &middot; {summary.bestSport.roi}% ROI</p>
          </div>
        )}
        {summary.worstSport && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs text-muted-foreground">Worst Sport</p>
            <p className="text-lg font-bold text-red-500">{summary.worstSport.sport.toUpperCase()}</p>
            <p className="text-xs">{summary.worstSport.record} &middot; {summary.worstSport.roi}% ROI</p>
          </div>
        )}
        {summary.bestMonth && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Best Month</p>
            <p className="text-lg font-bold">{summary.bestMonth.month}</p>
            <p className="text-xs text-green-500">+{summary.bestMonth.profit.toFixed(2)}u ({summary.bestMonth.picks} picks)</p>
          </div>
        )}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Streaks</p>
          <p className="text-lg font-bold">
            <span className="text-green-500">W{summary.longestWinStreak}</span>
            {' / '}
            <span className="text-red-500">L{summary.longestLossStreak}</span>
          </p>
          <p className="text-xs text-muted-foreground">longest win / loss</p>
        </div>
      </div>

      {/* Bet type breakdown */}
      {summary.betTypeBreakdown.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">By Bet Type</h4>
          {summary.betTypeBreakdown.map((bt) => (
            <div key={bt.type} className="flex items-center justify-between text-sm">
              <span className="capitalize">{bt.type}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{bt.wins}-{bt.losses}</span>
                <span className={bt.roi > 0 ? 'text-green-500' : bt.roi < 0 ? 'text-red-500' : ''}>
                  {bt.roi >= 0 ? '+' : ''}{bt.roi}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Copy / Share */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={copied ? 'text-green-500' : ''}
        >
          {copied ? 'Copied!' : 'Copy Summary'}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/60">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color ?? ''}`}>{value}</p>
    </div>
  )
}
