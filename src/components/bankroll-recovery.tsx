'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { calculateRecovery, type RecoveryInput, type RecoveryResult } from '@/lib/bankroll-recovery'

// ---------------------------------------------------------------------------
// Bankroll Recovery Calculator UI
// ---------------------------------------------------------------------------

function getBankrollConfig(): { bankroll: number; unitSize: number } {
  if (typeof window === 'undefined') return { bankroll: 1000, unitSize: 10 }
  try {
    const stored = localStorage.getItem('betbrain-bankroll-config')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        bankroll: parsed.bankroll ?? 1000,
        unitSize: parsed.unitSize ?? 10,
      }
    }
  } catch { /* ignore */ }
  return { bankroll: 1000, unitSize: 10 }
}

export function BankrollRecoveryCalculator() {
  const [config, setConfig] = useState({ bankroll: 1000, unitSize: 10 })
  const [peak, setPeak] = useState(1200)
  const [winRate, setWinRate] = useState(52)
  const [avgOdds, setAvgOdds] = useState(-110)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    const c = getBankrollConfig()
    setConfig(c)
    // Estimate peak as 120% of current if we don't have historical data
    setPeak(Math.round(c.bankroll * 1.2))
  }, [])

  const result = useMemo<RecoveryResult | null>(() => {
    if (!showResult) return null
    const input: RecoveryInput = {
      current: config.bankroll,
      peak,
      winRate: winRate / 100,
      avgOdds,
      unitSize: config.unitSize,
    }
    return calculateRecovery(input)
  }, [showResult, config.bankroll, config.unitSize, peak, winRate, avgOdds])

  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold">Recovery Calculator</h3>
      <p className="text-sm text-muted-foreground">
        Estimate how many bets it takes to recover from a drawdown based on your win rate and average odds.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Current Bankroll ($)</label>
          <input
            type="number"
            value={config.bankroll}
            onChange={(e) => setConfig({ ...config, bankroll: Number(e.target.value) || 0 })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Peak Bankroll ($)</label>
          <input
            type="number"
            value={peak}
            onChange={(e) => setPeak(Number(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Win Rate (%)</label>
          <input
            type="number"
            value={winRate}
            min={0}
            max={100}
            onChange={(e) => setWinRate(Number(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Avg Odds (American)</label>
          <input
            type="number"
            value={avgOdds}
            onChange={(e) => setAvgOdds(Number(e.target.value) || -110)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Unit Size ($)</label>
          <input
            type="number"
            value={config.unitSize}
            onChange={(e) => setConfig({ ...config, unitSize: Number(e.target.value) || 1 })}
            className={inputClass}
          />
        </div>
      </div>

      <Button onClick={() => setShowResult(true)} className="w-full sm:w-auto">
        Calculate Recovery Plan
      </Button>

      {result && result.deficit > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/50">
          {/* Drawdown summary */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            <div className="rounded border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Drawdown</p>
              <p className="text-lg font-bold text-red-400">
                -${result.deficit.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.drawdownPct}% from peak
              </p>
            </div>
            <div className="rounded border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Expected Bets</p>
              <p className="text-lg font-bold">
                {result.expectedBets >= 999 ? 'N/A' : result.expectedBets}
              </p>
              <p className="text-xs text-muted-foreground">
                at your current rate
              </p>
            </div>
            <div className="rounded border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Profit/Bet</p>
              <p className={`text-lg font-bold ${result.expectedProfitPerBet > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {result.expectedProfitPerBet > 0 ? '+' : ''}{result.expectedProfitPerBet.toFixed(3)}u
              </p>
              <p className="text-xs text-muted-foreground">
                expected value
              </p>
            </div>
          </div>

          {/* Scenario comparison */}
          <div className="rounded border border-border/50 p-4">
            <h4 className="text-sm font-semibold mb-3">Scenarios</h4>
            <div className="space-y-2">
              <ScenarioRow
                label="Optimistic"
                detail={`${winRate + 5}% win rate`}
                bets={result.optimisticBets}
                color="text-green-400"
              />
              <ScenarioRow
                label="Expected"
                detail={`${winRate}% win rate`}
                bets={result.expectedBets}
                color="text-foreground"
              />
              <ScenarioRow
                label="Pessimistic"
                detail={`${winRate - 5}% win rate`}
                bets={result.pessimisticBets}
                color="text-red-400"
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded border border-border/50 p-4">
            <h4 className="text-sm font-semibold mb-3">Estimated Timeline</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">At 2 bets/day</p>
                <p className="font-medium">
                  {result.daysAt2Bets >= 999 ? 'N/A' : `~${result.daysAt2Bets} days`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">At 5 bets/day</p>
                <p className="font-medium">
                  {result.daysAt5Bets >= 999 ? 'N/A' : `~${result.daysAt5Bets} days`}
                </p>
              </div>
            </div>
          </div>

          {/* Recovery probability */}
          <div className="rounded border border-border/50 p-4">
            <h4 className="text-sm font-semibold mb-3">Recovery Probability</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Within 50 bets</p>
                <ProbabilityBar pct={result.recoveryProbability50} />
              </div>
              <div>
                <p className="text-muted-foreground">Within 100 bets</p>
                <ProbabilityBar pct={result.recoveryProbability100} />
              </div>
            </div>
          </div>

          {result.expectedProfitPerBet <= 0 && (
            <div className="rounded border border-red-900/50 bg-red-950/30 p-4">
              <p className="text-sm text-red-400 font-medium">
                Your current win rate and average odds produce negative expected value.
              </p>
              <p className="text-xs text-red-400/80 mt-1">
                Recovery is not statistically likely until you achieve a positive edge.
                Consider improving your handicapping or being more selective with bets.
              </p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/60">
            For informational purposes only. Not financial advice. Actual results will vary.
          </p>
        </div>
      )}

      {result && result.deficit <= 0 && (
        <div className="rounded border border-green-900/50 bg-green-950/30 p-4 mt-4">
          <p className="text-sm text-green-400 font-medium">
            No drawdown detected — your current bankroll is at or above the peak.
          </p>
        </div>
      )}
    </div>
  )
}

function ScenarioRow({
  label,
  detail,
  bets,
  color,
}: {
  label: string
  detail: string
  bets: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={`text-sm font-medium ${color}`}>{label}</span>
        <span className="text-xs text-muted-foreground ml-2">({detail})</span>
      </div>
      <span className="text-sm font-mono">
        {bets >= 999 ? 'N/A' : `${bets} bets`}
      </span>
    </div>
  )
}

function ProbabilityBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? 'bg-green-500' :
    pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-1">
        <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-mono ml-2 w-12 text-right">{pct}%</span>
      </div>
    </div>
  )
}
