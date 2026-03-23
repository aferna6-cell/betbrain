'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  calculateBookROI,
  getAllAssignments,
  exportBookROIToCSV,
  type BookROI,
} from '@/lib/book-roi'
import { getBookColor, formatBookName } from '@/lib/book-colors'

interface BookROITrackerProps {
  picks: Array<{
    id: string
    outcome?: string | null
    profit?: number | null
    units: number
  }>
}

export function BookROITracker({ picks }: BookROITrackerProps) {
  const [bookROIs, setBookROIs] = useState<BookROI[]>([])
  const [sortKey, setSortKey] = useState<'roi' | 'profit' | 'picks' | 'winRate'>('roi')

  const refresh = useCallback(() => {
    const assignments = getAllAssignments()
    const rois = calculateBookROI(picks, assignments)
    setBookROIs(rois)
  }, [picks])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (bookROIs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No book-specific data yet. Assign bookmakers to your picks to track ROI per book.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          When logging picks, select which book you placed the bet at.
        </p>
      </div>
    )
  }

  const sorted = [...bookROIs].sort((a, b) => {
    if (sortKey === 'roi') return b.roi - a.roi
    if (sortKey === 'profit') return b.totalProfit - a.totalProfit
    if (sortKey === 'picks') return b.picks - a.picks
    return b.winRate - a.winRate
  })

  function handleExport() {
    const csv = exportBookROIToCSV(sorted)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `betbrain-book-roi-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold">ROI by Bookmaker</h3>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {(['roi', 'profit', 'picks', 'winRate'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  sortKey === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {key === 'roi' ? 'ROI' : key === 'profit' ? 'Profit' : key === 'picks' ? 'Volume' : 'Win Rate'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Bookmaker</th>
              <th className="pb-2 px-3 font-medium text-right">Record</th>
              <th className="pb-2 px-3 font-medium text-right">P/L</th>
              <th className="pb-2 px-3 font-medium text-right">ROI</th>
              <th className="pb-2 pl-3 font-medium text-right">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const color = getBookColor(b.bookmaker)
              const isProfit = b.totalProfit > 0
              const isLoss = b.totalProfit < 0
              return (
                <tr key={b.bookmaker} className={`border-b border-border/50 ${color.bg}`}>
                  <td className={`py-2.5 pr-4 font-medium ${color.text}`}>
                    <span
                      className="inline-block h-2 w-2 rounded-full mr-1.5"
                      style={{ backgroundColor: color.dot }}
                    />
                    {formatBookName(b.bookmaker)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">
                    {b.wins}-{b.losses}{b.pushes > 0 ? `-${b.pushes}` : ''}
                    <span className="text-muted-foreground ml-1">({b.picks})</span>
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${isProfit ? 'text-green-500' : isLoss ? 'text-red-500' : ''}`}>
                    {isProfit ? '+' : ''}{b.totalProfit.toFixed(2)}u
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-semibold ${b.roi > 0 ? 'text-green-500' : b.roi < 0 ? 'text-red-500' : ''}`}>
                    {b.roi > 0 ? '+' : ''}{b.roi.toFixed(1)}%
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono text-xs">
                    {b.winRate.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-xs text-muted-foreground border-t border-border pt-3">
        <span>
          Best:{' '}
          <span className="text-green-500 font-medium">
            {formatBookName(sorted[0].bookmaker)} ({sorted[0].roi > 0 ? '+' : ''}{sorted[0].roi.toFixed(1)}%)
          </span>
        </span>
        {sorted.length > 1 && (
          <span>
            Worst:{' '}
            <span className="text-red-500 font-medium">
              {formatBookName(sorted[sorted.length - 1].bookmaker)} ({sorted[sorted.length - 1].roi > 0 ? '+' : ''}{sorted[sorted.length - 1].roi.toFixed(1)}%)
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
