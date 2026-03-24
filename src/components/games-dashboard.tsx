'use client'

import { useState, useEffect, useCallback } from 'react'
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
  evGameIds?: string[]
  signalGameIds?: string[]
}

type QuickFilter = 'none' | 'ev' | 'signals' | 'my-picks'

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
  evGameIds = [],
  signalGameIds = [],
}: GamesDashboardProps) {
  const [activeLeague, setActiveLeague] = useState<'all' | Sport>('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('none')
  const [myPickGameIds, setMyPickGameIds] = useState<Set<string>>(new Set())

  // Fetch user's pick game IDs for "My Picks" filter
  const fetchMyPicks = useCallback(async () => {
    try {
      const res = await fetch('/api/picks')
      if (!res.ok) return
      const data = await res.json()
      const picks = data.picks ?? []
      const ids = new Set<string>(
        picks.map((p: { external_game_id: string }) => p.external_game_id)
      )
      setMyPickGameIds(ids)
    } catch {
      // Silent
    }
  }, [])

  useEffect(() => {
    fetchMyPicks()
  }, [fetchMyPicks])

  const evSet = new Set(evGameIds)
  const signalSet = new Set(signalGameIds)

  let filteredGames =
    activeLeague === 'all'
      ? Object.values(gamesBySport).flat()
      : gamesBySport[activeLeague] ?? []

  // Apply quick filter
  if (quickFilter === 'ev') {
    filteredGames = filteredGames.filter((g) => evSet.has(g.id))
  } else if (quickFilter === 'signals') {
    filteredGames = filteredGames.filter((g) => signalSet.has(g.id))
  } else if (quickFilter === 'my-picks') {
    filteredGames = filteredGames.filter((g) => myPickGameIds.has(g.id))
  }

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

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'none' as QuickFilter, label: 'All Games', count: null },
          { key: 'ev' as QuickFilter, label: '+EV', count: evGameIds.length },
          { key: 'signals' as QuickFilter, label: 'Signals', count: signalGameIds.length },
          { key: 'my-picks' as QuickFilter, label: 'My Picks', count: myPickGameIds.size },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setQuickFilter(quickFilter === key ? 'none' : key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              quickFilter === key
                ? key === 'ev'
                  ? 'bg-green-500/15 border-green-500/30 text-green-500'
                  : key === 'signals'
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                    : key === 'my-picks'
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                      : 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {label}
            {count !== null && count > 0 && (
              <span className="ml-1 opacity-70">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Rate limit warning */}
      {apiUsage.isExhausted && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-500">
            Odds API limit reached ({apiUsage.count}/{apiUsage.limit}). Data shown is cached and may be stale. Limit resets at the start of next month.
          </p>
        </div>
      )}
      {apiUsage.isWarning && !apiUsage.isExhausted && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
          <p className="text-sm text-yellow-500">
            Approaching Odds API limit ({apiUsage.count}/{apiUsage.limit}). Data will be served from cache once the limit is reached.
          </p>
        </div>
      )}

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
