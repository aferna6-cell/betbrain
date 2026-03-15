'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Star, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import {
  getWatchlist,
  removeFromWatchlist,
  clearWatchlist,
  type WatchlistItem,
} from '@/lib/watchlist'

interface WatchlistPanelProps {
  /** When true, the panel starts expanded. Defaults to true. */
  defaultOpen?: boolean
}

export function WatchlistPanel({ defaultOpen = true }: WatchlistPanelProps) {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [open, setOpen] = useState(defaultOpen)
  const [mounted, setMounted] = useState(false)

  const refresh = useCallback(() => {
    setItems(getWatchlist())
  }, [])

  useEffect(() => {
    // Hydration gate: avoid rendering localStorage-dependent UI during SSR
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    refresh()

    // Keep in sync if other tabs modify localStorage
    function onStorage(e: StorageEvent) {
      if (e.key === 'betbrain-watchlist') refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) return null

  // Only show the panel when there are items
  if (items.length === 0) return null

  function handleRemove(gameId: string) {
    removeFromWatchlist(gameId)
    refresh()
  }

  function handleClearAll() {
    clearWatchlist()
    refresh()
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-card">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
          <span className="text-sm font-semibold">Watchlist</span>
          <Badge
            variant="secondary"
            className="h-5 min-w-5 rounded-full px-1.5 text-xs font-semibold"
          >
            {items.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClearAll()
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Clear all
          </button>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-border px-4 pb-3 pt-2">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.gameId}
                className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs font-semibold uppercase"
                    >
                      {SPORT_LABELS[item.sport] ?? item.sport.toUpperCase()}
                    </Badge>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatGameTime(item.commenceTime)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">
                    {item.awayTeam}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.homeTeam}
                  </p>
                </div>

                <div className="ml-2 flex shrink-0 items-center gap-1">
                  <Link
                    href={`/dashboard/games/${item.gameId}`}
                    className="inline-flex h-7 items-center rounded-md border border-border px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleRemove(item.gameId)}
                    aria-label="Remove from watchlist"
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
