import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { EVOpportunity } from '@/lib/ev-scanner'
import type { ConsensusIndicator } from '@/lib/consensus'

interface DailySummaryProps {
  evCount: number
  topEV: EVOpportunity | null
  divergenceCount: number
  topDivergence: ConsensusIndicator | null
  signalCount: number
}

/**
 * Quick daily summary shown at the top of the dashboard.
 * Highlights the top opportunities across EV, consensus, and signals.
 * Server component — no client JS.
 */
export function DailySummary({
  evCount,
  topEV,
  divergenceCount,
  topDivergence,
  signalCount,
}: DailySummaryProps) {
  const hasAnything = evCount > 0 || divergenceCount > 0 || signalCount > 0

  if (!hasAnything) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Today&apos;s Highlights</h2>
        <span className="text-[10px] text-muted-foreground">
          For informational purposes only
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* +EV Opportunities */}
        <Link
          href="/dashboard/ev"
          className="rounded-lg border border-border/50 bg-background p-3 transition-colors hover:border-green-500/30"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">+EV Bets</span>
            {evCount > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-green-500/15 text-green-400">
                {evCount}
              </Badge>
            )}
          </div>
          {topEV ? (
            <div>
              <p className="text-sm font-medium truncate">
                {topEV.team}
              </p>
              <p className="text-xs text-green-400">
                +{topEV.ev.toFixed(1)}% EV at {topEV.bookmaker.replace(/_/g, ' ')}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No +EV bets found</p>
          )}
        </Link>

        {/* Sharp/Public Divergence */}
        <Link
          href="/dashboard/ev"
          className="rounded-lg border border-border/50 bg-background p-3 transition-colors hover:border-amber-500/30"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Sharp/Public</span>
            {divergenceCount > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-400">
                {divergenceCount} split{divergenceCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {topDivergence ? (
            <div>
              <p className="text-sm font-medium truncate">
                {topDivergence.awayTeam} @ {topDivergence.homeTeam}
              </p>
              <p className="text-xs text-amber-400">
                Sharp on {topDivergence.sharpSide === 'home' ? topDivergence.homeTeam : topDivergence.awayTeam}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No divergences detected</p>
          )}
        </Link>

        {/* Smart Signals */}
        <Link
          href="/dashboard/signals"
          className="rounded-lg border border-border/50 bg-background p-3 transition-colors hover:border-blue-500/30"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Smart Signals</span>
            {signalCount > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-blue-500/15 text-blue-400">
                {signalCount}
              </Badge>
            )}
          </div>
          {signalCount > 0 ? (
            <p className="text-sm font-medium">
              {signalCount} signal{signalCount !== 1 ? 's' : ''} active
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No signals today</p>
          )}
        </Link>
      </div>
    </div>
  )
}
