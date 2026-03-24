'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { Sport } from '@/lib/supabase/types'
import type { ImpliedTeamTotalResult } from '@/lib/implied-team-totals'
import { classifyScoringEnvironment, SCORING_BENCHMARKS } from '@/lib/implied-team-totals'

const SPORT_FILTERS: { key: 'all' | Sport; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'nba', label: 'NBA' },
  { key: 'nfl', label: 'NFL' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
]

function ScoringBadge({ sport, total }: { sport: string; total: number }) {
  const env = classifyScoringEnvironment(sport, total)
  const colors: Record<string, string> = {
    high: 'bg-red-900/50 text-red-300',
    average: 'bg-gray-800 text-gray-300',
    low: 'bg-blue-900/50 text-blue-300',
  }
  const labels: Record<string, string> = {
    high: 'High Scoring',
    average: 'Average',
    low: 'Low Scoring',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[env]}`}>{labels[env]}</span>
}

function TeamTotalBar({ team, total, maxTotal }: { team: string; total: number; maxTotal: number }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 truncate text-gray-300">{team}</span>
      <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all"
          style={{ width: `${Math.max(pct, 15)}%` }}
        >
          {total.toFixed(1)}
        </div>
      </div>
    </div>
  )
}

function ImpliedTotalCard({ result }: { result: ImpliedTeamTotalResult }) {
  const [expanded, setExpanded] = useState(false)
  const benchmark = SCORING_BENCHMARKS[result.sport]
  const maxTotal = Math.max(result.consensus.avgHomeTotal, result.consensus.avgAwayTotal) * 1.1

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/games/${result.gameId}`} className="font-semibold text-white hover:text-blue-400 transition-colors">
            {result.awayTeam} @ {result.homeTeam}
          </Link>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{SPORT_LABELS[result.sport] ?? result.sport}</Badge>
            <span className="text-xs text-gray-500">{formatGameTime(result.commenceTime)}</span>
            <ScoringBadge sport={result.sport} total={result.consensus.avgGameTotal} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Game Total</div>
          <div className="text-xl font-bold text-white">{result.consensus.avgGameTotal.toFixed(1)}</div>
        </div>
      </div>

      <div className="space-y-2">
        <TeamTotalBar team={result.homeTeam} total={result.consensus.avgHomeTotal} maxTotal={maxTotal} />
        <TeamTotalBar team={result.awayTeam} total={result.consensus.avgAwayTotal} maxTotal={maxTotal} />
      </div>

      {result.maxDisagreement > 1 && (
        <div className="text-xs text-amber-400">
          ⚠ Bookmaker disagreement: {result.maxDisagreement.toFixed(1)} {benchmark?.unit ?? 'points'} spread in implied totals
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        {expanded ? 'Hide' : 'Show'} bookmaker breakdown ({result.byBookmaker.length} books)
      </button>

      {expanded && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1">Book</th>
                <th className="text-right py-1">Total</th>
                <th className="text-right py-1">Spread</th>
                <th className="text-right py-1">{result.homeTeam}</th>
                <th className="text-right py-1">{result.awayTeam}</th>
              </tr>
            </thead>
            <tbody>
              {result.byBookmaker.map(b => (
                <tr key={b.bookmaker} className="border-b border-gray-800/50">
                  <td className="py-1 text-gray-300">{b.bookmaker}</td>
                  <td className="text-right py-1">{b.gameTotal}</td>
                  <td className="text-right py-1">{b.homeSpread > 0 ? '+' : ''}{b.homeSpread}</td>
                  <td className="text-right py-1 font-medium">{b.homeImplied.toFixed(1)}</td>
                  <td className="text-right py-1 font-medium">{b.awayImplied.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-gray-600 italic">For informational purposes only. Not financial advice.</p>
    </div>
  )
}

export function ImpliedTeamTotalsPanel({ results }: { results: ImpliedTeamTotalResult[] }) {
  const [sportFilter, setSportFilter] = useState<'all' | Sport>('all')

  const filtered = sportFilter === 'all'
    ? results
    : results.filter(r => r.sport === sportFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Implied Team Totals</h3>
          <p className="text-sm text-gray-400">Expected scoring per team derived from spread + total</p>
        </div>
        <div className="flex gap-1">
          {SPORT_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setSportFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sportFilter === f.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No games with spread + total data available.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <ImpliedTotalCard key={r.gameId} result={r} />
          ))}
        </div>
      )}
    </div>
  )
}
