'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  detectCrossSportCorrelations,
  getCrossSportSummary,
  createMovementEvent,
  type SharpCorrelation,
  type LineMovementEvent,
} from '@/lib/cross-sport-sharp'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskColor(risk: string): string {
  switch (risk) {
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  }
}

function patternLabel(pattern: string): string {
  switch (pattern) {
    case 'cross-sport-steam': return 'Cross-Sport Steam'
    case 'synchronized-favorites': return 'Synced Favorites'
    case 'synchronized-underdogs': return 'Synced Underdogs'
    case 'coordinated-totals': return 'Coordinated Totals'
    case 'contrarian-cluster': return 'Contrarian Cluster'
    default: return pattern
  }
}

function patternEmoji(pattern: string): string {
  switch (pattern) {
    case 'cross-sport-steam': return ''
    case 'synchronized-favorites': return ''
    case 'synchronized-underdogs': return ''
    case 'coordinated-totals': return ''
    case 'contrarian-cluster': return ''
    default: return ''
  }
}

// ---------------------------------------------------------------------------
// CrossSportSharpPanel
// ---------------------------------------------------------------------------

interface Props {
  games: NormalizedGame[]
}

export function CrossSportSharpPanel({ games }: Props) {
  // Build movement events from games (simulate from odds data)
  const { correlations, summary } = useMemo(() => {
    const movements: LineMovementEvent[] = []

    // For each game, create a movement event if bookmakers show notable spread
    for (const game of games) {
      if (game.bookmakers.length < 3) continue

      // Check for ML movement by looking at bookmaker disagreement
      const mlPrices = game.bookmakers
        .map((b) => b.moneyline?.home)
        .filter((p): p is number => p !== null)

      if (mlPrices.length >= 3) {
        const min = Math.min(...mlPrices)
        const max = Math.max(...mlPrices)
        const spread = max - min

        // If bookmaker spread > 15 points, there's significant movement/disagreement
        if (spread >= 15) {
          const avgAgreement = Math.floor(mlPrices.length * 0.6)
          const event = createMovementEvent(
            game.id,
            game.sport,
            game.homeTeam,
            game.awayTeam,
            'moneyline',
            mlPrices[0],
            mlPrices[mlPrices.length - 1],
            game.bookmakers[0]?.lastUpdated ?? new Date().toISOString(),
            avgAgreement,
            mlPrices.length,
            game.commenceTime
          )
          if (event) movements.push(event)
        }
      }

      // Check for totals movement
      const totalLines = game.bookmakers
        .map((b) => b.total?.line)
        .filter((l): l is number => l !== null)

      if (totalLines.length >= 3) {
        const min = Math.min(...totalLines)
        const max = Math.max(...totalLines)
        if (max - min >= 1) {
          const avgAgreement = Math.floor(totalLines.length * 0.6)
          const event = createMovementEvent(
            game.id,
            game.sport,
            game.homeTeam,
            game.awayTeam,
            'total',
            totalLines[0],
            totalLines[totalLines.length - 1],
            game.bookmakers[0]?.lastUpdated ?? new Date().toISOString(),
            avgAgreement,
            totalLines.length,
            game.commenceTime
          )
          if (event) movements.push(event)
        }
      }
    }

    const correlations = detectCrossSportCorrelations(movements)
    const summary = getCrossSportSummary(correlations)
    return { correlations, summary }
  }, [games])

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold">{summary.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{summary.high}</p>
          <p className="text-[10px] text-muted-foreground">High Risk</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{summary.medium}</p>
          <p className="text-[10px] text-muted-foreground">Medium</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{summary.low}</p>
          <p className="text-[10px] text-muted-foreground">Low</p>
        </div>
      </div>

      {/* Correlations list */}
      {correlations.length > 0 ? (
        <div className="space-y-3">
          {correlations.map((c) => (
            <CorrelationCard key={c.id} correlation={c} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No cross-sport correlations detected right now.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Correlations appear when multiple sports show synchronized sharp line movement
            within a 30-minute window.
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        For informational purposes only. Not financial advice.
        Cross-sport correlations are statistical patterns, not guaranteed indicators.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CorrelationCard
// ---------------------------------------------------------------------------

function CorrelationCard({ correlation }: { correlation: SharpCorrelation }) {
  return (
    <div className={`rounded-lg border p-4 ${riskColor(correlation.risk)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {patternLabel(correlation.pattern)}
          </Badge>
          <Badge variant="outline" className={`text-xs ${riskColor(correlation.risk)}`}>
            {correlation.risk.toUpperCase()}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{correlation.strength}</p>
          <p className="text-[10px] text-muted-foreground">strength</p>
        </div>
      </div>

      <p className="text-sm mb-3">{correlation.description}</p>

      {/* Sports involved */}
      <div className="flex gap-1 mb-2">
        {correlation.sports.map((s) => (
          <Badge key={s} variant="secondary" className="text-[10px]">
            {s.toUpperCase()}
          </Badge>
        ))}
      </div>

      {/* Movement details */}
      <div className="space-y-1">
        {correlation.movements.slice(0, 5).map((m, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {m.sport.toUpperCase()}: {m.awayTeam} @ {m.homeTeam}
            </span>
            <span>
              {m.market} {m.direction} ({m.booksInAgreement}/{m.totalBooks} books)
            </span>
          </div>
        ))}
        {correlation.movements.length > 5 && (
          <p className="text-xs text-muted-foreground">
            +{correlation.movements.length - 5} more movements
          </p>
        )}
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground">
        Window: {correlation.durationMinutes}min
      </div>
    </div>
  )
}
