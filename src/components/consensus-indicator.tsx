'use client'

import { Badge } from '@/components/ui/badge'
import type { ConsensusIndicator } from '@/lib/consensus'

interface ConsensusViewProps {
  indicators: ConsensusIndicator[]
}

const SIDE_LABELS = {
  home: 'Home',
  away: 'Away',
  split: 'Split',
  unclear: 'Unclear',
}

export function ConsensusView({ indicators }: ConsensusViewProps) {
  if (indicators.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-lg font-medium">No Consensus Data Available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Consensus indicators require at least 3 bookmakers per game with moneyline odds.
          Check back when more odds data is available.
        </p>
      </div>
    )
  }

  const divergent = indicators.filter((i) => i.divergence)
  const aligned = indicators.filter((i) => !i.divergence)

  return (
    <div className="space-y-6">
      {divergent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Sharp/Public Divergence</h3>
            <Badge variant="destructive" className="text-xs">
              {divergent.length} game{divergent.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Games where estimated sharp money disagrees with the public consensus.
            Reverse line movement often indicates informed betting activity.
          </p>
          <div className="space-y-2">
            {divergent.map((ind) => (
              <ConsensusCard key={ind.gameId} indicator={ind} />
            ))}
          </div>
        </div>
      )}

      {aligned.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Consensus Aligned ({aligned.length})
          </h3>
          <div className="space-y-2">
            {aligned.map((ind) => (
              <ConsensusCard key={ind.gameId} indicator={ind} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Sharp/public estimates are based on bookmaker odds disagreement and line outliers.
        Without actual handle data, these are probabilistic estimates.
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function ConsensusCard({ indicator }: { indicator: ConsensusIndicator }) {
  const { homeTeam, awayTeam, publicSide, sharpSide, divergence, confidence, reasoning, avgImplied, impliedStdDev } = indicator

  return (
    <div
      className={`rounded-lg border p-4 ${
        divergence
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {awayTeam} @ {homeTeam}
            </span>
            {divergence && (
              <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-300">
                Divergence
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Public side: </span>
              <span className={publicSide === 'home' ? 'text-blue-400' : publicSide === 'away' ? 'text-purple-400' : 'text-muted-foreground'}>
                {publicSide === 'home' ? homeTeam : publicSide === 'away' ? awayTeam : 'Split'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sharp side: </span>
              <span className={
                sharpSide === 'home' ? 'text-blue-400' :
                sharpSide === 'away' ? 'text-purple-400' :
                'text-muted-foreground'
              }>
                {sharpSide === 'home' ? homeTeam : sharpSide === 'away' ? awayTeam : 'Unclear'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Home: {avgImplied.home}%</span>
            <span>Away: {avgImplied.away}%</span>
            <span>Spread: {impliedStdDev.home}pp / {impliedStdDev.away}pp std dev</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{reasoning}</p>
        </div>

        <div className="text-right shrink-0">
          <div className={`text-lg font-bold ${
            confidence >= 60 ? 'text-green-400' :
            confidence >= 45 ? 'text-yellow-400' :
            'text-muted-foreground'
          }`}>
            {confidence}%
          </div>
          <span className="text-[10px] text-muted-foreground">confidence</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact consensus badge for display on game cards.
 */
export function ConsensusCompactBadge({ indicator }: { indicator: ConsensusIndicator }) {
  if (!indicator.divergence) return null

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300"
      title={indicator.reasoning}
    >
      Sharp/Public Split
    </span>
  )
}
