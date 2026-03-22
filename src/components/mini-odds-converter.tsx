'use client'

import { useState } from 'react'
import { americanToDecimal, americanToFractional } from '@/lib/odds'

/**
 * Compact interactive odds converter for embedding in educational content.
 * Shows American odds → decimal, fractional, implied probability, and payout.
 */
export function MiniOddsConverter() {
  const [odds, setOdds] = useState('-110')

  const numOdds = Number(odds)
  const isValid = !isNaN(numOdds) && numOdds !== 0 && (numOdds <= -100 || numOdds >= 100)

  let impliedProb = 0
  let payout = 0
  let decimal = ''
  let fractional = ''
  if (isValid) {
    if (numOdds < 0) {
      impliedProb = Math.abs(numOdds) / (Math.abs(numOdds) + 100)
      payout = 100 + (100 / Math.abs(numOdds)) * 100
    } else {
      impliedProb = 100 / (numOdds + 100)
      payout = 100 + numOdds
    }
    decimal = americanToDecimal(numOdds).toFixed(2)
    fractional = americanToFractional(numOdds)
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
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Decimal</span>
            <p className="font-mono font-medium">{decimal}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Fractional</span>
            <p className="font-mono font-medium">{fractional}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Implied probability</span>
            <p className="font-mono font-medium">{(impliedProb * 100).toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">$100 bet pays</span>
            <p className="font-mono font-medium">${payout.toFixed(0)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Profit</span>
            <p className="font-mono font-medium text-green-500">${(payout - 100).toFixed(0)}</p>
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
