'use client'

import { useState, useEffect, useMemo } from 'react'
import { getUnitRecommendations, getFlatUnitSize, type UnitRecommendation } from '@/lib/unit-sizing'
import { TermTooltip } from '@/components/term-tooltip'

interface UnitSizingCardProps {
  /** Estimated win probability from AI analysis (0 to 1) */
  winProbability: number
  /** American odds being offered */
  americanOdds: number
}

const BANKROLL_STORAGE_KEY = 'betbrain_bankroll_config'

interface BankrollConfig {
  bankroll: number
  unitSize: number
}

function loadConfig(): BankrollConfig {
  if (typeof window === 'undefined') return { bankroll: 1000, unitSize: 10 }
  try {
    const raw = localStorage.getItem(BANKROLL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        bankroll: parsed.startingBalance ?? parsed.bankroll ?? 1000,
        unitSize: parsed.unitSize ?? 10,
      }
    }
  } catch { /* use defaults */ }
  return { bankroll: 1000, unitSize: 10 }
}

const CONFIDENCE_COLORS: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-yellow-500',
  high: 'text-green-500',
  max: 'text-blue-400',
}

export function UnitSizingCard({ winProbability, americanOdds }: UnitSizingCardProps) {
  const [config, setConfig] = useState<BankrollConfig>({ bankroll: 1000, unitSize: 10 })

  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  const recommendations = useMemo(
    () => getUnitRecommendations(winProbability, americanOdds, config),
    [winProbability, americanOdds, config]
  )

  const flatSizes = useMemo(() => ({
    conservative: getFlatUnitSize(config.bankroll, 'conservative'),
    moderate: getFlatUnitSize(config.bankroll, 'moderate'),
    aggressive: getFlatUnitSize(config.bankroll, 'aggressive'),
  }), [config.bankroll])

  // If no recommendations (edge case), show nothing
  if (recommendations.length === 0) return null

  // If all recommendations are 0 units (negative EV), show warning
  const allZero = recommendations.every((r) => r.units === 0)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <TermTooltip term="Kelly Criterion">Unit Sizing</TermTooltip>
        </h4>
        <span className="text-xs text-muted-foreground">
          Bankroll: ${config.bankroll.toLocaleString()} &middot; Unit: ${config.unitSize}
        </span>
      </div>

      {allZero ? (
        <div className="rounded-md bg-yellow-500/10 px-3 py-2">
          <p className="text-xs text-yellow-500">
            Kelly criterion suggests no bet — the estimated edge is zero or negative at these odds.
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">
              Flat staking alternatives:
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Conservative (1%): </span>
                <span className="font-medium">${flatSizes.conservative}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Moderate (2%): </span>
                <span className="font-medium">${flatSizes.moderate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Aggressive (3%): </span>
                <span className="font-medium">${flatSizes.aggressive}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {recommendations.map((rec) => (
            <RecommendationTile key={rec.confidence} rec={rec} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60">
        For informational purposes only. Not financial advice. Kelly sizing assumes accurate win probability estimates.
      </p>
    </div>
  )
}

function RecommendationTile({ rec }: { rec: UnitRecommendation }) {
  return (
    <div className="rounded-md border border-border/50 p-2 text-center">
      <p className={`text-xs font-medium capitalize ${CONFIDENCE_COLORS[rec.confidence]}`}>
        {rec.confidence}
      </p>
      <p className="text-lg font-bold">{rec.units}u</p>
      <p className="text-[10px] text-muted-foreground">
        ${rec.dollarAmount} ({(rec.bankrollPct * 100).toFixed(1)}%)
      </p>
    </div>
  )
}
