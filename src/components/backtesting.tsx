'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { BacktestConfig, BacktestResult, BacktestGame } from '@/lib/backtesting'

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return value < 0 ? `-$${formatted}` : `$${formatted}`
}

function SummaryCard({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string
  value: string
  subtext?: string
  highlight?: 'green' | 'red' | 'yellow' | 'neutral'
}) {
  const valueColor =
    highlight === 'green'
      ? 'text-green-400'
      : highlight === 'red'
        ? 'text-red-400'
        : highlight === 'yellow'
          ? 'text-yellow-400'
          : 'text-foreground'

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold font-mono ${valueColor}`}>{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  )
}

function ResultRow({ game, index }: { game: BacktestGame; index: number }) {
  const resultColor =
    game.result === 'win'
      ? 'text-green-400'
      : game.result === 'loss'
        ? 'text-red-400'
        : 'text-yellow-400'

  const profitColor = game.profit > 0 ? 'text-green-400' : game.profit < 0 ? 'text-red-400' : 'text-yellow-400'

  return (
    <tr className={index % 2 === 0 ? 'bg-muted/10' : ''}>
      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{game.date}</td>
      <td className="px-3 py-2 text-xs">
        <span className="text-muted-foreground">{game.awayTeam}</span>
        <span className="mx-1 text-muted-foreground/50">@</span>
        <span>{game.homeTeam}</span>
      </td>
      <td className="px-3 py-2 text-xs text-center capitalize">{game.side}</td>
      <td className="px-3 py-2 text-xs text-center font-mono">{formatOdds(game.odds)}</td>
      <td className="px-3 py-2 text-xs text-center">
        <span className={`font-semibold uppercase ${resultColor}`}>{game.result}</span>
      </td>
      <td className={`px-3 py-2 text-xs text-right font-mono ${profitColor}`}>
        {game.profit >= 0 ? '+' : ''}{formatCurrency(game.profit)}
      </td>
      <td className="px-3 py-2 text-xs text-right font-mono text-muted-foreground">
        {formatCurrency(game.runningBankroll)}
      </td>
    </tr>
  )
}

function BacktestResults({ result }: { result: BacktestResult }) {
  const { summary } = result
  const roiHighlight: 'green' | 'red' = summary.roi >= 0 ? 'green' : 'red'
  const profitHighlight: 'green' | 'red' = summary.totalProfit >= 0 ? 'green' : 'red'

  // Show most recent 20 games (last 20 entries in array)
  const recentGames = result.games.slice(-20)

  return (
    <div className="space-y-6">
      {/* Summary cards — top row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Win Rate"
          value={`${summary.winRate}%`}
          subtext={`${summary.wins}W / ${summary.losses}L${summary.pushes > 0 ? ` / ${summary.pushes}P` : ''}`}
          highlight={summary.winRate >= 52 ? 'green' : 'red'}
        />
        <SummaryCard
          label="ROI"
          value={`${summary.roi >= 0 ? '+' : ''}${summary.roi}%`}
          subtext={`On $${summary.totalWagered.toLocaleString()} wagered`}
          highlight={roiHighlight}
        />
        <SummaryCard
          label="Total Profit"
          value={`${summary.totalProfit >= 0 ? '+' : ''}${formatCurrency(summary.totalProfit)}`}
          subtext={`${summary.totalGames} games tracked`}
          highlight={profitHighlight}
        />
        <SummaryCard
          label="Final Bankroll"
          value={formatCurrency(summary.finalBankroll)}
          subtext={`Peak: ${formatCurrency(summary.peakBankroll)}`}
          highlight={summary.finalBankroll >= result.config.startingBankroll ? 'green' : 'red'}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Max Drawdown</p>
          <p className="mt-1 font-mono text-lg font-semibold text-red-400">
            -{formatCurrency(summary.maxDrawdown)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Best Streak</p>
          <p className="mt-1 font-mono text-lg font-semibold text-green-400">
            {summary.bestStreak} wins
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Worst Streak</p>
          <p className="mt-1 font-mono text-lg font-semibold text-red-400">
            {summary.worstStreak} losses
          </p>
        </div>
      </div>

      {/* Recent games table */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          Last {recentGames.length} Games
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Matchup</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Side</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Odds</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Result</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Profit</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Bankroll</th>
              </tr>
            </thead>
            <tbody>
              {recentGames.map((game, i) => (
                <ResultRow key={i} game={game} index={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy + config info */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Config:</span>
        <Badge variant="outline" className="text-xs capitalize">{result.config.sport.toUpperCase()}</Badge>
        <Badge variant="outline" className="text-xs">{result.config.season}</Badge>
        <Badge variant="secondary" className="text-xs capitalize">
          {result.config.strategy.replace('-', ' ')}
        </Badge>
        <Badge variant="outline" className="text-xs">${result.config.unitSize}/unit</Badge>
      </div>

      {/* Disclaimer */}
      <p className="border-t border-border pt-3 text-xs italic text-muted-foreground">
        {result.disclaimer}
      </p>
    </div>
  )
}

const DEFAULT_CONFIG: BacktestConfig = {
  sport: 'nba',
  season: '2024-25',
  strategy: 'smart-signals',
  unitSize: 100,
  startingBankroll: 1000,
}

export function BacktestForm() {
  const [config, setConfig] = useState<BacktestConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/backtesting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Backtest failed')
        return
      }
      setResult(data as BacktestResult)
    } catch {
      setError('Failed to run backtest. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sport */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Sport
            </label>
            <select
              value={config.sport}
              onChange={(e) => setConfig({ ...config, sport: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="nba">NBA</option>
              <option value="nfl">NFL</option>
              <option value="mlb">MLB</option>
              <option value="nhl">NHL</option>
            </select>
          </div>

          {/* Season */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Season
            </label>
            <select
              value={config.season}
              onChange={(e) => setConfig({ ...config, season: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Strategy
            </label>
            <select
              value={config.strategy}
              onChange={(e) =>
                setConfig({ ...config, strategy: e.target.value as BacktestConfig['strategy'] })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="smart-signals">Smart Signals</option>
              <option value="high-confidence">High Confidence</option>
              <option value="value-plays">Value Plays</option>
            </select>
          </div>

          {/* Unit Size */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Unit Size ($)
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={config.unitSize}
              onChange={(e) =>
                setConfig({ ...config, unitSize: parseInt(e.target.value, 10) || 100 })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Starting Bankroll */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Starting Bankroll ($)
            </label>
            <input
              type="number"
              min={100}
              max={1000000}
              value={config.startingBankroll}
              onChange={(e) =>
                setConfig({
                  ...config,
                  startingBankroll: parseInt(e.target.value, 10) || 1000,
                })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Strategy descriptions */}
        <div className="rounded-md bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {config.strategy === 'smart-signals' && (
            <span>Smart Signals: ~55-58% win rate on all qualifying games. Highest volume.</span>
          )}
          {config.strategy === 'high-confidence' && (
            <span>High Confidence: ~52-54% win rate, selective (~40% of games). Higher precision, lower volume.</span>
          )}
          {config.strategy === 'value-plays' && (
            <span>Value Plays: ~50-53% win rate on ~70% of games. Balanced approach targeting mispriced lines.</span>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Running backtest...' : 'Run Backtest'}
        </Button>
      </form>

      {result && <BacktestResults result={result} />}
    </div>
  )
}
