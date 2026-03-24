'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { estimatePublicMoney, type PublicMoneyEstimate } from '@/lib/public-money'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Public Money Estimates Panel
// ---------------------------------------------------------------------------

type SportFilter = 'all' | 'nba' | 'nfl' | 'mlb' | 'nhl'

export function PublicMoneyPanel({ games }: { games: NormalizedGame[] }) {
  const [sportFilter, setSportFilter] = useState<SportFilter>('all')
  const [showAll, setShowAll] = useState(false)

  const result = useMemo(() => estimatePublicMoney(games), [games])

  const filtered = useMemo(() => {
    let list = result.estimates
    if (sportFilter !== 'all') {
      list = list.filter((e) => e.game.sport === sportFilter)
    }
    if (!showAll) {
      // Only show high-confidence estimates
      list = list.filter((e) => e.confidence >= 40)
    }
    return list
  }, [result.estimates, sportFilter, showAll])

  if (result.estimates.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Not enough odds data to estimate public money direction. Need at least 2 bookmakers per game.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Games Analyzed</p>
          <p className="text-2xl font-bold">{result.gamesAnalyzed}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Divergences</p>
          <p className="text-2xl font-bold text-yellow-400">{result.divergenceCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Estimates</p>
          <p className="text-2xl font-bold">{result.estimates.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground mr-1">Sport:</span>
        {(['all', 'nba', 'nfl', 'mlb', 'nhl'] as const).map((sport) => (
          <Button
            key={sport}
            variant={sportFilter === sport ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSportFilter(sport)}
          >
            {sport === 'all' ? 'All' : sport.toUpperCase()}
          </Button>
        ))}
        <label className="flex items-center gap-1.5 ml-3 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="rounded border-border"
          />
          Show low confidence
        </label>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.map((est) => (
          <PublicMoneyRow key={est.game.id} estimate={est} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No estimates match filters. Try enabling low-confidence estimates.
          </p>
        )}
      </div>

      <div className="rounded border border-border/50 bg-card/50 p-3">
        <p className="text-[10px] text-muted-foreground">
          These are estimates based on odds patterns, not actual handle data.
          Public money direction is inferred from favorite bias, bookmaker consensus, and
          outlier detection. Confidence is capped at 85% since no real handle data is available.
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          For informational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  )
}

function PublicMoneyRow({ estimate }: { estimate: PublicMoneyEstimate }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-[10px] uppercase">
            {SPORT_LABELS[estimate.game.sport] ?? estimate.game.sport}
          </Badge>
          <span className="text-sm font-medium">
            {estimate.game.awayTeam} @ {estimate.game.homeTeam}
          </span>
          {estimate.divergence && (
            <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400">
              Divergence
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Public on</p>
            <p className="text-sm font-medium">{estimate.publicTeam}</p>
          </div>
          <PublicPctBadge pct={estimate.publicPct} />
          <svg
            className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-border/30 space-y-2">
          {/* Visual bar */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 text-right text-muted-foreground">{estimate.publicTeam}</span>
            <div className="flex-1 h-3 rounded-full bg-muted/20 overflow-hidden flex">
              <div
                className="h-full bg-blue-500/60 rounded-l-full"
                style={{ width: `${estimate.publicPct}%` }}
              />
              <div
                className="h-full bg-purple-500/60 rounded-r-full"
                style={{ width: `${100 - estimate.publicPct}%` }}
              />
            </div>
            <span className="w-20 text-muted-foreground">{estimate.sharpTeam}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-22">
            <span className="text-blue-400">~{estimate.publicPct}% public</span>
            <span className="text-purple-400">~{100 - estimate.publicPct}% sharp</span>
          </div>

          {/* Factors */}
          <div className="space-y-1 pt-1">
            <p className="text-xs font-medium">Contributing factors:</p>
            {estimate.factors.map((f, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-3">
                {f}
              </p>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              Confidence: {estimate.confidence}%
            </span>
            <Link
              href={`/dashboard/games/${encodeURIComponent(estimate.game.id)}`}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View game &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function PublicPctBadge({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-blue-500/20 text-blue-400' :
    pct >= 60 ? 'bg-blue-500/10 text-blue-300' :
    'bg-muted text-muted-foreground'

  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded ${color}`}>
      {pct}%
    </span>
  )
}
