'use client'

import { Badge } from '@/components/ui/badge'
import type { VelocityAlert } from '@/lib/odds-velocity'

interface OddsVelocityProps {
  alerts: VelocityAlert[]
}

const SEVERITY_STYLES = {
  extreme: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/15 text-red-500 border-red-500/30',
    text: 'text-red-500',
  },
  sharp: {
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/5',
    badge: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
    text: 'text-orange-500',
  },
  moderate: {
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    badge: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    text: 'text-yellow-500',
  },
}

/**
 * Displays odds velocity alerts — lines that are moving fast.
 */
export function OddsVelocityPanel({ alerts }: OddsVelocityProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No rapid line movements detected. Lines are stable.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const style = SEVERITY_STYLES[alert.severity]
        const arrow = alert.direction === 'up' ? '\u2191' : '\u2193'

        return (
          <div
            key={`${alert.gameId}-${alert.market}-${alert.side}-${i}`}
            className={`rounded-lg border ${style.border} ${style.bg} p-3 space-y-1`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${style.badge}`}>
                  {alert.severity.toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {alert.sport.toUpperCase()}
                </Badge>
                <span className="text-sm font-medium">
                  {alert.awayTeam} @ {alert.homeTeam}
                </span>
              </div>
              <span className={`text-sm font-bold ${style.text}`}>
                {arrow} {alert.magnitude} pts
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="capitalize">{alert.market} ({alert.side})</span>
              <span>{alert.bookCount} books moved {alert.direction}</span>
              <span>{alert.velocity} pts/hr</span>
            </div>
          </div>
        )
      })}

      <p className="text-[10px] text-muted-foreground/60">
        Rapid line movement often indicates sharp action or breaking news. For informational purposes only.
      </p>
    </div>
  )
}
