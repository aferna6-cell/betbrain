'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { formatOdds } from '@/lib/odds'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { Sport } from '@/lib/supabase/types'
import type { SpreadVsMLResult, SpreadVsMLComparison } from '@/lib/spread-vs-ml'

const SPORT_FILTERS: { key: 'all' | Sport; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'nba', label: 'NBA' },
  { key: 'nfl', label: 'NFL' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
]

type RecommendationFilter = 'all' | 'ml' | 'spread'

function RecBadge({ rec }: { rec: 'ml' | 'spread' | 'either' }) {
  const styles: Record<string, string> = {
    ml: 'bg-blue-900/60 text-blue-300 border-blue-700',
    spread: 'bg-purple-900/60 text-purple-300 border-purple-700',
    either: 'bg-gray-800 text-gray-400 border-gray-700',
  }
  const labels: Record<string, string> = {
    ml: 'ML Better',
    spread: 'Spread Better',
    either: 'Either',
  }
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${styles[rec]}`}>
      {labels[rec]}
    </span>
  )
}

function ComparisonCard({ cmp }: { cmp: SpreadVsMLComparison }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/games/${cmp.gameId}`} className="font-medium text-white hover:text-blue-400 text-sm">
            {cmp.awayTeam} @ {cmp.homeTeam}
          </Link>
          <div className="flex gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs">{SPORT_LABELS[cmp.sport] ?? cmp.sport}</Badge>
            <span className="text-xs text-gray-500">{formatGameTime(cmp.commenceTime)}</span>
          </div>
        </div>
        <RecBadge rec={cmp.recommendation} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-lg p-2 text-center ${cmp.recommendation === 'ml' ? 'bg-blue-900/30 ring-1 ring-blue-600' : 'bg-gray-800/50'}`}>
          <div className="text-xs text-gray-400 mb-1">Moneyline</div>
          <div className="text-lg font-bold text-white">{formatOdds(cmp.mlOdds)}</div>
          <div className="text-xs text-gray-500">Break-even: {cmp.mlBreakEven}%</div>
        </div>
        <div className={`rounded-lg p-2 text-center ${cmp.recommendation === 'spread' ? 'bg-purple-900/30 ring-1 ring-purple-600' : 'bg-gray-800/50'}`}>
          <div className="text-xs text-gray-400 mb-1">Spread ({cmp.spreadLine > 0 ? '+' : ''}{cmp.spreadLine})</div>
          <div className="text-lg font-bold text-white">{formatOdds(cmp.spreadOdds)}</div>
          <div className="text-xs text-gray-500">Break-even: {cmp.spreadBreakEven}%</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs">
          <span className="text-gray-400">Team:</span>{' '}
          <span className="text-white font-medium">{cmp.team}</span>
          <span className="text-gray-500 ml-2">({cmp.side})</span>
        </div>
        {cmp.edgePercent > 0 && (
          <span className="text-xs text-emerald-400 font-medium">{cmp.edgePercent.toFixed(1)}% edge</span>
        )}
      </div>

      <button onClick={() => setShowDetail(!showDetail)} className="text-xs text-blue-400 hover:text-blue-300">
        {showDetail ? 'Hide' : 'Show'} analysis
      </button>

      {showDetail && (
        <div className="text-xs text-gray-400 bg-gray-800/50 rounded p-2 space-y-1">
          <p>{cmp.reason}</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <span className="text-gray-500">ML decimal:</span> {cmp.mlDecimal.toFixed(3)}
            </div>
            <div>
              <span className="text-gray-500">Spread decimal:</span> {cmp.spreadDecimal.toFixed(3)}
            </div>
            <div>
              <span className="text-gray-500">ML implied:</span> {(cmp.mlImplied * 100).toFixed(1)}%
            </div>
            <div>
              <span className="text-gray-500">Spread implied:</span> {(cmp.spreadImplied * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-600 italic">For informational purposes only. Not financial advice.</p>
    </div>
  )
}

export function SpreadVsMLPanel({ result }: { result: SpreadVsMLResult }) {
  const [sportFilter, setSportFilter] = useState<'all' | Sport>('all')
  const [recFilter, setRecFilter] = useState<RecommendationFilter>('all')

  const filtered = result.comparisons
    .filter(c => sportFilter === 'all' || c.sport === sportFilter)
    .filter(c => recFilter === 'all' || c.recommendation === recFilter)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Spread vs Moneyline</h3>
        <p className="text-sm text-gray-400">
          Which market offers better value for each side —{' '}
          <span className="text-blue-400">{result.mlBetterCount} ML better</span>,{' '}
          <span className="text-purple-400">{result.spreadBetterCount} spread better</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {SPORT_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setSportFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sportFilter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([['all', 'All'], ['ml', 'ML Better'], ['spread', 'Spread Better']] as [RecommendationFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRecFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                recFilter === key ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No comparisons match filters.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c, i) => (
            <ComparisonCard key={`${c.gameId}-${c.side}-${c.bookmaker}-${i}`} cmp={c} />
          ))}
        </div>
      )}
    </div>
  )
}
