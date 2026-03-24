'use client'

import { useState, useEffect, useMemo } from 'react'
import { autoGradeAllPicks, type AutoGradeResult, type PickForAutoGrade } from '@/lib/auto-grade'
import { getGradeColor } from '@/lib/bet-grading'

export function AutoGradePanel() {
  const [picks, setPicks] = useState<PickForAutoGrade[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) setPicks(JSON.parse(raw))
    } catch { /* empty */ }
  }, [])

  const results = useMemo(() => {
    const resolved = picks.filter(
      (p) => p.outcome === 'win' || p.outcome === 'loss'
    )
    if (resolved.length === 0) return []
    return autoGradeAllPicks(resolved)
  }, [picks])

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Auto-Grade Picks</h3>
        <p className="text-sm text-muted-foreground">
          Log some resolved picks to see automated process grading based on available metadata.
        </p>
      </div>
    )
  }

  // Summary stats
  const avgScore = Math.round(
    results.reduce((sum, r) => sum + r.grade.score, 0) / results.length
  )
  const highConf = results.filter((r) => r.confidence === 'high').length
  const chaseBets = results.filter((r) => r.inferred.isChaseBet).length

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Auto-Grade Picks</h3>
        <p className="text-sm text-muted-foreground">
          Process grades inferred from pick metadata. Add notes and CLV data for better accuracy.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-2xl font-bold">{avgScore}</div>
          <div className="text-xs text-muted-foreground">Avg Process Score</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-2xl font-bold">{highConf}</div>
          <div className="text-xs text-muted-foreground">High Confidence</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-2xl font-bold text-amber-400">{chaseBets}</div>
          <div className="text-xs text-muted-foreground">Chase Bets</div>
        </div>
      </div>

      {/* Grade list */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {results
          .slice()
          .reverse()
          .slice(0, 20)
          .map((result) => (
            <GradeRow
              key={result.pickId}
              result={result}
              pick={picks.find((p) => p.id === result.pickId)}
              isExpanded={expanded === result.pickId}
              onToggle={() =>
                setExpanded(expanded === result.pickId ? null : result.pickId)
              }
            />
          ))}
      </div>

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice. Auto-grades are estimates — manual grading is more accurate.
      </p>
    </div>
  )
}

function GradeRow({
  result,
  pick,
  isExpanded,
  onToggle,
}: {
  result: AutoGradeResult
  pick?: PickForAutoGrade
  isExpanded: boolean
  onToggle: () => void
}) {
  const confidenceColors = {
    high: 'text-green-400',
    medium: 'text-amber-400',
    low: 'text-zinc-400',
  }

  return (
    <div className="border border-border/50 rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Grade */}
        <span className={`text-lg font-bold w-8 ${getGradeColor(result.grade.grade)}`}>
          {result.grade.grade}
        </span>

        {/* Pick info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">
            {pick?.pick_team || pick?.sport?.toUpperCase() || 'Pick'}{' '}
            <span className="text-muted-foreground">
              {pick?.odds && pick.odds > 0 ? `+${pick.odds}` : pick?.odds}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {pick?.game_date} | {pick?.pick_type}
          </div>
        </div>

        {/* Outcome */}
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            pick?.outcome === 'win'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {pick?.outcome}
        </span>

        {/* Confidence */}
        <span className={`text-xs ${confidenceColors[result.confidence]}`}>
          {result.confidence}
        </span>

        {/* Score */}
        <span className="text-sm font-mono w-8 text-right">{result.grade.score}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
          {/* Inferred criteria */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <CriterionRow
              label="Thesis"
              value={result.inferred.hasThesis}
              detail={result.inferred.thesisReason}
            />
            <CriterionRow
              label="Line Shopped"
              value={result.inferred.lineShopped}
              detail={result.inferred.lineShopReason}
            />
            <CriterionRow
              label="Beat CLV"
              value={result.inferred.beatClosingLine}
              detail={result.inferred.clvReason}
            />
            <CriterionRow
              label="Sizing"
              value={result.inferred.sizingAccuracy <= 1.25 && result.inferred.sizingAccuracy >= 0.75}
              detail={result.inferred.sizingReason}
            />
            <CriterionRow
              label="Not Chase"
              value={!result.inferred.isChaseBet}
              detail={result.inferred.chaseReason}
            />
            <CriterionRow
              label="System"
              value={result.inferred.followedSystem}
              detail={result.inferred.systemReason}
            />
          </div>

          {/* Alignment */}
          <div className="text-xs text-muted-foreground">
            {result.grade.processLabel} | {result.grade.outcomeAlignment === 'aligned' ? 'Outcome aligned' : result.grade.outcomeAlignment === 'lucky' ? 'Got lucky' : result.grade.outcomeAlignment === 'unlucky' ? 'Bad luck' : 'Pending'}
          </div>

          <div className="text-xs text-muted-foreground italic">
            {result.confidenceReason}
          </div>
        </div>
      )}
    </div>
  )
}

function CriterionRow({
  label,
  value,
  detail,
}: {
  label: string
  value: boolean | null
  detail: string
}) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5">
        {value === true ? (
          <span className="text-green-400">+</span>
        ) : value === false ? (
          <span className="text-red-400">-</span>
        ) : (
          <span className="text-zinc-400">?</span>
        )}
      </span>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-muted-foreground">{detail}</div>
      </div>
    </div>
  )
}
