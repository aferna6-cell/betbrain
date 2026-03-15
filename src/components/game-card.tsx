import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { AnalyzeButton } from '@/components/analysis-dialog'
import { WatchlistButton } from '@/components/watchlist-button'
import { formatOdds, formatImpliedProb, getBestMoneyline } from '@/lib/odds'
import { formatGameTime, timeAgo } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'

function getOddsRange(bookmakers: NormalizedGame['bookmakers'], side: 'home' | 'away'): number | null {
  const odds = bookmakers
    .map((bk) => side === 'home' ? bk.moneyline?.home : bk.moneyline?.away)
    .filter((v): v is number => v != null)
  if (odds.length < 2) return null
  return Math.max(...odds) - Math.min(...odds)
}

export function GameCard({ game }: { game: NormalizedGame }) {
  const topBookmakers = game.bookmakers.slice(0, 3)
  const bestHome = getBestMoneyline(game.bookmakers, 'home')
  const bestAway = getBestMoneyline(game.bookmakers, 'away')
  const homeRange = getOddsRange(game.bookmakers, 'home')
  const awayRange = getOddsRange(game.bookmakers, 'away')
  const maxRange = Math.max(homeRange ?? 0, awayRange ?? 0)

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-semibold uppercase">
          {SPORT_LABELS[game.sport] ?? game.sport.toUpperCase()}
        </Badge>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {formatGameTime(game.commenceTime)}
          </span>
          <WatchlistButton
            gameId={game.id}
            sport={game.sport}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
            commenceTime={game.commenceTime}
          />
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{game.awayTeam}</span>
          <span className="font-mono text-sm text-muted-foreground">
            {formatOdds(bestAway)}
            <span className="ml-1 text-xs opacity-60">{formatImpliedProb(bestAway)}</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">{game.homeTeam}</span>
          <span className="font-mono text-sm text-muted-foreground">
            {formatOdds(bestHome)}
            <span className="ml-1 text-xs opacity-60">{formatImpliedProb(bestHome)}</span>
          </span>
        </div>
      </div>

      {maxRange >= 15 && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          <span className="text-xs text-yellow-500">
            {maxRange}+ pt book spread — odds disagree
          </span>
        </div>
      )}

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

      {game.fromCache && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          {timeAgo(game.cachedAt) ? `Fetched ${timeAgo(game.cachedAt)}` : 'Cached data'}
          {!game.isFresh && ' — may be stale'}
        </p>
      )}
    </div>
  )
}
