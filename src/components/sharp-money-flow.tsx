'use client'

import { useState } from 'react'
import {
  type SharpSignal,
  type SharpFlowSummary,
  strengthLabel,
  strengthColor,
} from '@/lib/sharp-money-flow'

// ---------------------------------------------------------------------------
// Signal type config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  rlm: { label: 'Reverse Line Movement', icon: 'RLM', color: 'text-red-400' },
  'late-steam': { label: 'Late Steam', icon: 'LST', color: 'text-orange-400' },
  'opening-value': { label: 'Opening Value', icon: 'OLV', color: 'text-blue-400' },
}

// ---------------------------------------------------------------------------
// Signal card
// ---------------------------------------------------------------------------

function SignalCard({ signal }: { signal: SharpSignal }) {
  const [expanded, setExpanded] = useState(false)
  const typeConf = TYPE_CONFIG[signal.type] ?? { label: signal.type, icon: '?', color: 'text-muted-foreground' }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-7 items-center rounded-md bg-muted px-2 text-xs font-bold ${typeConf.color}`}>
            {typeConf.icon}
          </span>
          <span className="text-sm font-medium">{typeConf.label}</span>
          <span className={`text-xs font-semibold ${strengthColor(signal.strength)}`}>
            {strengthLabel(signal.strength)} ({signal.strength}/5)
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      <p className="text-sm text-muted-foreground">{signal.description}</p>

      {/* Strength bar */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full ${
              level <= signal.strength
                ? level >= 4
                  ? 'bg-red-500'
                  : level >= 3
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2 text-xs">
          <div>
            <span className="text-muted-foreground">Market:</span>{' '}
            <span className="font-medium capitalize">{signal.market}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Side:</span>{' '}
            <span className="font-medium capitalize">{signal.side}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Books:</span>{' '}
            <span className="font-medium">{signal.bookmakers.join(', ')}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Confirmations:</span>{' '}
            <span className="font-medium">{signal.confirmations}</span>
          </div>
          {signal.publicPct > 0 && (
            <div>
              <span className="text-muted-foreground">Public %:</span>{' '}
              <span className="font-medium">{signal.publicPct}%</span>
            </div>
          )}
          {signal.movement.changePP !== 0 && (
            <div>
              <span className="text-muted-foreground">Move:</span>{' '}
              <span className="font-medium">{signal.movement.changePP > 0 ? '+' : ''}{signal.movement.changePP}pp</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

function FlowStats({ summary }: { summary: SharpFlowSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-3 text-center">
        <div className="text-2xl font-bold">{summary.totalSignals}</div>
        <div className="text-xs text-muted-foreground">Total Signals</div>
      </div>
      <div className="rounded-lg border border-border bg-card p-3 text-center">
        <div className="text-2xl font-bold text-red-400">{summary.rlmCount}</div>
        <div className="text-xs text-muted-foreground">RLM</div>
      </div>
      <div className="rounded-lg border border-border bg-card p-3 text-center">
        <div className="text-2xl font-bold text-orange-400">{summary.lateSteamCount}</div>
        <div className="text-xs text-muted-foreground">Late Steam</div>
      </div>
      <div className="rounded-lg border border-border bg-card p-3 text-center">
        <div className="text-2xl font-bold text-blue-400">{summary.openingValueCount}</div>
        <div className="text-xs text-muted-foreground">Opening Value</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SharpMoneyFlowPanel({
  summary,
  signals,
}: {
  summary: SharpFlowSummary
  signals: SharpSignal[]
}) {
  const [filterType, setFilterType] = useState<string>('all')
  const [minStrength, setMinStrength] = useState(1)

  const filtered = signals.filter((s) => {
    if (filterType !== 'all' && s.type !== filterType) return false
    if (s.strength < minStrength) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sharp Money Flow</h2>
        {summary.multiSignalGames.length > 0 && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
            {summary.multiSignalGames.length} multi-signal game{summary.multiSignalGames.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <FlowStats summary={summary} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Type:</span>
        {['all', 'rlm', 'late-steam', 'opening-value'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              filterType === t
                ? 'bg-blue-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t === 'all' ? 'All' : TYPE_CONFIG[t]?.label ?? t}
          </button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">Min:</span>
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setMinStrength(s)}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              minStrength === s
                ? 'bg-blue-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s}+
          </button>
        ))}
      </div>

      {/* Signal list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No sharp money signals detected
          {filterType !== 'all' || minStrength > 1
            ? ' for current filters. Try widening your filters.'
            : ' yet. Signals appear as line movement data accumulates.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((signal, i) => (
            <SignalCard key={`${signal.gameId}-${signal.type}-${signal.market}-${i}`} signal={signal} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
