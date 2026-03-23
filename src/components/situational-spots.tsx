'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  detectSituationalSpots,
  type SituationalAnalysis,
  type SituationalSpot,
  type ScheduleGame,
  type SpotType,
} from '@/lib/situational-spots'
import type { NormalizedGame } from '@/lib/sports/config'

const SPOT_LABELS: Record<SpotType, { label: string; color: string }> = {
  back_to_back: { label: 'Back-to-Back', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  rest_advantage: { label: 'Rest Edge', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  three_in_four: { label: '3-in-4', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  long_road_trip: { label: 'Road Trip', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  home_stand: { label: 'Home Stand', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  travel_fatigue: { label: 'Travel', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  schedule_loss: { label: 'Sched. Loss', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

function ImpactStars({ impact }: { impact: number }) {
  return (
    <div className="flex items-center gap-0.5" title={`Impact: ${impact}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= impact ? 'bg-yellow-500' : 'bg-muted/30'
          }`}
        />
      ))}
    </div>
  )
}

function SpotCard({ spot }: { spot: SituationalSpot }) {
  const spotStyle = SPOT_LABELS[spot.spotType] || SPOT_LABELS.back_to_back

  return (
    <div className="rounded-lg border border-border p-4 space-y-2 hover:border-muted-foreground/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{spot.awayTeam}</span>
            <span className="text-xs text-muted-foreground">@</span>
            <span className="text-sm font-semibold">{spot.homeTeam}</span>
            <Badge variant="outline" className="text-[10px]">
              {spot.sport.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className={`text-[10px] ${spotStyle.color}`}>
            {spotStyle.label}
          </Badge>
          <ImpactStars impact={spot.impact} />
        </div>
      </div>

      <p className="text-sm text-foreground">{spot.description}</p>

      <div className="flex items-center justify-between">
        {spot.edgeTeam && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Edge:</span>
            <span className="font-medium text-green-400">{spot.edgeTeam}</span>
            <span className="text-muted-foreground">
              ({spot.edgeSide === 'home' ? 'H' : 'A'})
            </span>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground italic">
          {spot.historicalEdge}
        </p>
      </div>
    </div>
  )
}

/**
 * Convert NormalizedGame[] to ScheduleGame[] for the detector.
 */
function gamesToSchedule(games: NormalizedGame[]): ScheduleGame[] {
  return games.map((g) => ({
    gameId: g.id,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    date: g.commenceTime.split('T')[0],
    sport: g.sport,
  }))
}

interface SituationalSpotsProps {
  games?: NormalizedGame[]
}

export function SituationalSpotsPanel({ games: propGames }: SituationalSpotsProps) {
  const [analysis, setAnalysis] = useState<SituationalAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<SpotType | 'all'>('all')

  const loadData = useCallback(async () => {
    try {
      let games: NormalizedGame[]
      if (propGames) {
        games = propGames
      } else {
        const res = await fetch('/api/odds/all')
        const data = await res.json()
        if (!res.ok || !data.games) {
          setLoading(false)
          return
        }
        games = data.games
      }

      const schedule = gamesToSchedule(games)
      // Use the same games as both target and context
      // In production, you'd want a broader schedule context
      setAnalysis(detectSituationalSpots(schedule, schedule))
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
            <div className="h-4 bg-muted/50 rounded w-72" />
          </div>
        ))}
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground text-center">
        Unable to load schedule data for situational analysis.
      </div>
    )
  }

  const spotTypes = [...new Set(analysis.spots.map((s) => s.spotType))]
  const filtered =
    typeFilter === 'all'
      ? analysis.spots
      : analysis.spots.filter((s) => s.spotType === typeFilter)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="rounded-lg border border-border px-3 py-2">
          <div className="text-xs text-muted-foreground">Games Analyzed</div>
          <div className="text-lg font-bold font-mono">{analysis.gamesAnalyzed}</div>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <div className="text-xs text-muted-foreground">Spots Found</div>
          <div className="text-lg font-bold font-mono text-yellow-500">{analysis.spotsFound}</div>
        </div>
        {analysis.spots.filter((s) => s.impact >= 4).length > 0 && (
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">High Impact</div>
            <div className="text-lg font-bold font-mono text-red-400">
              {analysis.spots.filter((s) => s.impact >= 4).length}
            </div>
          </div>
        )}
      </div>

      {/* Type filter */}
      {spotTypes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              typeFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-muted-foreground'
            }`}
          >
            All ({analysis.spots.length})
          </button>
          {spotTypes.map((type) => {
            const style = SPOT_LABELS[type]
            const count = analysis.spots.filter((s) => s.spotType === type).length
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  typeFilter === type ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-muted-foreground'
                }`}
              >
                {style.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Spots list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No situational spots detected for current games.
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Spots include back-to-backs, rest advantages, long road trips, and more.
            They appear based on schedule context.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((spot, i) => (
            <SpotCard key={`${spot.gameId}-${spot.spotType}-${i}`} spot={spot} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground bg-muted/20 rounded p-2">
        For informational purposes only. Not financial advice. Situational angles are historical tendencies, not guarantees.
      </p>
    </div>
  )
}
