'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { GameCard } from '@/components/game-card'
import { WatchlistPanel } from '@/components/watchlist'
import type { NormalizedGame } from '@/lib/sports/config'
import type { Sport } from '@/lib/supabase/types'

interface GamesDashboardProps {
  gamesBySport: Record<string, NormalizedGame[]>
  apiUsage: {
    count: number
    limit: number
    isWarning: boolean
    isExhausted: boolean
  }
  dataNotices: string[]
}

const LEAGUES: { key: 'all' | Sport; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'nba', label: 'NBA' },
  { key: 'nfl', label: 'NFL' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
]

export function GamesDashboard({
  gamesBySport,
  apiUsage,
  dataNotices,
}: GamesDashboardProps) {
  const [activeLeague, setActiveLeague] = useState<'all' | Sport>('all')

  const filteredGames =
    activeLeague === 'all'
      ? Object.values(gamesBySport).flat()
      : gamesBySport[activeLeague] ?? []

  // Sort by commence time
  const sortedGames = [...filteredGames].sort(
    (a, b) =>
      new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
  )

  const totalGames = Object.values(gamesBySport).flat().length

  return (
    <div className="space-y-4">
      {/* Watchlist panel — only renders when localStorage has items */}
      <WatchlistPanel />

      {/* League filter + API usage */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {LEAGUES.map((league) => {
            const count =
              league.key === 'all'
                ? totalGames
                : (gamesBySport[league.key]?.length ?? 0)

            return (
              <button
                key={league.key}
                onClick={() => setActiveLeague(league.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeLeague === league.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {league.label}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">API Usage</span>
          <Badge
            variant={
              apiUsage.isExhausted
                ? 'destructive'
                : apiUsage.isWarning
                  ? 'secondary'
                  : 'outline'
            }
            className="font-mono text-xs"
          >
            {apiUsage.count}/{apiUsage.limit}
          </Badge>
        </div>
      </div>

      {/* Data notices */}
      {dataNotices.length > 0 && (
        <div className="space-y-1">
          {dataNotices.map((notice, i) => (
            <p key={i} className="text-sm text-yellow-500">
              {notice}
            </p>
          ))}
        </div>
      )}

      {/* Game cards grid */}
      {sortedGames.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {activeLeague === 'all'
              ? 'No upcoming games found. Check back later for today\'s matchups.'
              : `No upcoming ${activeLeague.toUpperCase()} games found.`}
          </p>
        </div>
      )}
    </div>
  )
}
