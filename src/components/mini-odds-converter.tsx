'use client'

import { useState } from 'react'

/**
 * Compact interactive odds converter for embedding in educational content.
 * Shows American odds → implied probability → payout in real-time.
 */
export function MiniOddsConverter() {
  const [odds, setOdds] = useState('-110')

  const numOdds = Number(odds)
  const isValid = !isNaN(numOdds) && numOdds !== 0 && (numOdds <= -100 || numOdds >= 100)

  let impliedProb = 0
  let payout = 0
  if (isValid) {
    if (numOdds < 0) {
      impliedProb = Math.abs(numOdds) / (Math.abs(numOdds) + 100)
      payout = 100 + (100 / Math.abs(numOdds)) * 100
    } else {
      impliedProb = 100 / (numOdds + 100)
      payout = 100 + numOdds
    }
  }

  return (
    <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 p-4">
      <p className="text-xs font-semibold uppercase text-indigo-400 mb-3">Try it yourself</p>
      <div className="flex items-center gap-3">
        <label htmlFor="mini-odds" className="text-sm text-muted-foreground shrink-0">
          American odds:
        </label>
        <input
          id="mini-odds"
          type="number"
          value={odds}
          onChange={(e) => setOdds(e.target.value)}
          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="-110"
        />
      </div>
      {isValid ? (
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Implied probability: </span>
            <strong className="text-foreground">{(impliedProb * 100).toFixed(1)}%</strong>
          </div>
          <div>
            <span className="text-muted-foreground">$100 bet pays: </span>
            <strong className="text-foreground">${payout.toFixed(0)}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Profit: </span>
            <strong className="text-green-500">${(payout - 100).toFixed(0)}</strong>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Enter valid American odds (-100 or lower, or +100 or higher)
        </p>
      )}
    </div>
  )
}
