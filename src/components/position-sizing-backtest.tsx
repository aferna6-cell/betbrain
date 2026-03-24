'use client'

import { useState, useMemo, useEffect } from 'react'
import type { BacktestComparison, BacktestResult, StrategyConfig } from '@/lib/position-sizing-backtest'
import { compareStrategies, DEFAULT_STRATEGIES } from '@/lib/position-sizing-backtest'

interface PickForBacktest {
  id: string
  odds: number
  units: number
  result: 'win' | 'loss' | 'push'
  confidence?: number
  date?: string
}

function TrajectoryChart({ results, startingBankroll }: { results: BacktestResult[]; startingBankroll: number }) {
  const maxPicks = Math.max(...results.map(r => r.trajectory.length), 1)
  const allBankrolls = results.flatMap(r => r.trajectory.map(p => p.bankroll))
  const maxBankroll = Math.max(startingBankroll, ...allBankrolls) * 1.05
  const minBankroll = Math.min(startingBankroll, ...allBankrolls) * 0.95

  const W = 600
  const H = 250
  const PAD = { top: 20, right: 20, bottom: 30, left: 50 }

  const xScale = (i: number) => PAD.left + (i / maxPicks) * (W - PAD.left - PAD.right)
  const yScale = (v: number) => PAD.top + ((maxBankroll - v) / (maxBankroll - minBankroll)) * (H - PAD.top - PAD.bottom)

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      <line x1={PAD.left} y1={yScale(startingBankroll)} x2={W - PAD.right} y2={yScale(startingBankroll)} stroke="#374151" strokeDasharray="4" />
      <text x={PAD.left - 5} y={yScale(startingBankroll) + 4} textAnchor="end" fill="#6b7280" fontSize="9">
        {startingBankroll}
      </text>

      {/* Y axis labels */}
      {[minBankroll, maxBankroll].map(v => (
        <text key={v} x={PAD.left - 5} y={yScale(v) + 4} textAnchor="end" fill="#6b7280" fontSize="9">
          {Math.round(v)}
        </text>
      ))}

      {/* X axis label */}
      <text x={W / 2} y={H - 5} textAnchor="middle" fill="#6b7280" fontSize="9">Picks</text>

      {/* Trajectories */}
      {results.map((r, ri) => {
        if (r.trajectory.length === 0) return null
        const points = [
          { x: xScale(0), y: yScale(startingBankroll) },
          ...r.trajectory.map((p, i) => ({ x: xScale(i + 1), y: yScale(p.bankroll) })),
        ]
        const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
        return (
          <path
            key={ri}
            d={d}
            fill="none"
            stroke={colors[ri % colors.length]}
            strokeWidth="1.5"
            opacity="0.8"
          />
        )
      })}
    </svg>
  )
}

function ResultRow({ result, color }: { result: BacktestResult; color: string }) {
  const profitColor = result.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <tr className="border-b border-gray-800/50 text-xs">
      <td className="py-2 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-gray-300">{result.strategy.label}</span>
      </td>
      <td className={`text-right py-2 font-medium ${profitColor}`}>
        {result.totalProfit >= 0 ? '+' : ''}{result.totalProfit.toFixed(2)}
      </td>
      <td className={`text-right py-2 ${profitColor}`}>
        {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(1)}%
      </td>
      <td className="text-right py-2 text-gray-400">{result.finalBankroll.toFixed(2)}</td>
      <td className="text-right py-2 text-amber-400">{result.maxDrawdownPct.toFixed(1)}%</td>
      <td className="text-right py-2 text-gray-400">{result.sharpeRatio.toFixed(3)}</td>
      <td className="text-right py-2 text-gray-400">{result.wentBroke ? '💀' : '—'}</td>
    </tr>
  )
}

export function PositionSizingBacktestPanel({ picks }: { picks: PickForBacktest[] }) {
  const [bankroll, setBankroll] = useState(1000)
  const [selectedStrategies, setSelectedStrategies] = useState<number[]>([0, 1, 2, 3, 4])

  const strategies = DEFAULT_STRATEGIES
  const activeStrategies = selectedStrategies.map(i => strategies[i]).filter(Boolean)

  const comparison = useMemo(() => {
    if (picks.length === 0 || activeStrategies.length === 0) return null
    return compareStrategies(picks, bankroll, activeStrategies)
  }, [picks, bankroll, activeStrategies])

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

  if (picks.length < 5) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Position Sizing Backtest</h3>
        <p className="text-gray-500">Need at least 5 picks to run a meaningful backtest. You have {picks.length}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Position Sizing Backtest</h3>
        <p className="text-sm text-gray-400">
          Replay your {picks.length} picks with different staking strategies
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Starting Bankroll:</label>
          <input
            type="number"
            value={bankroll}
            onChange={e => setBankroll(Math.max(1, Number(e.target.value)))}
            className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {strategies.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelectedStrategies(prev =>
              prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
            )}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedStrategies.includes(i)
                ? 'text-white ring-1'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
            }`}
            style={selectedStrategies.includes(i) ? {
              backgroundColor: `${colors[selectedStrategies.indexOf(i) % colors.length]}20`,
              borderColor: colors[selectedStrategies.indexOf(i) % colors.length],
            } : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>

      {comparison && (
        <>
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <TrajectoryChart results={comparison.results} startingBankroll={bankroll} />
          </div>

          <div className="flex gap-3 text-sm">
            <div className="flex-1 bg-emerald-900/20 rounded-lg p-3 border border-emerald-800/30">
              <div className="text-emerald-400 text-xs font-medium">Best Strategy</div>
              <div className="text-white font-semibold">{comparison.bestStrategy}</div>
            </div>
            <div className="flex-1 bg-red-900/20 rounded-lg p-3 border border-red-800/30">
              <div className="text-red-400 text-xs font-medium">Worst Strategy</div>
              <div className="text-white font-semibold">{comparison.worstStrategy}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2">Strategy</th>
                  <th className="text-right py-2">Profit</th>
                  <th className="text-right py-2">ROI</th>
                  <th className="text-right py-2">Final</th>
                  <th className="text-right py-2">Max DD</th>
                  <th className="text-right py-2">Sharpe</th>
                  <th className="text-right py-2">Bust</th>
                </tr>
              </thead>
              <tbody>
                {comparison.results.map((r, i) => (
                  <ResultRow key={i} result={r} color={colors[i % colors.length]} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-[10px] text-gray-600 italic">
        For informational purposes only. Not financial advice. Past performance does not guarantee future results.
      </p>
    </div>
  )
}
