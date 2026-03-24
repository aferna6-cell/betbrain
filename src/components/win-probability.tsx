'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import { formatProb } from '@/lib/win-probability'
import type { WinProbability } from '@/lib/win-probability'
import type { Sport } from '@/lib/supabase/types'

const SPORT_FILTERS: { key: 'all' | Sport; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'nba', label: 'NBA' },
  { key: 'nfl', label: 'NFL' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
]

function ProbBar({ homeProb, homeTeam, awayTeam }: { homeProb: number; homeTeam: string; awayTeam: string }) {
  const homePct = Math.round(homeProb * 100)
  const awayPct = 100 - homePct

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{homeTeam}</span>
        <span className="font-medium">{awayTeam}</span>
      </div>
      <div className="flex h-5 w-full rounded-full overflow-hidden">
        <div
          className="bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
          style={{ width: `${Math.max(homePct, 5)}%` }}
        >
          {homePct}%
        </div>
        <div
          className="bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
          style={{ width: `${Math.max(awayPct, 5)}%` }}
        >
          {awayPct}%
        </div>
      </div>
    </div>
  )
}

function WinProbCard({ wp }: { wp: WinProbability }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {SPORT_LABELS[wp.game.sport] ?? wp.game.sport.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {wp.confidence}% conf
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatGameTime(wp.game.commenceTime)}
        </span>
      </div>

      {/* Win probability bar */}
      <ProbBar homeProb={wp.homeProb} homeTeam={wp.game.homeTeam} awayTeam={wp.game.awayTeam} />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Avg Vig</p>
          <p className="font-mono">{(wp.avgVig * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Disagreement</p>
          <p className="font-mono">{(wp.disagreement * 100).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Books</p>
          <p className="font-mono">{wp.byBook.length}</p>
        </div>
      </div>

      {/* Bullish/bearish */}
      {wp.mostBullishHome && wp.leastBullishHome && (
        <div className="flex justify-between text-xs">
          <span className="text-blue-500">
            Most bullish ({wp.game.homeTeam}): {wp.mostBullishHome.bookmaker.replace(/_/g, ' ')} {formatProb(wp.mostBullishHome.prob)}
          </span>
          <span className="text-orange-500">
            Least: {wp.leastBullishHome.bookmaker.replace(/_/g, ' ')} {formatProb(wp.leastBullishHome.prob)}
          </span>
        </div>
      )}

      {/* Expandable book-by-book */}
      {wp.byBook.length > 1 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline"
          >
            {expanded ? 'Hide' : 'Show'} book breakdown
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {wp.byBook.map((b) => (
                <div key={b.bookmaker} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{b.bookmaker.replace(/_/g, ' ')}</span>
                  <div className="flex gap-3">
                    <span className="text-blue-500 font-mono">{formatProb(b.noVigHome)}</span>
                    <span className="text-orange-500 font-mono">{formatProb(b.noVigAway)}</span>
                    <span className="text-muted-foreground font-mono w-12 text-right">
                      {(b.vig * 100).toFixed(1)}% vig
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Link
        href={`/dashboard/games/${wp.game.id}`}
        className="inline-flex h-7 w-full items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Full Game Analysis
      </Link>
    </div>
  )
}

export function WinProbabilityPanel({ probabilities }: { probabilities: WinProbability[] }) {
  const [activeSport, setActiveSport] = useState<'all' | Sport>('all')

  const filtered = activeSport === 'all'
    ? probabilities
    : probabilities.filter((wp) => wp.game.sport === activeSport)

  const highDisagreement = filtered.filter((wp) => wp.disagreement > 0.02).length
  const strongFavorites = filtered.filter((wp) => wp.homeProb > 0.65 || wp.awayProb > 0.65).length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Games</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-yellow-500">{highDisagreement}</p>
          <p className="text-xs text-muted-foreground">Disagreements</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{strongFavorites}</p>
          <p className="text-xs text-muted-foreground">Heavy Favorites</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1">
        {SPORT_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() => setActiveSport(sf.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeSport === sf.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((wp) => (
            <WinProbCard key={wp.game.id} wp={wp} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">No games with probability data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Win probabilities appear when moneyline odds are available from multiple bookmakers.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice. Win probabilities are derived from
        bookmaker odds and represent market consensus, not predictive certainty.
      </p>
    </div>
  )
}
