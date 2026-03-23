'use client'

import { useState, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  runSimulation,
  deriveConfigFromPicks,
  type SimulationConfig,
  type SimulationResult,
} from '@/lib/monte-carlo'

function StatCard({ label, value, subtext, color }: {
  label: string
  value: string
  subtext?: string
  color?: string
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${color ?? ''}`}>{value}</div>
      {subtext && <div className="text-[10px] text-muted-foreground">{subtext}</div>}
    </div>
  )
}

function TrajectoryChart({ result }: { result: SimulationResult }) {
  if (result.trajectories.length === 0) return null

  const allValues = result.trajectories.flatMap((t) => [t.p5, t.p95])
  const maxVal = Math.max(...allValues, result.config.startingBankroll * 1.1)
  const minVal = Math.min(...allValues, 0)
  const range = maxVal - minVal || 1

  const width = 600
  const height = 200
  const padL = 50
  const padR = 10
  const padT = 10
  const padB = 30
  const chartW = width - padL - padR
  const chartH = height - padT - padB

  const toX = (bet: number) => padL + (bet / result.config.numBets) * chartW
  const toY = (val: number) => padT + chartH - ((val - minVal) / range) * chartH

  const medianPath = result.trajectories.map((t, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(t.bet).toFixed(1)} ${toY(t.median).toFixed(1)}`
  ).join(' ')

  const bandPath =
    result.trajectories.map((t, i) =>
      `${i === 0 ? 'M' : 'L'} ${toX(t.bet).toFixed(1)} ${toY(t.p75).toFixed(1)}`
    ).join(' ') + ' ' +
    [...result.trajectories].reverse().map((t, i) =>
      `${i === 0 ? 'M' : 'L'} ${toX(t.bet).toFixed(1)} ${toY(t.p25).toFixed(1)}`
    ).join(' ').replace('M', 'L') + ' Z'

  const wideBandPath =
    result.trajectories.map((t, i) =>
      `${i === 0 ? 'M' : 'L'} ${toX(t.bet).toFixed(1)} ${toY(t.p95).toFixed(1)}`
    ).join(' ') + ' ' +
    [...result.trajectories].reverse().map((t, i) =>
      `${i === 0 ? 'M' : 'L'} ${toX(t.bet).toFixed(1)} ${toY(t.p5).toFixed(1)}`
    ).join(' ').replace('M', 'L') + ' Z'

  const startY = toY(result.config.startingBankroll)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      <line x1={padL} y1={startY} x2={width - padR} y2={startY}
        stroke="currentColor" strokeDasharray="4 4" opacity={0.2} />

      {/* 5-95 band */}
      <path d={wideBandPath} fill="currentColor" opacity={0.05} />

      {/* 25-75 band */}
      <path d={bandPath} fill="currentColor" opacity={0.1} />

      {/* Median line */}
      <path d={medianPath} fill="none" stroke="#22c55e" strokeWidth={2} />

      {/* Starting bankroll line */}
      <text x={padL - 4} y={startY + 3} textAnchor="end"
        fill="currentColor" opacity={0.4} fontSize={9}>{result.config.startingBankroll}u</text>

      {/* Axis labels */}
      <text x={width / 2} y={height - 4} textAnchor="middle"
        fill="currentColor" opacity={0.4} fontSize={10}>Bets</text>

      {/* End value labels */}
      {result.trajectories.length > 0 && (() => {
        const last = result.trajectories[result.trajectories.length - 1]
        return (
          <>
            <text x={width - padR + 2} y={toY(last.p95) + 3}
              fill="#22c55e" opacity={0.6} fontSize={8}>{last.p95.toFixed(0)}</text>
            <text x={width - padR + 2} y={toY(last.median) + 3}
              fill="#22c55e" fontSize={9} fontWeight="bold">{last.median.toFixed(0)}</text>
            <text x={width - padR + 2} y={toY(last.p5) + 3}
              fill="#ef4444" opacity={0.6} fontSize={8}>{last.p5.toFixed(0)}</text>
          </>
        )
      })()}
    </svg>
  )
}

