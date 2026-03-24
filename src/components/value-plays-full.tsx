'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { findValuePlays, type ValuePlay, type ValueReason } from '@/lib/value-finder'
import { formatBookName, getBookColor } from '@/lib/book-colors'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Value Plays Full Page — all value plays with filters
// ---------------------------------------------------------------------------

const REASON_LABELS: Record<string, { label: string; color: string; filterColor: string }> = {
  'positive-ev': { label: '+EV', color: 'bg-green-500/20 text-green-400', filterColor: 'bg-green-500/20 text-green-400 border-green-500/50' },
  'key-line-discrepancy': { label: 'Key Line', color: 'bg-yellow-500/20 text-yellow-400', filterColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  'bookmaker-disagreement': { label: 'Disagree', color: 'bg-orange-500/20 text-orange-400', filterColor: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  'low-juice': { label: 'Low Juice', color: 'bg-blue-500/20 text-blue-400', filterColor: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
}

const ALL_REASONS: ValueReason[] = ['positive-ev', 'key-line-discrepancy', 'bookmaker-disagreement', 'low-juice']

type SportFilter = 'all' | 'nba' | 'nfl' | 'mlb' | 'nhl'

export function ValuePlaysFullPage({ games }: { games: NormalizedGame[] }) {
  const [sportFilter, setSportFilter] = useState<SportFilter>('all')
  const [reasonFilter, setReasonFilter] = useState<ValueReason | 'all'>('all')
  const [minScore, setMinScore] = useState(0)

  const result = useMemo(() => findValuePlays(games), [games])

  const filteredPlays = useMemo(() => {
    return result.plays.filter((play) => {
      if (sportFilter !== 'all' && play.game.sport !== sportFilter) return false
      if (reasonFilter !== 'all' && play.reason !== reasonFilter) return false
      if (play.score < minScore) return false
      return true
    })
  }, [result.plays, sportFilter, reasonFilter, minScore])

  // Stats summary
  const reasonCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const play of result.plays) {
      counts[play.reason] = (counts[play.reason] ?? 0) + 1
    }
    return counts
  }, [result.plays])

  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const play of result.plays) {
      counts[play.game.sport] = (counts[play.game.sport] ?? 0) + 1
    }
    return counts
  }, [result.plays])

  if (result.plays.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-lg font-medium text-muted-foreground mb-2">
          No value plays detected
        </p>
        <p className="text-sm text-muted-foreground">
          Check back when more games have odds from multiple bookmakers. Value plays require
          at least 3 bookmakers to calculate fair odds.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Plays</p>
          <p className="text-2xl font-bold">{result.plays.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Games Analyzed</p>
          <p className="text-2xl font-bold">{result.gamesAnalyzed}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className="text-2xl font-bold">
            {result.plays.length > 0
              ? Math.round(result.plays.reduce((s, p) => s + p.score, 0) / result.plays.length)
              : 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Best Score</p>
          <p className="text-2xl font-bold text-green-400">
            {result.plays.length > 0 ? result.plays[0].score : 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground mr-1">Sport:</span>
        {(['all', 'nba', 'nfl', 'mlb', 'nhl'] as const).map((sport) => (
          <Button
            key={sport}
            variant={sportFilter === sport ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSportFilter(sport)}
          >
            {sport === 'all' ? 'All' : sport.toUpperCase()}
            {sport !== 'all' && sportCounts[sport] ? ` (${sportCounts[sport]})` : ''}
          </Button>
        ))}

        <span className="text-xs text-muted-foreground ml-3 mr-1">Type:</span>
        <Button
          variant={reasonFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setReasonFilter('all')}
        >
          All
        </Button>
        {ALL_REASONS.map((reason) => {
          const style = REASON_LABELS[reason]
          const count = reasonCounts[reason] ?? 0
          return (
            <Button
              key={reason}
              variant="outline"
              size="sm"
              className={`h-7 text-xs ${reasonFilter === reason ? style.filterColor + ' border' : ''}`}
              onClick={() => setReasonFilter(reasonFilter === reason ? 'all' : reason)}
            >
              {style.label} {count > 0 && `(${count})`}
            </Button>
          )
        })}

        <span className="text-xs text-muted-foreground ml-3 mr-1">Min score:</span>
        <select
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="h-7 rounded border border-border bg-background px-2 text-xs"
        >
          <option value={0}>Any</option>
          <option value={20}>20+</option>
          <option value={40}>40+</option>
          <option value={60}>60+</option>
          <option value={80}>80+</option>
        </select>
      </div>

      {/* Results */}
      <div className="rounded-lg border border-border/50 bg-card divide-y divide-border/30">
        {filteredPlays.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No plays match the current filters. Try broadening your criteria.
          </div>
        ) : (
          filteredPlays.map((play, i) => (
            <ValuePlayDetailRow key={play.id} play={play} rank={i + 1} />
          ))
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function ValuePlayDetailRow({ play, rank }: { play: ValuePlay; rank: number }) {
  const reasonStyle = REASON_LABELS[play.reason] ?? { label: play.reason, color: '' }

  return (
    <Link
      href={`/dashboard/games/${encodeURIComponent(play.game.id)}`}
      className="block px-4 py-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Rank */}
        <span className="text-lg font-bold text-muted-foreground/50 w-6 text-right flex-shrink-0">
          {rank}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="secondary" className="text-[10px] font-semibold uppercase px-1.5 py-0">
              {SPORT_LABELS[play.game.sport] ?? play.game.sport}
            </Badge>
            <Badge className={`text-[10px] px-1.5 py-0 ${reasonStyle.color}`}>
              {reasonStyle.label}
            </Badge>
            {play.side && (
              <span className="text-xs text-muted-foreground">
                {play.side === 'home' ? play.game.homeTeam : play.game.awayTeam}
              </span>
            )}
          </div>

          <div className="text-sm font-medium">
            {play.game.awayTeam} @ {play.game.homeTeam}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
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
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-lg font-bold ${
            play.score >= 60 ? 'text-green-400' :
            play.score >= 40 ? 'text-yellow-400' :
            'text-muted-foreground'
          }`}>
            {play.score}
          </div>
          <span className="text-[10px] text-muted-foreground">score</span>
        </div>
      </div>
    </Link>
  )
}
