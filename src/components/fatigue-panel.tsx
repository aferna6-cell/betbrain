'use client'

import { Badge } from '@/components/ui/badge'
import type { FatigueAssessment, FatigueComparison, FatigueRating } from '@/lib/fatigue-model'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ratingColor(rating: FatigueRating): string {
  switch (rating) {
    case 'severe': return 'text-red-500'
    case 'high': return 'text-orange-500'
    case 'moderate': return 'text-yellow-500'
    case 'mild': return 'text-blue-400'
    case 'none': return 'text-green-500'
  }
}

function ratingBg(rating: FatigueRating): string {
  switch (rating) {
    case 'severe': return 'bg-red-500'
    case 'high': return 'bg-orange-500'
    case 'moderate': return 'bg-yellow-500'
    case 'mild': return 'bg-blue-400'
    case 'none': return 'bg-green-500'
  }
}

function FatigueBar({ score }: { score: number }) {
  const width = Math.min(score, 100)
  const color =
    score >= 75 ? 'bg-red-500' :
    score >= 55 ? 'bg-orange-500' :
    score >= 35 ? 'bg-yellow-500' :
    score >= 15 ? 'bg-blue-400' :
    'bg-green-500'

  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

function FactorRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono">{value}/{max}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single team assessment card
// ---------------------------------------------------------------------------

function TeamFatigueCard({ assessment }: { assessment: FatigueAssessment }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{assessment.team}</span>
          {assessment.isBackToBack && (
            <Badge variant="destructive" className="text-xs">B2B</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${ratingColor(assessment.rating)}`}>
            {assessment.fatigueScore}
          </span>
          <Badge className={`${ratingBg(assessment.rating)} text-white text-xs`}>
            {assessment.rating.toUpperCase()}
          </Badge>
        </div>
      </div>

      <FatigueBar score={assessment.fatigueScore} />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Rest Days</p>
          <p className="text-sm font-bold">{assessment.teamRestDays}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Opp Rest</p>
          <p className="text-sm font-bold">{assessment.opponentRestDays}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ATS Impact</p>
          <p className={`text-sm font-bold ${assessment.atsImpact < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {assessment.atsImpact > 0 ? '+' : ''}{assessment.atsImpact} pts
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <FactorRow label="Rest Diff" value={assessment.factors.restDifferential} max={30} />
        <FactorRow label="Venue" value={assessment.factors.venueContext} max={20} />
        <FactorRow label="Density" value={assessment.factors.scheduleDensity} max={20} />
        <FactorRow label="Travel" value={assessment.factors.travelPenalty} max={15} />
        <FactorRow label="B2B Penalty" value={assessment.factors.b2bPenalty} max={15} />
      </div>

      <div className="space-y-1">
        {assessment.breakdown.map((line, i) => (
          <p key={i} className="text-xs text-muted-foreground">&bull; {line}</p>
        ))}
      </div>

      {assessment.isBackToBack && (
        <p className="text-xs text-muted-foreground">
          Historical B2B win rate ({assessment.sport.toUpperCase()}): {(assessment.historicalB2BWinRate * 100).toFixed(0)}%
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main comparison panel
// ---------------------------------------------------------------------------

export function FatiguePanel({ comparison }: { comparison: FatigueComparison }) {
  const edgeColor =
    comparison.fatigueEdge === 'home' ? 'text-green-500' :
    comparison.fatigueEdge === 'away' ? 'text-green-500' :
    'text-muted-foreground'

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Fatigue Analysis</h3>
        <p className="text-sm text-muted-foreground">{comparison.summary}</p>
      </div>

      {comparison.fatigueEdge !== 'even' && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
          <p className={`text-sm font-medium ${edgeColor}`}>
            Fatigue Edge: {comparison.fatigueEdge === 'home' ? comparison.home.team : comparison.away.team}
          </p>
          {comparison.fatigueDifferential !== 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Estimated {Math.abs(comparison.fatigueDifferential)} pt ATS advantage from fatigue differential
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <TeamFatigueCard assessment={comparison.home} />
        <TeamFatigueCard assessment={comparison.away} />
      </div>

      <p className="text-xs text-muted-foreground italic">
        {comparison.home.disclaimer}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick estimate widget (for use without full schedule data)
// ---------------------------------------------------------------------------

export function QuickFatigueWidget({
  team,
  restDays,
  opponentRestDays,
  isHome,
  sport,
}: {
  team: string
  restDays: number
  opponentRestDays: number
  isHome: boolean
  sport: 'nba' | 'nhl'
}) {
  const { quickFatigueEstimate } = require('@/lib/fatigue-model')
  const estimate = quickFatigueEstimate(restDays, opponentRestDays, isHome, sport)

  if (estimate.rating === 'none') return null

  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge className={`${ratingBg(estimate.rating)} text-white`}>
        Fatigue: {estimate.rating}
      </Badge>
      <span className="text-muted-foreground">
        {team} ({restDays}d rest vs {opponentRestDays}d)
      </span>
      {estimate.atsImpact !== 0 && (
        <span className="text-red-400">
          {estimate.atsImpact > 0 ? '+' : ''}{estimate.atsImpact} pts ATS
        </span>
      )}
    </div>
  )
}
