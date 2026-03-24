'use client'

import { useMemo, useState, useEffect } from 'react'
import { assessRisk, type RiskInput, type RiskAssessment, type RiskFactor } from '@/lib/risk-assessment'

// ---------------------------------------------------------------------------
// Risk Scorecard — Visual pre-bet risk meter wired into the pick form
// ---------------------------------------------------------------------------

const LEVEL_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  low: { color: 'text-green-400', bg: 'bg-green-500', label: 'Low Risk' },
  moderate: { color: 'text-blue-400', bg: 'bg-blue-500', label: 'Moderate' },
  elevated: { color: 'text-yellow-400', bg: 'bg-yellow-500', label: 'Elevated' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500', label: 'High Risk' },
  extreme: { color: 'text-red-400', bg: 'bg-red-500', label: 'Extreme' },
}

const SEVERITY_STYLES: Record<string, string> = {
  ok: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
}

interface RiskScorecardProps {
  odds: number | null
  units: number
  sport: string
  betType: string
}

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

function getRecentOutcomes(): ('win' | 'loss' | 'push')[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('betbrain-recent-outcomes')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function getPendingPickCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem('betbrain-pending-count')
    if (stored) return parseInt(stored, 10)
  } catch { /* ignore */ }
  return 0
}

export function RiskScorecard({ odds, units, sport, betType }: RiskScorecardProps) {
  const [bankrollConfig, setBankrollConfig] = useState({ bankroll: 1000, unitSize: 10 })
  const [recentOutcomes, setRecentOutcomes] = useState<('win' | 'loss' | 'push')[]>([])
  const [pendingPickCount, setPendingPickCount] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setBankrollConfig(getBankrollConfig())
    setRecentOutcomes(getRecentOutcomes())
    setPendingPickCount(getPendingPickCount())
  }, [])

  const assessment = useMemo<RiskAssessment | null>(() => {
    if (odds == null || !isFinite(odds) || odds === 0) return null
    // Validate American odds
    if (odds > -100 && odds < 100) return null

    const input: RiskInput = {
      odds,
      units,
      sport,
      betType,
      bankroll: bankrollConfig.bankroll,
      unitSize: bankrollConfig.unitSize,
      recentOutcomes,
      pendingPickCount,
    }

    return assessRisk(input)
  }, [odds, units, sport, betType, bankrollConfig, recentOutcomes, pendingPickCount])

  if (!assessment) return null

  const style = LEVEL_STYLES[assessment.level] ?? LEVEL_STYLES.moderate
  const scorePercent = Math.min(100, assessment.score)

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <RiskMeter score={scorePercent} color={style.bg} />
          <div>
            <span className={`text-sm font-semibold ${style.color}`}>
              {style.label}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              Score: {assessment.score}/100
            </span>
          </div>
        </div>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Recommendation */}
      <p className="text-xs text-muted-foreground">
        {assessment.recommendation}
      </p>

      {/* Max recommended units */}
      {assessment.maxRecommendedUnits > 0 && units > assessment.maxRecommendedUnits && (
        <p className="text-xs text-yellow-400">
          Max recommended: {assessment.maxRecommendedUnits}u (you have {units}u)
        </p>
      )}

      {/* Expanded factor breakdown */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          {assessment.factors.map((factor) => (
            <FactorRow key={factor.name} factor={factor} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function RiskMeter({ score, color }: { score: number; color: string }) {
  return (
    <div className="relative w-10 h-10">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          strokeWidth="3"
          strokeDasharray={`${(score / 100) * 88} 88`}
          strokeLinecap="round"
          className={color}
          stroke="currentColor"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
        {score}
      </span>
    </div>
  )
}

function FactorRow({ factor }: { factor: RiskFactor }) {
  const severityColor = SEVERITY_STYLES[factor.severity] ?? 'text-muted-foreground'

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <div className={`h-2 w-2 rounded-full ${
          factor.severity === 'ok' ? 'bg-green-500' :
          factor.severity === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">{factor.name}</span>
          <span className={`text-xs font-mono ${severityColor}`}>
            {factor.score}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">{factor.description}</p>
      </div>
    </div>
  )
}
