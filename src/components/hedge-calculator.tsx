'use client'

import { useState, useMemo } from 'react'
import { calculateHedge, calculatePayout, type HedgeBet } from '@/lib/bet-calculator'
import { getBestMoneyline, formatOdds } from '@/lib/odds'
import type { NormalizedGame } from '@/lib/sports/config'

interface HedgeCalculatorProps {
  game: NormalizedGame
}

export function HedgeCalculator({ game }: HedgeCalculatorProps) {
  const [originalSide, setOriginalSide] = useState<'home' | 'away'>('away')
  const [originalOdds, setOriginalOdds] = useState('')
  const [originalWager, setOriginalWager] = useState('')
  const [hedgeOdds, setHedgeOdds] = useState('')

  // Pre-populate hedge odds from best available line
  const bestHomeML = getBestMoneyline(game.bookmakers, 'home')
  const bestAwayML = getBestMoneyline(game.bookmakers, 'away')

  function handleSideChange(side: 'home' | 'away') {
    setOriginalSide(side)
    // Auto-populate hedge odds from best line on opposite side
    if (side === 'home' && bestAwayML !== null) {
      setHedgeOdds(String(bestAwayML))
    } else if (side === 'away' && bestHomeML !== null) {
      setHedgeOdds(String(bestHomeML))
    }
  }

  function prefillFromLine(side: 'home' | 'away') {
    const best = side === 'home' ? bestHomeML : bestAwayML
    if (best !== null) {
      setOriginalSide(side)
      setOriginalOdds(String(best))
      // Hedge is the other side
      const hedgeBest = side === 'home' ? bestAwayML : bestHomeML
      if (hedgeBest !== null) setHedgeOdds(String(hedgeBest))
    }
  }

  const hedge = useMemo<HedgeBet | null>(() => {
    const wager = parseFloat(originalWager)
    const origOdds = parseInt(originalOdds)
    const hOdds = parseInt(hedgeOdds)

    if (!wager || wager <= 0 || !origOdds || !hOdds) return null
    if (origOdds === 0 || hOdds === 0) return null
    if (origOdds > -100 && origOdds < 100) return null
    if (hOdds > -100 && hOdds < 100) return null

    try {
      return calculateHedge(wager, origOdds, hOdds)
    } catch {
      return null
    }
  }, [originalWager, originalOdds, hedgeOdds])

  const originalPayout = useMemo(() => {
    const wager = parseFloat(originalWager)
    const odds = parseInt(originalOdds)
    if (!wager || wager <= 0 || !odds) return null
    if (odds > -100 && odds < 100) return null
    try {
      return calculatePayout(wager, odds)
    } catch {
      return null
    }
  }, [originalWager, originalOdds])

  const hedgeSide = originalSide === 'home' ? 'away' : 'home'
  const originalTeam = originalSide === 'home' ? game.homeTeam : game.awayTeam
  const hedgeTeam = hedgeSide === 'home' ? game.homeTeam : game.awayTeam

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold">Hedge Calculator</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Calculate the optimal hedge bet to lock in profit regardless of outcome.
        </p>
      </div>

      {/* Quick-fill buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-400">Quick fill:</span>
        {bestHomeML !== null && (
          <button
            onClick={() => prefillFromLine('home')}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors"
          >
            I bet {game.homeTeam} ({formatOdds(bestHomeML)})
          </button>
        )}
        {bestAwayML !== null && (
          <button
            onClick={() => prefillFromLine('away')}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors"
          >
            I bet {game.awayTeam} ({formatOdds(bestAwayML)})
          </button>
        )}
      </div>

      {/* Input form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Original bet */}
        <div className="space-y-3 rounded-lg border border-border bg-zinc-900 p-4">
          <h4 className="text-sm font-semibold text-blue-400">Your Original Bet</h4>

          <div className="flex gap-2">
            <button
              onClick={() => handleSideChange('home')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                originalSide === 'home'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'border border-border hover:bg-zinc-800'
              }`}
            >
              {game.homeTeam}
            </button>
            <button
              onClick={() => handleSideChange('away')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                originalSide === 'away'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'border border-border hover:bg-zinc-800'
              }`}
            >
              {game.awayTeam}
            </button>
          </div>

          <div>
            <label className="text-xs text-zinc-400">Wager Amount ($)</label>
            <input
              type="number"
              value={originalWager}
              onChange={(e) => setOriginalWager(e.target.value)}
              placeholder="100"
              min="1"
              className="mt-1 w-full rounded-md border border-border bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Odds (American)</label>
            <input
              type="number"
              value={originalOdds}
              onChange={(e) => setOriginalOdds(e.target.value)}
              placeholder="-150"
              className="mt-1 w-full rounded-md border border-border bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {originalPayout && (
            <div className="text-xs text-zinc-400">
              Potential payout: <span className="text-green-400 font-medium">${originalPayout.totalPayout.toFixed(2)}</span>
              {' '}(profit: ${originalPayout.profit.toFixed(2)})
            </div>
          )}
        </div>

        {/* Hedge bet */}
        <div className="space-y-3 rounded-lg border border-border bg-zinc-900 p-4">
          <h4 className="text-sm font-semibold text-orange-400">Hedge Bet</h4>

          <div className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-300">
            {hedgeTeam}
          </div>

          <div>
            <label className="text-xs text-zinc-400">
              Hedge Odds (American)
              {hedgeSide === 'home' && bestHomeML !== null && (
                <button
                  onClick={() => setHedgeOdds(String(bestHomeML))}
                  className="ml-2 text-blue-400 hover:underline"
                >
                  Use best: {formatOdds(bestHomeML)}
                </button>
              )}
              {hedgeSide === 'away' && bestAwayML !== null && (
                <button
                  onClick={() => setHedgeOdds(String(bestAwayML))}
                  className="ml-2 text-blue-400 hover:underline"
                >
                  Use best: {formatOdds(bestAwayML)}
                </button>
              )}
            </label>
            <input
              type="number"
              value={hedgeOdds}
              onChange={(e) => setHedgeOdds(e.target.value)}
              placeholder="+130"
              className="mt-1 w-full rounded-md border border-border bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {hedge && (
        <div className="rounded-lg border border-border bg-zinc-900 p-4 space-y-4">
          <h4 className="text-sm font-semibold">Hedge Results</h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard
              label="Hedge Wager"
              value={`$${hedge.hedgeWager.toFixed(2)}`}
              color="text-orange-400"
            />
            <ResultCard
              label="Total Outlay"
              value={`$${hedge.totalOutlay.toFixed(2)}`}
              color="text-zinc-300"
            />
            <ResultCard
              label="Guaranteed Profit"
              value={`$${hedge.guaranteedProfit.toFixed(2)}`}
              color={hedge.guaranteedProfit >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <ResultCard
              label="ROI"
              value={`${hedge.roi >= 0 ? '+' : ''}${hedge.roi.toFixed(1)}%`}
              color={hedge.roi >= 0 ? 'text-green-400' : 'text-red-400'}
            />
          </div>

          {/* Scenario breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
              <div className="text-xs text-blue-400 font-medium mb-1">
                If {originalTeam} wins
              </div>
              <div className="text-lg font-bold text-zinc-100">
                ${hedge.ifOriginalWins.payout.toFixed(2)} payout
              </div>
              <div className={`text-sm ${hedge.ifOriginalWins.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {hedge.ifOriginalWins.profit >= 0 ? '+' : ''}${hedge.ifOriginalWins.profit.toFixed(2)} profit
              </div>
            </div>
            <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-3">
              <div className="text-xs text-orange-400 font-medium mb-1">
                If {hedgeTeam} wins
              </div>
              <div className="text-lg font-bold text-zinc-100">
                ${hedge.ifHedgeWins.payout.toFixed(2)} payout
              </div>
              <div className={`text-sm ${hedge.ifHedgeWins.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {hedge.ifHedgeWins.profit >= 0 ? '+' : ''}${hedge.ifHedgeWins.profit.toFixed(2)} profit
              </div>
            </div>
          </div>

          {hedge.guaranteedProfit < 0 && (
            <div className="text-xs text-amber-400 bg-amber-500/10 rounded-md p-2">
              Warning: This hedge results in a guaranteed loss. The combined vig is too high to lock in profit.
              Consider waiting for better odds or adjusting your hedge amount.
            </div>
          )}
        </div>
      )}

      {!hedge && originalWager && originalOdds && hedgeOdds && (
        <div className="text-sm text-zinc-500 text-center py-4">
          Enter valid American odds (e.g., -150 or +130) and a wager amount to calculate.
        </div>
      )}

      <p className="text-xs text-zinc-500 italic">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function ResultCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}
