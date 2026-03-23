'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  findFadeOpportunities,
  formatFadeOdds,
  type FadeAnalysis,
  type FadeOpportunity,
} from '@/lib/fade-public'
import type { NormalizedGame } from '@/lib/sports/config'

function FadeStrengthBar({ strength }: { strength: number }) {
  const color =
    strength >= 70
      ? 'bg-green-500'
      : strength >= 50
        ? 'bg-yellow-500'
        : 'bg-orange-500'

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${strength}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{strength}</span>
    </div>
  )
}

function FadeCard({ opportunity }: { opportunity: FadeOpportunity }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border p-4 space-y-3 hover:border-muted-foreground/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{opportunity.awayTeam}</span>
            <span className="text-xs text-muted-foreground">@</span>
            <span className="text-sm font-semibold">{opportunity.homeTeam}</span>
            <Badge variant="outline" className="text-[10px]">
              {opportunity.sport.toUpperCase()}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Fade</span>
            <span className="text-sm font-medium text-red-400 line-through">
              {opportunity.publicTeam}
            </span>
            <span className="text-xs text-muted-foreground">→ Bet</span>
            <span className="text-sm font-medium text-green-400">
              {opportunity.fadeTeam}
            </span>
          </div>
        </div>
        <div className="text-right">
          <FadeStrengthBar strength={opportunity.fadeStrength} />
          {opportunity.bestFadeOdds !== null && (
            <div className="mt-1 text-right">
              <span className="text-xs text-muted-foreground">Best: </span>
              <span className="text-sm font-mono font-semibold text-green-400">
                {formatFadeOdds(opportunity.bestFadeOdds)}
              </span>
              {opportunity.bestFadeBook && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({opportunity.bestFadeBook})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* First reason always visible */}
      <p className="text-xs text-muted-foreground">{opportunity.reasons[0]}</p>

      {/* Expand for more */}
      {opportunity.reasons.length > 1 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {expanded ? 'Show less' : `+${opportunity.reasons.length - 1} more reason${opportunity.reasons.length > 2 ? 's' : ''}`}
          </button>
          {expanded && (
            <ul className="space-y-1">
              {opportunity.reasons.slice(1).map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-muted-foreground/40 mt-0.5">-</span>
                  {r}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Implied probability */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Fade side implied: <span className="font-mono">{opportunity.fadeImplied.toFixed(1)}%</span>
        </span>
        <span>
          Public conf: <span className="font-mono">{opportunity.consensus.confidence}%</span>
        </span>
        {opportunity.consensus.divergence && (
          <Badge variant="default" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
            Sharp divergence
          </Badge>
        )}
      </div>
    </div>
  )
}

interface FadePublicToolProps {
  games?: NormalizedGame[]
}

export function FadePublicTool({ games: propGames }: FadePublicToolProps) {
  const [analysis, setAnalysis] = useState<FadeAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
    try {
      if (propGames) {
        setAnalysis(findFadeOpportunities(propGames))
        setLoading(false)
        return
      }

      const res = await fetch('/api/odds/all')
      const data = await res.json()
      if (res.ok && data.games) {
        setAnalysis(findFadeOpportunities(data.games))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [propGames])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border p-4 animate-pulse">
            <div className="h-5 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted/50 rounded w-64" />
          </div>
        ))}
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground text-center">
        Unable to load odds data for fade analysis.
      </div>
    )
  }

  const sports = [...new Set(analysis.opportunities.map((o) => o.sport))]
  const filtered =
    sportFilter === 'all'
      ? analysis.opportunities
      : analysis.opportunities.filter((o) => o.sport === sportFilter)

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="rounded-lg border border-border px-3 py-2">
          <div className="text-xs text-muted-foreground">Games Analyzed</div>
          <div className="text-lg font-bold font-mono">{analysis.gamesAnalyzed}</div>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <div className="text-xs text-muted-foreground">Fade Opportunities</div>
          <div className="text-lg font-bold font-mono text-green-500">{analysis.opportunities.length}</div>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <div className="text-xs text-muted-foreground">Sharp Divergences</div>
          <div className="text-lg font-bold font-mono text-purple-400">{analysis.publicBias.divergenceCount}</div>
        </div>
        {analysis.publicBias.gamesWithPublicSide > 0 && (
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">Public on Favorite</div>
            <div className="text-lg font-bold font-mono">
              {Math.round((analysis.publicBias.publicOnFavorite / analysis.publicBias.gamesWithPublicSide) * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Sport filter */}
      {sports.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSportFilter('all')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              sportFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-muted-foreground'
            }`}
          >
            All
          </button>
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                sportFilter === sport ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-muted-foreground'
              }`}
            >
              {sport.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Opportunities */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No strong fade opportunities detected right now.
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Fade signals appear when there is a clear public side with contrarian value indicators.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((opp) => (
            <FadeCard key={opp.gameId} opportunity={opp} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground bg-muted/20 rounded p-2">
        For informational purposes only. Not financial advice. Fading the public is one strategy among many and does not guarantee profits.
      </p>
    </div>
  )
}
