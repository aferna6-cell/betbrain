'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast'
import { calculateBankrollStats, kellyCriterion, type BankrollStats, type BankrollConfig } from '@/lib/bankroll'
import { profitColor } from '@/lib/format'

const STORAGE_KEY = 'betbrain-bankroll-config'

function getStoredConfig(): BankrollConfig {
  if (typeof window === 'undefined') return { startingBalance: 1000, unitSize: 10 }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as BankrollConfig
  } catch { /* ignore */ }
  return { startingBalance: 1000, unitSize: 10 }
}

function storeConfig(config: BankrollConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

// ---------------------------------------------------------------------------
// Config Form
// ---------------------------------------------------------------------------

function ConfigForm({
  config,
  onSave,
}: {
  config: BankrollConfig
  onSave: (config: BankrollConfig) => void
}) {
  const [starting, setStarting] = useState(config.startingBalance.toString())
  const [unit, setUnit] = useState(config.unitSize.toString())

  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Bankroll Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Set your starting balance and unit size. Stored locally in your browser.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Starting Balance ($)</label>
          <input
            type="number"
            min="1"
            value={starting}
            onChange={(e) => setStarting(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Unit Size ($)</label>
          <input
            type="number"
            min="1"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => {
              const s = Number(starting)
              const u = Number(unit)
              if (s > 0 && u > 0) {
                onSave({ startingBalance: s, unitSize: u })
              }
            }}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------

function StatsCards({ stats, config }: { stats: BankrollStats; config: BankrollConfig }) {
  const profitCls = profitColor(stats.totalProfit)
  const balanceCls = profitColor(stats.currentBalance - stats.startingBalance)
  const kellyExample = kellyCriterion(0.55, -110) // 55% edge at -110
  const kellyUnits = Math.max(1, Math.round(kellyExample * stats.currentBalance / config.unitSize * 10) / 10)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Current Balance</p>
        <p className={`mt-1 text-2xl font-bold ${balanceCls}`}>
          ${stats.currentBalance.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Started: ${stats.startingBalance.toLocaleString()}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Total Profit</p>
        <p className={`mt-1 text-2xl font-bold ${profitCls}`}>
          {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          ROI: {stats.roi >= 0 ? '+' : ''}{stats.roi}%
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Max Drawdown</p>
        <p className="mt-1 text-2xl font-bold text-red-500">
          ${stats.maxDrawdown.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {stats.maxDrawdownPct}% from peak (${stats.peakBalance.toLocaleString()})
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Streaks</p>
        <p className="mt-1 text-lg font-semibold">
          <span className="text-green-500">W{stats.bestStreak}</span>
          {' / '}
          <span className="text-red-500">L{Math.abs(stats.worstStreak)}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Current: {stats.currentStreak >= 0 ? `W${stats.currentStreak}` : `L${Math.abs(stats.currentStreak)}`}
        </p>
      </div>

      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 sm:col-span-2 lg:col-span-4">
        <p className="text-sm text-purple-400">Kelly Criterion Guidance</p>
        <p className="mt-1 text-sm text-muted-foreground">
          At 55% win rate with -110 odds, Kelly suggests betting{' '}
          <span className="font-semibold text-purple-400">{(kellyExample * 100).toFixed(1)}%</span> of bankroll
          ({' '}
          <span className="font-semibold text-purple-400">{kellyUnits} units</span> at ${config.unitSize}/unit).
          Most sharps use half-Kelly or quarter-Kelly for safety.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Balance History Table
// ---------------------------------------------------------------------------

function BalanceHistory({ snapshots }: { snapshots: BankrollStats['snapshots'] }) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No resolved picks yet. Log picks and mark outcomes to see your bankroll history.
        </p>
      </div>
    )
  }

  // Show last 20
  const recent = snapshots.slice(-20).reverse()

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Recent Balance History</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Before</th>
              <th className="px-4 py-3 font-medium text-right">P/L</th>
              <th className="px-4 py-3 font-medium text-right">After</th>
              <th className="px-4 py-3 font-medium text-right">Running P/L</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((snap) => (
              <tr key={snap.pickId} className="border-b border-border/50 bg-card/50">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(snap.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  ${snap.balanceBefore.toLocaleString()}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${profitColor(snap.profit)}`}>
                  {snap.profit >= 0 ? '+' : ''}${snap.profit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold">
                  ${snap.balanceAfter.toLocaleString()}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${profitColor(snap.runningProfit)}`}>
                  {snap.runningProfit >= 0 ? '+' : ''}${snap.runningProfit.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function BankrollDashboard() {
  const [config, setConfig] = useState<BankrollConfig>(getStoredConfig)
  const [stats, setStats] = useState<BankrollStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  const fetchAndCalculate = useCallback(async (cfg: BankrollConfig) => {
    setError(null)
    try {
      const res = await fetch('/api/picks')
      const data = await res.json()
      if (res.ok) {
        const bankrollStats = calculateBankrollStats(data.picks, cfg)
        setStats(bankrollStats)
      } else {
        setError('Failed to load picks')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAndCalculate(config)
  }, [fetchAndCalculate, config])

  function handleSaveConfig(newConfig: BankrollConfig) {
    storeConfig(newConfig)
    setConfig(newConfig)
    addToast('Bankroll settings saved', 'success')
  }

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading bankroll data...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={() => fetchAndCalculate(config)}
          className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ConfigForm config={config} onSave={handleSaveConfig} />
      {stats && (
        <>
          <StatsCards stats={stats} config={config} />
          <BalanceHistory snapshots={stats.snapshots} />
        </>
      )}
    </div>
  )
}
