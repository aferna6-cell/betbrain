'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { EVDecaySummary, EVDecayAnalysis } from '@/lib/ev-decay'

function formatMinutes(mins: number): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${mins}m`
}

function DecayBadge({ decayPercent }: { decayPercent: number }) {
  const color =
    decayPercent >= 100
      ? 'bg-red-900/60 text-red-300'
      : decayPercent >= 50
        ? 'bg-amber-900/60 text-amber-300'
        : 'bg-green-900/60 text-green-300'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {decayPercent}% decay
    </span>
  )
}

function DecayCard({ analysis }: { analysis: EVDecayAnalysis }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-white text-sm">{analysis.team}</span>
          <span className="text-xs text-gray-500 ml-2">
            ({analysis.side})
          </span>
        </div>
        <DecayBadge decayPercent={analysis.decayPercent} />
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-xs text-gray-500">Initial EV</div>
          <div className="text-sm font-mono text-green-400">+{analysis.initialEV.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Final EV</div>
          <div className={`text-sm font-mono ${analysis.finalEV > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {analysis.finalEV > 0 ? '+' : ''}{analysis.finalEV.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Half-Life</div>
          <div className="text-sm font-mono text-gray-300">
            {analysis.halfLife !== null ? formatMinutes(analysis.halfLife) : '---'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Speed</div>
          <div className="text-sm font-mono text-gray-300">
            {analysis.correctionSpeed.toFixed(1)}/hr
          </div>
        </div>
      </div>

      {analysis.decayPoints.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {expanded ? 'Hide' : 'Show'} {analysis.decayPoints.length} data points
        </button>
      )}

      {expanded && (
        <div className="space-y-1 mt-2">
          {analysis.decayPoints.map((pt, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-gray-400 bg-gray-800/40 rounded px-2 py-1">
              <span>{formatMinutes(pt.minutesBefore)} before</span>
              <span className="font-mono">
                EV: <span className={pt.ev > 0 ? 'text-green-400' : 'text-red-400'}>
                  {pt.ev > 0 ? '+' : ''}{pt.ev.toFixed(2)}%
                </span>
              </span>
              <span className="font-mono">Fair: {pt.fairOdds > 0 ? '+' : ''}{pt.fairOdds}</span>
              <span className="font-mono">Best: {pt.bestOdds > 0 ? '+' : ''}{pt.bestOdds}</span>
              <span>{pt.bookCount} books</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EVDecayPanel({ summary }: { summary: EVDecaySummary }) {
  if (summary.analyses.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center">
        <p className="text-sm text-gray-400">
          No EV decay data available yet. EV decay tracking requires multiple odds snapshots
          over time to detect how quickly +EV opportunities are corrected by the market.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          For informational purposes only. Not financial advice.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Tracked Games</div>
          <div className="text-lg font-bold text-white">{summary.analyses.length}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Avg Half-Life</div>
          <div className="text-lg font-bold text-white">
            {summary.avgHalfLife !== null ? formatMinutes(summary.avgHalfLife) : '---'}
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Avg Initial EV</div>
          <div className="text-lg font-bold text-green-400">
            +{summary.avgInitialEV.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Fully Corrected</div>
          <div className="text-lg font-bold text-amber-400">
            {summary.fullyCorrectedCount}/{summary.analyses.length}
          </div>
        </div>
      </div>

      {/* Individual analyses */}
      <div className="space-y-2">
        {summary.analyses.map((a, i) => (
          <DecayCard key={`${a.gameId}-${a.side}-${i}`} analysis={a} />
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
