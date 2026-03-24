'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { findValuePlays, type ValuePlay } from '@/lib/value-finder'
import { formatBookName, getBookColor } from '@/lib/book-colors'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Value Plays Widget — shows best opportunities across all games
// ---------------------------------------------------------------------------

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  'positive-ev': { label: '+EV', color: 'bg-green-500/20 text-green-400' },
  'key-line-discrepancy': { label: 'Key Line', color: 'bg-yellow-500/20 text-yellow-400' },
  'bookmaker-disagreement': { label: 'Disagree', color: 'bg-orange-500/20 text-orange-400' },
  'low-juice': { label: 'Low Juice', color: 'bg-blue-500/20 text-blue-400' },
}

export function ValuePlaysWidget({ games }: { games: NormalizedGame[] }) {
  const result = useMemo(() => findValuePlays(games), [games])

  if (result.plays.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6">
        <h3 className="text-sm font-semibold mb-2">Today&apos;s Best Value</h3>
        <p className="text-sm text-muted-foreground">
          No strong value plays detected. Check back when more games have odds from multiple books.
        </p>
      </div>
    )
  }

  // Show top 5 on the dashboard
  const topPlays = result.plays.slice(0, 5)

  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Today&apos;s Best Value</h3>
        <span className="text-xs text-muted-foreground">
          {result.plays.length} plays from {result.gamesAnalyzed} games
        </span>
      </div>
      <div className="divide-y divide-border/30">
        {topPlays.map((play) => (
          <ValuePlayRow key={play.id} play={play} />
        ))}
      </div>
      {result.plays.length > 5 && (
        <div className="px-4 py-2 text-center border-t border-border/30">
          <Link
            href="/dashboard/value"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all {result.plays.length} value plays &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}

function ValuePlayRow({ play }: { play: ValuePlay }) {
  const reasonStyle = REASON_LABELS[play.reason] ?? { label: play.reason, color: '' }

  return (
    <Link
      href={`/dashboard/games/${encodeURIComponent(play.game.id)}`}
      className="block px-4 py-3 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="secondary" className="text-[10px] font-semibold uppercase px-1.5 py-0">
          {SPORT_LABELS[play.game.sport] ?? play.game.sport}
        </Badge>
        <Badge className={`text-[10px] px-1.5 py-0 ${reasonStyle.color}`}>
          {reasonStyle.label}
        </Badge>
        <span className="ml-auto text-xs font-mono text-muted-foreground">
          Score: {play.score}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">
          {play.game.awayTeam} @ {play.game.homeTeam}
        </span>
        {play.side && (
          <span className="text-xs text-muted-foreground">
            ({play.side === 'home' ? play.game.homeTeam : play.game.awayTeam})
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
        {play.summary}
      </p>

      {play.bestBook && (
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: getBookColor(play.bestBook).dot }}
          />
          <span className="text-xs text-muted-foreground">
            {formatBookName(play.bestBook)}
          </span>
          {play.bestOdds != null && (
            <span className="text-xs font-mono text-green-500">
              {play.bestOdds > 0 ? `+${play.bestOdds}` : play.bestOdds}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
