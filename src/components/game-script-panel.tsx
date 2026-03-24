'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import { getFlowLabel, getFlowColor } from '@/lib/game-script'
import type { GameScript } from '@/lib/game-script'
import type { Sport } from '@/lib/supabase/types'

const SPORT_FILTERS: { key: 'all' | Sport; label: string }[] = [
  { key: 'all', label: 'All Sports' },
  { key: 'nba', label: 'NBA' },
  { key: 'nfl', label: 'NFL' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
]

function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(value * 100, 2)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-mono">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  )
}

function GameScriptCard({ script }: { script: GameScript }) {
  const flowColor = getFlowColor(script.predictedFlow)
  const flowLabel = getFlowLabel(script.predictedFlow)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {SPORT_LABELS[script.game.sport] ?? script.game.sport.toUpperCase()}
          </Badge>
          <span className={`text-sm font-bold ${flowColor}`}>
            {flowLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {script.confidence}% conf
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatGameTime(script.game.commenceTime)}
          </span>
        </div>
      </div>

      {/* Matchup */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {script.game.awayTeam} @ {script.game.homeTeam}
        </p>
        {script.spreadAnalysis.consensusSpread !== null && (
          <span className="text-xs font-mono text-muted-foreground">
            Spread: {script.spreadAnalysis.consensusSpread > 0 ? '+' : ''}
            {script.spreadAnalysis.consensusSpread}
          </span>
        )}
      </div>

      {/* Narrative */}
      <div className="rounded-md bg-muted/20 px-3 py-2">
        <p className="text-sm text-foreground/80">{script.narrative}</p>
      </div>

      {/* Probability bars */}
      <div className="space-y-1.5">
        <ProbBar label="Blowout" value={script.probabilities.blowout} color="bg-red-500" />
        <ProbBar label="Comfortable" value={script.probabilities.comfortable} color="bg-orange-500" />
        <ProbBar label="Close" value={script.probabilities.close} color="bg-blue-500" />
        <ProbBar label="Overtime" value={script.probabilities.overtime} color="bg-purple-500" />
      </div>

      {/* Scoring environment */}
      <div className="flex items-center gap-3 text-xs">
        <Badge variant="outline" className={
          script.scoring.tempo === 'high' ? 'border-orange-500/50 text-orange-500' :
          script.scoring.tempo === 'low' ? 'border-blue-500/50 text-blue-500' :
          'border-border'
        }>
          {script.scoring.tempo === 'high' ? 'Fast Pace' :
           script.scoring.tempo === 'low' ? 'Slow Pace' : 'Average Pace'}
        </Badge>
        {script.scoring.expectedTotal !== null && (
          <span className="text-muted-foreground">
            Total: {script.scoring.expectedTotal}
          </span>
        )}
        {script.spreadAnalysis.lopsided && (
          <Badge className="bg-red-500/20 text-red-500 text-xs">Lopsided</Badge>
        )}
      </div>

      {/* Factors */}
      {script.factors.length > 0 && (
        <div className="space-y-1">
          {script.factors.map((f, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              &bull; {f}
            </p>
          ))}
        </div>
      )}

      {/* Link */}
      <Link
        href={`/dashboard/games/${script.game.id}`}
        className="inline-flex h-8 w-full items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Full Analysis
      </Link>
    </div>
  )
}

export function GameScriptPanel({ scripts }: { scripts: GameScript[] }) {
  const [activeSport, setActiveSport] = useState<'all' | Sport>('all')

  const filtered = activeSport === 'all'
    ? scripts
    : scripts.filter((s) => s.game.sport === activeSport)

  const otCandidates = filtered.filter((s) => s.predictedFlow === 'overtime_candidate').length
  const blowouts = filtered.filter((s) => s.predictedFlow.startsWith('blowout_')).length
  const closeGames = filtered.filter((s) => s.predictedFlow === 'close' || s.predictedFlow === 'coin_flip').length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Games Analyzed</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{blowouts}</p>
          <p className="text-xs text-muted-foreground">Blowout Risk</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-500">{closeGames}</p>
          <p className="text-xs text-muted-foreground">Close Games</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-purple-500">{otCandidates}</p>
          <p className="text-xs text-muted-foreground">OT Candidates</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1">
        {SPORT_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => setActiveSport(sf.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeSport === sf.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((s) => (
            <GameScriptCard key={s.game.id} script={s} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">No games to analyze</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Game script predictions appear when there are upcoming games with odds data.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice. Game script predictions are
        statistical estimates based on odds data and historical patterns.
      </p>
    </div>
  )
}
