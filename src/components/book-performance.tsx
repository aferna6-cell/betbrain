'use client'

import { useMemo, useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { analyzeBookPerformance, type BookPerformance, type PickWithBook } from '@/lib/book-performance'
import { formatBookName, getBookColor } from '@/lib/book-colors'

// ---------------------------------------------------------------------------
// Book Performance Panel — shows which bookmaker gives best CLV
// ---------------------------------------------------------------------------

export function BookPerformancePanel() {
  const [picks, setPicks] = useState<PickWithBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPicks() {
      try {
        const res = await fetch('/api/picks')
        if (!res.ok) return
        const data = await res.json()
        const allPicks = data.picks ?? []

        // Get bookmaker assignments from localStorage (from book-roi.ts)
        const bookAssignments = getBookAssignments()

        const enriched: PickWithBook[] = allPicks.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          odds: p.odds as number,
          closing_odds: p.closing_odds as number | null,
          bookmaker: bookAssignments[p.id as string] ?? null,
          outcome: p.outcome as string | null,
          profit: p.profit as number | null,
          units: p.units as number,
          sport: p.sport as string,
        }))

        setPicks(enriched)
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }
    fetchPicks()
  }, [])

  const result = useMemo(() => analyzeBookPerformance(picks), [picks])

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="h-4 w-40 animate-pulse rounded bg-muted mb-4" />
        <div className="space-y-2">
          <div className="h-8 animate-pulse rounded bg-muted" />
          <div className="h-8 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (result.performances.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold mb-2">Book Performance</h3>
        <p className="text-sm text-muted-foreground">
          No bookmaker data available. Assign bookmakers to your picks in the Book ROI tracker
          to see which book gives you the best closing line value.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Book Performance (CLV)</h3>
        <span className="text-xs text-muted-foreground">
          {result.totalAnalyzed} picks across {result.performances.length} books
        </span>
      </div>

      {/* Best book callout */}
      {result.bestCLVBook && (
        <div className="px-4 py-2 border-b border-border/30 bg-green-950/20">
          <p className="text-xs text-green-400">
            Best CLV: <span className="font-medium">{formatBookName(result.bestCLVBook)}</span>
            {' '}&mdash; consistently gives you better prices than closing lines.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              <th className="px-4 py-2 text-left">Book</th>
              <th className="px-2 py-2 text-right">Picks</th>
              <th className="px-2 py-2 text-right">Avg CLV</th>
              <th className="px-2 py-2 text-right">+CLV Rate</th>
              <th className="px-2 py-2 text-right">Win Rate</th>
              <th className="px-2 py-2 text-right">ROI</th>
              <th className="px-2 py-2 text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {result.performances.map((perf) => (
              <BookRow key={perf.bookmaker} perf={perf} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground/60">
          For informational purposes only. Not financial advice.
          CLV requires closing odds data on your picks.
        </p>
      </div>
    </div>
  )
}

function BookRow({ perf }: { perf: BookPerformance }) {
  const bookColor = getBookColor(perf.bookmaker)

  return (
    <tr className="hover:bg-accent/30 transition-colors">
      <td className="px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: bookColor.dot }}
          />
          <span className="font-medium">{formatBookName(perf.bookmaker)}</span>
        </div>
      </td>
      <td className="px-2 py-2 text-right font-mono">{perf.totalPicks}</td>
      <td className={`px-2 py-2 text-right font-mono ${
        perf.avgCLV > 0 ? 'text-green-400' : perf.avgCLV < 0 ? 'text-red-400' : ''
      }`}>
        {perf.clvPicks > 0
          ? `${perf.avgCLV > 0 ? '+' : ''}${perf.avgCLV}%`
          : '--'}
      </td>
      <td className="px-2 py-2 text-right font-mono">
        {perf.clvPicks > 0 ? `${perf.positiveCLVRate}%` : '--'}
      </td>
      <td className={`px-2 py-2 text-right font-mono ${
        perf.winRate > 52 ? 'text-green-400' : perf.winRate < 48 ? 'text-red-400' : ''
      }`}>
        {perf.winRate > 0 ? `${perf.winRate}%` : '--'}
      </td>
      <td className={`px-2 py-2 text-right font-mono ${
        perf.roi > 0 ? 'text-green-400' : perf.roi < 0 ? 'text-red-400' : ''
      }`}>
        {perf.roi !== 0 ? `${perf.roi > 0 ? '+' : ''}${perf.roi}%` : '--'}
      </td>
      <td className={`px-2 py-2 text-right font-mono ${
        perf.totalProfit > 0 ? 'text-green-400' : perf.totalProfit < 0 ? 'text-red-400' : ''
      }`}>
        {perf.totalProfit !== 0 ? `${perf.totalProfit > 0 ? '+' : ''}${perf.totalProfit}u` : '--'}
      </td>
    </tr>
  )
}

function getBookAssignments(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem('betbrain-book-assignments')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {}
}
