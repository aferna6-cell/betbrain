import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { AnalyzeButton } from '@/components/analysis-dialog'
import type { NormalizedGame } from '@/lib/sports/config'

const SPORT_LABELS: Record<string, string> = {
  nba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
  nhl: 'NHL',
}

function formatGameTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (isToday) return `Today ${time}`
  if (isTomorrow) return `Tomorrow ${time}`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatOdds(price: number | null): string {
  if (price === null) return '—'
  return price > 0 ? `+${price}` : `${price}`
}

function getBestOdds(game: NormalizedGame, side: 'home' | 'away'): number | null {
  let best: number | null = null
  for (const bk of game.bookmakers) {
    const price = side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (price !== null && price !== undefined) {
      if (best === null || price > best) {
        best = price
      }
    }
  }
  return best
}

export function GameCard({ game }: { game: NormalizedGame }) {
  const topBookmakers = game.bookmakers.slice(0, 3)
  const bestHome = getBestOdds(game, 'home')
  const bestAway = getBestOdds(game, 'away')

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-semibold uppercase">
          {SPORT_LABELS[game.sport] ?? game.sport.toUpperCase()}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatGameTime(game.commenceTime)}
        </span>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{game.awayTeam}</span>
          <span className="font-mono text-sm text-muted-foreground">
            {formatOdds(bestAway)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">{game.homeTeam}</span>
          <span className="font-mono text-sm text-muted-foreground">
            {formatOdds(bestHome)}
          </span>
        </div>
      </div>

      {topBookmakers.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Top Bookmakers
          </p>
          <div className="space-y-1">
            {topBookmakers.map((bk) => (
              <div
                key={bk.bookmaker}
                className="flex items-center justify-between text-xs"
              >
                <span className="capitalize text-muted-foreground">
                  {bk.bookmaker.replace(/_/g, ' ')}
                </span>
                <div className="flex gap-4">
                  <span
                    className={`font-mono ${
                      bk.moneyline?.away !== null &&
                      bk.moneyline?.away === bestAway
                        ? 'text-green-500'
                        : ''
                    }`}
                  >
                    {formatOdds(bk.moneyline?.away ?? null)}
                  </span>
                  <span
                    className={`font-mono ${
                      bk.moneyline?.home !== null &&
                      bk.moneyline?.home === bestHome
                        ? 'text-green-500'
                        : ''
                    }`}
                  >
                    {formatOdds(bk.moneyline?.home ?? null)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <AnalyzeButton game={game} />
        <Link
          href={`/dashboard/games/${game.id}`}
          className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          View Details
        </Link>
      </div>

      {!game.isFresh && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Cached data — may be outdated
        </p>
      )}
    </div>
  )
}
