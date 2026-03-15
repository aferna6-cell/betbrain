'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import {
  addToWatchlist,
  removeFromWatchlist,
  isWatched,
} from '@/lib/watchlist'

interface WatchlistButtonProps {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
}

export function WatchlistButton({
  gameId,
  sport,
  homeTeam,
  awayTeam,
  commenceTime,
}: WatchlistButtonProps) {
  const [watched, setWatched] = useState(false)

  // Read from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setWatched(isWatched(gameId))
  }, [gameId])

  function toggle() {
    if (watched) {
      removeFromWatchlist(gameId)
      setWatched(false)
    } else {
      addToWatchlist({
        gameId,
        sport,
        homeTeam,
        awayTeam,
        commenceTime,
        addedAt: new Date().toISOString(),
      })
      setWatched(true)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
    >
      <Star
        className="h-4 w-4 transition-colors"
        style={
          watched
            ? { fill: '#f59e0b', color: '#f59e0b' }
            : { fill: 'transparent', color: '#6b7280' }
        }
      />
    </button>
  )
}
