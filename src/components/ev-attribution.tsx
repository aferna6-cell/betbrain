'use client'

import { useState, useEffect } from 'react'
import { buildEVAttribution, type EVAttribution } from '@/lib/ev-attribution'

function ScoreBar({ score, name }: { score: number; name: string }) {
  const color =
    score >= 70 ? 'bg-emerald-500' :
    score >= 50 ? 'bg-blue-500' :
    score >= 30 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400 w-28 shrink-0 truncate" title={name}>{name}</span>
      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-zinc-300 w-8 text-right">{score.toFixed(0)}</span>
    </div>
  )
}

function EdgeBadge({ edge }: { edge: EVAttribution['overallEdge'] }) {
  const config = {
    strong: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Strong Edge' },
    moderate: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Moderate Edge' },
    slight: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Slight Edge' },
    negative: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Negative Edge' },
    insufficient: { bg: 'bg-zinc-700/20', text: 'text-zinc-400', label: 'Insufficient Data' },
  }
  const c = config[edge]
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

export function EVAttributionPanel() {
  const [attribution, setAttribution] = useState<EVAttribution | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('betbrain_picks')
      if (!raw) {
        setLoading(false)
        return
      }
      const picks = JSON.parse(raw)
      setAttribution(buildEVAttribution(picks))
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!attribution || attribution.overallEdge === 'insufficient') {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
        <p className="text-sm text-zinc-400">
          {attribution?.summary || 'Need resolved picks to analyze edge attribution. Log and resolve picks to see which factors drive your profitability.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">Overall Score</p>
          <p className="text-2xl font-bold text-white">{attribution.totalScore.toFixed(0)}/100</p>
        </div>
        <EdgeBadge edge={attribution.overallEdge} />
      </div>

      {/* Factor bars */}
      <div className="space-y-2.5">
        {attribution.factors.map((f) => (
          <div key={f.name}>
            <button
              className="w-full text-left"
              onClick={() => setExpanded(expanded === f.name ? null : f.name)}
            >
              <ScoreBar score={f.score} name={f.name} />
            </button>

            {expanded === f.name && (
              <div className="mt-2 ml-[7.5rem] bg-zinc-800/50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-zinc-500">{f.description}</p>
                <p className="text-xs text-zinc-400">{f.evidence}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 uppercase">Contribution:</span>
                  <span className="text-xs text-zinc-300">{f.contribution.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-emerald-400/80 bg-emerald-500/5 rounded px-2 py-1">
                  {f.recommendation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded px-3 py-2">
        {attribution.summary}
      </p>
    </div>
  )
}
