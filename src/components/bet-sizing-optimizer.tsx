'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  analyzeRecentPerformance,
  getOptimalSizing,
  getSizingHealth,
  type SizingRecommendation,
} from '@/lib/bet-sizing-optimizer'
import { getKellyConfig } from '@/lib/kelly-override'

export function BetSizingOptimizer() {
  const [bankroll, setBankroll] = useState(1000)
  const [unitSize, setUnitSize] = useState(10)
  const [picks, setPicks] = useState<Array<{
    outcome: string | null
    profit: number | null
    units: number
    odds: number
    game_date: string
  }>>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const config = localStorage.getItem('betbrain-bankroll-config')
      if (config) {
        const parsed = JSON.parse(config)
        if (parsed.startingBalance) setBankroll(parsed.startingBalance)
        if (parsed.unitSize) setUnitSize(parsed.unitSize)
      }
      const storedPicks = localStorage.getItem('betbrain-picks')
      if (storedPicks) setPicks(JSON.parse(storedPicks))
    } catch {
      // ignore
    }
  }, [])

  const kellyMultiplier = useMemo(() => {
    if (typeof window === 'undefined') return 0.25
    return getKellyConfig().multiplier
  }, [])

  const recentPerformance = useMemo(
    () => analyzeRecentPerformance(picks, 14),
    [picks]
  )

  const recommendation = useMemo(
    () => getOptimalSizing(bankroll, unitSize, kellyMultiplier, recentPerformance),
    [bankroll, unitSize, kellyMultiplier, recentPerformance]
  )

  const health = getSizingHealth(recommendation.sizingScore)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Bet Sizing Optimizer</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Smart unit sizing based on your recent performance, bankroll health, and Kelly settings.
        </p>
      </div>

      {/* Main recommendation */}
      <div className="rounded-lg border border-border bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Recommended Unit Size</div>
            <div className="text-3xl font-bold">${recommendation.adjustedUnitSize.toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Base: ${recommendation.baseUnitSize} &times; {recommendation.adjustmentFactor}x adjustment
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-semibold ${health.color}`}>{health.label}</div>
            <div className="text-2xl font-bold">{recommendation.sizingScore}</div>
            <div className="text-xs text-zinc-500">score</div>
          </div>
        </div>
        <p className="text-sm text-zinc-300 mt-3">{recommendation.reason}</p>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-2">
        {recommendation.factors.map((factor) => (
          <div key={factor.name} className="rounded-lg border border-border bg-zinc-900/50 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{factor.name}</span>
              <span className="text-sm text-zinc-400">
                {factor.score}/100
                <span className="text-zinc-600 text-xs ml-1">
                  ({(factor.weight * 100).toFixed(0)}% weight)
                </span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  factor.score >= 70
                    ? 'bg-green-500'
                    : factor.score >= 50
                      ? 'bg-blue-500'
                      : factor.score >= 30
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                }`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 mt-1">{factor.detail}</div>
          </div>
        ))}
      </div>

      {/* Recent performance snapshot */}
      {recentPerformance.totalPicks > 0 && (
        <div className="rounded-lg border border-border bg-zinc-900 p-3">
          <div className="text-xs font-medium text-zinc-400 mb-2">Last 14 Days</div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold">{recentPerformance.totalPicks}</div>
              <div className="text-xs text-zinc-500">Picks</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {(recentPerformance.winRate * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-zinc-500">Win Rate</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${recentPerformance.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {recentPerformance.roi >= 0 ? '+' : ''}{recentPerformance.roi.toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-500">ROI</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${recentPerformance.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {recentPerformance.netProfit >= 0 ? '+' : ''}{recentPerformance.netProfit.toFixed(1)}u
              </div>
              <div className="text-xs text-zinc-500">Net P/L</div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500 italic">
        For informational purposes only. Not financial advice.
        Adjustments are suggestions based on recent history — always use your own judgment.
      </p>
    </div>
  )
}
