'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { Sport } from '@/lib/supabase/types'
import type { MomentumResult, TeamMomentum } from '@/lib/momentum-detector'

const MOMENTUM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  hot: { bg: 'bg-red-900/50', text: 'text-red-300', label: 'Hot' },
  warm: { bg: 'bg-orange-900/50', text: 'text-orange-300', label: 'Warm' },
  neutral: { bg: 'bg-gray-800', text: 'text-gray-300', label: 'Neutral' },
  cool: { bg: 'bg-cyan-900/50', text: 'text-cyan-300', label: 'Cool' },
  cold: { bg: 'bg-blue-900/50', text: 'text-blue-300', label: 'Cold' },
}

function MomentumBadge({ momentum }: { momentum: TeamMomentum['momentum'] }) {
  const style = MOMENTUM_STYLES[momentum]
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>{style.label}</span>
}

function StreakDisplay({ results }: { results: ('W' | 'L')[] }) {
  return (
    <div className="flex gap-0.5">
      {results.slice(0, 10).map((r, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold ${
            r === 'W' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  )
}

function MomentumBar({ score }: { score: number }) {
  // Score is -100 to 100. Center at 50%.
  const pct = (score + 100) / 2
  const isPositive = score >= 0
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />
      <div
        className={`h-full rounded-full transition-all ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
        style={{
          width: `${Math.abs(score) / 2}%`,
          marginLeft: isPositive ? '50%' : `${pct}%`,
        }}
      />
    </div>
  )
}

function TeamCard({ team }: { team: TeamMomentum }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{team.team}</span>
          <Badge variant="outline" className="text-xs">{SPORT_LABELS[team.sport] ?? team.sport}</Badge>
          <MomentumBadge momentum={team.momentum} />
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${team.momentumScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {team.momentumScore > 0 ? '+' : ''}{team.momentumScore}
          </div>
        </div>
      </div>

      <StreakDisplay results={team.recentResults} />
      <MomentumBar score={team.momentumScore} />

      <div className="flex gap-4 text-xs text-gray-400">
        <span>Streak: <span className={team.streak > 0 ? 'text-emerald-400' : 'text-red-400'}>{team.streak > 0 ? '+' : ''}{team.streak}</span></span>
        <span>Win Rate: <span className="text-white">{(team.winRate * 100).toFixed(0)}%</span></span>
        <span>Recent: <span className="text-white">{team.recentResults.length} games</span></span>
      </div>

      {team.nextGame && (
        <div className="bg-gray-800/50 rounded p-2 text-xs">
          <span className="text-gray-500">Next: </span>
          <Link href={`/dashboard/games/${team.nextGame.gameId}`} className="text-blue-400 hover:text-blue-300">
            {team.nextGame.isHome ? 'vs' : '@'} {team.nextGame.opponent}
          </Link>
          <span className="text-gray-500 ml-2">{formatGameTime(team.nextGame.commenceTime)}</span>
          {team.nextGame.impliedWinProb != null && (
            <span className="ml-2">
              <span className="text-gray-500">Win prob:</span>{' '}
              <span className={team.nextGame.isFavored ? 'text-emerald-400' : 'text-amber-400'}>
                {(team.nextGame.impliedWinProb * 100).toFixed(0)}%
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function MomentumDetectorPanel({ result }: { result: MomentumResult }) {
  const [filter, setFilter] = useState<'all' | 'hot' | 'cold'>('all')

  const filtered = filter === 'all' ? result.teams
    : filter === 'hot' ? result.hotTeams
    : result.coldTeams

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Team Momentum</h3>
          <p className="text-sm text-gray-400">
            {result.hotTeams.length} hot, {result.coldTeams.length} cold across {result.teams.length} teams
          </p>
        </div>
        <div className="flex gap-1">
          {(['all', 'hot', 'cold'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? f === 'hot' ? 'bg-red-600 text-white' : f === 'cold' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f === 'hot' ? 'Hot' : 'Cold'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No teams match the filter. Need pick history to detect momentum.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(t => <TeamCard key={t.team} team={t} />)}
        </div>
      )}

      <p className="text-[10px] text-gray-600 italic">For informational purposes only. Not financial advice.</p>
    </div>
  )
}
