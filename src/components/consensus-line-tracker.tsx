'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { formatOdds } from '@/lib/odds'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { ConsensusTrackerResult, ConsensusLine } from '@/lib/consensus-line-tracker'

function DeviationBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-xs text-gray-500">In line</span>
  const color = count >= 3 ? 'bg-red-900/60 text-red-300' : count >= 1 ? 'bg-amber-900/60 text-amber-300' : 'bg-gray-800 text-gray-400'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{count} deviation{count !== 1 ? 's' : ''}</span>
}

function ConsensusCard({ line }: { line: ConsensusLine }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/games/${line.gameId}`} className="font-medium text-white hover:text-blue-400 text-sm">
            {line.awayTeam} @ {line.homeTeam}
          </Link>
          <div className="flex gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs">{SPORT_LABELS[line.sport] ?? line.sport}</Badge>
            <span className="text-xs text-gray-500">{formatGameTime(line.commenceTime)}</span>
          </div>
        </div>
        <DeviationBadge count={line.totalDeviations} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {line.markets.moneyline && (
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-500 mb-1">ML Consensus</div>
            <div className="text-white font-medium">
              {formatOdds(line.markets.moneyline.consensusHome)} / {formatOdds(line.markets.moneyline.consensusAway)}
            </div>
            {line.markets.moneyline.deviations.length > 0 && (
              <div className="text-amber-400 mt-1">{line.markets.moneyline.deviations.length} off</div>
            )}
          </div>
        )}
        {line.markets.spread && (
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-500 mb-1">Spread Consensus</div>
            <div className="text-white font-medium">
              {line.markets.spread.consensusLine > 0 ? '+' : ''}{line.markets.spread.consensusLine}
            </div>
            {line.markets.spread.deviations.length > 0 && (
              <div className="text-amber-400 mt-1">{line.markets.spread.deviations.length} off</div>
            )}
          </div>
        )}
        {line.markets.total && (
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-500 mb-1">Total Consensus</div>
            <div className="text-white font-medium">{line.markets.total.consensusLine}</div>
            {line.markets.total.deviations.length > 0 && (
              <div className="text-amber-400 mt-1">{line.markets.total.deviations.length} off</div>
            )}
          </div>
        )}
      </div>

      {line.totalDeviations > 0 && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-400 hover:text-blue-300">
            {expanded ? 'Hide' : 'Show'} deviating books
          </button>

          {expanded && (
            <div className="space-y-2 text-xs">
              {line.markets.moneyline?.deviations.map(d => (
                <div key={`ml-${d.bookmaker}`} className="bg-gray-800/30 rounded p-2 flex items-center justify-between">
                  <span className="text-gray-300">{d.bookmaker}</span>
                  <span>
                    <span className="text-gray-500">ML:</span>{' '}
                    <span className={d.direction === 'above' ? 'text-emerald-400' : 'text-red-400'}>
                      {formatOdds(d.homeOdds)} / {formatOdds(d.awayOdds)}
                    </span>
                    <span className="text-gray-600 ml-1">({d.homeDeviation > 0 ? '+' : ''}{d.homeDeviation})</span>
                  </span>
                </div>
              ))}
              {line.markets.spread?.deviations.map(d => (
                <div key={`sp-${d.bookmaker}`} className="bg-gray-800/30 rounded p-2 flex items-center justify-between">
                  <span className="text-gray-300">{d.bookmaker}</span>
                  <span>
                    <span className="text-gray-500">Spread:</span>{' '}
                    <span className={d.direction === 'above' ? 'text-emerald-400' : 'text-red-400'}>
                      {d.line > 0 ? '+' : ''}{d.line}
                    </span>
                    <span className="text-gray-600 ml-1">({d.lineDeviation > 0 ? '+' : ''}{d.lineDeviation})</span>
                  </span>
                </div>
              ))}
              {line.markets.total?.deviations.map(d => (
                <div key={`tot-${d.bookmaker}`} className="bg-gray-800/30 rounded p-2 flex items-center justify-between">
                  <span className="text-gray-300">{d.bookmaker}</span>
                  <span>
                    <span className="text-gray-500">Total:</span>{' '}
                    <span className={d.direction === 'above' ? 'text-emerald-400' : 'text-red-400'}>
                      {d.line}
                    </span>
                    <span className="text-gray-600 ml-1">({d.lineDeviation > 0 ? '+' : ''}{d.lineDeviation})</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function ConsensusLineTrackerPanel({ result }: { result: ConsensusTrackerResult }) {
  const [showDeviationsOnly, setShowDeviationsOnly] = useState(false)

  const filtered = showDeviationsOnly ? result.games.filter(g => g.totalDeviations > 0) : result.games

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Consensus Line Tracker</h3>
          <p className="text-sm text-gray-400">
            {result.totalGames} games — {result.gamesWithDeviations} with bookmaker deviations from market consensus
          </p>
        </div>
        <button
          onClick={() => setShowDeviationsOnly(!showDeviationsOnly)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            showDeviationsOnly ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {showDeviationsOnly ? 'Deviations Only' : 'Show All'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No games{showDeviationsOnly ? ' with deviations' : ''} to display.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map(line => <ConsensusCard key={line.gameId} line={line} />)}
        </div>
      )}

      <p className="text-[10px] text-gray-600 italic">For informational purposes only. Not financial advice.</p>
    </div>
  )
}
