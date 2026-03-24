'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  calcStreakProbability,
  streakProbabilityTable,
  type StreakProbability as StreakProbType,
} from '@/lib/streak-probability'

export function StreakProbabilityPanel() {
  const [picks, setPicks] = useState<Array<{ outcome: string | null }>>([])
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) setPicks(JSON.parse(raw))
    } catch { /* empty */ }
  }, [])

  const result = useMemo(() => calcStreakProbability(picks), [picks])
  const resolvedCount = picks.filter(
    (p) => p.outcome === 'win' || p.outcome === 'loss'
  ).length

  const table = useMemo(
    () => streakProbabilityTable(result.winRate, Math.max(resolvedCount, 10)),
    [result.winRate, resolvedCount]
  )

  if (resolvedCount === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Streak Probability</h3>
        <p className="text-sm text-muted-foreground">
          Log some picks to see streak analysis and probabilities.
        </p>
      </div>
    )
  }

  const pctExtend1 = Math.round(result.extendBy1 * 100)
  const pctExtend3 = Math.round(result.extendBy3 * 100)
  const pctExtend5 = Math.round(result.extendBy5 * 100)

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Streak Probability</h3>
        <p className="text-sm text-muted-foreground">
          What are the odds your current streak continues?
        </p>
      </div>

      {/* Current streak */}
      {result.streakType !== 'none' && result.currentLength > 0 ? (
        <>
          <div className="flex items-center gap-3">
            <div
              className={`text-4xl font-bold ${
                result.streakType === 'win' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {result.currentLength}{result.streakType === 'win' ? 'W' : 'L'}
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Current streak</div>
              <div>Win rate: {Math.round(result.winRate * 100)}%</div>
            </div>
            {result.isUnusual && (
              <div className="ml-auto rounded-full bg-amber-500/20 text-amber-400 px-3 py-1 text-xs font-medium">
                Unusual
              </div>
            )}
          </div>

          {/* Extension probabilities */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Chance of extending:</div>
            <ProbabilityBar label={`+1 (${result.currentLength + 1} total)`} pct={pctExtend1} />
            <ProbabilityBar label={`+3 (${result.currentLength + 3} total)`} pct={pctExtend3} />
            <ProbabilityBar label={`+5 (${result.currentLength + 5} total)`} pct={pctExtend5} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-xl font-bold">{result.expectedStreakLength}</div>
              <div className="text-xs text-muted-foreground">Expected avg streak</div>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-xl font-bold">
                {(result.probabilityOfStreak * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Prob of this streak</div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">
          No active streak. Your last results were mixed.
        </div>
      )}

      {/* Assessment */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-sm">{result.assessment}</p>
      </div>

      {/* Streak table toggle */}
      <button
        onClick={() => setShowTable(!showTable)}
        className="text-sm text-primary hover:underline"
      >
        {showTable ? 'Hide' : 'Show'} streak probability table
      </button>

      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 pr-4">Streak</th>
                <th className="text-right py-2 px-2">Win streak</th>
                <th className="text-right py-2 pl-2">Loss streak</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr
                  key={row.streakLength}
                  className={`border-b border-border/50 ${
                    row.streakLength === result.currentLength
                      ? 'bg-primary/10'
                      : ''
                  }`}
                >
                  <td className="py-1.5 pr-4 font-mono">{row.streakLength}+</td>
                  <td className="text-right py-1.5 px-2">
                    {(row.winStreakProb * 100).toFixed(1)}%
                  </td>
                  <td className="text-right py-1.5 pl-2">
                    {(row.lossStreakProb * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-2">
            Probability of experiencing a streak of this length at least once in {Math.max(resolvedCount, 10)} bets.
          </p>
        </div>
      )}
    </div>
  )
}

function ProbabilityBar({ label, pct }: { label: string; pct: number }) {
  const color =
    pct >= 50 ? 'bg-green-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-muted-foreground shrink-0">{label}</div>
      <div className="flex-1 h-4 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <div className="w-12 text-right text-xs font-mono">{pct}%</div>
    </div>
  )
}
