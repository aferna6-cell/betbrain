'use client'

import { useState, useEffect } from 'react'
import {
  buildDependencyGraph,
  type DependencyGraph,
  type DependencyCluster,
} from '@/lib/pick-dependencies'

const RISK_COLORS = {
  low: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
  medium: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  high: 'border-red-500/30 bg-red-500/10 text-red-400',
}

const EDGE_TYPE_LABELS = {
  'same-game': 'Same Game',
  'same-team': 'Same Team',
  'same-day-sport': 'Same Day/Sport',
  'correlated-outcome': 'Correlated',
}

function ClusterCard({ cluster, pickLabels }: { cluster: DependencyCluster; pickLabels: Map<string, string> }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-lg border p-3 ${RISK_COLORS[cluster.riskLevel].split(' ').slice(0, 2).join(' ')}`}>
      <button className="w-full text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_COLORS[cluster.riskLevel]}`}>
              {cluster.riskLevel.toUpperCase()}
            </span>
            <span className="text-sm text-zinc-300">
              {cluster.pickIds.length} correlated picks
            </span>
          </div>
          <span className="text-xs text-zinc-500">{cluster.reason}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 pl-2 border-l border-zinc-700">
          {cluster.pickIds.map((id) => (
            <p key={id} className="text-xs text-zinc-400">
              {pickLabels.get(id) ?? id}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export function PickDependenciesPanel() {
  const [graph, setGraph] = useState<DependencyGraph | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('betbrain_picks')
      if (!raw) {
        setLoading(false)
        return
      }
      const picks = JSON.parse(raw)
      const nodes = picks.map((p: Record<string, unknown>) => ({
        id: p.id ?? String(Math.random()),
        label: `${p.pick_team ?? 'Unknown'} (${p.bet_type ?? 'bet'})`,
        sport: p.sport,
        game_date: p.game_date ?? (typeof p.created_at === 'string' ? p.created_at.split('T')[0] : undefined),
        pick_team: p.pick_team,
        bet_type: p.bet_type,
        outcome: p.outcome,
      }))
      setGraph(buildDependencyGraph(nodes))
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-zinc-800 rounded" />)}
        </div>
      </div>
    )
  }

  if (!graph || graph.nodes.length < 2) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
        <p className="text-sm text-zinc-400">
          Need at least 2 picks to analyze dependencies. Log picks to see correlation clusters.
        </p>
      </div>
    )
  }

  const pickLabels = new Map(graph.nodes.map((n) => [n.id, n.label]))

  // Edge type breakdown
  const edgeTypeCounts = new Map<string, number>()
  for (const e of graph.edges) {
    edgeTypeCounts.set(e.type, (edgeTypeCounts.get(e.type) ?? 0) + 1)
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Correlations</p>
          <p className="text-lg font-bold text-zinc-300">{graph.totalEdges}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Correlated %</p>
          <p className={`text-lg font-bold ${graph.correlatedRate > 50 ? 'text-red-400' : graph.correlatedRate > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {graph.correlatedRate.toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Clusters</p>
          <p className="text-lg font-bold text-zinc-300">{graph.clusters.length}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Largest</p>
          <p className={`text-lg font-bold ${graph.maxClusterSize >= 5 ? 'text-red-400' : 'text-zinc-300'}`}>
            {graph.maxClusterSize} picks
          </p>
        </div>
      </div>

      {/* Edge type breakdown */}
      {graph.totalEdges > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...edgeTypeCounts.entries()].map(([type, count]) => (
            <span key={type} className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400">
              {EDGE_TYPE_LABELS[type as keyof typeof EDGE_TYPE_LABELS] ?? type}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Clusters */}
      {graph.clusters.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Correlation Clusters</h4>
          {graph.clusters.slice(0, 10).map((c) => (
            <ClusterCard key={c.id} cluster={c} pickLabels={pickLabels} />
          ))}
          {graph.clusters.length > 10 && (
            <p className="text-xs text-zinc-500 text-center">
              +{graph.clusters.length - 10} more clusters
            </p>
          )}
        </div>
      ) : (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-sm text-emerald-400">
            No correlations detected. Your picks are well-diversified.
          </p>
        </div>
      )}

      {/* Summary */}
      <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded px-3 py-2">
        {graph.riskSummary}
      </p>
    </div>
  )
}
