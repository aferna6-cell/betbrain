'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  analyzePortfolioRisk,
  type PortfolioRiskResult,
  type PickForRisk,
  type OverallRisk,
} from '@/lib/portfolio-risk'

const RISK_COLORS: Record<OverallRisk, string> = {
  low: 'text-green-400',
  moderate: 'text-yellow-400',
  elevated: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
}

const RISK_BG: Record<OverallRisk, string> = {
  low: 'bg-green-900/30 border-green-800',
  moderate: 'bg-yellow-900/30 border-yellow-800',
  elevated: 'bg-amber-900/30 border-amber-800',
  high: 'bg-orange-900/30 border-orange-800',
  critical: 'bg-red-900/30 border-red-800',
}

function RiskMeter({ score }: { score: number }) {
  const percentage = Math.min(100, Math.max(0, score))
  const color =
    percentage >= 80 ? '#ef4444' :
    percentage >= 60 ? '#f97316' :
    percentage >= 40 ? '#f59e0b' :
    percentage >= 20 ? '#eab308' :
    '#22c55e'

  return (
    <div className="w-full bg-gray-800 rounded-full h-3">
      <div
        className="h-3 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  )
}

function ExposureBar({ label, percent, count, units }: {
  label: string
  percent: number
  count: number
  units: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-300 capitalize">{label}</span>
        <span className="text-gray-500">{count} pick{count !== 1 ? 's' : ''} / {units}u ({percent}%)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-blue-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function PortfolioRiskPanel() {
  const [result, setResult] = useState<PortfolioRiskResult | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPicks = useCallback(async () => {
    try {
      const res = await fetch('/api/picks')
      if (!res.ok) {
        setResult(analyzePortfolioRisk([]))
        return
      }
      const data = await res.json()
      const pending = (data.picks ?? []).filter(
        (p: Record<string, unknown>) => p.outcome === 'pending' || p.outcome === null
      ) as PickForRisk[]
      setResult(analyzePortfolioRisk(pending))
    } catch {
      setResult(analyzePortfolioRisk([]))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPicks()
  }, [loadPicks])

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center">
        <p className="text-sm text-gray-400">Loading portfolio risk analysis...</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="space-y-4">
      {/* Risk gauge */}
      <div className={`rounded-lg border p-4 ${RISK_BG[result.overallRisk]}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-medium text-gray-300">Portfolio Risk</h3>
            <p className={`text-2xl font-bold capitalize ${RISK_COLORS[result.overallRisk]}`}>
              {result.overallRisk}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{result.riskScore}</div>
            <div className="text-xs text-gray-500">/100</div>
          </div>
        </div>
        <RiskMeter score={result.riskScore} />
        <p className="text-xs text-gray-400 mt-2">{result.summary}</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Open Picks</div>
          <div className="text-lg font-bold text-white">{result.openPickCount}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Units at Risk</div>
          <div className="text-lg font-bold text-white">{result.totalUnitsAtRisk}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Max Loss</div>
          <div className="text-lg font-bold text-red-400">-{result.maxLoss}u</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Max Win</div>
          <div className="text-lg font-bold text-green-400">+{result.maxWin}u</div>
        </div>
      </div>

      {/* Sport exposure */}
      {result.sportExposure.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Sport Exposure</h3>
          {result.sportExposure.map((s) => (
            <ExposureBar
              key={s.sport}
              label={s.sport.toUpperCase()}
              percent={s.percentOfPortfolio}
              count={s.pickCount}
              units={s.totalUnits}
            />
          ))}
        </div>
      )}

      {/* Type exposure */}
      {result.typeExposure.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Bet Type Exposure</h3>
          {result.typeExposure.map((t) => (
            <ExposureBar
              key={t.type}
              label={t.type}
              percent={t.percentOfPortfolio}
              count={t.pickCount}
              units={t.totalUnits}
            />
          ))}
        </div>
      )}

      {/* Correlated bets */}
      {result.correlationGroups.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Correlated Bets</h3>
          {result.correlationGroups.map((g) => (
            <div key={g.gameId} className="flex items-center justify-between bg-gray-800/40 rounded p-2">
              <div>
                <span className="text-sm text-white">{g.label}</span>
                <span className="text-xs text-gray-500 ml-2">{g.picks.length} bets, {g.totalUnits}u</span>
              </div>
              <Badge
                variant="outline"
                className={
                  g.riskLevel === 'high' ? 'border-red-600 text-red-400' :
                  g.riskLevel === 'medium' ? 'border-amber-600 text-amber-400' :
                  'border-gray-600 text-gray-400'
                }
              >
                {g.riskLevel} risk
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Risk factors */}
      {result.riskFactors.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Risk Factors</h3>
          {result.riskFactors.map((f, i) => (
            <div key={i} className="text-xs text-gray-400 flex items-start gap-1">
              <span className="text-amber-500 mt-0.5">&#9888;</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
