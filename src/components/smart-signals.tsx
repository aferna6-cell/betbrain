'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatOdds, getBestMoneyline } from '@/lib/odds'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { SmartSignal } from '@/lib/signals'
import type { Sport } from '@/lib/supabase/types'

const SPORT_FILTERS: { key: 'all' | Sport; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'nba', label: 'NBA' },
  { key: 'nfl', label: 'NFL' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
]

function SignalCard({ signal }: { signal: SmartSignal }) {
  const { game, signals, strength, aiConfidence, bestValue } = signal
  const bestHome = getBestMoneyline(game.bookmakers, 'home')
  const bestAway = getBestMoneyline(game.bookmakers, 'away')

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {SPORT_LABELS[game.sport] ?? game.sport.toUpperCase()}
          </Badge>
          <Badge
            variant={strength === 'strong' ? 'default' : 'outline'}
            className="text-xs"
          >
            {strength === 'strong' ? 'Strong Signal' : 'Moderate Signal'}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatGameTime(game.commenceTime)}
        </span>
      </div>

      <div className="mb-3 space-y-1">
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

      {aiConfidence !== null && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">AI Confidence:</span>
          <span className="text-sm font-semibold text-green-500">
            {aiConfidence}%
          </span>
        </div>
      )}

      {bestValue.side && bestValue.reasoning && (
        <div className="mb-3 rounded-md bg-green-500/10 px-3 py-2">
          <p className="text-xs font-medium text-green-500">
            Value on {bestValue.side === 'home' ? game.homeTeam : game.awayTeam}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {bestValue.reasoning}
          </p>
        </div>
      )}

      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground">
          Signals ({signals.length})
        </p>
        {signals.map((s, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 text-green-500">&#x2713;</span>
            <span className="text-muted-foreground">{s}</span>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Link
          href={`/dashboard/games/${game.id}`}
          className="inline-flex h-8 w-full items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

export function SmartSignalsView({ signals }: { signals: SmartSignal[] }) {
  const [activeSport, setActiveSport] = useState<'all' | Sport>('all')

  const filtered = activeSport === 'all'
    ? signals
    : signals.filter((s) => s.game.sport === activeSport)

  const strong = filtered.filter((s) => s.strength === 'strong')
  const moderate = filtered.filter((s) => s.strength === 'moderate')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {SPORT_FILTERS.map((sf) => {
            const count = sf.key === 'all'
              ? signals.length
              : signals.filter((s) => s.game.sport === sf.key).length

            return (
              <button
                key={sf.key}
                onClick={() => setActiveSport(sf.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeSport === sf.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {sf.label}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">{count}</span>
                )}
              </button>
            )
          })}
        </div>
        {filtered.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {strong.length} strong, {moderate.length} moderate
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">
            {signals.length === 0
              ? 'No Smart Signals right now'
              : `No ${SPORT_LABELS[activeSport as Sport] ?? ''} signals right now`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Signals appear when odds variance, AI analysis, and market data align
            on a game. Check back closer to game time.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((signal) => (
            <SignalCard key={signal.game.id} signal={signal} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Smart Signals are not guaranteed
        winners — always do your own research.
      </p>
    </div>
  )
}
