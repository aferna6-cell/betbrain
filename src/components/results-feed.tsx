'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  buildResultsFeed,
  formatPickType,
  getResultColor,
  getResultBg,
  type ResultsFeedData,
} from '@/lib/results-feed'
import { formatOdds } from '@/lib/odds'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'

interface ResultsFeedProps {
  games?: NormalizedGame[]
}

interface StoredPick {
  id: string
  external_game_id: string
  sport: string
  pick_type: string
  pick_team: string | null
  pick_line: number | null
  odds: number
  units: number
  outcome: string | null
  profit: number | null
  game_date: string
  resolved_at: string | null
}

export function ResultsFeed({ games = [] }: ResultsFeedProps) {
  const [picks, setPicks] = useState<StoredPick[]>([])
  const [dateOffset, setDateOffset] = useState(0) // 0 = today, -1 = yesterday, etc.

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('betbrain-picks')
      if (stored) setPicks(JSON.parse(stored))
    } catch {
      // ignore
    }
  }, [])

  const targetDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + dateOffset)
    return d.toISOString().slice(0, 10)
  }, [dateOffset])

  const feedData = useMemo(() => {
    const gameData = games.map((g) => ({
      externalGameId: g.id,
      sport: g.sport,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      commenceTime: g.commenceTime,
    }))
    return buildResultsFeed(picks, gameData, targetDate)
  }, [picks, games, targetDate])

  const dateLabel = useMemo(() => {
    if (dateOffset === 0) return 'Today'
    if (dateOffset === -1) return 'Yesterday'
    const d = new Date()
    d.setDate(d.getDate() + dateOffset)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }, [dateOffset])

  return (
    <div className="space-y-4">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Results Feed</h3>
          <p className="text-sm text-muted-foreground">
            {dateLabel}&apos;s pick results
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDateOffset((d) => d - 1)}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-zinc-800 transition-colors"
          >
            &larr;
          </button>
          <button
            onClick={() => setDateOffset(0)}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-zinc-800 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setDateOffset((d) => Math.min(d + 1, 0))}
            disabled={dateOffset >= 0}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Running totals */}
      {(feedData.results.length > 0 || feedData.pendingCount > 0) && (
        <div className="flex items-center gap-4 text-sm">
          <span className={`font-bold ${feedData.todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {feedData.todayPnL >= 0 ? '+' : ''}{feedData.todayPnL.toFixed(2)}u
          </span>
          <span className="text-zinc-400">
            {feedData.todayWins}W-{feedData.todayLosses}L{feedData.todayPushes > 0 ? `-${feedData.todayPushes}P` : ''}
          </span>
          {feedData.pendingCount > 0 && (
            <span className="text-amber-400 text-xs">
              {feedData.pendingCount} pending
            </span>
          )}
        </div>
      )}

      {/* Results list */}
      {feedData.results.length > 0 ? (
        <div className="space-y-2">
          {feedData.results.map((result) => (
            <div
              key={result.id}
              className={`rounded-lg border p-3 transition-colors ${
                result.pick ? getResultBg(result.pick.outcome) : 'bg-zinc-900 border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 uppercase font-medium">
                    {SPORT_LABELS[result.sport as keyof typeof SPORT_LABELS] ?? result.sport}
                  </span>
                  <Link
                    href={`/dashboard/games/${encodeURIComponent(result.externalGameId)}?sport=${result.sport}`}
                    className="font-medium hover:underline"
                  >
                    {result.awayTeam} @ {result.homeTeam}
                  </Link>
                </div>
                {result.pick && (
                  <span className={`text-sm font-bold ${getResultColor(result.pick.outcome)}`}>
                    {result.pick.outcome.toUpperCase()}
                  </span>
                )}
              </div>

              {result.pick && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <span>{formatPickType(result.pick.pickType, result.pick.pickTeam, result.pick.pickLine)}</span>
                    <span className="text-zinc-500">@</span>
                    <span>{formatOdds(result.pick.odds)}</span>
                    <span className="text-zinc-500">{result.pick.units}u</span>
                  </div>
                  <span className={`font-bold ${result.pick.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.pick.profit >= 0 ? '+' : ''}{result.pick.profit.toFixed(2)}u
                  </span>
                </div>
              )}

              {result.homeScore !== null && result.awayScore !== null && (
                <div className="mt-1 text-xs text-zinc-500">
                  Final: {result.awayTeam} {result.awayScore} - {result.homeTeam} {result.homeScore}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-zinc-500">
          <p>No results for {dateLabel.toLowerCase()}.</p>
          {feedData.pendingCount > 0 && (
            <p className="text-sm mt-1 text-amber-400">
              {feedData.pendingCount} pick{feedData.pendingCount > 1 ? 's' : ''} still pending
            </p>
          )}
        </div>
      )}
    </div>
  )
}
