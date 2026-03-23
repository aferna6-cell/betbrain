'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SteamMove } from '@/lib/steam-moves'

interface SteamMovesViewProps {
  /** If provided, render these moves directly (server-fetched). Otherwise, fetch client-side. */
  initialMoves?: SteamMove[]
}

const MARKET_LABELS: Record<string, string> = {
  moneyline: 'Moneyline',
  spread: 'Spread',
  total: 'Total',
}

const SEVERITY_STYLES: Record<string, string> = {
  extreme: 'border-red-500/40 bg-red-500/5',
  fast: 'border-orange-500/30 bg-orange-500/5',
  moderate: 'border-yellow-500/20 bg-yellow-500/5',
}

function getSpeedLabel(velocityPPH: number): { label: string; severity: string } {
  if (velocityPPH >= 12) return { label: 'Very Fast', severity: 'extreme' }
  if (velocityPPH >= 8) return { label: 'Fast', severity: 'fast' }
  return { label: 'Moderate', severity: 'moderate' }
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

export function SteamMovesView({ initialMoves }: SteamMovesViewProps) {
  const [moves, setMoves] = useState<SteamMove[]>(initialMoves ?? [])
  const [loading, setLoading] = useState(!initialMoves)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialMoves) return

    async function fetchMoves() {
      try {
        const res = await fetch('/api/odds/steam')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setMoves(data.steamMoves ?? [])
      } catch {
        setError('Unable to load steam moves')
      } finally {
        setLoading(false)
      }
    }

    fetchMoves()
  }, [initialMoves])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/odds/steam')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setMoves(data.steamMoves ?? [])
    } catch {
      setError('Unable to refresh steam moves')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
          Retry
        </Button>
      </div>
    )
  }

  if (moves.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-lg font-medium">No Steam Moves Detected</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Steam moves occur when lines shift rapidly due to sharp action. Check back closer to game
          time when lines are more active.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {moves.length} steam move{moves.length !== 1 ? 's' : ''} detected in the last 2 hours
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {moves.map((move, i) => {
          const { label: speedLabel, severity } = getSpeedLabel(move.velocityPPH)
          return (
            <div
              key={`${move.gameId}-${move.market}-${move.side}-${i}`}
              className={`rounded-lg border p-4 ${SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.moderate}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={severity === 'extreme' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {speedLabel}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {MARKET_LABELS[move.market] ?? move.market}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {move.bookmaker.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{move.direction}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{move.magnitudePP}pp shift</span>
                    <span>{move.windowMinutes}min window</span>
                    <span>{move.velocityPPH}pp/hr velocity</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(move.detectedAt)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Steam moves indicate sharp money entering the market. Lines may continue to move in the same
        direction. For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