export function MonteCarloSimulator() {
  const [config, setConfig] = useState<SimulationConfig>({
    startingBankroll: 100,
    winRate: 0.55,
    avgOdds: -110,
    unitSize: 1,
    numBets: 100,
    numSimulations: 1000,
  })
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [autoLoaded, setAutoLoaded] = useState(false)

  // Auto-derive config from picks
  const loadFromPicks = useCallback(async () => {
    try {
      const res = await fetch('/api/picks')
      const data = await res.json()
      if (res.ok && data.picks && data.picks.length > 0) {
        const derived = deriveConfigFromPicks(data.picks, config.startingBankroll, config.numBets)
        setConfig(derived)
        setAutoLoaded(true)
      }
    } catch {
      // silent — use defaults
    }
  }, [config.startingBankroll, config.numBets])

  useEffect(() => {
    loadFromPicks()
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRun = useCallback(() => {
    const sim = runSimulation(config)
    setResult(sim)
  }, [config])

  const updateField = (field: keyof SimulationConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
    setResult(null) // Clear stale result
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Monte Carlo Simulator</h3>
          <p className="text-sm text-muted-foreground">
            Project likely bankroll outcomes over future bets.
          </p>
        </div>
        {autoLoaded && (
          <Badge variant="secondary" className="text-xs">
            Auto-filled from history
          </Badge>
        )}
      </div>

      {/* Config inputs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Starting Bankroll (units)</label>
          <input
            type="number"
            value={config.startingBankroll}
            onChange={(e) => updateField('startingBankroll', Number(e.target.value))}
            className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono"
            min={1}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Win Rate (%)</label>
          <input
            type="number"
            value={Math.round(config.winRate * 100)}
            onChange={(e) => updateField('winRate', Number(e.target.value) / 100)}
            className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono"
            min={1}
            max={99}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Avg Odds (American)</label>
          <input
            type="number"
            value={config.avgOdds}
            onChange={(e) => updateField('avgOdds', Number(e.target.value))}
            className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Unit Size</label>
          <input
            type="number"
            value={config.unitSize}
            onChange={(e) => updateField('unitSize', Number(e.target.value))}
            className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono"
            min={0.5}
            step={0.5}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Future Bets</label>
          <input
            type="number"
            value={config.numBets}
            onChange={(e) => updateField('numBets', Number(e.target.value))}
            className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono"
            min={10}
            max={1000}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Simulations</label>
          <input
            type="number"
            value={config.numSimulations}
            onChange={(e) => updateField('numSimulations', Number(e.target.value))}
            className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono"
            min={100}
            max={5000}
            step={100}
          />
        </div>
      </div>

      <button
        onClick={handleRun}
        className="w-full rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        Run Simulation
      </button>

      {result && (
        <>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Median Final Bankroll"
              value={`${result.median.toFixed(1)}u`}
              color={result.median > config.startingBankroll ? 'text-green-500' : 'text-red-500'}
            />
            <StatCard
              label="Profit Probability"
              value={`${result.profitProbability.toFixed(1)}%`}
              color={result.profitProbability > 50 ? 'text-green-500' : 'text-red-500'}
            />
            <StatCard
              label="Ruin Risk"
              value={`${result.ruinProbability.toFixed(1)}%`}
              color={result.ruinProbability > 10 ? 'text-red-500' : 'text-green-500'}
              subtext="Chance of going bust"
            />
            <StatCard
              label="Expected ROI"
              value={`${result.expectedROI > 0 ? '+' : ''}${result.expectedROI.toFixed(1)}%`}
              color={result.expectedROI > 0 ? 'text-green-500' : 'text-red-500'}
            />
          </div>

          {/* Percentile range */}
          <div className="rounded-lg bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground mb-2">Bankroll Range (after {config.numBets} bets)</div>
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-red-400">{result.p5.toFixed(1)}u</span>
              <div className="flex-1 h-3 bg-muted/30 rounded-full relative overflow-hidden">
                <div
                  className="absolute h-full bg-red-500/30 rounded-l-full"
                  style={{ left: '0%', width: '5%' }}
                />
                <div
                  className="absolute h-full bg-yellow-500/30"
                  style={{ left: '5%', width: '20%' }}
                />
                <div
                  className="absolute h-full bg-green-500/40"
                  style={{ left: '25%', width: '50%' }}
                />
                <div
                  className="absolute h-full bg-yellow-500/30"
                  style={{ left: '75%', width: '20%' }}
                />
                <div
                  className="absolute h-full bg-green-500/30 rounded-r-full"
                  style={{ left: '95%', width: '5%' }}
                />
              </div>
              <span className="text-green-400">{result.p95.toFixed(1)}u</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-8">
              <span>5th %ile</span>
              <span>25th: {result.p25.toFixed(1)}u</span>
              <span>Median: {result.median.toFixed(1)}u</span>
              <span>75th: {result.p75.toFixed(1)}u</span>
              <span>95th %ile</span>
            </div>
          </div>

          {/* Trajectory chart */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Bankroll Trajectory (median + percentile bands)</div>
            <TrajectoryChart result={result} />
          </div>

          {/* Double probability */}
          <div className="text-sm text-muted-foreground">
            Chance of doubling your bankroll: <span className="font-semibold text-foreground">{result.doubleProbability.toFixed(1)}%</span>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/20 rounded p-2">
            For informational purposes only. Not financial advice. Results are based on simulated outcomes using your historical stats and do not guarantee future performance.
          </p>
        </>
      )}
    </div>
  )
}
