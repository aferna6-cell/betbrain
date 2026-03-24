'use client'

import { useState, useMemo } from 'react'
import {
  compareOddsSnapshots,
  getChangeColor,
  formatChange,
  type OddsSnapshot,
  type ComparatorResult,
} from '@/lib/odds-comparator'

interface OddsComparatorProps {
  snapshots: OddsSnapshot[]
}

export function OddsComparator({ snapshots }: OddsComparatorProps) {
  const [beforeIdx, setBeforeIdx] = useState(0)
  const [afterIdx, setAfterIdx] = useState(Math.min(1, snapshots.length - 1))

  // Group snapshots by timestamp
  const timestamps = useMemo(() => {
    const unique = [...new Set(snapshots.map((s) => s.fetched_at))].sort()
    return unique
  }, [snapshots])

  const result = useMemo((): ComparatorResult | null => {
    if (timestamps.length < 2) return null
    const beforeTime = timestamps[beforeIdx]
    const afterTime = timestamps[afterIdx]
    const before = snapshots.filter((s) => s.fetched_at === beforeTime)
    const after = snapshots.filter((s) => s.fetched_at === afterTime)
    return compareOddsSnapshots(before, after)
  }, [snapshots, timestamps, beforeIdx, afterIdx])

  if (timestamps.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Odds Comparator</h3>
        <p className="text-sm text-muted-foreground">
          Need at least 2 odds snapshots to compare. Odds are captured automatically when you view games.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Odds Comparator</h3>
        <p className="text-sm text-muted-foreground">
          Compare odds at two points in time. Highlights significant movement.
        </p>
      </div>

      {/* Time selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Before</label>
          <select
            value={beforeIdx}
            onChange={(e) => setBeforeIdx(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
          >
            {timestamps.map((t, i) => (
              <option key={t} value={i}>
                {new Date(t).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">After</label>
          <select
            value={afterIdx}
            onChange={(e) => setAfterIdx(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
          >
            {timestamps.map((t, i) => (
              <option key={t} value={i}>
                {new Date(t).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {result && (
        <>
          {/* Summary */}
          <div className="flex items-center gap-4 text-sm">
            <span>{result.totalBooks} books</span>
            <span className="text-amber-400">{result.booksWithMovement} with movement</span>
            {result.biggestMove && (
              <span className={getChangeColor(result.biggestMove.change)}>
                Biggest: {result.biggestMove.bookmaker} {result.biggestMove.market} ({formatChange(result.biggestMove.change)})
              </span>
            )}
          </div>

          {/* Diff table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-2">Book</th>
                  <th className="text-right py-2 px-1">ML H</th>
                  <th className="text-right py-2 px-1">ML A</th>
                  <th className="text-right py-2 px-1">Sprd</th>
                  <th className="text-right py-2 px-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.diffs.map((diff) => (
                  <tr
                    key={diff.bookmaker}
                    className={`border-b border-border/50 ${
                      diff.hasSignificantChange ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-1.5 pr-2 font-medium truncate max-w-[100px]">
                      {diff.bookmaker}
                    </td>
                    <td className={`text-right py-1.5 px-1 font-mono ${getChangeColor(diff.moneyline.home.change)}`}>
                      {formatChange(diff.moneyline.home.change)}
                    </td>
                    <td className={`text-right py-1.5 px-1 font-mono ${getChangeColor(diff.moneyline.away.change)}`}>
                      {formatChange(diff.moneyline.away.change)}
                    </td>
                    <td className={`text-right py-1.5 px-1 font-mono ${getChangeColor(diff.spread.line.change)}`}>
                      {formatChange(diff.spread.line.change)}
                    </td>
                    <td className={`text-right py-1.5 px-1 font-mono ${getChangeColor(diff.total.line.change)}`}>
                      {formatChange(diff.total.line.change)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
