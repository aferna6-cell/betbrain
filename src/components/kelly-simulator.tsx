'use client'

import { useState, useMemo } from 'react'
import { runKellySimulation, type KellySimResult, type KellyTrajectory } from '@/lib/kelly-simulator'

const TRAJECTORY_COLORS = [
  '#6b7280', // gray (flat)
  '#3b82f6', // blue (quarter)
  '#10b981', // emerald (half)
  '#f59e0b', // amber (three-quarter)
  '#ef4444', // red (full)
]

function formatCurrency(n: number): string {
  if (n >= 10000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function MiniChart({ trajectories, numBets }: { trajectories: KellyTrajectory[]; numBets: number }) {
  const width = 600
  const height = 200
  const padding = { top: 10, right: 10, bottom: 20, left: 50 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  // Find y range across all trajectories
  const allValues = trajectories.flatMap((t) => t.medianPath)
  const minY = Math.min(...allValues) * 0.9
  const maxY = Math.max(...allValues) * 1.1

  const xScale = (i: number) => padding.left + (i / numBets) * innerW
  const yScale = (v: number) => padding.top + innerH - ((v - minY) / (maxY - minY || 1)) * innerH

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const val = minY + pct * (maxY - minY)
        return (
          <text
            key={pct}
            x={padding.left - 5}
            y={yScale(val)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-zinc-600 text-[9px]"
          >
            {formatCurrency(val)}
          </text>
        )
      })}

      {/* Starting line */}
      <line
        x1={padding.left}
        y1={yScale(trajectories[0]?.medianPath[0] ?? 0)}
        x2={width - padding.right}
        y2={yScale(trajectories[0]?.medianPath[0] ?? 0)}
        stroke="#3f3f46"
        strokeDasharray="4,4"
      />

      {/* Trajectory lines */}
      {trajectories.map((t, idx) => {
        const d = t.medianPath
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`)
          .join(' ')
        return (
          <path
            key={t.label}
            d={d}
            fill="none"
            stroke={TRAJECTORY_COLORS[idx % TRAJECTORY_COLORS.length]}
            strokeWidth={2}
            opacity={0.8}
          />
        )
      })}

      {/* X-axis label */}
      <text
        x={width / 2}
        y={height - 2}
        textAnchor="middle"
        className="fill-zinc-600 text-[9px]"
      >
        Bets
      </text>
    </svg>
  )
}

export function KellySimulatorPanel() {
  const [bankroll, setBankroll] = useState('1000')
  const [numBets, setNumBets] = useState('200')
  const [winRate, setWinRate] = useState('55')
  const [avgOdds, setAvgOdds] = useState('-110')
  const [result, setResult] = useState<KellySimResult | null>(null)

  const handleRun = () => {
    const config = {
      startingBankroll: parseFloat(bankroll) || 1000,
      numBets: parseInt(numBets) || 200,
      winRate: (parseFloat(winRate) || 55) / 100,
      avgOdds: parseInt(avgOdds) || -110,
      simulations: 200,
      seed: Date.now(),
    }
    setResult(runKellySimulation(config))
  }

  // Auto-run with defaults on mount
  const defaultResult = useMemo(() => {
    return runKellySimulation({
      startingBankroll: 1000,
      numBets: 200,
      winRate: 0.55,
      avgOdds: -110,
      simulations: 200,
      seed: 42,
    })
  }, [])

  const display = result ?? defaultResult

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-5">
      {/* Config */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Bankroll ($)</label>
          <input
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Bets to Sim</label>
          <input
            type="number"
            value={numBets}
            onChange={(e) => setNumBets(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Win Rate (%)</label>
          <input
            type="number"
            value={winRate}
            onChange={(e) => setWinRate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Avg Odds</label>
          <input
            type="number"
            value={avgOdds}
            onChange={(e) => setAvgOdds(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
          />
        </div>
      </div>

      <button
        onClick={handleRun}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
      >
        Run Simulation
      </button>

      {/* Full Kelly info */}
      <div className="text-xs text-zinc-500">
        Full Kelly fraction: <span className="text-zinc-300">{(display.fullKellyFraction * 100).toFixed(2)}%</span> of bankroll per bet
      </div>

      {/* Chart */}
      <MiniChart trajectories={display.trajectories} numBets={display.config.numBets} />

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {display.trajectories.map((t, idx) => (
          <div key={t.label} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-3 h-1 rounded-full"
              style={{ backgroundColor: TRAJECTORY_COLORS[idx % TRAJECTORY_COLORS.length] }}
            />
            <span className="text-zinc-400">{t.label}</span>
          </div>
        ))}
      </div>

      {/* Results table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-500 py-2 pr-4">Strategy</th>
              <th className="text-right text-zinc-500 py-2 px-2">Fraction</th>
              <th className="text-right text-zinc-500 py-2 px-2">Median</th>
              <th className="text-right text-zinc-500 py-2 px-2">Worst 5%</th>
              <th className="text-right text-zinc-500 py-2 px-2">Best 5%</th>
              <th className="text-right text-zinc-500 py-2 px-2">Ruin %</th>
              <th className="text-right text-zinc-500 py-2 px-2">Max DD</th>
            </tr>
          </thead>
          <tbody>
            {display.trajectories.map((t, idx) => (
              <tr key={t.label} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: TRAJECTORY_COLORS[idx % TRAJECTORY_COLORS.length] }}
                    />
                    <span className="text-zinc-300">{t.label}</span>
                  </div>
                </td>
                <td className="text-right text-zinc-400 py-2 px-2">{(t.fraction * 100).toFixed(1)}%</td>
                <td className={`text-right py-2 px-2 ${t.medianFinal > display.config.startingBankroll ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(t.medianFinal)}
                </td>
                <td className={`text-right py-2 px-2 ${t.p5Final > display.config.startingBankroll ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(t.p5Final)}
                </td>
                <td className="text-right text-emerald-400 py-2 px-2">{formatCurrency(t.p95Final)}</td>
                <td className={`text-right py-2 px-2 ${t.ruinProbability > 5 ? 'text-red-400' : t.ruinProbability > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {t.ruinProbability.toFixed(1)}%
                </td>
                <td className="text-right text-zinc-400 py-2 px-2">{t.avgMaxDrawdown.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendation */}
      <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded px-3 py-2">
        {display.recommendation}
      </p>
    </div>
  )
}
