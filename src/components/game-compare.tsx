'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OddsDisplay } from '@/components/odds-display'
import { formatImpliedProb, getBestMoneyline, getBestSpreadOdds, getBestTotalOdds } from '@/lib/odds'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Game selector
// ---------------------------------------------------------------------------

function GameSelector({
  games,
  selectedIds,
  onToggle,
}: {
  games: NormalizedGame[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
}) {
  const [filter, setFilter] = useState('')
  const filtered = games.filter(
    (g) =>
      g.homeTeam.toLowerCase().includes(filter.toLowerCase()) ||
      g.awayTeam.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search teams..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="max-h-64 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No games found</p>
        )}
        {filtered.map((game) => {
          const selected = selectedIds.has(game.id)
          return (
            <button
              key={game.id}
              onClick={() => onToggle(game.id)}
              disabled={!selected && selectedIds.size >= 5}
              className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors text-left ${
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/30'
              } ${!selected && selectedIds.size >= 5 ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div>
                <span className="font-medium">{game.awayTeam}</span>
                <span className="text-muted-foreground mx-1">@</span>
                <span className="font-medium">{game.homeTeam}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {SPORT_LABELS[game.sport] ?? game.sport.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatGameTime(game.commenceTime)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

function ComparisonTable({ games }: { games: NormalizedGame[] }) {
  if (games.length < 2) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-3 pr-4 font-medium">Metric</th>
            {games.map((g) => (
              <th key={g.id} className="pb-3 px-4 font-medium text-center min-w-[160px]">
                <div>{g.awayTeam}</div>
                <div className="text-muted-foreground/60">@ {g.homeTeam}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Sport + Time */}
          <tr className="border-b border-border/50">
            <td className="py-2 pr-4 text-muted-foreground">Sport</td>
            {games.map((g) => (
              <td key={g.id} className="py-2 px-4 text-center">
                <Badge variant="secondary" className="text-[10px]">
                  {SPORT_LABELS[g.sport] ?? g.sport.toUpperCase()}
                </Badge>
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 pr-4 text-muted-foreground">Game Time</td>
            {games.map((g) => (
              <td key={g.id} className="py-2 px-4 text-center text-xs">
                {formatGameTime(g.commenceTime)}
              </td>
            ))}
          </tr>

          {/* Best Moneyline */}
          <tr className="border-b border-border/50 bg-card/30">
            <td className="py-2 pr-4 text-muted-foreground">Best Away ML</td>
            {games.map((g) => {
              const best = getBestMoneyline(g.bookmakers, 'away')
              return (
                <td key={g.id} className="py-2 px-4 text-center font-mono">
                  <OddsDisplay odds={best} />
                  {best !== null && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatImpliedProb(best)}
                    </span>
                  )}
                </td>
              )
            })}
          </tr>
          <tr className="border-b border-border/50 bg-card/30">
            <td className="py-2 pr-4 text-muted-foreground">Best Home ML</td>
            {games.map((g) => {
              const best = getBestMoneyline(g.bookmakers, 'home')
              return (
                <td key={g.id} className="py-2 px-4 text-center font-mono">
                  <OddsDisplay odds={best} />
                  {best !== null && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatImpliedProb(best)}
                    </span>
                  )}
                </td>
              )
            })}
          </tr>

          {/* Best Spread */}
          <tr className="border-b border-border/50">
            <td className="py-2 pr-4 text-muted-foreground">Best Away Spread</td>
            {games.map((g) => {
              const best = getBestSpreadOdds(g.bookmakers, 'away')
              const line = g.bookmakers.find((bk) => bk.spread?.awayOdds === best)?.spread?.awayLine
              return (
                <td key={g.id} className="py-2 px-4 text-center font-mono">
                  {line != null && <span className="text-muted-foreground mr-1">{line > 0 ? `+${line}` : line}</span>}
                  {best !== null ? <OddsDisplay odds={best} /> : <span className="text-muted-foreground">--</span>}
                </td>
              )
            })}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 pr-4 text-muted-foreground">Best Home Spread</td>
            {games.map((g) => {
              const best = getBestSpreadOdds(g.bookmakers, 'home')
              const line = g.bookmakers.find((bk) => bk.spread?.homeOdds === best)?.spread?.homeLine
              return (
                <td key={g.id} className="py-2 px-4 text-center font-mono">
                  {line != null && <span className="text-muted-foreground mr-1">{line > 0 ? `+${line}` : line}</span>}
                  {best !== null ? <OddsDisplay odds={best} /> : <span className="text-muted-foreground">--</span>}
                </td>
              )
            })}
          </tr>

          {/* Best Total */}
          <tr className="border-b border-border/50 bg-card/30">
            <td className="py-2 pr-4 text-muted-foreground">Best Over</td>
            {games.map((g) => {
              const best = getBestTotalOdds(g.bookmakers, 'over')
              const line = g.bookmakers.find((bk) => bk.total?.overOdds === best)?.total?.line
              return (
                <td key={g.id} className="py-2 px-4 text-center font-mono">
                  {line != null && <span className="text-muted-foreground mr-1">O{line}</span>}
                  {best !== null ? <OddsDisplay odds={best} /> : <span className="text-muted-foreground">--</span>}
                </td>
              )
            })}
          </tr>
          <tr className="border-b border-border/50 bg-card/30">
            <td className="py-2 pr-4 text-muted-foreground">Best Under</td>
            {games.map((g) => {
              const best = getBestTotalOdds(g.bookmakers, 'under')
              const line = g.bookmakers.find((bk) => bk.total?.underOdds === best)?.total?.line
              return (
                <td key={g.id} className="py-2 px-4 text-center font-mono">
                  {line != null && <span className="text-muted-foreground mr-1">U{line}</span>}
                  {best !== null ? <OddsDisplay odds={best} /> : <span className="text-muted-foreground">--</span>}
                </td>
              )
            })}
          </tr>

          {/* Books count */}
          <tr className="border-b border-border/50">
            <td className="py-2 pr-4 text-muted-foreground">Bookmakers</td>
            {games.map((g) => (
              <td key={g.id} className="py-2 px-4 text-center">
                {g.bookmakers.length}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GameCompare() {
  const [allGames, setAllGames] = useState<NormalizedGame[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/odds')
      if (!res.ok) throw new Error('Failed to load games')
      const data = await res.json()
      // API returns { nba: { games: [...], ... }, nfl: { ... }, ... }
      // or possibly { nba: [...], ... } depending on version
      const allGames: NormalizedGame[] = []
      for (const sportData of Object.values(data)) {
        if (Array.isArray(sportData)) {
          allGames.push(...(sportData as NormalizedGame[]))
        } else if (sportData && typeof sportData === 'object' && 'games' in (sportData as Record<string, unknown>)) {
          allGames.push(...((sportData as { games: NormalizedGame[] }).games ?? []))
        }
      }
      setAllGames(allGames)
    } catch {
      setError('Could not load games. Try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 5) {
        next.add(id)
      }
      return next
    })
  }

  const selectedGames = allGames.filter((g) => selectedIds.has(g.id))

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (allGames.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No games available to compare. Check back when odds are loaded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Select Games ({selectedIds.size}/5)</h2>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          )}
        </div>
        <GameSelector
          games={allGames}
          selectedIds={selectedIds}
          onToggle={handleToggle}
        />
      </div>

      {selectedGames.length >= 2 ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-4">Side-by-Side Comparison</h2>
          <ComparisonTable games={selectedGames} />
        </div>
      ) : selectedGames.length === 1 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Select at least one more game to compare.
          </p>
        </div>
      ) : null}
    </div>
  )
}
