'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { getVerdictColor } from '@/lib/daily-slate'
import type { DailySlate, TopGame } from '@/lib/daily-slate'

function TopGameRow({ topGame, rank }: { topGame: TopGame; rank: number }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {topGame.sportLabel}
          </Badge>
          {topGame.score >= 30 && (
            <Badge className="bg-green-500/20 text-green-500 text-xs">
              Score: {topGame.score}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatGameTime(topGame.game.commenceTime)}
          </span>
        </div>
        <p className="text-sm font-medium truncate">
          {topGame.game.awayTeam} @ {topGame.game.homeTeam}
        </p>
        {topGame.reasons.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {topGame.reasons.slice(0, 3).map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground">&bull; {r}</p>
            ))}
          </div>
        )}
        <Link
          href={`/dashboard/games/${topGame.game.id}`}
          className="mt-1 inline-block text-xs text-primary hover:underline"
        >
          View Analysis
        </Link>
      </div>
    </div>
  )
}

export function DailySlateWidget({ slate }: { slate: DailySlate }) {
  const verdictColor = getVerdictColor(slate.verdict)

  if (slate.totalGames === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-1">Today&apos;s Slate</h3>
        <p className="text-sm text-muted-foreground">No games scheduled for today.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Today&apos;s Slate</h3>
          <p className={`text-lg font-bold ${verdictColor}`}>{slate.verdictLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{slate.totalGames}</p>
          <p className="text-xs text-muted-foreground">
            {slate.activeSports} sport{slate.activeSports !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Sport pills */}
      <div className="flex flex-wrap gap-2">
        {slate.sports.map((s) => (
          <Link
            key={s.sport}
            href={`/dashboard/league/${s.sport}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:bg-accent transition-colors"
          >
            <span className="font-semibold">{s.label}</span>
            <span className="text-muted-foreground">{s.gameCount} games</span>
            {s.evCount > 0 && (
              <Badge className="bg-green-500/20 text-green-500 text-[10px] px-1.5 py-0">
                {s.evCount} +EV
              </Badge>
            )}
          </Link>
        ))}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <p className="text-lg font-bold text-green-500">{slate.stats.totalEVOpps}</p>
          <p className="text-[10px] text-muted-foreground">+EV Bets</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-500">{slate.stats.closeGames}</p>
          <p className="text-[10px] text-muted-foreground">Close Games</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-500">{slate.stats.otCandidates}</p>
          <p className="text-[10px] text-muted-foreground">OT Risk</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">{slate.stats.blowoutRisk}</p>
          <p className="text-[10px] text-muted-foreground">Blowouts</p>
        </div>
      </div>

      {/* Top games */}
      {slate.topGames.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Top Games to Watch
          </h4>
          <div className="space-y-2">
            {slate.topGames.slice(0, 5).map((tg, i) => (
              <TopGameRow key={tg.game.id} topGame={tg} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className="flex items-center justify-between text-xs">
        <Link href="/dashboard/ev" className="text-primary hover:underline">
          View EV Scanner
        </Link>
        <p className="text-muted-foreground">
          For informational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  )
}
